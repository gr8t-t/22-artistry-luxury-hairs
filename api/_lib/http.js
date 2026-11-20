export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  return (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || 'unknown'
}

export function body(req) {
  const b = req.body
  if (!b) return {}
  if (typeof b === 'string') {
    try { return JSON.parse(b) } catch { throw new HttpError(400, 'Invalid request body') }
  }
  return b
}

/** Normalises Nigerian phone numbers to +234XXXXXXXXXX. Returns null if invalid. */
export function normalizePhone(input) {
  if (!input) return null
  let p = String(input).replace(/[\s\-().]/g, '')
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('234')) p = p.slice(3)
  else if (p.startsWith('0')) p = p.slice(1)
  if (!/^[789][01]\d{8}$/.test(p)) return null
  return '+234' + p
}

export function normalizeEmail(input) {
  if (!input) return null
  const e = String(input).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null
}
