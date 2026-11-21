import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, HttpError } from '../http.js'
import { koboToNaira } from '../money.js'
import { notifyUser } from '../notify.js'
import {
  LOYALTY, MAX_REFERRAL_BPS, getReferralRateBps, pointsBalance, rewardsSummary, applyRewardsForPayment,
} from '../rewards.js'

/** The logged-in customer's own points, wallet and referral picture. */
export async function myRewards(req, res) {
  const user = await requireUser(req)
  send(res, 200, await rewardsSummary(user.id))
}

/** Staff look up one customer's rewards (to redeem a free treatment or answer a question). */
export async function customerRewards(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id, 'customer')
  const c = (await sql`select id, name, phone from users where id = ${id} and role = 'customer'`)[0]
  if (!c) throw new HttpError(404, 'Customer not found')
  send(res, 200, { customer: c, rewards: await rewardsSummary(id) })
}

/** Staff redeem one free hair treatment (costs 5 points). A retry can never charge points twice. */
export async function redeemTreatment(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const b = body(req)
  const uid = uuid(b.customerId, 'customer')
  const key = text(b.idempotencyKey, 'Request id', { required: true, max: 80 })
  const note = text(b.note, 'Note', { max: 200 })
  const c = (await sql`select id, name from users where id = ${uid} and role = 'customer'`)[0]
  if (!c) throw new HttpError(404, 'Customer not found')
  const need = LOYALTY.freeTreatmentPoints

  const [, ins] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'loyalty:' + uid}))`,
    sql`with enough as (
          select 1 where (select coalesce(sum(points), 0) from points_ledger where user_id = ${uid}::uuid) >= ${need}::int),
        red as (
          insert into treatment_redemptions (user_id, points_spent, note, staff_id, idempotency_key)
          select ${uid}::uuid, ${need}::int, ${note}::text, ${staff.id}::uuid, ${key}::text from enough
          on conflict (idempotency_key) do nothing returning id)
        insert into points_ledger (user_id, points, reason, note, created_by)
        select ${uid}::uuid, ${-need}::int, 'redeem', 'Free hair treatment', ${staff.id}::uuid from red returning id`,
  ])
  if (!ins.length) {
    const dup = await sql`select id from treatment_redemptions where idempotency_key = ${key}`
    if (dup.length) return send(res, 200, { duplicate: true, rewards: await rewardsSummary(uid) })
    throw new HttpError(400, `${c.name.split(' ')[0]} needs ${need} points for a free treatment and doesn't have enough yet.`)
  }
  await logActivity(staff.id, 'rewards.treatment_redeemed', 'user', uid, { points: need })
  const left = await pointsBalance(uid)
  await notifyUser(uid, {
    type: 'reward', title: 'Free hair treatment redeemed',
    body: `Enjoy your treatment! You have ${left} point${left === 1 ? '' : 's'} left.`, url: '/account',
  })
  send(res, 201, { rewards: await rewardsSummary(uid) })
}

/** Manager: current settings, recent rewards and redemptions. */
export async function rewardsOverview(req, res) {
  await requireUser(req, ['manager'])
  const [rate, rewards, redemptions, totals] = await Promise.all([
    getReferralRateBps(),
    sql`select w.type, w.amount_kobo, w.rate_bps, w.created_at, r.name as referrer, s.name as friend, p.receipt_no
        from wallet_ledger w
        join users r on r.id = w.user_id
        left join users s on s.id = w.source_user_id
        left join payments p on p.id = w.payment_id
        where w.type in ('referral_reward','referral_reversal')
        order by w.created_at desc limit 30`,
    sql`select t.points_spent, t.note, t.created_at, u.name as customer, st.name as staff
        from treatment_redemptions t join users u on u.id = t.user_id join users st on st.id = t.staff_id
        order by t.created_at desc limit 30`,
    sql`select
          (select coalesce(sum(amount_kobo), 0)::bigint from wallet_ledger where type in ('referral_reward','referral_reversal')) as rewards_paid,
          (select coalesce(sum(amount_kobo), 0)::bigint from wallet_ledger) as wallet_total,
          (select count(*)::int from treatment_redemptions) as redeemed`,
  ])
  send(res, 200, {
    referralRatePercent: rate / 100,
    maxPercent: MAX_REFERRAL_BPS / 100,
    totals: { referralRewardsNet: koboToNaira(totals[0].rewards_paid), walletHeldByCustomers: koboToNaira(totals[0].wallet_total), treatmentsRedeemed: totals[0].redeemed },
    rewards: rewards.map((r) => ({
      type: r.type, amount: koboToNaira(r.amount_kobo), ratePercent: r.rate_bps ? r.rate_bps / 100 : null,
      referrer: r.referrer, friend: r.friend, receiptNo: r.receipt_no, createdAt: new Date(r.created_at).toISOString(),
    })),
    redemptions: redemptions.map((r) => ({ customer: r.customer, staff: r.staff, note: r.note, createdAt: new Date(r.created_at).toISOString() })),
  })
}

/** Manager: change the referral percentage. Applies only to payments recorded from now on. */
export async function setRewardsSettings(req, res) {
  const manager = await requireUser(req, ['manager'])
  const raw = body(req).referralRatePercent
  const pct = Number(raw)
  if (raw === '' || raw === null || raw === undefined || !Number.isFinite(pct) || pct < 0 || pct > MAX_REFERRAL_BPS / 100) {
    throw new HttpError(400, `Enter a percentage between 0 and ${MAX_REFERRAL_BPS / 100}`)
  }
  const bps = Math.round(pct * 100)
  if (Math.abs(pct * 100 - bps) > 1e-6) throw new HttpError(400, 'Use at most 2 decimal places, for example 4 or 3.5')
  const before = await getReferralRateBps()
  await sql`insert into settings (key, value, updated_by, updated_at) values ('referral_rate_bps', ${String(bps)}, ${manager.id}, now())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`
  await logActivity(manager.id, 'rewards.referral_rate_changed', 'settings', 'referral_rate_bps', { fromBps: before, toBps: bps })
  send(res, 200, { referralRatePercent: bps / 100 })
}

/** Manager safety valve: re-run the rewards for one payment. Safe to repeat (nothing is paid twice). */
export async function recalcPayment(req, res) {
  const manager = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const p = (await sql`select id, status from payments where id = ${id}`)[0]
  if (!p) throw new HttpError(404, 'Payment not found')
  if (p.status !== 'confirmed') throw new HttpError(409, 'Only confirmed payments earn rewards')
  const out = await applyRewardsForPayment(id, manager.id)
  send(res, 200, { rewards: { ...out, referralReward: koboToNaira(out.referralRewardKobo) } })
}
