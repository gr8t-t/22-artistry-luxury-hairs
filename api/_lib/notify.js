// Notifications: every event is saved to the user's in-app inbox AND pushed to their devices.
// These helpers never throw - a failed notification must never break the action that triggered it.
import * as webpush from 'web-push'
import { sql } from './db.js'

/** Wrapped so tests can swap the real network call for a fake one. */
export const pushClient = {
  send: (subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 60 * 60 * 24, timeout: 5000 }),
}

let configured = false
function configure() {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://22-artistry-luxury-hairs.vercel.app', pub, priv)
  configured = true
  return true
}

export const pushEnabled = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

async function pushTo(userIds, { title, body, url, type }) {
  if (!configure()) return
  const subs = await sql`select id, endpoint, p256dh, auth from push_subscriptions where user_id = any(${userIds}::uuid[])`
  if (!subs.length) return
  const payload = JSON.stringify({ title, body, url, type })
  const dead = []
  await Promise.allSettled(subs.map(async (s) => {
    try {
      await pushClient.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    } catch (e) {
      // 404/410 = the device un-subscribed or the app was removed: forget it
      if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(s.id)
      else console.error('push failed', e?.statusCode || e?.message)
    }
  }))
  if (dead.length) await sql`delete from push_subscriptions where id = any(${dead}::uuid[])`
}

/** Save to the inbox of each user, then push to their devices. */
export async function notifyUsers(userIds, { type, title, body = '', url = '/' }) {
  try {
    const ids = [...new Set(userIds.filter(Boolean))]
    if (!ids.length) return
    await sql`insert into notifications (user_id, type, title, body, url)
      select u, ${type}, ${title}, ${body}, ${url} from unnest(${ids}::uuid[]) as u`
    await pushTo(ids, { type, title, body, url })
  } catch (e) {
    console.error('notify failed', e)
  }
}

export const notifyUser = (userId, n) => notifyUsers([userId], n)

/** Everyone working in the salon (staff + managers). */
export async function notifyStaff(n, { managersOnly = false } = {}) {
  try {
    const rows = managersOnly
      ? await sql`select id from users where role = 'manager' and is_active = true`
      : await sql`select id from users where role in ('staff','manager') and is_active = true`
    await notifyUsers(rows.map(r => r.id), n)
  } catch (e) {
    console.error('notifyStaff failed', e)
  }
}

/** Every active customer (offers / announcements). */
export async function notifyAllCustomers(n) {
  try {
    const rows = await sql`select id from users where role = 'customer' and is_active = true`
    await notifyUsers(rows.map(r => r.id), n)
  } catch (e) {
    console.error('notifyAllCustomers failed', e)
  }
}
