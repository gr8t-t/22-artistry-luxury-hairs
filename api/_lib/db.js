import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

export const sql = neon(process.env.DATABASE_URL)

export async function logActivity(actorId, action, entity = null, entityId = null, meta = null) {
  try {
    await sql`insert into activity_log (actor_id, action, entity, entity_id, meta)
              values (${actorId}, ${action}, ${entity}, ${entityId}, ${meta ? JSON.stringify(meta) : null})`
  } catch (e) {
    console.error('activity log failed', e)
  }
}

/** Throws 429 if `bucket` has been used `max` times in the last `minutes`. Records this use. */
export async function rateLimit(bucket, max, minutes, message = 'Too many requests. Please try again later.') {
  const rows = await sql`select count(*)::int as n from rate_events
    where bucket = ${bucket} and created_at > now() - (${minutes} * interval '1 minute')`
  if (rows[0].n >= max) {
    const { HttpError } = await import('./http.js')
    throw new HttpError(429, message)
  }
  await sql`insert into rate_events (bucket) values (${bucket})`
}
