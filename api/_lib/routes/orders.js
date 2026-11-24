import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, normalizePhone, HttpError } from '../http.js'
import { nairaToKobo, koboToNaira, formatNaira } from '../money.js'
import { notifyUser, notifyStaff } from '../notify.js'
import { loadItems } from './flexpay.js'

export const LOW_STOCK = 5            // staff are alerted when a product drops to this many or fewer
const MAX_OPEN_ORDERS = 5
const MAX_FEE_KOBO = 50_000_000       // delivery fee limit: ₦500,000
const OPEN = ['new', 'confirmed', 'ready']
const money = (k) => formatNaira(koboToNaira(k))

export function mapOrder(o) {
  const subtotal = Number(o.subtotal_kobo)
  const fee = o.delivery_fee_kobo == null ? null : Number(o.delivery_fee_kobo)
  const total = subtotal + (fee || 0)
  const paid = Number(o.paid_kobo || 0)
  return {
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    fulfilment: o.fulfilment,
    address: o.delivery_address,
    contactPhone: o.contact_phone,
    note: o.note,
    items: (o.items || []).map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, price: koboToNaira(i.priceKobo), image: i.image || '' })),
    subtotal: koboToNaira(subtotal),
    deliveryFee: fee == null ? null : koboToNaira(fee),
    total: koboToNaira(total),
    paid: koboToNaira(paid),
    remaining: koboToNaira(Math.max(0, total - paid)),
    feePending: o.fulfilment === 'delivery' && fee == null,
    cancelReason: o.cancel_reason || '',
    createdAt: new Date(o.created_at).toISOString(),
    confirmedAt: o.confirmed_at ? new Date(o.confirmed_at).toISOString() : null,
    completedAt: o.completed_at ? new Date(o.completed_at).toISOString() : null,
  }
}

const getOrder = async (id) => (await sql`select o.*, order_paid(o.id) as paid_kobo, u.name as customer, u.phone as customer_phone
  from orders o join users u on u.id = o.user_id where o.id = ${id}`)[0]

// ── Customer ──
export async function myOrders(req, res) {
  const user = await requireUser(req)
  const rows = await sql`select o.*, order_paid(o.id) as paid_kobo from orders o where o.user_id = ${user.id} order by o.created_at desc limit 20`
  send(res, 200, { orders: rows.map(mapOrder) })
}

export async function createOrder(req, res) {
  const user = await requireUser(req, ['customer'])
  const b = body(req)
  if (b.fulfilment !== 'pickup' && b.fulfilment !== 'delivery') throw new HttpError(400, 'Choose pickup at the salon or delivery')
  const address = text(b.address, 'Delivery address', { max: 300 })
  const phone = normalizePhone(String(b.contactPhone || '')) || user.phone || ''
  if (b.fulfilment === 'delivery') {
    if (address.length < 5) throw new HttpError(400, 'Enter the delivery address')
    if (!phone) throw new HttpError(400, 'Enter a phone number we can reach for the delivery')
  }
  const note = text(b.note, 'Note', { max: 300 })
  const key = text(b.idempotencyKey, 'Request id', { required: true, max: 80 })
  const { items, total } = await loadItems(b.items, 'an order')

  const open = await sql`select count(*)::int as n from orders where user_id = ${user.id} and status = any(${OPEN}::text[])`
  if (open[0].n >= MAX_OPEN_ORDERS) throw new HttpError(400, `You already have ${MAX_OPEN_ORDERS} orders in progress. Please wait for them to finish.`)

  const ins = await sql`insert into orders (order_no, user_id, fulfilment, delivery_address, contact_phone, note, items, subtotal_kobo, idempotency_key)
    values ('OR-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('order_seq')::text, 5, '0'), ${user.id}, ${b.fulfilment},
            ${b.fulfilment === 'delivery' ? address : ''}, ${phone}, ${note}, ${JSON.stringify(items)}::jsonb, ${total}, ${key})
    on conflict (idempotency_key) do nothing returning id, order_no`
  if (!ins.length) return send(res, 200, { duplicate: true })
  const { id, order_no: orderNo } = ins[0]
  await sql`delete from carts where user_id = ${user.id}`
  await logActivity(user.id, 'order.created', 'order', id, { totalKobo: total, fulfilment: b.fulfilment })
  await notifyUser(user.id, {
    type: 'payment', title: `Order ${orderNo} received`,
    body: `${money(total)}, ${b.fulfilment === 'delivery' ? 'delivery' : 'pickup at the salon'}. We will confirm availability${b.fulfilment === 'delivery' ? ' and your delivery fee' : ''} shortly.`, url: '/account',
  })
  await notifyStaff({
    type: 'payment', title: `New order ${orderNo}`,
    body: `${user.name} · ${money(total)} · ${b.fulfilment === 'delivery' ? 'delivery' : 'pickup'} · ${items.map((i) => `${i.name} x${i.qty}`).join(', ').slice(0, 120)}`, url: '/admin',
  })
  send(res, 201, { order: mapOrder(await getOrder(id)) })
}

