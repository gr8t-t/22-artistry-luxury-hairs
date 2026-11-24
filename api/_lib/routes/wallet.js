import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, HttpError } from '../http.js'
import { nairaToKobo, koboToNaira, formatNaira, MAX_PAYMENT_KOBO } from '../money.js'
import { notifyUser } from '../notify.js'

const lockKey = (uid) => 'wallet:' + uid

/**
 * Balance and how much of it the customer may ask to get back.
 * Only money the customer paid in (top-ups) is refundable, never referral rewards,
 * and never more than the balance. Amounts already held or paid out for refunds are taken off.
 */
export async function walletFigures(userId) {
  const r = (await sql`select
      coalesce(sum(amount_kobo), 0)::bigint as balance,
      coalesce(sum(amount_kobo) filter (where type in ('topup','topup_reversal')), 0)::bigint as topped,
      coalesce(-sum(amount_kobo) filter (where type in ('refund_hold','refund_release')), 0)::bigint as refunded
    from wallet_ledger where user_id = ${userId}`)[0]
  const balance = Number(r.balance)
  const refundable = Math.max(0, Math.min(balance, Number(r.topped) - Number(r.refunded)))
  return { balance, refundable }
}

const mapGoal = (g, balance) => g && ({
  title: g.title,
  target: koboToNaira(g.target_kobo),
  remindersOn: g.reminders_on,
  remindWeekday: g.remind_weekday,
  percent: Math.min(100, Math.floor((balance * 100) / Number(g.target_kobo))),
  reached: balance >= Number(g.target_kobo),
})

const mapRequest = (r) => ({
  id: r.id, amount: koboToNaira(r.amount_kobo), reason: r.reason, status: r.status,
  decisionNote: r.decision_note, createdAt: new Date(r.created_at).toISOString(),
  decidedAt: r.decided_at ? new Date(r.decided_at).toISOString() : null,
})

/** Called after a top-up: tell the customer once when their savings goal is reached. */
export async function checkGoalReached(userId) {
  try {
    const { balance } = await walletFigures(userId)
    const hit = await sql`update wallet_goals set reached_notified = true
      where user_id = ${userId} and reached_notified = false and ${balance}::bigint >= target_kobo
      returning title, target_kobo`
    if (hit.length) {
      await notifyUser(userId, {
        type: 'reward', title: 'Savings goal reached',
        body: `You have saved ${formatNaira(koboToNaira(hit[0].target_kobo))} for "${hit[0].title}". Book it at the salon whenever you are ready.`, url: '/account',
      })
    }
  } catch (e) { console.error('goal check failed', e) }
}

export async function myWallet(req, res) {
  const user = await requireUser(req)
  const [fig, goal, reqs, history] = await Promise.all([
    walletFigures(user.id),
    sql`select * from wallet_goals where user_id = ${user.id}`,
    sql`select * from wallet_refund_requests where user_id = ${user.id} order by created_at desc limit 5`,
    sql`select amount_kobo, type, note, created_at from wallet_ledger where user_id = ${user.id} order by created_at desc limit 30`,
  ])
  send(res, 200, {
    balance: koboToNaira(fig.balance),
    refundable: koboToNaira(fig.refundable),
    goal: mapGoal(goal[0], fig.balance),
    refunds: reqs.map(mapRequest),
    history: history.map((h) => ({ amount: koboToNaira(h.amount_kobo), type: h.type, note: h.note, createdAt: new Date(h.created_at).toISOString() })),
  })
}

export async function saveGoal(req, res) {
  const user = await requireUser(req)
  const b = body(req)
  const title = text(b.title, 'Goal name', { required: true, max: 60 })
  const kobo = nairaToKobo(b.target)
  if (!kobo || kobo < 100_000) throw new HttpError(400, 'Enter a target of at least ₦1,000')
  if (kobo > MAX_PAYMENT_KOBO) throw new HttpError(400, 'That target is too high')
  const day = Number(b.remindWeekday)
  if (!Number.isInteger(day) || day < 1 || day > 7) throw new HttpError(400, 'Choose a reminder day')
  const on = b.remindersOn !== false
  await sql`insert into wallet_goals (user_id, title, target_kobo, reminders_on, remind_weekday, reached_notified, updated_at)
    values (${user.id}, ${title}, ${kobo}, ${on}, ${day}, false, now())
    on conflict (user_id) do update set title = excluded.title, target_kobo = excluded.target_kobo,
      reminders_on = excluded.reminders_on, remind_weekday = excluded.remind_weekday, reached_notified = false, updated_at = now()`
  const fig = await walletFigures(user.id)
  const g = (await sql`select * from wallet_goals where user_id = ${user.id}`)[0]
  send(res, 200, { goal: mapGoal(g, fig.balance) })
}

