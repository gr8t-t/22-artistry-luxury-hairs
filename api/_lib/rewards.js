// Loyalty points, referral rewards and the Hair Wallet ledger.
// All money is integer kobo. Every operation is idempotent so a retry can never pay twice.
import { sql, logActivity } from './db.js'
import { notifyUser } from './notify.js'
import { formatNaira, koboToNaira } from './money.js'

export const LOYALTY = {
  // A day's spend must be MORE than this to reach the tier (₦100,000 and ₦1,000,000 in kobo)
  tier5Kobo: 10_000_000,
  tier10Kobo: 100_000_000,
  freeTreatmentPoints: 5,
}
export const DEFAULT_REFERRAL_BPS = 400 // 4%
export const MAX_REFERRAL_BPS = 2000    // manager can set up to 20%

export const treatmentsFor = (points) => Math.floor(Math.max(0, points) / LOYALTY.freeTreatmentPoints)

export async function getReferralRateBps() {
  const r = await sql`select value from settings where key = 'referral_rate_bps'`
  const n = r[0] ? parseInt(r[0].value, 10) : DEFAULT_REFERRAL_BPS
  return Number.isInteger(n) && n >= 0 && n <= MAX_REFERRAL_BPS ? n : DEFAULT_REFERRAL_BPS
}

export async function pointsBalance(userId) {
  const r = await sql`select coalesce(sum(points), 0)::int as n from points_ledger where user_id = ${userId}`
  return r[0].n
}

export async function walletBalanceKobo(userId) {
  const r = await sql`select coalesce(sum(amount_kobo), 0)::bigint as n from wallet_ledger where user_id = ${userId}`
  return Number(r[0].n)
}

const firstName = (n) => String(n || 'your friend').trim().split(/\s+/)[0]

/**
 * Re-works the loyalty points for the customer's DAY of this payment.
 * Day total > ₦100,000 = 5 points, > ₦1,000,000 = 10, anything else paid = 1.
 * Only the difference from what was already awarded is added (or removed after a reversal).
 */
export async function recomputeVisitPoints(paymentId) {
  const p = (await sql`select customer_id, (created_at at time zone 'Africa/Lagos')::date::text as day
    from payments where id = ${paymentId}`)[0]
  if (!p?.customer_id) return { diff: 0, total: null, unlocked: false }
  const uid = p.customer_id
  const [, ins] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'loyalty:' + uid}))`,
    sql`with spend as (
          select coalesce(sum(amount_kobo), 0)::bigint as total from payments
          where customer_id = ${uid}::uuid and status = 'confirmed'
            and (created_at at time zone 'Africa/Lagos')::date = ${p.day}::date),
        target as (
          select case when total > ${LOYALTY.tier10Kobo}::bigint then 10
                      when total > ${LOYALTY.tier5Kobo}::bigint then 5
                      when total > 0 then 1 else 0 end as pts from spend),
        awarded as (
          select coalesce(sum(points), 0)::int as pts from points_ledger
          where user_id = ${uid}::uuid and reason = 'visit' and day = ${p.day}::date)
        insert into points_ledger (user_id, points, reason, day, payment_id, note)
        select ${uid}::uuid, t.pts - a.pts, 'visit', ${p.day}::date, ${paymentId}::uuid,
               case when t.pts > a.pts then 'Visit points' else 'Visit points adjusted' end
        from target t, awarded a where t.pts <> a.pts
        returning points`,
  ])
  const diff = ins[0]?.points ?? 0
  const total = await pointsBalance(uid)
  const unlocked = diff > 0 && treatmentsFor(total) > treatmentsFor(total - diff)
  return { diff, total, unlocked, userId: uid }
}

/** Pays the referrer their percentage of this payment (once). Returns the reward in kobo, or 0. */
export async function applyReferralReward(paymentId) {
  const p = (await sql`select p.id, p.amount_kobo, p.status, p.method, p.customer_id, u.referred_by, u.name as payer_name
    from payments p join users u on u.id = p.customer_id where p.id = ${paymentId}`)[0]
  // Only real money in counts: spending Hair Wallet credit never earns another reward.
  if (!p || !p.referred_by || p.status !== 'confirmed' || p.method === 'wallet') return 0
  const rate = await getReferralRateBps()
  const reward = Math.floor((Number(p.amount_kobo) * rate) / 10000)
  if (reward < 1) return 0
  const ins = await sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, source_user_id, rate_bps, note)
    values (${p.referred_by}, ${reward}, 'referral_reward', ${paymentId}, ${p.customer_id}, ${rate}, 'Referral reward')
    on conflict (payment_id, type) where payment_id is not null do nothing returning id`
  if (!ins.length) return 0
  await notifyUser(p.referred_by, {
    type: 'reward', title: `Referral reward: ${formatNaira(koboToNaira(reward))}`,
    body: `${firstName(p.payer_name)} just paid at the salon. ${rate / 100}% was added to your Hair Wallet.`, url: '/account',
  })
  return reward
}

