// Set a new password for a manager or staff account (for when it has been forgotten).
// The password is typed here in the terminal and is never printed or stored in readable form.
//
// Usage (from the project folder):
//   node --env-file=.env.local scripts/set-password.mjs +2349075341220
// To only check that the account exists, without changing anything, add --check
import readline from 'node:readline'
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { normalizePhone } from '../api/_lib/http.js'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Run it exactly as shown above, from the project folder.')
  process.exit(1)
}
const sql = neon(process.env.DATABASE_URL)

const phone = normalizePhone(process.argv[2] || '')
if (!phone) {
  console.error('Give the phone number of the account, for example: +2349075341220')
  process.exit(1)
}
const user = (await sql`select id, name, role, is_active, is_walkin from users where phone = ${phone}`)[0]
if (!user || user.is_walkin || !['manager', 'staff'].includes(user.role)) {
  console.error('No manager or staff account has that phone number.')
  process.exit(1)
}
console.log(`Account found: ${user.name} (${user.role}${user.is_active ? '' : ', switched off'})`)
if (process.argv.includes('--check')) process.exit(0)

// ask for the password without showing it on screen
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl.stdoutMuted = false
    rl._writeToOutput = (s) => { if (rl.stdoutMuted) rl.output.write(s.includes('\n') ? s : '*'); else rl.output.write(s) }
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer) })
    rl.stdoutMuted = true
  })
}

const first = await ask('New password (at least 8 characters): ')
if (first.length < 8 || first.length > 128) { console.error('The password must be 8 to 128 characters. Nothing was changed.'); process.exit(1) }
const second = await ask('Type it again: ')
if (first !== second) { console.error('The two passwords do not match. Nothing was changed.'); process.exit(1) }

const hash = await bcrypt.hash(first, 11)
// token_version + 1 signs the account out of every other device
await sql`update users set password_hash = ${hash}, must_change_password = false, token_version = token_version + 1, is_active = true where id = ${user.id}`
await sql`insert into activity_log (actor_id, action, entity, entity_id, meta) values (${user.id}, 'team.password_set_by_script', 'user', ${String(user.id)}, ${JSON.stringify({ via: 'scripts/set-password.mjs' })}::jsonb)`
console.log(`Done. ${user.name} can now log in at /admin with ${phone} and the new password.`)
process.exit(0)
