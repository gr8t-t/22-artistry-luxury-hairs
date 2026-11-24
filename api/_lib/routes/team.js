import crypto from 'node:crypto'
import { sql, logActivity, rateLimit } from '../db.js'
import { requireUser, hashPassword, verifyPassword, issueSession, publicUser } from '../auth.js'
import { send, body, text, uuid, normalizePhone, normalizeEmail, HttpError } from '../http.js'

// No look-alike characters (0/O, 1/l/I) so a temporary password is easy to read out and type
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const tempPassword = () => Array.from({ length: 10 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')

const mapMember = (u) => ({
  id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, active: u.is_active,
  mustChangePassword: !!u.must_change_password, createdAt: new Date(u.created_at).toISOString(),
  lastLogin: u.last_login ? new Date(u.last_login).toISOString() : null,
})

/** Manager: everyone who can log in to the staff area. */
export async function listTeam(req, res) {
  await requireUser(req, ['manager'])
  const rows = await sql`select u.id, u.name, u.phone, u.email, u.role, u.is_active, u.must_change_password, u.created_at,
      (select max(a.created_at) from activity_log a where a.actor_id = u.id and a.action in ('staff.login','manager.login')) as last_login
    from users u where u.role in ('staff','manager') order by (u.role = 'manager') desc, u.created_at`
  send(res, 200, { team: rows.map(mapMember) })
}

/** Manager creates a staff login. They get a temporary password and must choose their own at first login. */
export async function createStaff(req, res) {
  const manager = await requireUser(req, ['manager'])
  const b = body(req)
  const name = text(b.name, 'Name', { required: true, max: 80 })
  if (name.length < 2) throw new HttpError(400, "Enter the staff member's name")
  const phone = normalizePhone(String(b.phone || ''))
  if (!phone) throw new HttpError(400, 'Enter a valid Nigerian phone number. They will log in with it.')
  const email = b.email && String(b.email).trim() ? normalizeEmail(b.email) : null
  if (b.email && String(b.email).trim() && !email) throw new HttpError(400, 'That email address does not look right')
  let password = b.password ? String(b.password) : ''
  const generated = !password
  if (generated) password = tempPassword()
  else if (password.length < 8 || password.length > 128) throw new HttpError(400, 'A password must be 8 to 128 characters')

  const dup = (await sql`select name from users where phone = ${phone}`)[0]
  if (dup) throw new HttpError(409, `That phone number already belongs to ${dup.name}.`)
  if (email) {
    const e = (await sql`select name from users where email = ${email}`)[0]
    if (e) throw new HttpError(409, `That email already belongs to ${e.name}.`)
  }
  const hash = await hashPassword(password)
  const row = (await sql`insert into users (role, name, phone, email, password_hash, referral_code, must_change_password, created_by)
    values ('staff', ${name}, ${phone}, ${email}, ${hash}, ${crypto.randomBytes(4).toString('hex').toUpperCase()}, true, ${manager.id})
    returning id, name, phone, email, role, is_active, must_change_password, created_at`)[0]
  await logActivity(manager.id, 'team.staff_created', 'user', row.id, { name })
  // the temporary password is returned this one time and never stored in readable form
  send(res, 201, { member: mapMember(row), tempPassword: generated ? password : null })
}

async function staffTarget(id, manager) {
  const t = (await sql`select id, name, role from users where id = ${id}`)[0]
  if (!t) throw new HttpError(404, 'Team member not found')
  if (t.role !== 'staff') throw new HttpError(403, 'Only staff accounts can be changed here.')
  if (t.id === manager.id) throw new HttpError(403, 'You cannot change your own account here.')
  return t
}

/** Manager gives a staff member a new temporary password (for example after they forget it). They are logged out everywhere. */
export async function resetStaffPassword(req, res) {
  const manager = await requireUser(req, ['manager'])
  const t = await staffTarget(uuid(req.params.id), manager)
  const password = tempPassword()
  await sql`update users set password_hash = ${await hashPassword(password)}, must_change_password = true, token_version = token_version + 1 where id = ${t.id}`
  await logActivity(manager.id, 'team.password_reset', 'user', t.id, {})
  send(res, 200, { tempPassword: password })
}

/** Manager switches a staff login off or on. Switching off logs them out immediately. */
export async function setStaffActive(req, res) {
  const manager = await requireUser(req, ['manager'])
  const t = await staffTarget(uuid(req.params.id), manager)
  const active = body(req).active === true
  await sql`update users set is_active = ${active}, token_version = token_version + 1 where id = ${t.id}`
  await logActivity(manager.id, active ? 'team.staff_enabled' : 'team.staff_disabled', 'user', t.id, {})
  send(res, 200, { ok: true, active })
}

/** Manager corrects a staff member's name or phone. */
export async function updateStaff(req, res) {
  const manager = await requireUser(req, ['manager'])
  const t = await staffTarget(uuid(req.params.id), manager)
  const b = body(req)
  const name = b.name === undefined ? null : text(b.name, 'Name', { required: true, max: 80 })
  let phone = null
  if (b.phone !== undefined) {
    phone = normalizePhone(String(b.phone || ''))
    if (!phone) throw new HttpError(400, 'Enter a valid Nigerian phone number')
    const dup = (await sql`select name from users where phone = ${phone} and id <> ${t.id}`)[0]
    if (dup) throw new HttpError(409, `That phone number already belongs to ${dup.name}.`)
  }
  await sql`update users set name = coalesce(${name}::text, name), phone = coalesce(${phone}::text, phone) where id = ${t.id}`
  await logActivity(manager.id, 'team.staff_updated', 'user', t.id, {})
  send(res, 200, { ok: true })
}

/** Anyone logged in can change their own password. Their other devices are logged out and this one stays signed in. */
export async function changeMyPassword(req, res) {
  const user = await requireUser(req)
  await rateLimit(`pw:${user.id}`, 8, 15, 'Too many attempts. Please wait a few minutes and try again.')
  const b = body(req)
  const current = String(b.current || '')
  const next = String(b.next || '')
  if (!(await verifyPassword(current, user.password_hash))) throw new HttpError(400, 'Your current password is not correct.')
  if (next.length < 8 || next.length > 128) throw new HttpError(400, 'Your new password must be 8 to 128 characters.')
  if (next === current) throw new HttpError(400, 'Choose a password that is different from the old one.')
  const updated = (await sql`update users set password_hash = ${await hashPassword(next)}, must_change_password = false, token_version = token_version + 1
    where id = ${user.id} returning *`)[0]
  await issueSession(res, updated)
  if (user.role !== 'customer') await logActivity(user.id, `${user.role}.password_changed`, 'user', user.id, {})
  send(res, 200, { user: publicUser(updated) })
}
