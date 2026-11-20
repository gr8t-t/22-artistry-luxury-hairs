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
