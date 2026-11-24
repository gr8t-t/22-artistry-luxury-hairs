import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { sql } from './db.js'
import { HttpError } from './http.js'

const COOKIE = 'artistry_session'
const MAX_AGE = 60 * 60 * 24 * 90 // 90 days, renewed whenever the person keeps using the site
const RENEW_AFTER = 60 * 60 * 24 // renew the cookie when it is more than a day old

function secretKey() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET is missing or too short')
  return new TextEncoder().encode(s)
}

export const hashPassword = (pw) => bcrypt.hash(pw, 11)
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash)

export async function issueSession(res, user) {
  const token = await new SignJWT({ role: user.role, tv: user.token_version })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey())
  const secure = process.env.NODE_ENV === 'development' ? '' : ' Secure;'
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`)
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`)
}

function readCookie(req, name) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export function publicUser(u) {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    phone: u.phone,
    email: u.email,
    referralCode: u.referral_code,
    createdAt: u.created_at,
  }
}

/** Returns the logged-in user row, or null. Checks signature, expiry, token version, active flag. */
export async function currentUser(req) {
  const token = readCookie(req, COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    const rows = await sql`select * from users where id = ${payload.sub}`
    const u = rows[0]
    if (!u || !u.is_active || u.is_walkin || u.token_version !== payload.tv) return null
    u._iat = payload.iat
    return u
  } catch {
    return null
  }
}

/** Sliding login: an active person never gets logged out, because each visit renews the cookie. */
export async function renewSessionIfOld(res, user) {
  if (user?._iat && Date.now() / 1000 - user._iat > RENEW_AFTER) await issueSession(res, user)
}

/** Throws 401/403 unless a logged-in user has one of the given roles (any role if none given). */
export async function requireUser(req, roles = null) {
  const u = await currentUser(req)
  if (!u) throw new HttpError(401, 'Please log in')
  if (roles && !roles.includes(u.role)) throw new HttpError(403, 'You do not have permission to do this')
  return u
}
