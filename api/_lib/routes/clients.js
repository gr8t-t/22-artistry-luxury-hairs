import crypto from 'node:crypto'
import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, uuid, normalizePhone, HttpError } from '../http.js'
import { koboToNaira } from '../money.js'
import { rewardsSummary } from '../rewards.js'
import { mapPayment } from './payments.js'
import { planView } from './flexpay.js'
import { mapOrder } from './orders.js'

const refCode = () => crypto.randomBytes(4).toString('hex').toUpperCase()

/** Every customer, online or in-salon, with their points and wallet. */
export async function listClients(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const q = String(req.query?.q || '').trim().slice(0, 40)
  const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%'
  const digits = q.replace(/\D/g, '')
  const phoneLike = digits.length >= 3 ? '%' + digits.replace(/^0/, '') + '%' : like
  const rows = await sql`select u.id, u.name, u.phone, u.is_walkin, u.created_at,
      (select coalesce(sum(amount_kobo), 0) from wallet_ledger w where w.user_id = u.id)::bigint as wallet,
      (select coalesce(sum(points), 0) from points_ledger p where p.user_id = u.id)::int as points
    from users u
    where u.role = 'customer' and u.is_active = true
      and (${q}::text = '' or u.name ilike ${like} or u.phone like ${phoneLike})
    order by u.created_at desc limit 40`
  send(res, 200, {
    clients: rows.map((r) => ({
      id: r.id, name: r.name, phone: r.phone, type: r.is_walkin ? 'walkin' : 'online',
      createdAt: new Date(r.created_at).toISOString(), wallet: koboToNaira(r.wallet), points: r.points,
    })),
  })
}

/** Add someone who has no phone or account: they can still save in the wallet, use FlexPay and earn points. */
export async function createClient(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const b = body(req)
  const name = text(b.name, 'Name', { required: true, max: 80 })
  if (name.length < 2) throw new HttpError(400, 'Enter the client\'s name')
  let phone = null
  if (b.phone && String(b.phone).trim()) {
    phone = normalizePhone(String(b.phone))
    if (!phone) throw new HttpError(400, 'Enter a valid Nigerian phone number, or leave it empty')
    const dup = (await sql`select name from users where phone = ${phone}`)[0]
    if (dup) throw new HttpError(409, `That phone number already belongs to ${dup.name}. Search for them instead.`)
  }
  let row = null
  for (let i = 0; i < 5 && !row; i++) {
    try {
      row = (await sql`insert into users (role, name, phone, password_hash, referral_code, is_walkin, created_by)
        values ('customer', ${name}, ${phone}, null, ${refCode()}, true, ${staff.id}) returning id, name, phone, created_at`)[0]
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('users_phone_key')) throw new HttpError(409, 'That phone number is already in use.')
      if (!msg.includes('referral_code')) throw e
    }
  }
  if (!row) throw new HttpError(500, 'Could not create the client. Please try again.')
  await logActivity(staff.id, 'client.created', 'user', row.id, { walkin: true })
  send(res, 201, { client: { id: row.id, name: row.name, phone: row.phone, type: 'walkin' } })
}

/** Fix a walk-in client's name or add their phone later. Online customers manage their own details. */
export async function updateClient(req, res) {
  const staff = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const b = body(req)
  const cur = (await sql`select id, is_walkin from users where id = ${id} and role = 'customer'`)[0]
  if (!cur) throw new HttpError(404, 'Client not found')
  if (!cur.is_walkin) throw new HttpError(403, 'This customer has their own account and manages their own details.')
  const name = b.name === undefined ? null : text(b.name, 'Name', { required: true, max: 80 })
  let phone
  if (b.phone !== undefined) {
    if (String(b.phone).trim() === '') phone = null
    else {
      phone = normalizePhone(String(b.phone))
      if (!phone) throw new HttpError(400, 'Enter a valid Nigerian phone number')
      const dup = (await sql`select name from users where phone = ${phone} and id <> ${id}`)[0]
      if (dup) throw new HttpError(409, `That phone number already belongs to ${dup.name}.`)
    }
  }
  await sql`update users set name = coalesce(${name}::text, name),
      phone = case when ${b.phone !== undefined}::boolean then ${phone ?? null}::text else phone end where id = ${id}`
  await logActivity(staff.id, 'client.updated', 'user', id, {})
  send(res, 200, { ok: true })
}

/** Everything about one customer in one place, for the manager (and staff) to follow their history. */
export async function clientDetail(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id, 'client')
  const u = (await sql`select u.id, u.name, u.phone, u.email, u.is_walkin, u.created_at, c.name as added_by
    from users u left join users c on c.id = u.created_by where u.id = ${id} and u.role = 'customer'`)[0]
  if (!u) throw new HttpError(404, 'Client not found')
  const [rewards, plans, orders, pays, totals, bookings] = await Promise.all([
    rewardsSummary(id),
    sql`select f.*, flexpay_paid(f.id) as paid_kobo from flexpay_plans f where f.user_id = ${id} order by f.created_at desc limit 20`,
    sql`select o.*, order_paid(o.id) as paid_kobo from orders o where o.user_id = ${id} order by o.created_at desc limit 20`,
    sql`select p.*, r.name as recorder_name from payments p join users r on r.id = p.recorded_by
        where p.customer_id = ${id} order by p.created_at desc limit 25`,
    sql`select coalesce(sum(amount_kobo) filter (where status = 'confirmed' and method <> 'wallet'), 0)::bigint as money_in,
               count(*) filter (where status = 'confirmed')::int as n from payments where customer_id = ${id}`,
    sql`select count(*)::int as n from bookings where customer_id = ${id}`,
  ])
  send(res, 200, {
    client: { id: u.id, name: u.name, phone: u.phone, email: u.email, type: u.is_walkin ? 'walkin' : 'online', createdAt: new Date(u.created_at).toISOString(), addedBy: u.added_by || null },
    rewards,
    plans: plans.map((p) => planView(p)),
    orders: orders.map(mapOrder),
    payments: pays.map(mapPayment),
    totals: { moneyIn: koboToNaira(totals[0].money_in), payments: totals[0].n, bookings: bookings[0].n },
  })
}
