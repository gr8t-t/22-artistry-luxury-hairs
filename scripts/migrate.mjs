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

  // ── Step 2: catalogue, bookings, reviews, announcements ──
  `create table if not exists products (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    category    text not null default 'Hair',
    price_kobo  bigint not null check (price_kobo >= 0),
    quantity    integer not null default 0 check (quantity >= 0),
    description text not null default '',
    image       text not null default '',
    featured    boolean not null default false,
    created_at  timestamptz not null default now()
  )`,
  `create table if not exists gallery_images (
    id         uuid primary key default gen_random_uuid(),
    url        text not null,
    caption    text not null default '',
    created_at timestamptz not null default now()
  )`,
  `create table if not exists announcements (
    id         uuid primary key default gen_random_uuid(),
    title      text not null default '',
    message    text not null default '',
    image_url  text not null default '',
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists bookings (
    id          uuid primary key default gen_random_uuid(),
    customer_id uuid references users(id),
    name        text not null,
    phone       text not null,
    service     text not null,
    date        text not null,
    time        text not null,
    notes       text not null default '',
    status      text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
    created_at  timestamptz not null default now()
  )`,
  `create index if not exists idx_bookings_created on bookings (created_at desc)`,
  `create table if not exists reviews (
    id          uuid primary key default gen_random_uuid(),
    customer_id uuid references users(id),
    name        text not null,
    service     text not null default '',
    rating      integer not null check (rating between 1 and 5),
    comment     text not null,
    approved    boolean not null default false,
    created_at  timestamptz not null default now()
  )`,
  `create table if not exists rate_events (
    id         bigserial primary key,
    bucket     text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_rate_events_lookup on rate_events (bucket, created_at)`,

  // ── Step 2: payments (recorded by staff; never edited, only reversed by a manager) ──
  `create sequence if not exists receipt_seq start 1`,
  `create table if not exists payments (
    id              uuid primary key default gen_random_uuid(),
    receipt_no      text not null unique,
    idempotency_key text unique,
    customer_id     uuid references users(id),
    customer_name   text not null,
    customer_phone  text,
    purpose         text not null check (purpose in ('service','product','booking_deposit','wallet_topup','flexpay_instalment','other')),
    description     text not null default '',
    amount_kobo     bigint not null check (amount_kobo > 0),
    method          text not null check (method in ('cash','pos','transfer')),
    reference       text not null default '',
    booking_id      uuid references bookings(id),
    recorded_by     uuid not null references users(id),
    status          text not null default 'confirmed' check (status in ('confirmed','reversed')),
    reversed_by     uuid references users(id),
    reversed_at     timestamptz,
    reverse_reason  text,
    created_at      timestamptz not null default now()
  )`,
  `create index if not exists idx_payments_created on payments (created_at desc)`,
  `create index if not exists idx_payments_customer on payments (customer_id, created_at desc)`,

  // ── Step 3: notifications + push subscriptions ──
  `create table if not exists notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users(id) on delete cascade,
    type       text not null,
    title      text not null,
    body       text not null default '',
    url        text not null default '/',
    read_at    timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_notifications_user on notifications (user_id, created_at desc)`,
  `create index if not exists idx_notifications_unread on notifications (user_id) where read_at is null`,
  `create table if not exists push_subscriptions (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users(id) on delete cascade,
    endpoint   text not null unique,
    p256dh     text not null,
    auth       text not null,
    user_agent text,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id)`,

  // ── Step 4: loyalty points, referral rewards, Hair Wallet ledger ──
  `alter table payments drop constraint if exists payments_method_check`,
  `alter table payments add constraint payments_method_check check (method in ('cash','pos','transfer','wallet'))`,
  `create table if not exists settings (
    key        text primary key,
    value      text not null,
    updated_by uuid references users(id),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists points_ledger (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users(id),
    points     integer not null,
    reason     text not null check (reason in ('visit','redeem','adjust')),
    day        date,
    payment_id uuid references payments(id),
    note       text not null default '',
    created_by uuid references users(id),
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_points_user on points_ledger (user_id, created_at desc)`,
  `create index if not exists idx_points_visit_day on points_ledger (user_id, day) where reason = 'visit'`,
  `create table if not exists treatment_redemptions (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id),
    points_spent    integer not null,
    note            text not null default '',
    staff_id        uuid not null references users(id),
    idempotency_key text unique,
    created_at      timestamptz not null default now()
  )`,
  `create table if not exists wallet_ledger (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references users(id),
    amount_kobo    bigint not null,
    type           text not null check (type in ('referral_reward','referral_reversal','wallet_spend','wallet_refund','adjustment')),
    payment_id     uuid references payments(id),
    source_user_id uuid references users(id),
    rate_bps       integer,
    note           text not null default '',
    created_by     uuid references users(id),
    created_at     timestamptz not null default now()
  )`,
  `create index if not exists idx_wallet_user on wallet_ledger (user_id, created_at desc)`,
  `create unique index if not exists uq_wallet_payment_type on wallet_ledger (payment_id, type) where payment_id is not null`,
]

for (const stmt of STATEMENTS) {
  await sql.query(stmt)
}

// First-time starter content (only if the tables are empty) so the site is never bare.
const [{ n: productCount }] = await sql`select count(*)::int as n from products`
if (productCount === 0) {
  const U = (id) => `https://images.unsplash.com/${id}?w=600&q=80`
  const seed = [
    ['Brazilian Body Wave Bundle', 'Hair', 2500000, 10, '100% virgin Brazilian hair. Soft, silky body wave texture. Available in 10" – 30".', U('photo-1522337360788-8b13dee7a37e'), true],
    ['Frontal Lace 13x4', 'Hair', 1800000, 8, 'Pre-plucked hairline. Invisible knots. Swiss lace. Perfect for a natural look.', U('photo-1560472354-b33ff0c44a43'), true],
    ['Luxury Press-On Nails Set', 'Accessories', 550000, 20, 'Salon-quality press-on nails. Long-lasting adhesive. Various designs available.', U('photo-1604654894610-df63bc536371'), false],
    ['Mink Lash Extension Set', 'Beauty', 450000, 15, 'Ultra-natural mink lashes. Full volume, lightweight. Reusable up to 25 times.', U('photo-1516975080664-ed2fc6a32937'), true],
  ]
  for (const [name, category, price, qty, description, image, featured] of seed) {
    await sql`insert into products (name, category, price_kobo, quantity, description, image, featured)
              values (${name}, ${category}, ${price}, ${qty}, ${description}, ${image}, ${featured})`
  }
  console.log('Seeded starter products')
}
const [{ n: galleryCount }] = await sql`select count(*)::int as n from gallery_images`
if (galleryCount === 0) {
  const U = (id) => `https://images.unsplash.com/${id}?w=600&q=80`
  const seed = [
    ['photo-1522337360788-8b13dee7a37e', 'Frontal Install'], ['photo-1560472354-b33ff0c44a43', 'Colour Treatment'],
    ['photo-1595476108010-b4d1f102b1b1', 'Machine Wigging'], ['photo-1605497788044-5a32c7078486', 'Revamp'],
    ['photo-1519735777090-ec97162dc266', 'Lash Extension'], ['photo-1516975080664-ed2fc6a32937', 'Nail Fix'],
  ]
  for (const [id, caption] of seed) {
    await sql`insert into gallery_images (url, caption) values (${U(id)}, ${caption})`
  }
  console.log('Seeded starter gallery')
}
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
console.log('Database ready. Tables:', tables.map(t => t.table_name).join(', '))
