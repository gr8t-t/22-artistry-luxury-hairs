import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, HttpError } from '../http.js'
import { koboToNaira, formatNaira } from '../money.js'
import { notifyUser, notifyStaff } from '../notify.js'

// ── Rules ──
export const FLEX = {
  minWeeks: 2,
  maxWeeks: 22,          // about 5 months
  refundPercent: 80,     // share of the money paid so far that is refunded if the customer stops
  pendingDays: 7,        // a plan with no first payment is cancelled after this many days
  maxOpenPlans: 3,
  termsVersion: 'v1',
}
const OPEN = ['pending', 'active']
const money = (k) => formatNaira(koboToNaira(k))

// ── Pure helpers (also used by the tests) ──
/** Equal weekly instalments; the last one absorbs the odd kobo so they add up exactly. */
export function splitInstalments(totalKobo, weeks) {
  const t = Number(totalKobo)
  const base = Math.floor(t / weeks)
  const out = Array(weeks).fill(base)
  out[weeks - 1] += t - base * weeks
  return out
}
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export const lagosToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

/** Everything the screens need to show about one plan. */
export function planView(p, today = lagosToday()) {
  const total = Number(p.total_kobo)
  const paid = Number(p.paid_kobo || 0)
  const amounts = splitInstalments(total, p.weeks)
  const start = p.start_date ? String(p.start_date).slice(0, 10) : null
  let cum = 0
  const schedule = amounts.map((a, i) => {
    cum += a
    return { n: i + 1, amount: koboToNaira(a), date: start ? addDays(start, 7 * i) : null, paid: paid >= cum, _cum: cum }
  })
  const open = p.status === 'active' || p.status === 'pending'
  const nextIdx = schedule.findIndex((s) => !s.paid)
  let next = null
  let behindBy = 0
  let overdue = false
  if (open && nextIdx >= 0) {
    const s = schedule[nextIdx]
    next = { n: s.n, date: s.date, amount: koboToNaira(s._cum - paid) }
    if (start) {
      const dueNow = schedule.filter((x) => x.date <= today)
      const expected = dueNow.length ? dueNow[dueNow.length - 1]._cum : 0
      behindBy = Math.max(0, expected - paid)
      overdue = s.date < today
    }
  }
  return {
    id: p.id,
    status: p.status,
    items: (p.items || []).map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, price: koboToNaira(i.priceKobo), image: i.image || '' })),
    total: koboToNaira(total),
    paid: koboToNaira(paid),
    remaining: koboToNaira(total - paid),
    weeks: p.weeks,
    instalment: koboToNaira(amounts[0]),
    startDate: start,
    schedule: schedule.map(({ _cum, ...s }) => s), // eslint-disable-line no-unused-vars
    next,
    behindBy: koboToNaira(behindBy),
    overdue,
    stopRequested: !!p.stop_requested_at && open,
    stopReason: p.stop_reason || '',
    refundIfStopped: koboToNaira(Math.floor((paid * FLEX.refundPercent) / 100)),
    refund: p.refund_kobo == null ? null : koboToNaira(p.refund_kobo),
    decisionNote: p.decision_note || '',
    createdAt: new Date(p.created_at).toISOString(),
    expiresAt: p.status === 'pending' ? new Date(new Date(p.created_at).getTime() + FLEX.pendingDays * 86400000).toISOString() : null,
    completedAt: p.completed_at ? new Date(p.completed_at).toISOString() : null,
    collectedAt: p.collected_at ? new Date(p.collected_at).toISOString() : null,
  }
}

export async function loadItems(raw, what = 'a plan') {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) throw new HttpError(400, `Choose at least one item for ${what === 'a plan' ? 'your plan' : 'your order'}`)
  const want = new Map()
  for (const r of raw) {
    const id = uuid(r?.productId, 'product')
    const qty = Number(r?.qty)
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new HttpError(400, 'Each item quantity must be between 1 and 10')
    want.set(id, (want.get(id) || 0) + qty)
  }
  const ids = [...want.keys()]
  const rows = await sql`select id, name, price_kobo, quantity, image from products where id = any(${ids}::uuid[])`
  if (rows.length !== ids.length) throw new HttpError(400, 'One of the items is no longer available')
  const items = rows.map((p) => {
    const qty = want.get(p.id)
    if (Number(p.price_kobo) <= 0) throw new HttpError(400, `${p.name} has no price yet, so it cannot be put on ${what}`)
    if (p.quantity < qty) throw new HttpError(400, `Only ${p.quantity} of ${p.name} in stock`)
    return { productId: p.id, name: p.name, qty, priceKobo: Number(p.price_kobo), image: p.image || '' }
  })
  const total = items.reduce((s, i) => s + i.priceKobo * i.qty, 0)
  return { items, total }
}

