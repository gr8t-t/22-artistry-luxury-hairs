import { sql } from '../db.js'
import { requireUser } from '../auth.js'
import { send } from '../http.js'
import { koboToNaira } from '../money.js'
import { planView, lagosToday, addDays } from './flexpay.js'
import { LOW_STOCK } from './orders.js'

const DAY = 86400000
const PERIODS = ['today', 'week', 'month']

/**
 * Manager overview. "Money in" is cash, POS and transfer actually received (including Hair Wallet top-ups).
 * Paying from the Hair Wallet is NOT new money, because it was counted when the customer topped up.
 * All day boundaries are Lagos time.
 */
export async function reports(req, res) {
  await requireUser(req, ['manager'])
  const period = PERIODS.includes(req.query?.period) ? req.query.period : 'month'

  const marks = (await sql`select (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos') as today_start,
      (date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos') as month_start`)[0]
  const todayStart = new Date(marks.today_start)
  const start = period === 'today' ? todayStart : period === 'week' ? new Date(todayStart.getTime() - 6 * DAY) : new Date(marks.month_start)
  const since = start.toISOString()
  const seriesSince = new Date(todayStart.getTime() - 13 * DAY).toISOString()

  const [methods, purposes, series, reversed, staff, customers, orderRows, top, bookingRows, referral, redeemed,
    wallet, openPlans, readyPlans, stopReqs, refunds, waitingOrders, pendingBookings, lowStock] = await Promise.all([
    sql`select method, coalesce(sum(amount_kobo), 0)::bigint as total, count(*)::int as n from payments
        where status = 'confirmed' and created_at >= ${since}::timestamptz group by method`,
    sql`select purpose, coalesce(sum(amount_kobo), 0)::bigint as total, count(*)::int as n from payments
        where status = 'confirmed' and method <> 'wallet' and created_at >= ${since}::timestamptz group by purpose order by 2 desc`,
    sql`select (created_at at time zone 'Africa/Lagos')::date::text as d, coalesce(sum(amount_kobo), 0)::bigint as total from payments
        where status = 'confirmed' and method <> 'wallet' and created_at >= ${seriesSince}::timestamptz group by 1`,
    sql`select count(*)::int as n, coalesce(sum(amount_kobo), 0)::bigint as total from payments
        where status = 'reversed' and reversed_at >= ${since}::timestamptz`,
    sql`select r.name, count(*)::int as n, coalesce(sum(p.amount_kobo) filter (where p.method <> 'wallet'), 0)::bigint as total
        from payments p join users r on r.id = p.recorded_by
        where p.status = 'confirmed' and p.created_at >= ${since}::timestamptz group by r.id, r.name order by 3 desc, 2 desc`,
    sql`select count(*) filter (where not is_walkin)::int as online, count(*) filter (where is_walkin)::int as walkin
        from users where role = 'customer' and created_at >= ${since}::timestamptz`,
    sql`select status, count(*)::int as n from orders where created_at >= ${since}::timestamptz group by status`,
    sql`select x->>'name' as name, sum((x->>'qty')::int)::int as qty, sum((x->>'priceKobo')::bigint * (x->>'qty')::int)::bigint as value
        from orders o, jsonb_array_elements(o.items) x
        where o.status in ('confirmed','ready','completed') and o.created_at >= ${since}::timestamptz
        group by 1 order by 2 desc, 3 desc limit 5`,
    sql`select status, count(*)::int as n from bookings where created_at >= ${since}::timestamptz group by status`,
    sql`select coalesce(sum(amount_kobo), 0)::bigint as total from wallet_ledger
        where type in ('referral_reward','referral_reversal') and created_at >= ${since}::timestamptz`,
    sql`select count(*)::int as n from treatment_redemptions where created_at >= ${since}::timestamptz`,
    sql`select coalesce(sum(amount_kobo), 0)::bigint as total from wallet_ledger`,
    sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.status in ('pending','active')`,
    sql`select count(*)::int as n from flexpay_plans where status = 'completed'`,
    sql`select count(*)::int as n from flexpay_plans where status = 'active' and stop_requested_at is not null`,
    sql`select count(*)::int as n, coalesce(sum(amount_kobo), 0)::bigint as total from wallet_refund_requests where status = 'pending'`,
    sql`select count(*)::int as n from orders where status = 'new'`,
    sql`select count(*)::int as n from bookings where status = 'pending'`,
    sql`select name, quantity from products where quantity <= ${LOW_STOCK} order by quantity, name limit 10`,
  ])

  const byMethod = Object.fromEntries(methods.map((m) => [m.method, { amount: koboToNaira(m.total), count: m.n }]))
  const money = (m) => (byMethod[m] ? byMethod[m].amount : 0)
  const moneyIn = money('cash') + money('pos') + money('transfer')

  const seriesMap = new Map(series.map((s) => [s.d, Number(s.total)]))
  const today = lagosToday()
  const daily = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13)
    return { date, amount: koboToNaira(seriesMap.get(date) || 0) }
  })

  // FlexPay: how much is still owed, and who is behind (uses the same schedule the customer sees)
  const views = openPlans.map((p) => planView(p, today))
  const outstanding = views.reduce((s, v) => s + v.remaining, 0)
  const behind = views.filter((v) => v.behindBy > 0 && v.status === 'active')

  const statusCount = (rows) => Object.fromEntries(rows.map((r) => [r.status, r.n]))
  const orderStatus = statusCount(orderRows)
  const bookingStatus = statusCount(bookingRows)

  send(res, 200, {
    period,
    since,
    moneyIn: {
      total: Math.round(moneyIn * 100) / 100,
      cash: money('cash'), pos: money('pos'), transfer: money('transfer'),
      byPurpose: purposes.map((p) => ({ purpose: p.purpose, amount: koboToNaira(p.total), count: p.n })),
    },
    walletSpent: byMethod.wallet || { amount: 0, count: 0 },
    payments: methods.reduce((s, m) => s + m.n, 0),
    reversed: { count: reversed[0].n, amount: koboToNaira(reversed[0].total) },
    daily,
    staff: staff.map((s) => ({ name: s.name, count: s.n, amount: koboToNaira(s.total) })),
    newCustomers: { online: customers[0].online, inSalon: customers[0].walkin },
    orders: { byStatus: orderStatus, total: orderRows.reduce((s, r) => s + r.n, 0) },
    topProducts: top.map((t) => ({ name: t.name, qty: t.qty, value: koboToNaira(t.value) })),
    bookings: { byStatus: bookingStatus, total: bookingRows.reduce((s, r) => s + r.n, 0) },
    rewards: { referralPaid: koboToNaira(referral[0].total), treatmentsRedeemed: redeemed[0].n },
    now: {
      walletHeld: koboToNaira(wallet[0].total),
      flexpay: {
        open: views.length,
        outstanding: Math.round(outstanding * 100) / 100,
        waitingFirstPayment: views.filter((v) => v.status === 'pending').length,
        behindCount: behind.length,
        behindAmount: Math.round(behind.reduce((s, v) => s + v.behindBy, 0) * 100) / 100,
        readyToCollect: readyPlans[0].n,
        stopRequests: stopReqs[0].n,
      },
      refunds: { count: refunds[0].n, amount: koboToNaira(refunds[0].total) },
      ordersWaiting: waitingOrders[0].n,
      bookingsPending: pendingBookings[0].n,
      lowStock: lowStock.map((p) => ({ name: p.name, quantity: p.quantity })),
      lowStockLimit: LOW_STOCK,
    },
  })
}
