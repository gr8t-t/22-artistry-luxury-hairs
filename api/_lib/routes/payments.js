import crypto from 'node:crypto'
import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, normalizePhone, HttpError } from '../http.js'
import { nairaToKobo, koboToNaira, formatNaira, MAX_PAYMENT_KOBO } from '../money.js'
import { notifyUser } from '../notify.js'
import { applyRewardsForPayment, undoRewardsForPayment } from '../rewards.js'
import { checkGoalReached, walletFigures } from './wallet.js'
import { flexAfterPayment, flexAfterReversal } from './flexpay.js'
import { orderAfterPayment } from './orders.js'

const PURPOSES = ['service', 'product', 'booking_deposit', 'wallet_topup', 'flexpay_instalment', 'other']
const METHODS = ['cash', 'pos', 'transfer', 'wallet']
const PURPOSE_TEXT = { service: 'service', product: 'product purchase', booking_deposit: 'booking deposit', wallet_topup: 'Hair Wallet top-up', flexpay_instalment: 'FlexPay instalment', other: 'payment' }

export const mapPayment = (p) => ({
  id: p.id,
  receiptNo: p.receipt_no,
  customerId: p.customer_id,
  customerName: p.customer_name,
  customerPhone: p.customer_phone,
  purpose: p.purpose,
  description: p.description,
  amount: koboToNaira(p.amount_kobo),
  method: p.method,
  reference: p.reference,
  bookingId: p.booking_id,
  status: p.status,
  recordedBy: p.recorder_name,
  createdAt: new Date(p.created_at).toISOString(),
  reversedAt: p.reversed_at ? new Date(p.reversed_at).toISOString() : null,
  reverseReason: p.reverse_reason,
})

async function getPayment(id) {
  const rows = await sql`select p.*, r.name as recorder_name
    from payments p join users r on r.id = p.recorded_by where p.id = ${id}`
  return rows[0] ? mapPayment(rows[0]) : null
}

/** Staff type a customer's name or phone to find their account. */
export async function searchCustomers(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const q = String(req.params?.q || '').trim().slice(0, 40)
  if (q.length < 2) return send(res, 200, { customers: [] })
  const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%'
  const digits = q.replace(/\D/g, '')
  const phoneLike = digits.length >= 3 ? '%' + digits.replace(/^0/, '') + '%' : like
  const rows = await sql`select id, name, phone, email from users
    where role = 'customer' and is_active = true and (name ilike ${like} or phone like ${phoneLike} or email ilike ${like})
    order by name limit 8`
  send(res, 200, { customers: rows })
}