// ── Customer ──
export async function myPlans(req, res) {
  const user = await requireUser(req)
  const rows = await sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.user_id = ${user.id} order by f.created_at desc limit 20`
  send(res, 200, { plans: rows.map((r) => planView(r)), rules: { minWeeks: FLEX.minWeeks, maxWeeks: FLEX.maxWeeks, refundPercent: FLEX.refundPercent, pendingDays: FLEX.pendingDays, termsVersion: FLEX.termsVersion } })
}

/** Creates a plan for `user`. A customer does it from their cart; staff can do it for a client in the salon. */
async function buildPlan(user, b, byStaff = null) {
  const weeks = Number(b.weeks)
  if (!Number.isInteger(weeks) || weeks < FLEX.minWeeks || weeks > FLEX.maxWeeks) {
    throw new HttpError(400, `Choose a plan length between ${FLEX.minWeeks} weeks and ${FLEX.maxWeeks} weeks (about 5 months)`)
  }
  if (b.acceptTerms !== true) throw new HttpError(400, byStaff ? 'Confirm that the client has read and agreed to the FlexPay terms' : 'Please read and accept the FlexPay terms')
  const key = text(b.idempotencyKey, 'Request id', { required: true, max: 80 })
  const { items, total } = await loadItems(b.items)

  const open = await sql`select count(*)::int as n from flexpay_plans where user_id = ${user.id} and status = any(${OPEN}::text[])`
  if (open[0].n >= FLEX.maxOpenPlans) throw new HttpError(400, `${byStaff ? 'This client can' : 'You can'} have up to ${FLEX.maxOpenPlans} plans running at once. Finish or cancel one first.`)

  const ins = await sql`insert into flexpay_plans (user_id, items, total_kobo, weeks, terms_version, idempotency_key)
    values (${user.id}, ${JSON.stringify(items)}::jsonb, ${total}, ${weeks}, ${FLEX.termsVersion}, ${key})
    on conflict (idempotency_key) do nothing returning id`
  if (!ins.length) return null
  const id = ins[0].id
  const first = splitInstalments(total, weeks)[0]
  await logActivity(byStaff?.id ?? user.id, 'flexpay.created', 'flexpay', id, { totalKobo: total, weeks, forCustomerId: user.id, byStaff: !!byStaff })
  await notifyUser(user.id, {
    type: 'payment', title: 'FlexPay plan created',
    body: `${money(total)} over ${weeks} weeks. Pay your first ${money(first)} at the salon within ${FLEX.pendingDays} days to start the plan and hold your items.`, url: '/account',
  })
  if (!byStaff) await notifyStaff({ type: 'payment', title: 'New FlexPay plan', body: `${user.name}: ${money(total)} over ${weeks} weeks. First payment ${money(first)} expected.`, url: '/admin' })
  const row = (await sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.id = ${id}`)[0]
  return planView(row)
}

export async function createPlan(req, res) {
  const user = await requireUser(req, ['customer'])
  const plan = await buildPlan(user, body(req))
  if (!plan) return send(res, 200, { duplicate: true })
  send(res, 201, { plan })
}

/** Staff start a plan for a client who is in the salon (including walk-in clients without an account). */
export async function staffCreatePlan(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const b = body(req)
  const cid = uuid(b.customerId, 'client')
  const user = (await sql`select id, name from users where id = ${cid} and role = 'customer' and is_active = true`)[0]
  if (!user) throw new HttpError(404, 'Client not found')
  const plan = await buildPlan(user, b, staff)
  if (!plan) return send(res, 200, { duplicate: true })
  send(res, 201, { plan })
}

/** The customer drops a plan that has no payment yet. */
export async function cancelPlan(req, res) {
  const user = await requireUser(req)
  const id = uuid(req.params.id)
  const done = await sql`update flexpay_plans f set status = 'cancelled'
    where f.id = ${id} and f.user_id = ${user.id} and f.status = 'pending' and flexpay_paid(f.id) = 0 returning f.id`
  if (!done.length) throw new HttpError(409, 'This plan can no longer be cancelled here. If you have already paid, use "Stop this plan".')
  await logActivity(user.id, 'flexpay.cancelled', 'flexpay', id, {})
  send(res, 200, { ok: true })
}