/** Everything that follows a confirmed payment. Never throws: the payment itself is already safe. */
export async function applyRewardsForPayment(paymentId, actorId = null) {
  const out = { points: 0, totalPoints: null, unlockedFreeTreatment: false, referralRewardKobo: 0 }
  try {
    const pts = await recomputeVisitPoints(paymentId)
    out.points = pts.diff
    out.totalPoints = pts.total
    out.unlockedFreeTreatment = !!pts.unlocked
    if (pts.userId && pts.diff > 0) {
      await notifyUser(pts.userId, {
        type: 'reward',
        title: pts.unlocked ? 'Free hair treatment unlocked' : `You earned ${pts.diff} point${pts.diff > 1 ? 's' : ''}`,
        body: pts.unlocked
          ? `You now have ${pts.total} points. Visit the salon to claim your free hair treatment.`
          : `You now have ${pts.total} point${pts.total === 1 ? '' : 's'}. Every ${LOYALTY.freeTreatmentPoints} points is a free hair treatment.`,
        url: '/account',
      })
    }
    out.referralRewardKobo = await applyReferralReward(paymentId)
  } catch (e) {
    console.error('rewards failed for payment', paymentId, e)
    await logActivity(actorId, 'rewards.failed', 'payment', paymentId, { error: String(e.message).slice(0, 200) })
  }
  return out
}

/** Called after a manager reverses a payment: take back its points, its referral reward, and refund wallet spend. */
export async function undoRewardsForPayment(paymentId) {
  try {
    const p = (await sql`select id, amount_kobo, method, customer_id, receipt_no from payments where id = ${paymentId}`)[0]
    if (!p) return
    // 1. referral reward -> reversal (once)
    const rw = (await sql`select user_id, amount_kobo, source_user_id from wallet_ledger where payment_id = ${paymentId} and type = 'referral_reward'`)[0]
    if (rw) {
      const ins = await sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, source_user_id, note)
        values (${rw.user_id}, ${-Number(rw.amount_kobo)}, 'referral_reversal', ${paymentId}, ${rw.source_user_id}, 'Payment was reversed')
        on conflict (payment_id, type) where payment_id is not null do nothing returning id`
      if (ins.length) {
        await notifyUser(rw.user_id, {
          type: 'reward', title: 'Referral reward reversed',
          body: `${formatNaira(koboToNaira(rw.amount_kobo))} was taken back because the payment (${p.receipt_no}) was reversed.`, url: '/account',
        })
      }
    }
    // 2. Hair Wallet payment -> refund the balance (once)
    if (p.method === 'wallet' && p.customer_id) {
      await sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, note)
        values (${p.customer_id}, ${Number(p.amount_kobo)}, 'wallet_refund', ${paymentId}, 'Payment was reversed')
        on conflict (payment_id, type) where payment_id is not null do nothing`
    }
    // 3. loyalty points for that day
    const pts = await recomputeVisitPoints(paymentId)
    if (pts.userId && pts.diff < 0) {
      await notifyUser(pts.userId, {
        type: 'reward', title: 'Points adjusted',
        body: `${-pts.diff} point${pts.diff === -1 ? '' : 's'} removed because a payment was reversed. You now have ${pts.total}.`, url: '/account',
      })
    }
  } catch (e) {
    console.error('undo rewards failed', paymentId, e)
    await logActivity(null, 'rewards.undo_failed', 'payment', paymentId, { error: String(e.message).slice(0, 200) })
  }
}

/** One customer's whole rewards picture (used by their Account page and by staff). */
export async function rewardsSummary(userId) {
  const [points, wallet, friends, earned, activity, redeemed] = await Promise.all([
    pointsBalance(userId),
    walletBalanceKobo(userId),
    sql`select count(*)::int as n from users where referred_by = ${userId}`,
    sql`select coalesce(sum(amount_kobo), 0)::bigint as n from wallet_ledger where user_id = ${userId} and type in ('referral_reward','referral_reversal')`,
    sql`(select 'points' as kind, points::bigint as amount, reason as type, note, created_at from points_ledger where user_id = ${userId})
        union all
        (select 'wallet', w.amount_kobo, w.type, coalesce(u.name, w.note), w.created_at
           from wallet_ledger w left join users u on u.id = w.source_user_id where w.user_id = ${userId})
        order by created_at desc limit 25`,
    sql`select count(*)::int as n from treatment_redemptions where user_id = ${userId}`,
  ])
  const rate = await getReferralRateBps()
  return {
    points,
    freeTreatments: treatmentsFor(points),
    pointsToNext: points >= 0 ? LOYALTY.freeTreatmentPoints - (points % LOYALTY.freeTreatmentPoints) : LOYALTY.freeTreatmentPoints,
    pointsPerTreatment: LOYALTY.freeTreatmentPoints,
    treatmentsRedeemed: redeemed[0].n,
    wallet: koboToNaira(wallet),
    referral: {
      ratePercent: rate / 100,
      friends: friends[0].n,
      earned: koboToNaira(earned[0].n),
    },
    activity: activity.map((a) => ({
      kind: a.kind,
      amount: a.kind === 'wallet' ? koboToNaira(a.amount) : Number(a.amount),
      type: a.type,
      note: a.note,
      createdAt: new Date(a.created_at).toISOString(),
    })),
  }
}