export async function recordPayment(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const b = body(req)

  const kobo = nairaToKobo(b.amount)
  if (!kobo || kobo < 100) throw new HttpError(400, 'Enter a valid amount (at least ₦1)')
  if (kobo > MAX_PAYMENT_KOBO) throw new HttpError(400, 'That amount is above the single-entry limit. Please check it.')
  if (!PURPOSES.includes(b.purpose)) throw new HttpError(400, 'Choose what the payment is for')
  if (!METHODS.includes(b.method)) throw new HttpError(400, 'Choose cash, POS, transfer or Hair Wallet')
  const key = text(b.idempotencyKey, 'Request id', { required: true, max: 80 })
  const description = text(b.description, 'Description', { max: 300 })
  const reference = text(b.reference, 'Reference', { max: 80 })

  let customer = null
  if (b.customerId) {
    const r = await sql`select id, name, phone from users where id = ${uuid(b.customerId, 'customer')} and role = 'customer'`
    if (!r.length) throw new HttpError(400, 'That customer account was not found')
    customer = r[0]
  }
  let name = customer?.name
  let phone = customer?.phone ?? null
  if (!customer) {
    name = text(b.customerName, 'Customer name', { required: true, max: 120 })
    if (b.customerPhone) {
      phone = normalizePhone(b.customerPhone)
      if (!phone) throw new HttpError(400, 'Enter a valid Nigerian phone number, or leave it empty')
      const match = await sql`select id, name, phone from users where phone = ${phone} and role = 'customer'`
      if (match.length) { customer = match[0]; name = customer.name }
    }
  }

  let bookingId = null
  if (b.bookingId) {
    bookingId = uuid(b.bookingId, 'booking')
    const bk = await sql`select id from bookings where id = ${bookingId}`
    if (!bk.length) throw new HttpError(400, 'That booking was not found')
  }

  // The unique idempotency key means a double-tap or retry can never record the money twice.
  if (b.purpose === 'wallet_topup') {
    if (b.method === 'wallet') throw new HttpError(400, 'A top-up must be paid with cash, POS or transfer, not from the wallet itself')
    if (!customer) throw new HttpError(400, 'Hair Wallet top-ups need a registered customer')
  }

  // FlexPay: the plan must belong to this customer, be open, and the amount can never exceed what is left.
  let flexPlan = null
  let flexAfter = null
  if (b.purpose === 'flexpay_instalment') {
    if (!customer) throw new HttpError(400, 'FlexPay instalments need a registered customer')
    const planId = uuid(b.planId, 'plan')
    const pr = (await sql`select f.id, f.status, f.total_kobo, flexpay_paid(f.id) as paid_kobo from flexpay_plans f
      where f.id = ${planId} and f.user_id = ${customer.id}`)[0]
    if (!pr) throw new HttpError(400, 'That plan was not found for this customer')
    if (!['pending', 'active'].includes(pr.status)) throw new HttpError(409, 'That plan is closed, so it cannot take payments')
    const left = Number(pr.total_kobo) - Number(pr.paid_kobo)
    if (kobo > left) throw new HttpError(400, `Only ${formatNaira(koboToNaira(left))} is left on this plan.`)
    flexPlan = pr
  }

  // Order: money recorded against a confirmed in-app order can never exceed what is still owed on it.
  let orderRow = null
  if (b.orderId) {
    if (b.purpose !== 'product') throw new HttpError(400, 'A payment for an order must be marked "Product purchase"')
    if (!customer) throw new HttpError(400, 'Order payments need the registered customer who placed the order')
    const oid = uuid(b.orderId, 'order')
    const or = (await sql`select o.id, o.status, o.subtotal_kobo, o.delivery_fee_kobo, order_paid(o.id) as paid_kobo
      from orders o where o.id = ${oid} and o.user_id = ${customer.id}`)[0]
    if (!or) throw new HttpError(400, 'That order was not found for this customer')
    if (!['confirmed', 'ready'].includes(or.status)) throw new HttpError(409, 'Only a confirmed order can take payments. Confirm the order first.')
    const owed = Number(or.subtotal_kobo) + Number(or.delivery_fee_kobo || 0) - Number(or.paid_kobo)
    if (kobo > owed) throw new HttpError(400, `Only ${formatNaira(koboToNaira(owed))} is left to pay on this order.`)
    orderRow = or
  }

  let inserted
  if (flexPlan) {
    const id = crypto.randomUUID()
    const result = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'flex:' + flexPlan.id}))`,
      sql`select pg_advisory_xact_lock(hashtext(${'wallet:' + customer.id}))`,
      sql`insert into payments (id, receipt_no, idempotency_key, customer_id, customer_name, customer_phone, purpose,
                                description, amount_kobo, method, reference, booking_id, recorded_by, flexpay_plan_id)
          select ${id}::uuid, 'RC-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('receipt_seq')::text, 5, '0'),
                 ${key}::text, ${customer.id}::uuid, ${name}::text, ${phone}::text, 'flexpay_instalment',
                 ${description}::text, ${kobo}::bigint, ${b.method}::text, ${reference}::text, ${bookingId}::uuid, ${staff.id}::uuid, ${flexPlan.id}::uuid
          where exists (select 1 from flexpay_plans f where f.id = ${flexPlan.id}::uuid and f.user_id = ${customer.id}::uuid
                          and f.status in ('pending','active') and ${kobo}::bigint <= f.total_kobo - flexpay_paid(f.id))
            and (${b.method}::text <> 'wallet' or (select coalesce(sum(amount_kobo), 0) from wallet_ledger where user_id = ${customer.id}::uuid) >= ${kobo}::bigint)
          on conflict (idempotency_key) do nothing returning id`,
      sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, note, created_by)
          select ${customer.id}::uuid, ${-kobo}::bigint, 'wallet_spend', ${id}::uuid, 'FlexPay instalment', ${staff.id}::uuid
          where ${b.method}::text = 'wallet' and exists (select 1 from payments where id = ${id}::uuid)`,
      sql`update flexpay_plans f set
            status = case when flexpay_paid(f.id) >= f.total_kobo then 'completed' when f.status = 'pending' then 'active' else f.status end,
            start_date = coalesce(f.start_date, to_char(now() at time zone 'Africa/Lagos', 'YYYY-MM-DD')),
            completed_at = case when flexpay_paid(f.id) >= f.total_kobo then now() else f.completed_at end
          where f.id = ${flexPlan.id}::uuid and exists (select 1 from payments where id = ${id}::uuid)
          returning f.status`,
    ])
    inserted = result[2]
    flexAfter = result[4][0]?.status ?? null
    if (!inserted.length && !(await sql`select 1 from payments where idempotency_key = ${key}`).length) {
      throw new HttpError(409, b.method === 'wallet'
        ? 'Could not record this: the Hair Wallet balance is too low, or the plan changed. Please check and try again.'
        : 'Could not record this: the plan changed while you were typing. Please check the balance and try again.')
    }
  } else if (orderRow) {
    const id = crypto.randomUUID()
    const result = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'order:' + orderRow.id}))`,
      sql`select pg_advisory_xact_lock(hashtext(${'wallet:' + customer.id}))`,
      sql`insert into payments (id, receipt_no, idempotency_key, customer_id, customer_name, customer_phone, purpose,
                                description, amount_kobo, method, reference, booking_id, recorded_by, order_id)
          select ${id}::uuid, 'RC-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('receipt_seq')::text, 5, '0'),
                 ${key}::text, ${customer.id}::uuid, ${name}::text, ${phone}::text, 'product',
                 ${description}::text, ${kobo}::bigint, ${b.method}::text, ${reference}::text, ${bookingId}::uuid, ${staff.id}::uuid, ${orderRow.id}::uuid
          where exists (select 1 from orders o where o.id = ${orderRow.id}::uuid and o.user_id = ${customer.id}::uuid and o.status in ('confirmed','ready')
                          and ${kobo}::bigint <= o.subtotal_kobo + coalesce(o.delivery_fee_kobo, 0) - order_paid(o.id))
            and (${b.method}::text <> 'wallet' or (select coalesce(sum(amount_kobo), 0) from wallet_ledger where user_id = ${customer.id}::uuid) >= ${kobo}::bigint)
          on conflict (idempotency_key) do nothing returning id`,
      sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, note, created_by)
          select ${customer.id}::uuid, ${-kobo}::bigint, 'wallet_spend', ${id}::uuid, 'Order payment', ${staff.id}::uuid
          where ${b.method}::text = 'wallet' and exists (select 1 from payments where id = ${id}::uuid)`,
    ])
    inserted = result[2]
    if (!inserted.length && !(await sql`select 1 from payments where idempotency_key = ${key}`).length) {
      throw new HttpError(409, b.method === 'wallet'
        ? 'Could not record this: the Hair Wallet balance is too low, or the order changed. Please check and try again.'
        : 'Could not record this: the order changed while you were typing. Please check the balance and try again.')
    }
  } else if (b.purpose === 'wallet_topup') {
    // The receipt and the wallet credit are written together, or not at all.
    const id = crypto.randomUUID()
    const result = await sql.transaction([
      sql`insert into payments (id, receipt_no, idempotency_key, customer_id, customer_name, customer_phone, purpose,
                                description, amount_kobo, method, reference, booking_id, recorded_by)
          values (${id}::uuid, 'RC-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('receipt_seq')::text, 5, '0'),
                  ${key}::text, ${customer.id}::uuid, ${name}::text, ${phone}::text, 'wallet_topup',
                  ${description}::text, ${kobo}::bigint, ${b.method}::text, ${reference}::text, ${bookingId}::uuid, ${staff.id}::uuid)
          on conflict (idempotency_key) do nothing returning id`,
      sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, note, created_by)
          select ${customer.id}::uuid, ${kobo}::bigint, 'topup', ${id}::uuid, 'Top-up at the salon', ${staff.id}::uuid
          where exists (select 1 from payments where id = ${id}::uuid)`,
    ])
    inserted = result[0]
  } else if (b.method === 'wallet') {
    // Paying from the Hair Wallet: the balance check, the payment and the debit happen together, or not at all.
    if (!customer) throw new HttpError(400, 'Hair Wallet can only be used by a registered customer')
    const id = crypto.randomUUID()
    const result = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'wallet:' + customer.id}))`,
      sql`insert into payments (id, receipt_no, idempotency_key, customer_id, customer_name, customer_phone, purpose,
                                description, amount_kobo, method, reference, booking_id, recorded_by)
          select ${id}::uuid, 'RC-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('receipt_seq')::text, 5, '0'),
                 ${key}::text, ${customer.id}::uuid, ${name}::text, ${phone}::text, ${b.purpose}::text,
                 ${description}::text, ${kobo}::bigint, 'wallet', ${reference}::text, ${bookingId}::uuid, ${staff.id}::uuid
          where (select coalesce(sum(amount_kobo), 0) from wallet_ledger where user_id = ${customer.id}::uuid) >= ${kobo}::bigint
          on conflict (idempotency_key) do nothing
          returning id`,
      sql`insert into wallet_ledger (user_id, amount_kobo, type, payment_id, note, created_by)
          select ${customer.id}::uuid, ${-kobo}::bigint, 'wallet_spend', ${id}::uuid, 'Paid at the salon', ${staff.id}::uuid
          where exists (select 1 from payments where id = ${id}::uuid)`,
    ])
    inserted = result[1]
    if (!inserted.length) {
      const dup = await sql`select id from payments where idempotency_key = ${key}`
      if (!dup.length) throw new HttpError(400, `${String(customer.name).split(' ')[0]} does not have enough Hair Wallet balance for this payment.`)
    }
  } else {
    inserted = await sql`
      insert into payments (receipt_no, idempotency_key, customer_id, customer_name, customer_phone, purpose,
                            description, amount_kobo, method, reference, booking_id, recorded_by)
      values ('RC-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('receipt_seq')::text, 5, '0'),
              ${key}, ${customer?.id ?? null}, ${name}, ${phone}, ${b.purpose},
              ${description}, ${kobo}, ${b.method}, ${reference}, ${bookingId}, ${staff.id})
      on conflict (idempotency_key) do nothing
      returning id`
  }

  if (!inserted.length) {
    const existing = await sql`select id from payments where idempotency_key = ${key}`
    return send(res, 200, { payment: await getPayment(existing[0].id), duplicate: true })
  }

  await logActivity(staff.id, 'payment.recorded', 'payment', inserted[0].id,
    { amountKobo: kobo, method: b.method, purpose: b.purpose, customerId: customer?.id ?? null })
  const payment = await getPayment(inserted[0].id)
  if (customer?.id) {
    await notifyUser(customer.id, {
      type: 'payment', title: 'Payment received',
      body: b.purpose === 'wallet_topup'
        ? `${formatNaira(payment.amount)} was added to your Hair Wallet. New balance ${formatNaira((await walletFigures(customer.id)).balance / 100)}. Receipt ${payment.receiptNo}.`
        : `${formatNaira(payment.amount)} ${b.method === 'wallet' ? 'paid from your Hair Wallet' : 'received'} (${PURPOSE_TEXT[b.purpose]}). Receipt ${payment.receiptNo}.`, url: '/account',
    })
    if (b.purpose === 'wallet_topup') await checkGoalReached(customer.id)
    if (flexPlan) await flexAfterPayment(flexPlan.id, customer.id, flexPlan.status, flexAfter)
    if (orderRow) await orderAfterPayment(orderRow.id, customer.id)
  }
  // Loyalty points + referral reward (safe to repeat, never throws)
  const rewards = customer?.id ? await applyRewardsForPayment(inserted[0].id, staff.id) : null
  send(res, 201, { payment, rewards: rewards && { ...rewards, referralReward: rewards.referralRewardKobo / 100 } })
}