/** The customer asks to stop a running plan. A manager decides; 80% of what was paid is refunded. */
export async function requestStop(req, res) {
  const user = await requireUser(req)
  const id = uuid(req.params.id)
  const reason = text(body(req).reason, 'Reason', { required: true, max: 300 })
  if (reason.length < 3) throw new HttpError(400, 'Please tell us briefly why')
  const done = await sql`update flexpay_plans f set stop_requested_at = now(), stop_reason = ${reason}
    where f.id = ${id} and f.user_id = ${user.id} and f.status = 'active' and f.stop_requested_at is null and flexpay_paid(f.id) > 0
    returning f.id, flexpay_paid(f.id) as paid_kobo`
  if (!done.length) throw new HttpError(409, 'This plan cannot be stopped right now, or a stop request is already waiting.')
  const paid = Number(done[0].paid_kobo)
  await logActivity(user.id, 'flexpay.stop_requested', 'flexpay', id, { paidKobo: paid })
  await notifyStaff({ type: 'payment', title: 'FlexPay stop request', body: `${user.name} wants to stop a plan (${money(paid)} paid). Open the FlexPay tab to decide.`, url: '/admin' }, { managersOnly: true })
  send(res, 200, { ok: true, refundIfStopped: koboToNaira(Math.floor((paid * FLEX.refundPercent) / 100)) })
}

// ── Staff and manager ──
export async function listPlans(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const rows = await sql`select f.*, flexpay_paid(f.id) as paid_kobo, u.name as customer, u.phone
    from flexpay_plans f join users u on u.id = f.user_id
    order by (f.status in ('pending','active')) desc, (f.stop_requested_at is not null) desc, f.created_at desc limit 80`
  send(res, 200, { plans: rows.map((r) => ({ ...planView(r), customer: r.customer, phone: r.phone })) })
}

/** Open plans of one customer (for the Record Payment form). */
export async function customerPlans(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const cid = uuid(req.params.id, 'customer')
  const rows = await sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f
    where f.user_id = ${cid} and f.status = any(${OPEN}::text[]) order by f.created_at`
  send(res, 200, { plans: rows.map((r) => planView(r)) })
}

/** Swap products on a plan. The total is recalculated and the weekly instalments follow it. */
export async function swapItems(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const { items, total } = await loadItems(body(req).items)
  const [, upd] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'flex:' + id}))`,
    sql`update flexpay_plans f set items = ${JSON.stringify(items)}::jsonb, total_kobo = ${total}::bigint,
          status = case when ${total}::bigint <= flexpay_paid(f.id) then 'completed' else f.status end,
          completed_at = case when ${total}::bigint <= flexpay_paid(f.id) then now() else f.completed_at end
        where f.id = ${id}::uuid and f.status = any(${OPEN}::text[]) and ${total}::bigint >= flexpay_paid(f.id)
        returning f.id, f.user_id, f.status`,
  ])
  if (!upd.length) {
    const p = (await sql`select f.status, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.id = ${id}`)[0]
    if (!p) throw new HttpError(404, 'Plan not found')
    if (!OPEN.includes(p.status)) throw new HttpError(409, 'This plan is closed, so its items cannot be changed.')
    throw new HttpError(400, `The customer has already paid ${money(p.paid_kobo)}. Choose items worth at least that much.`)
  }
  await logActivity(staff.id, 'flexpay.items_changed', 'flexpay', id, { totalKobo: total })
  const row = (await sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.id = ${id}`)[0]
  const v = planView(row)
  await notifyUser(row.user_id, {
    type: 'payment', title: 'Your FlexPay plan was updated',
    body: row.status === 'completed'
      ? `New total ${formatPlain(v.total)}. You have already paid it all. Visit the salon to collect your items.`
      : `New total ${formatPlain(v.total)}. ${formatPlain(v.remaining)} left, about ${formatPlain(v.next?.amount ?? 0)} for your next instalment.`,
    url: '/account',
  })
  send(res, 200, { plan: v })
}
const formatPlain = (naira) => formatNaira(naira)

/** Staff hand over a fully paid package. */
export async function markCollected(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const done = await sql`update flexpay_plans set status = 'collected', collected_at = now()
    where id = ${id} and status = 'completed' returning id, user_id`
  if (!done.length) throw new HttpError(409, 'Only a fully paid plan can be marked as collected.')
  await logActivity(staff.id, 'flexpay.collected', 'flexpay', id, {})
  await notifyUser(done[0].user_id, { type: 'payment', title: 'Items collected', body: 'Thank you for choosing 22 Artistry. Your FlexPay plan is complete.', url: '/account' })
  send(res, 200, { ok: true })
}

/** Manager decides a stop request. Approving closes the plan; the refund is 80% of what was paid. */
export async function decideStop(req, res) {
  const manager = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const b = body(req)
  if (b.decision !== 'approve' && b.decision !== 'reject') throw new HttpError(400, 'Choose approve or reject')
  const note = text(b.note, 'Note', { max: 300 })
  if (b.decision === 'reject' && note.length < 3) throw new HttpError(400, 'Please give the customer a short reason')
  const [, upd] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'flex:' + id}))`,
    b.decision === 'approve'
      ? sql`update flexpay_plans f set status = 'stopped', decided_by = ${manager.id}::uuid, decided_at = now(), decision_note = ${note}::text,
              refund_kobo = floor(flexpay_paid(f.id) * ${FLEX.refundPercent}::bigint / 100)
            where f.id = ${id}::uuid and f.status = 'active' and f.stop_requested_at is not null returning f.user_id, f.refund_kobo, flexpay_paid(f.id) as paid_kobo`
      : sql`update flexpay_plans f set stop_requested_at = null, decided_by = ${manager.id}::uuid, decided_at = now(), decision_note = ${note}::text
            where f.id = ${id}::uuid and f.status = 'active' and f.stop_requested_at is not null returning f.user_id, null::bigint as refund_kobo, flexpay_paid(f.id) as paid_kobo`,
  ])
  if (!upd.length) throw new HttpError(409, 'There is no waiting stop request on this plan.')
  const r = upd[0]
  await logActivity(manager.id, `flexpay.stop_${b.decision}d`, 'flexpay', id, { paidKobo: Number(r.paid_kobo), refundKobo: r.refund_kobo == null ? null : Number(r.refund_kobo) })
  await notifyUser(r.user_id, b.decision === 'approve'
    ? { type: 'payment', title: 'FlexPay plan stopped', body: `Your plan was stopped. ${money(r.refund_kobo)} (${FLEX.refundPercent}% of the ${money(r.paid_kobo)} you paid) will be returned to you by cash or bank transfer.${note ? ' Note: ' + note : ''}`, url: '/account' }
    : { type: 'payment', title: 'Stop request declined', body: `Your plan continues as before. Reason: ${note}`, url: '/account' })
  send(res, 200, { ok: true, refund: r.refund_kobo == null ? null : koboToNaira(r.refund_kobo) })
}

