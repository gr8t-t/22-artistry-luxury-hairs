export const naira = (n) => {
  const v = Number(n) || 0
  return '₦' + v.toLocaleString('en-NG', {
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

export const METHOD_LABEL = { cash: 'Cash', pos: 'POS (card)', transfer: 'Bank transfer' }