export async function deleteGoal(req, res) {
  const user = await requireUser(req)
  await sql`delete from wallet_goals where user_id = ${user.id}`
  send(res, 200, { ok: true })
}

/** Customer asks for part of their top-ups back. The amount is put on hold until a manager decides. */
export async function requestRefund(req, res) {
  const user = await requireUser(req)
  const b = body(req)
  const kobo = nairaToKobo(b.amount)
  if (!kobo || kobo < 100) throw new HttpError(400, 'Enter the amount you want back')
  const reason = text(b.reason, 'Reason', { required: true, max: 300 })
  if (reason.length < 3) throw new HttpError(400, 'Please tell us briefly why')
  const key = text(b.idempotencyKey, 'Request id', { required: true, max: 80 })

  const [, ins] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${lockKey(user.id)}))`,
    sql`with fig as (
          select coalesce(sum(amount_kobo), 0) as bal,
                 coalesce(sum(amount_kobo) filter (where type in ('topup','topup_reversal')), 0) as topped,
                 coalesce(-sum(amount_kobo) filter (where type in ('refund_hold','refund_release')), 0) as refunded
          from wallet_ledger where user_id = ${user.id}::uuid),
        req as (
          insert into wallet_refund_requests (user_id, amount_kobo, reason, idempotency_key)
          select ${user.id}::uuid, ${kobo}::bigint, ${reason}::text, ${key}::text from fig
          where ${kobo}::bigint <= least(bal, topped - refunded)
          on conflict do nothing returning id, amount_kobo)
        insert into wallet_ledger (user_id, amount_kobo, type, note)
        select ${user.id}::uuid, -amount_kobo, 'refund_hold', 'Refund requested' from req returning id`,
  ])
  if (!ins.length) {
    if ((await sql`select 1 from wallet_refund_requests where idempotency_key = ${key}`).length) return send(res, 200, { duplicate: true })
    if ((await sql`select 1 from wallet_refund_requests where user_id = ${user.id} and status = 'pending'`).length) {
      throw new HttpError(409, 'You already have a refund request waiting for approval.')
    }
    const { refundable } = await walletFigures(user.id)
    throw new HttpError(400, `You can ask for up to ${formatNaira(koboToNaira(refundable))} back. Referral rewards and money already spent are not refundable.`)
  }
  await logActivity(user.id, 'wallet.refund_requested', 'user', user.id, { amountKobo: kobo })
  try {
    const mgrs = await sql`select id from users where role = 'manager' and is_active = true`
    for (const m of mgrs) {
      await notifyUser(m.id, {
        type: 'reward', title: 'Hair Wallet refund request',
        body: `${user.name} asked for ${formatNaira(koboToNaira(kobo))} back. Open the Wallet tab to decide.`, url: '/admin',
      })
    }
  } catch (e) { console.error('refund notify failed', e) }
  send(res, 201, { ok: true })
}

/** Customer withdraws their own pending request: the hold is released. */
export async function cancelRefund(req, res) {
  const user = await requireUser(req)
  const id = uuid(req.params.id)
  const [, out] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${lockKey(user.id)}))`,
    sql`with c as (
          update wallet_refund_requests set status = 'cancelled', decided_at = now()
          where id = ${id}::uuid and user_id = ${user.id}::uuid and status = 'pending' returning id, amount_kobo)
        insert into wallet_ledger (user_id, amount_kobo, type, note)
        select ${user.id}::uuid, amount_kobo, 'refund_release', 'Refund request cancelled' from c returning id`,
  ])
  if (!out.length) throw new HttpError(409, 'That request is no longer waiting.')
  send(res, 200, { ok: true })
}

