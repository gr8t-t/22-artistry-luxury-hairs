// Creates the first manager (or staff) account. You type the password yourself;
// it is hidden while typing and never saved anywhere except as a secure hash.
// Usage: node --env-file=.env.local scripts/create-manager.mjs
import readline from 'node:readline'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing.'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('') }
    }
    rl.question(question, (answer) => { rl.close(); if (hidden) console.log(); resolve(answer.trim()) })
  })
}

function normalizePhone(input) {
  let p = String(input).replace(/[\s\-().]/g, '')
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('234')) p = p.slice(3); else if (p.startsWith('0')) p = p.slice(1)
  return /^[789][01]\d{8}$/.test(p) ? '+234' + p : null
}

const role = (await ask('Role (manager or staff) [manager]: ')) || 'manager'
if (!['manager', 'staff'].includes(role)) { console.error('Role must be manager or staff'); process.exit(1) }
const name = await ask('Full name: ')
const phone = normalizePhone(await ask('Phone number (e.g. 08012345678): '))
if (!name || !phone) { console.error('Name and a valid Nigerian phone number are required'); process.exit(1) }
const email = (await ask('Email (optional, press Enter to skip): ')).toLowerCase() || null
const pw1 = await ask('Password (min 10 characters): ', true)
const pw2 = await ask('Repeat password: ', true)
if (pw1 !== pw2) { console.error('Passwords do not match'); process.exit(1) }
if (pw1.length < 10) { console.error('Password must be at least 10 characters'); process.exit(1) }

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const code = Array.from(crypto.randomBytes(7)).map(b => CODE_CHARS[b % CODE_CHARS.length]).join('')
const hash = await bcrypt.hash(pw1, 11)

try {
  const rows = await sql`
    insert into users (role, name, phone, email, password_hash, referral_code)
    values (${role}, ${name}, ${phone}, ${email}, ${hash}, ${code})
    returning id`
  await sql`insert into activity_log (actor_id, action, entity, entity_id) values (${rows[0].id}, ${role + '.created_by_script'}, 'user', ${rows[0].id})`
  console.log(`\nDone. ${role} account created for ${name} (${phone}). You can now log in at /admin.`)
} catch (e) {
  console.error('\nCould not create account:', String(e.message).includes('unique') ? 'that phone or email already exists.' : e.message)
  process.exit(1)
}