// ── Called by payments.js ──
/** After a plan instalment: tell the customer when the plan starts or completes. */
export async function flexAfterPayment(planId, userId, before, after) {
  try {
    if (before === 'pending' && after === 'active') {
      await notifyUser(userId, { type: 'payment', title: 'FlexPay plan started', body: 'Your first payment is in. Your items are now held for you until the plan is fully paid.', url: '/account' })
    }
    if (after === 'completed') {
      await notifyUser(userId, { type: 'payment', title: 'FlexPay fully paid', body: 'You have paid in full. Visit the salon to collect your items.', url: '/account' })
      const who = (await sql`select name from users where id = ${userId}`)[0]?.name || 'A customer'
      await notifyStaff({ type: 'payment', title: 'FlexPay fully paid', body: `${who} finished a plan. Their items are ready to hand over.`, url: '/admin' })
    }
  } catch (e) { console.error('flexAfterPayment failed', planId, e) }
}

/** A manager reversed an instalment: a completed plan is open again. */
export async function flexAfterReversal(planId) {
  try {
    await sql`update flexpay_plans f set status = 'active', completed_at = null
      where f.id = ${planId} and f.status = 'completed' and flexpay_paid(f.id) < f.total_kobo`
  } catch (e) { console.error('flexAfterReversal failed', planId, e) }
}

// ── Daily job (Vercel cron) ──
export async function flexpayJob(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers?.authorization !== `Bearer ${secret}`) throw new HttpError(401, 'Not allowed')
  const today = lagosToday()
  let expired = 0, reminded = 0

  const gone = await sql`update flexpay_plans set status = 'cancelled'
    where status = 'pending' and created_at < now() - (${FLEX.pendingDays}::int * interval '1 day') returning user_id`
  for (const g of gone) {
    expired++
    await notifyUser(g.user_id, { type: 'payment', title: 'FlexPay plan expired', body: `Your plan was cancelled because no first payment was made within ${FLEX.pendingDays} days. You can start a new one any time.`, url: '/account' })
  }

  const rows = await sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.status = 'active' and f.start_date is not null`
  const tomorrow = addDays(today, 1)
  for (const r of rows) {
    const v = planView(r, today)
    if (!v.next) continue
    const last = r.last_reminded_on ? String(r.last_reminded_on).slice(0, 10) : null
    let msg = null
    if (v.next.date < today || v.next.date === today) {
      if (!last || last <= addDays(today, -3)) {
        msg = { title: v.next.date < today ? 'FlexPay payment overdue' : 'FlexPay payment due today',
          body: `${formatPlain(v.behindBy)} is due on your plan. There are no late fees. Pay at the salon when you can.` }
      }
    } else if (v.next.date === tomorrow && last !== today) {
      msg = { title: 'FlexPay payment due tomorrow', body: `${formatPlain(v.next.amount)} is due tomorrow on your plan.` }
    }
    if (!msg) continue
    await sql`update flexpay_plans set last_reminded_on = ${today}::date where id = ${r.id}`
    await notifyUser(r.user_id, { type: 'payment', ...msg, url: '/account' })
    reminded++
  }
  send(res, 200, { expired, reminded })
}
