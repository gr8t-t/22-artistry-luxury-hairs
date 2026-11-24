// Shared FlexPay helpers for the customer and staff screens.

/** First (and regular) weekly instalment in naira, exactly as the server splits it. */
export function flexInstalment(totalNaira, weeks) {
  const kobo = Math.round(totalNaira * 100)
  return Math.floor(kobo / weeks) / 100
}

export const weeksLabel = (w) => {
  if (w < 9) return `${w} weeks`
  const months = Math.round((w / 4.345) * 2) / 2
  return `${w} weeks (about ${months} month${months === 1 ? '' : 's'})`
}

export const PLAN_STATUS = {
  pending: 'Waiting for first payment',
  active: 'Running',
  completed: 'Fully paid, ready to collect',
  collected: 'Collected',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
}

export const dayLabel = (iso) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

/** The FlexPay terms. The figures come from the server so the text can never disagree with the rules. */
export function flexTerms({ refundPercent = 80, pendingDays = 7, minWeeks = 2, maxWeeks = 22 } = {}) {
  return [
    ['How FlexPay works', `FlexPay lets you pay for wigs and accessories in weekly instalments instead of all at once. You choose how long you need, from ${minWeeks} weeks up to ${maxWeeks} weeks (about 5 months). We split the total into equal weekly instalments and show you the schedule before you agree.`],
    ['Starting your plan', `Your plan starts when your first payment is received at the salon. Please make it within ${pendingDays} days of creating the plan. If no payment is made in that time, the plan is cancelled automatically and you can start a new one.`],
    ['Your items are held for you', 'Once your first payment is in, your items are held for you. They are handed over after your final payment. You may not take the items home before the plan is fully paid.'],
    ['Making payments', 'Pay at the salon by cash, POS or bank transfer, or from your Hair Wallet. Every payment is recorded by our staff and you receive a receipt and a notification. You may pay more than the weekly amount at any time, but never more than what is left on the plan.'],
    ['No late fees', 'We do not charge late fees or interest. You will get friendly reminders before a payment is due and when one is behind. The total price of your plan never goes up because of late payments.'],
    ['Changing your items', 'You can swap items by speaking to our staff. The total is recalculated, the money you have already paid stays on your plan, and your remaining weekly instalments are adjusted. A swap cannot bring the total below what you have already paid.'],
    ['Stopping your plan', `You may stop a plan at any time by sending a request from your account. A manager approves it. If it is approved, you will be refunded ${refundPercent}% of the total you have paid so far, by cash or bank transfer, and the remaining ${100 - refundPercent}% is kept by the salon. Your items are then released and the plan is closed. Cancelling a plan before you have paid anything costs nothing.`],
    ['Prices', 'The price of each item is the price shown on the day you create your plan. If you swap items later, the price at that time applies to the new item.'],
  ]
}
