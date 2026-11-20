import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { sql, logActivity } from '../db.js'
import {
  hashPassword, verifyPassword, issueSession, clearSession, currentUser, publicUser,
} from '../auth.js'
import { HttpError, send, body, clientIp, normalizePhone, normalizeEmail } from '../http.js'
import { notifyUser } from '../notify.js'

// Used so a wrong identifier takes as long to reject as a wrong password
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 11)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L

function makeReferralCode() {
  let out = ''
  const bytes = crypto.randomBytes(7)
  for (let i = 0; i < 7; i++) out += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  return out
}

export async function register(req, res) {
  const b = body(req)
  const name = String(b.name || '').trim()
  const phone = normalizePhone(b.phone)
  const email = b.email ? normalizeEmail(b.email) : null
  const password = String(b.password || '')

  if (name.length < 2) throw new HttpError(400, 'Please enter your full name')
  if (!phone) throw new HttpError(400, 'Please enter a valid Nigerian phone number')
  if (b.email && !email) throw new HttpError(400, 'Please enter a valid email address')
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters')
  if (password.length > 128) throw new HttpError(400, 'Password is too long')

  const existing = await sql`select phone, email from users where phone = ${phone} or (${email}::text is not null and email = ${email})`
  if (existing.length) {
    throw new HttpError(409, existing[0].phone === phone
      ? 'An account with this phone number already exists. Please log in.'
      : 'An account with this email already exists. Please log in.')
  }

  let referredBy = null
  const refCode = String(b.referralCode || '').trim().toUpperCase()
  if (refCode) {
    const r = await sql`select id from users where referral_code = ${refCode}`
    if (!r.length) throw new HttpError(400, 'That referral code is not valid')
    referredBy = r[0].id
  }

  const passwordHash = await hashPassword(password)
  let user = null
  for (let attempt = 0; attempt < 5 && !user; attempt++) {
    try {
      const rows = await sql`
        insert into users (name, phone, email, password_hash, referral_code, referred_by)
        values (${name}, ${phone}, ${email}, ${passwordHash}, ${makeReferralCode()}, ${referredBy})
        returning *`
      user = rows[0]
    } catch (e) {
      if (!String(e.message).includes('referral_code')) {
        if (String(e.message).includes('users_phone_key')) throw new HttpError(409, 'An account with this phone number already exists. Please log in.')
        if (String(e.message).includes('users_email_key')) throw new HttpError(409, 'An account with this email already exists. Please log in.')
        throw e
      }
    }
  }
  if (!user) throw new HttpError(500, 'Could not create account. Please try again.')

  await logActivity(user.id, 'customer.registered', 'user', user.id, referredBy ? { referredBy } : null)
  await notifyUser(user.id, {
    type: 'system', title: 'Welcome to 22 Artistry',
    body: 'Your account is ready. Book an appointment, shop, and watch this space for offers.', url: '/account',
  })
  await issueSession(res, user)
  send(res, 201, { user: publicUser(user) })
}

export async function login(req, res) {
  const b = body(req)
  const raw = String(b.identifier || '').trim()
  const password = String(b.password || '')
  if (!raw || !password) throw new HttpError(400, 'Enter your phone number or email, and your password')

  const phone = normalizePhone(raw)
  const email = raw.includes('@') ? normalizeEmail(raw) : null
  const key = phone || email || raw.toLowerCase()
  const ip = clientIp(req)

  const recent = await sql`
    select count(*)::int as n from login_attempts
    where success = false and created_at > now() - interval '15 minutes'
      and (identifier = ${key} or ip = ${ip})`
  if (recent[0].n >= 8) {
    throw new HttpError(429, 'Too many failed attempts. Please wait 15 minutes and try again.')
  }

  const rows = phone
    ? await sql`select * from users where phone = ${phone}`
    : email
      ? await sql`select * from users where email = ${email}`
      : []
  const user = rows[0]
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH)

  if (!user || !ok || !user.is_active) {
    await sql`insert into login_attempts (identifier, ip, success) values (${key}, ${ip}, false)`
    throw new HttpError(401, 'Incorrect phone/email or password')
  }

  await sql`insert into login_attempts (identifier, ip, success) values (${key}, ${ip}, true)`
  if (user.role !== 'customer') await logActivity(user.id, `${user.role}.login`, 'user', user.id, { ip })
  await issueSession(res, user)
  send(res, 200, { user: publicUser(user) })
}

export async function logout(req, res) {
  clearSession(res)
  send(res, 200, { ok: true })
}

export async function me(req, res) {
  const user = await currentUser(req)
  send(res, 200, { user: user ? publicUser(user) : null })
}
