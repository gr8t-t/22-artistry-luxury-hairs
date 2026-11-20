// All money is stored as integer kobo (₦1 = 100 kobo) so there are never rounding errors.
export const MAX_PAYMENT_KOBO = 5_000_000_000 // ₦50,000,000 safety cap per entry

/** Naira number/string (max 2 decimals) -> integer kobo, or null if invalid. */
export function nairaToKobo(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  const kobo = Math.round(n * 100)
  if (Math.abs(n * 100 - kobo) > 1e-6) return null // more than 2 decimals
  return kobo
}

/** Naira formatting for messages, e.g. 15000.5 -> N15,000.50 */
export const formatNaira = (n) => {
  const v = Number(n) || 0
  return '₦' + v.toLocaleString('en-NG', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })
}

/** Integer kobo (bigint/string/number) -> naira number. */
export const koboToNaira = (kobo) => Number(kobo) / 100