/** Manager: pending and recent refund requests. */
export async function listRefunds(req, res) {
  await requireUser(req, ['manager'])
  const rows = await sql`select r.*, u.name as customer, u.phone
    from wallet_refund_requests r join users u on u.id = r.user_id
    order by (r.status = 'pending') desc, r.created_at desc limit 40`
  send(res, 200, { requests: rows.map((r) => ({ ...mapRequest(r), customer: r.customer, phone: r.phone })) })
}

/** Manager approves (the salon then pays the customer back by cash or transfer) or rejects (hold released). */
export async function decideRefund(req, res) {
  const manager = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const b = body(req)
  const decision = b.decision
  if (decision !== 'approve' && decision !== 'reject') throw new HttpError(400, 'Choose approve or reject')
  const note = text(b.note, 'Note', { max: 300 })
  if (decision === 'reject' && note.length < 3) throw new HttpError(400, 'Please give the customer a short reason')
  const r0 = (await sql`select user_id, amount_kobo from wallet_refund_requests where id = ${id}`)[0]
  if (!r0) throw new HttpError(404, 'Request not found')

  let done
  if (decision === 'approve') {
    done = await sql`update wallet_refund_requests set status = 'approved', decided_by = ${manager.id}, decided_at = now(), decision_note = ${note}
      where id = ${id} and status = 'pending' returning id`
  } else {
    const [, out] = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${lockKey(r0.user_id)}))`,
      sql`with c as (
            update wallet_refund_requests set status = 'rejected', decided_by = ${manager.id}::uuid, decided_at = now(), decision_note = ${note}::text
            where id = ${id}::uuid and status = 'pending' returning id, user_id, amount_kobo)
          insert into wallet_ledger (user_id, amount_kobo, type, note, created_by)
          select user_id, amount_kobo, 'refund_release', 'Refund request declined', ${manager.id}::uuid from c returning id`,
    ])
    done = out
  }
  if (!done.length) throw new HttpError(409, 'This request was already decided.')
  await logActivity(manager.id, `wallet.refund_${decision}d`, 'user', r0.user_id, { amountKobo: Number(r0.amount_kobo), requestId: id })
  const amt = formatNaira(koboToNaira(r0.amount_kobo))
  await notifyUser(r0.user_id, decision === 'approve'
    ? { type: 'reward', title: 'Refund approved', body: `${amt} was approved. The salon will pay it back to you by cash or bank transfer.${note ? ' Note: ' + note : ''}`, url: '/account' }
    : { type: 'reward', title: 'Refund request declined', body: `Your request for ${amt} was declined and the money is back in your Hair Wallet. Reason: ${note}`, url: '/account' })
  send(res, 200, { ok: true })
}

/** Daily job (Vercel cron): send the weekly savings reminder to customers whose day it is. */
export async function walletReminders(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers?.authorization !== `Bearer ${secret}`) throw new HttpError(401, 'Not allowed')
  const due = await sql`with t as (select (now() at time zone 'Africa/Lagos')::date as d),
    due as (
      update wallet_goals g set last_reminded_on = t.d from t
      where g.reminders_on and g.remind_weekday = extract(isodow from t.d)::int
        and (g.last_reminded_on is null or g.last_reminded_on < t.d)
        and exists (select 1 from users u where u.id = g.user_id and u.is_active)
      returning g.user_id, g.title, g.target_kobo)
    select d.*, (select coalesce(sum(amount_kobo), 0) from wallet_ledger w where w.user_id = d.user_id)::bigint as balance from due d`
  let sent = 0
  for (const g of due) {
    if (Number(g.balance) >= Number(g.target_kobo)) continue
    const left = Number(g.target_kobo) - Number(g.balance)
    await notifyUser(g.user_id, {
      type: 'reward', title: 'Weekly savings reminder',
      body: `You have saved ${formatNaira(koboToNaira(g.balance))} towards "${g.title}". ${formatNaira(koboToNaira(left))} to go. Top up at the salon this week.`, url: '/account',
    })
    sent++
  }
  send(res, 200, { checked: due.length, sent })
}
