import { sql } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, uuid, HttpError } from '../http.js'

/** The customer's saved cart, so it follows them to any phone or computer. */
export async function getCart(req, res) {
  const user = await requireUser(req, ['customer'])
  const r = await sql`select items from carts where user_id = ${user.id}`
  send(res, 200, { items: r[0]?.items || [] })
}

export async function putCart(req, res) {
  const user = await requireUser(req, ['customer'])
  const raw = body(req).items
  if (!Array.isArray(raw) || raw.length > 30) throw new HttpError(400, 'Your cart is too large')
  const seen = new Map()
  for (const r of raw) {
    const id = uuid(r?.productId, 'product')
    const qty = Number(r?.qty)
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new HttpError(400, 'Each quantity must be between 1 and 10')
    seen.set(id, qty)
  }
  const items = [...seen].map(([productId, qty]) => ({ productId, qty }))
  await sql`insert into carts (user_id, items, updated_at) values (${user.id}, ${JSON.stringify(items)}::jsonb, now())
    on conflict (user_id) do update set items = excluded.items, updated_at = now()`
  send(res, 200, { items })
}
