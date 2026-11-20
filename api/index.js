// Single entry point for the whole backend (keeps us under Vercel's function limit).
// vercel.json rewrites /api/<anything> to /api?p=<anything>, and we route on that.
// Add new routes to the table below as we build each step.
import { HttpError, send } from './_lib/http.js'
import * as auth from './_lib/routes/auth.js'

const ROUTES = {
  'POST /auth/register': auth.register,
  'POST /auth/login': auth.login,
  'POST /auth/logout': auth.logout,
  'GET /auth/me': auth.me,
}

function routePath(req) {
  const p = req.query?.p
  const raw = Array.isArray(p) ? p.join('/') : (p ?? '')
  return '/' + String(raw).split('/').filter(Boolean).join('/')
}

export default async function handler(req, res) {
  try {
    const key = `${req.method} ${routePath(req)}`
    const route = ROUTES[key]
    if (!route) throw new HttpError(404, 'Not found')
    await route(req, res)
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message })
    console.error(e)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
