import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, normalizePhone, HttpError } from '../http.js'
import { nairaToKobo, koboToNaira, MAX_PAYMENT_KOBO } from '../money.js'

// Wallet top-ups and FlexPay instalments are added in later steps (they need balances to credit).
const PURPOSES = ['service', 'product', 'booking_deposit', 'other']
const METHODS = ['cash', 'pos', 'transfer']

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
  if (!METHODS.includes(b.method)) throw new HttpError(400, 'Choose cash, POS or transfer')
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
  const inserted = await sql`
    insert into payments (receipt_no, idempotency_key, customer_id, customer_name, customer_phone, purpose,
                          description, amount_kobo, method, reference, booking_id, recorded_by)
    values ('RC-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('receipt_seq')::text, 5, '0'),
            ${key}, ${customer?.id ?? null}, ${name}, ${phone}, ${b.purpose},
            ${description}, ${kobo}, ${b.method}, ${reference}, ${bookingId}, ${staff.id})
    on conflict (idempotency_key) do nothing
    returning id`

  if (!inserted.length) {
    const existing = await sql`select id from payments where idempotency_key = ${key}`
    return send(res, 200, { payment: await getPayment(existing[0].id), duplicate: true })
  }

  await logActivity(staff.id, 'payment.recorded', 'payment', inserted[0].id,
    { amountKobo: kobo, method: b.method, purpose: b.purpose, customerId: customer?.id ?? null })
  send(res, 201, { payment: await getPayment(inserted[0].id) })
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
  const rows = await sql`update payments set status = 'reversed', reversed_by = ${manager.id},
      reversed_at = now(), reverse_reason = ${reason}
    where id = ${id} and status = 'confirmed' returning id`
  if (!rows.length) throw new HttpError(409, 'This payment was not found or is already reversed')
  await logActivity(manager.id, 'payment.reversed', 'payment', id, { reason })
  send(res, 200, { payment: await getPayment(id) })
}

export async function myPayments(req, res) {
  const user = await requireUser(req)
  const rows = await sql`select p.*, r.name as recorder_name
    from payments p join users r on r.id = p.recorded_by
    where p.customer_id = ${user.id} order by p.created_at desc limit 50`
  send(res, 200, { payments: rows.map(mapPayment) })
}
