export const naira = (n) => {
  const v = Number(n) || 0
  return (v < 0 ? '-' : '') + '₦' + Math.abs(v).toLocaleString('en-NG', {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const PURPOSE_LABEL = {
  service: 'Service',
  product: 'Product purchase',
  booking_deposit: 'Booking deposit',
  other: 'Other',
  wallet_topup: 'Hair Wallet top-up',
  flexpay_instalment: 'FlexPay instalment',
}

export const METHOD_LABEL = { cash: 'Cash', pos: 'POS (card)', transfer: 'Bank transfer', wallet: 'Hair Wallet' }

export const timeAgo = (iso) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
