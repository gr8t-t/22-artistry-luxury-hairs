// Creates / updates the database tables. Safe to run many times.
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Run: vercel env pull .env.local --environment=production')
  process.exit(1)
}
const sql = neon(process.env.DATABASE_URL)

const STATEMENTS = [
  `create table if not exists users (
    id            uuid primary key default gen_random_uuid(),
    role          text not null default 'customer' check (role in ('customer','staff','manager')),
    name          text not null,
    phone         text not null unique,
    email         text unique,
    password_hash text not null,
    referral_code text not null unique,
    referred_by   uuid references users(id),
    token_version int  not null default 0,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now()
  )`,
  `create table if not exists login_attempts (
    id         bigserial primary key,
    identifier text not null,
    ip         text,
    success    boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_login_attempts_lookup on login_attempts (identifier, created_at)`,
  `create table if not exists activity_log (
    id         bigserial primary key,
    actor_id   uuid references users(id),
    action     text not null,
    entity     text,
    entity_id  text,
    meta       jsonb,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_activity_log_created on activity_log (created_at desc)`,
]

for (const stmt of STATEMENTS) {
  await sql.query(stmt)
}
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
console.log('Database ready. Tables:', tables.map(t => t.table_name).join(', '))
