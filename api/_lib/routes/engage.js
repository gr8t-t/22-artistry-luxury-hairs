import { sql, logActivity, rateLimit } from '../db.js'
import { requireUser, currentUser } from '../auth.js'
import { send, body, text, whole, uuid, clientIp, normalizePhone, HttpError } from '../http.js'
import { mapReview } from './catalog.js'
import { notifyUser, notifyStaff } from '../notify.js'

const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

const mapBooking = (b) => ({
  id: b.id, name: b.name, phone: b.phone, service: b.service, date: b.date, time: b.time,
  notes: b.notes, status: b.status, createdAt: new Date(b.created_at).toISOString(),
})

export async function createBooking(req, res) {
  const b = body(req)
  const name = text(b.name, 'Name', { required: true, max: 120 })
  const rawPhone = text(b.phone, 'Phone number', { required: true, max: 30 })
  const phone = normalizePhone(rawPhone) || rawPhone // keep what they typed if it isn't a standard Nigerian number
  const service = text(b.service, 'Service', { required: true, max: 120 })
  const date = text(b.date, 'Date', { required: true, max: 10 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Please choose a valid date')
  const time = text(b.time, 'Time', { required: true, max: 20 })
  const notes = text(b.notes, 'Notes', { max: 500 })

  await rateLimit(`booking:${clientIp(req)}`, 6, 60, 'Too many bookings from this connection. Please try again in an hour or message us on WhatsApp.')
  const user = await currentUser(req)
  const rows = await sql`insert into bookings (customer_id, name, phone, service, date, time, notes)
    values (${user?.id ?? null}, ${name}, ${phone}, ${service}, ${date}, ${time}, ${notes}) returning *`
  await notifyStaff({ type: 'booking', title: 'New booking request', body: `${name} · ${service} · ${date} at ${time}`, url: '/admin' })
  if (user) await notifyUser(user.id, { type: 'booking', title: 'Booking request received', body: `${service} on ${date} at ${time}. We will confirm shortly.`, url: '/account' })
  send(res, 201, { booking: mapBooking(rows[0]) })
}

export async function listBookings(req, res) {
  await requireUser(req, ['staff', 'manager'])
  const rows = await sql`select * from bookings order by created_at desc limit 500`
  send(res, 200, { bookings: rows.map(mapBooking) })
}

export async function updateBooking(req, res) {
  const u = await requireUser(req, ['staff', 'manager'])
  const id = uuid(req.params.id)
  const status = String(body(req).status || '')
  if (!BOOKING_STATUSES.includes(status)) throw new HttpError(400, 'Invalid status')
  const rows = await sql`update bookings set status=${status} where id=${id} returning *`
  if (!rows.length) throw new HttpError(404, 'Booking not found')
  await logActivity(u.id, 'booking.status_changed', 'booking', id, { status })
  const b = rows[0]
  const said = { confirmed: 'is confirmed', cancelled: 'was cancelled', completed: 'is complete. Thank you for visiting!' }[status]
  if (b.customer_id && said) {
    await notifyUser(b.customer_id, { type: 'booking', title: `Your booking ${status}`, body: `${b.service} on ${b.date} at ${b.time} ${said}`, url: '/account' })
  }
  send(res, 200, { booking: mapBooking(b) })
}

export async function createReview(req, res) {
  const b = body(req)
  const name = text(b.name, 'Name', { required: true, max: 80 })
  const comment = text(b.comment, 'Review', { required: true, max: 1000 })
  const service = text(b.service, 'Service', { max: 120 })
  const rating = whole(b.rating, 'Rating', { min: 1, max: 5 })

  await rateLimit(`review:${clientIp(req)}`, 3, 60, 'You have sent several reviews already. Please try again later.')
  const user = await currentUser(req)
  const rows = await sql`insert into reviews (customer_id, name, service, rating, comment)
    values (${user?.id ?? null}, ${name}, ${service}, ${rating}, ${comment}) returning *`
  await notifyStaff({ type: 'review', title: 'New review awaiting approval', body: `${name} gave ${rating} star${rating > 1 ? 's' : ''}`, url: '/admin' }, { managersOnly: true })
  send(res, 201, { review: mapReview(rows[0]) })
}

export async function listAllReviews(req, res) {
  await requireUser(req, ['manager'])
  const rows = await sql`select * from reviews order by created_at desc limit 500`
  send(res, 200, { reviews: rows.map(mapReview) })
}

export async function approveReview(req, res) {
  const u = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const rows = await sql`update reviews set approved = true where id=${id} returning *`
  if (!rows.length) throw new HttpError(404, 'Review not found')
  await logActivity(u.id, 'review.approved', 'review', id)
  if (rows[0].customer_id) await notifyUser(rows[0].customer_id, { type: 'review', title: 'Your review is now live', body: 'Thank you for sharing your experience with us!', url: '/' })
  send(res, 200, { review: mapReview(rows[0]) })
}

export async function deleteReview(req, res) {
  const u = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const rows = await sql`delete from reviews where id=${id} returning id`
  if (!rows.length) throw new HttpError(404, 'Review not found')
  await logActivity(u.id, 'review.deleted', 'review', id)
  send(res, 200, { ok: true })
}
