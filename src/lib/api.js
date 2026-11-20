/** Thin wrapper around fetch for our /api backend. Throws Error(message) on failure. */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  let data = {}
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}