export async function listPayments(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const rows = await sql`select p.*, r.name as recorder_name
    from payments p join users r on r.id = p.recorded_by
    order by p.created_at desc limit 100`
  const today = await sql`select coalesce(sum(amount_kobo), 0) as total, count(*)::int as n from payments
    where status = 'confirmed' and created_at >= date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos'`
  send(res, 200, {
    payments: rows.map(mapPayment),
    today: { total: koboToNaira(today[0].total), count: today[0].n },
  })
}

export async function reversePayment(req, res) {
  const manager = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const reason = text(body(req).reason, 'Reason', { required: true, max: 300 })
  if (reason.length < 3) throw new HttpError(400, 'Please give a short reason')
  const pre = (await sql`select purpose, customer_id, flexpay_plan_id from payments where id = ${id}`)[0]
  let rows
  if (pre?.purpose === 'wallet_topup' && pre.customer_id) {
    // A top-up can only be reversed while the customer still has that money in their wallet.
    const [, upd] = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'wallet:' + pre.customer_id}))`,
      sql`with u as (
            update payments set status = 'reversed', reversed_by = ${manager.id}::uuid, reversed_at = now(), reverse_reason = ${reason}::text
            where id = ${id}::uuid and status = 'confirmed'
              and (select coalesce(sum(amount_kobo), 0) from wallet_ledger where user_id = ${pre.customer_id}::uuid) >= amount_kobo
            returning id, customer_id, amount_kobo)
          insert into wallet_ledger (user_id, amount_kobo, type, payment_id, note, created_by)
          select customer_id, -amount_kobo, 'topup_reversal', id, 'Top-up was reversed', ${manager.id}::uuid from u returning payment_id as id`,
    ])
    rows = upd
    if (!rows.length) {
      const st = (await sql`select status from payments where id = ${id}`)[0]
      if (st?.status === 'confirmed') throw new HttpError(409, 'The customer has already spent, or asked a refund for, part of this top-up, so it cannot be reversed.')
    }
  } else {
    rows = await sql`update payments set status = 'reversed', reversed_by = ${manager.id},
        reversed_at = now(), reverse_reason = ${reason}
      where id = ${id} and status = 'confirmed' returning id`
  }
  if (!rows.length) throw new HttpError(409, 'This payment was not found or is already reversed')
  await logActivity(manager.id, 'payment.reversed', 'payment', id, { reason })
  await undoRewardsForPayment(id)
  if (pre?.flexpay_plan_id) await flexAfterReversal(pre.flexpay_plan_id)
  const payment = await getPayment(id)
  if (payment.customerId) {
    await notifyUser(payment.customerId, {
      type: 'payment', title: 'Payment reversed',
      body: `${formatNaira(payment.amount)} (${payment.receiptNo}) was reversed. Reason: ${reason}`, url: '/account',
    })
  }
  send(res, 200, { payment })
}

export async function myPayments(req, res) {
  const user = await requireUser(req)
  const rows = await sql`select p.*, r.name as recorder_name
    from payments p join users r on r.id = p.recorded_by
    where p.customer_id = ${user.id} order by p.created_at desc limit 50`
  send(res, 200, { payments: rows.map(mapPayment) })
}
