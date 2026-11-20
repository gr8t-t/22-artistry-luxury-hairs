export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function send(res, status, data, cacheControl = 'no-store') {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheControl)
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

/** Clean, length-limited text. Throws a friendly 400 if required and empty. */
export function text(value, label, { max = 200, required = false } = {}) {
  const s = value === undefined || value === null ? '' : String(value).trim()
  if (required && !s) throw new HttpError(400, `${label} is required`)
  if (s.length > max) throw new HttpError(400, `${label} is too long (max ${max} characters)`)
  return s
}

export function whole(value, label, { min = 0, max = 1_000_000_000 } = {}) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be a whole number`)
  return n
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function uuid(value, label = 'id') {
  if (!UUID_RE.test(String(value || ''))) throw new HttpError(400, `Invalid ${label}`)
  return String(value).toLowerCase()
}

/** Only http(s) image links (or empty) are allowed. */
export function imageUrl(value, label = 'Image') {
  const s = text(value, label, { max: 2000 })
  if (s && !/^https:\/\//i.test(s)) throw new HttpError(400, `${label} must be a secure https:// link`)
  return s
}