// ── Stock-safe cancel (used by the customer on a new order, and by staff) ──
async function cancelCore(id, reason) {
  const results = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'order:' + id}))`,
    sql`update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = ${reason}::text
        where id = ${id}::uuid and status = any(${OPEN}::text[]) and order_paid(id) = 0 returning id, user_id`,
    // put the stock back if it had been taken
    sql`update products p set quantity = p.quantity + w.qty
        from (select (x->>'productId')::uuid as pid, (x->>'qty')::int as qty
                from orders o, jsonb_array_elements(o.items) x
               where o.id = ${id}::uuid and o.status = 'cancelled' and o.stock_reduced) w
        where p.id = w.pid`,
    sql`update orders set stock_reduced = false where id = ${id}::uuid and status = 'cancelled' and stock_reduced`,
  ])
  return results[1] // the cancelled order, or nothing if it could not be cancelled
}

export async function cancelMyOrder(req, res) {
  const user = await requireUser(req)
  const id = uuid(req.params.id)
  const o = (await sql`select user_id, status from orders where id = ${id}`)[0]
  if (!o || o.user_id !== user.id) throw new HttpError(404, 'Order not found')
  if (o.status !== 'new') throw new HttpError(409, 'This order has already been confirmed. Please message us to change it.')
  const r = await sql`update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Cancelled by the customer'
    where id = ${id} and status = 'new' returning order_no`
  if (!r.length) throw new HttpError(409, 'This order can no longer be cancelled here.')
  await logActivity(user.id, 'order.cancelled', 'order', id, { by: 'customer' })
  await notifyStaff({ type: 'payment', title: `Order ${r[0].order_no} cancelled`, body: `${user.name} cancelled the order before it was confirmed.`, url: '/admin' })
  send(res, 200, { ok: true })
}

// ── Staff and manager ──
export async function listOrders(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const rows = await sql`select o.*, order_paid(o.id) as paid_kobo, u.name as customer, u.phone as customer_phone
    from orders o join users u on u.id = o.user_id
    order by (o.status = any(${OPEN}::text[])) desc, o.created_at desc limit 80`
  send(res, 200, { orders: rows.map((r) => ({ ...mapOrder(r), customer: r.customer, customerPhone: r.customer_phone })) })
}

/** Open orders of one customer that still have money to pay (for the Record Payment form). */
export async function customerOrders(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const cid = uuid(req.params.id, 'customer')
  const rows = await sql`select o.*, order_paid(o.id) as paid_kobo from orders o
    where o.user_id = ${cid} and o.status in ('confirmed','ready') order by o.created_at`
  send(res, 200, { orders: rows.map(mapOrder).filter((o) => o.remaining > 0) })
}

/** Staff confirm an order: the delivery fee is set, and stock is taken off, together or not at all. */
export async function confirmOrder(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const o0 = await getOrder(id)
  if (!o0) throw new HttpError(404, 'Order not found')
  if (o0.status !== 'new') throw new HttpError(409, 'This order has already been handled.')
  let fee = null
  if (o0.fulfilment === 'delivery') {
    const raw = body(req).deliveryFee
    fee = raw === 0 || raw === '0' ? 0 : nairaToKobo(raw)
    if (fee === null || fee < 0 || fee > MAX_FEE_KOBO) throw new HttpError(400, 'Enter the delivery fee (use 0 for free delivery)')
  }

  let stock
  try {
    const out = await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'order:' + id}))`,
      sql`update orders o set status = 'confirmed', delivery_fee_kobo = ${fee}::bigint, confirmed_by = ${staff.id}::uuid, confirmed_at = now()
          where o.id = ${id}::uuid and o.status = 'new'
            and not exists (
              select 1 from jsonb_array_elements(o.items) x
              left join products p on p.id = (x->>'productId')::uuid
              where p.id is null or p.quantity < (x->>'qty')::int)
          returning o.id`,
      sql`update products p set quantity = p.quantity - w.qty
          from (select (x->>'productId')::uuid as pid, (x->>'qty')::int as qty
                  from orders o, jsonb_array_elements(o.items) x
                 where o.id = ${id}::uuid and o.status = 'confirmed' and not o.stock_reduced) w
          where p.id = w.pid returning p.name, p.quantity`,
      sql`update orders set stock_reduced = true where id = ${id}::uuid and status = 'confirmed' and not stock_reduced returning id`,
    ])
    stock = out[2]
    if (!out[1].length) {
      const short = (await sql`select p.name, p.quantity, (x->>'qty')::int as want
        from orders o, jsonb_array_elements(o.items) x left join products p on p.id = (x->>'productId')::uuid
        where o.id = ${id} and (p.id is null or p.quantity < (x->>'qty')::int) limit 1`)[0]
      throw new HttpError(409, short?.name ? `Not enough stock for ${short.name}: ${short.quantity} left, the customer wants ${short.want}.` : 'One of the items is no longer in the catalogue.')
    }
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(409, 'The stock changed while you were confirming. Please check the order and try again.')
  }

  await logActivity(staff.id, 'order.confirmed', 'order', id, { feeKobo: fee })
  const o = await getOrder(id)
  const m = mapOrder(o)
  await notifyUser(o.user_id, {
    type: 'payment', title: `Order ${o.order_no} confirmed`,
    body: `${m.fulfilment === 'delivery' ? `Delivery fee ${formatNaira(m.deliveryFee)}. ` : ''}Total ${formatNaira(m.total)}. Pay at the salon or by bank transfer; message us on WhatsApp if you need the account details.`, url: '/account',
  })
  for (const s of stock) {
    if (s.quantity <= LOW_STOCK) {
      await notifyStaff({
        type: 'system', title: s.quantity === 0 ? `Out of stock: ${s.name}` : `Low stock: ${s.name}`,
        body: s.quantity === 0 ? `${s.name} has none left after order ${o.order_no}.` : `Only ${s.quantity} of ${s.name} left after order ${o.order_no}.`, url: '/admin',
      })
    }
  }
  send(res, 200, { order: m })
}

