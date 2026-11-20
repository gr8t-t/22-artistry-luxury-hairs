import { sql } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, uuid, HttpError } from '../http.js'
import { notifyUser, pushEnabled } from '../notify.js'

const map = (n) => ({
  id: n.id, type: n.type, title: n.title, body: n.body, url: n.url,
  read: !!n.read_at, createdAt: new Date(n.created_at).toISOString(),
})

export async function listMine(req, res) {
  const user = await requireUser(req)
  const [rows, unread] = await Promise.all([
    sql`select * from notifications where user_id = ${user.id} order by created_at desc limit 40`,
    sql`select count(*)::int as n from notifications where user_id = ${user.id} and read_at is null`,
  ])
  send(res, 200, { notifications: rows.map(map), unread: unread[0].n })
}

/** Mark specific notifications (or all, when no ids are given) as read. */
export async function markRead(req, res) {
  const user = await requireUser(req)
  const ids = body(req).ids
  if (Array.isArray(ids) && ids.length) {
    const clean = ids.slice(0, 100).map(i => uuid(i, 'notification'))
    await sql`update notifications set read_at = now() where user_id = ${user.id} and read_at is null and id = any(${clean}::uuid[])`
  } else {
    await sql`update notifications set read_at = now() where user_id = ${user.id} and read_at is null`
  }
  const unread = await sql`select count(*)::int as n from notifications where user_id = ${user.id} and read_at is null`
  send(res, 200, { unread: unread[0].n })
}

/** Public: the browser needs this key to create a push subscription. */
export async function pushKey(req, res) {
  send(res, 200, { key: pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null }, 'public, max-age=3600')
}

const B64URL = /^[A-Za-z0-9_-]{20,200}={0,2}$/

export async function subscribe(req, res) {
  const user = await requireUser(req)
  const sub = body(req).subscription || {}
  const endpoint = String(sub.endpoint || '')
  const p256dh = String(sub.keys?.p256dh || '')
  const auth = String(sub.keys?.auth || '')
  if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint)) throw new HttpError(400, 'Invalid push subscription')
  if (!B64URL.test(p256dh) || !B64URL.test(auth)) throw new HttpError(400, 'Invalid push subscription keys')
  const ua = String(req.headers['user-agent'] || '').slice(0, 200)

  // The same device can only belong to one person: re-subscribing moves it to the current user.
  await sql`insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${user.id}, ${endpoint}, ${p256dh}, ${auth}, ${ua})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`
  // Keep at most 10 devices per person (oldest are dropped)
  await sql`delete from push_subscriptions where user_id = ${user.id} and id not in (
    select id from push_subscriptions where user_id = ${user.id} order by created_at desc limit 10)`
  send(res, 200, { ok: true })
}

export async function unsubscribe(req, res) {
  const user = await requireUser(req)
  const endpoint = String(body(req).endpoint || '')
  await sql`delete from push_subscriptions where user_id = ${user.id} and endpoint = ${endpoint}`
  send(res, 200, { ok: true })
}

export async function sendTest(req, res) {
  const user = await requireUser(req)
  await notifyUser(user.id, {
    type: 'system',
    title: 'Notifications are working',
    body: 'You will get updates about your bookings, payments and offers here.',
    url: '/account',
  })
  send(res, 200, { ok: true })
}