export async function readyOrder(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const r = await sql`update orders set status = 'ready', ready_at = now() where id = ${id} and status = 'confirmed' returning user_id, order_no, fulfilment`
  if (!r.length) throw new HttpError(409, 'Only a confirmed order can be marked ready.')
  await logActivity(staff.id, 'order.ready', 'order', id, {})
  await notifyUser(r[0].user_id, {
    type: 'payment', title: r[0].fulfilment === 'delivery' ? `Order ${r[0].order_no} is on its way` : `Order ${r[0].order_no} is ready`,
    body: r[0].fulfilment === 'delivery' ? 'Your order is out for delivery.' : 'Your order is ready. Please come to the salon to collect it.', url: '/account',
  })
  send(res, 200, { order: mapOrder(await getOrder(id)) })
}

export async function completeOrder(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const r = await sql`update orders set status = 'completed', completed_at = now()
    where id = ${id} and status in ('confirmed','ready') and order_paid(id) >= subtotal_kobo + coalesce(delivery_fee_kobo, 0)
    returning user_id, order_no`
  if (!r.length) {
    const o = await getOrder(id)
    if (!o) throw new HttpError(404, 'Order not found')
    if (!['confirmed', 'ready'].includes(o.status)) throw new HttpError(409, 'This order cannot be completed from its current status.')
    const m = mapOrder(o)
    throw new HttpError(409, `Record the full payment first: ${formatNaira(m.remaining)} is still to pay.`)
  }
  await logActivity(staff.id, 'order.completed', 'order', id, {})
  await notifyUser(r[0].user_id, { type: 'payment', title: `Order ${r[0].order_no} complete`, body: 'Thank you for shopping with 22 Artistry Luxury Hairs.', url: '/account' })
  send(res, 200, { order: mapOrder(await getOrder(id)) })
}

export async function cancelOrder(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const reason = text(body(req).reason, 'Reason', { required: true, max: 300 })
  if (reason.length < 3) throw new HttpError(400, 'Please give the customer a short reason')
  const out = await cancelCore(id, reason)
  if (!out.length) {
    const o = await getOrder(id)
    if (!o) throw new HttpError(404, 'Order not found')
    if (!OPEN.includes(o.status)) throw new HttpError(409, 'This order is already closed.')
    throw new HttpError(409, `Payments are recorded on this order (${money(o.paid_kobo)}). Reverse them first, then cancel.`)
  }
  await logActivity(staff.id, 'order.cancelled', 'order', id, { reason })
  await notifyUser(out[0].user_id, { type: 'payment', title: 'Order cancelled', body: `Your order was cancelled. Reason: ${reason}`, url: '/account' })
  send(res, 200, { order: mapOrder(await getOrder(id)) })
}

// ── Called by payments.js ──
export async function orderAfterPayment(orderId, userId) {
  try {
    const o = await getOrder(orderId)
    if (o && mapOrder(o).remaining === 0) {
      await notifyUser(userId, { type: 'payment', title: `Order ${o.order_no} paid in full`, body: o.fulfilment === 'delivery' ? 'Thank you. Your delivery is being arranged.' : 'Thank you. Your order is ready for you at the salon.', url: '/account' })
    }
  } catch (e) { console.error('orderAfterPayment failed', orderId, e) }
}
