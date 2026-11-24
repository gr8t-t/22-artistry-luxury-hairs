// Single entry point for the whole backend (keeps us under Vercel's function limit).
// vercel.json rewrites /api/<anything> to /api?p=<anything>, and we route on that.
// Add new routes to the table below as we build each step.
import { HttpError, send } from './_lib/http.js'
import * as auth from './_lib/routes/auth.js'
import * as catalog from './_lib/routes/catalog.js'
import * as engage from './_lib/routes/engage.js'
import * as payments from './_lib/routes/payments.js'
import * as notifications from './_lib/routes/notifications.js'
import * as rewards from './_lib/routes/rewards.js'
import * as wallet from './_lib/routes/wallet.js'

const ROUTES = [
  // Accounts
  ['POST',   '/auth/register', auth.register],
  ['POST',   '/auth/login',    auth.login],
  ['POST',   '/auth/logout',   auth.logout],
  ['GET',    '/auth/me',       auth.me],

  // Public
  ['GET',    '/catalog',       catalog.publicCatalog],
  ['POST',   '/bookings',      engage.createBooking],
  ['POST',   '/reviews',       engage.createReview],

  ['GET',    '/push/key',      notifications.pushKey],

  // Any logged-in user
  ['GET',    '/me/payments',   payments.myPayments],
  ['GET',    '/me/rewards',    rewards.myRewards],
  ['GET',    '/me/wallet',     wallet.myWallet],
  ['POST',   '/me/wallet/goal', wallet.saveGoal],
  ['DELETE', '/me/wallet/goal', wallet.deleteGoal],
  ['POST',   '/me/wallet/refund', wallet.requestRefund],
  ['POST',   '/me/wallet/refund/:id/cancel', wallet.cancelRefund],
  ['GET',    '/admin/wallet/refunds', wallet.listRefunds],
  ['POST',   '/admin/wallet/refunds/:id/decide', wallet.decideRefund],
  ['GET',    '/cron/wallet-reminders', wallet.walletReminders],
  ['GET',    '/me/notifications',        notifications.listMine],
  ['POST',   '/me/notifications/read',   notifications.markRead],
  ['POST',   '/me/push/subscribe',       notifications.subscribe],
  ['POST',   '/me/push/unsubscribe',     notifications.unsubscribe],
  ['POST',   '/me/push/test',            notifications.sendTest],

  // Staff + manager
  ['GET',    '/admin/bookings',          engage.listBookings],
  ['PATCH',  '/admin/bookings/:id',      engage.updateBooking],
  ['GET',    '/admin/customers/:q',      payments.searchCustomers],
  ['GET',    '/admin/payments',          payments.listPayments],
  ['POST',   '/admin/payments',          payments.recordPayment],
  ['GET',    '/admin/rewards/customer/:id', rewards.customerRewards],
  ['POST',   '/admin/rewards/redeem',    rewards.redeemTreatment],

  // Manager only
  ['GET',    '/admin/rewards/overview',  rewards.rewardsOverview],
  ['POST',   '/admin/rewards/settings',  rewards.setRewardsSettings],
  ['POST',   '/admin/rewards/recalc/:id', rewards.recalcPayment],
  ['POST',   '/admin/payments/:id/reverse', payments.reversePayment],
  ['GET',    '/admin/reviews',           engage.listAllReviews],
  ['PATCH',  '/admin/reviews/:id',       engage.approveReview],
  ['DELETE', '/admin/reviews/:id',       engage.deleteReview],
  ['POST',   '/admin/products',          catalog.createProduct],
  ['PATCH',  '/admin/products/:id',      catalog.updateProduct],
  ['DELETE', '/admin/products/:id',      catalog.deleteProduct],
  ['POST',   '/admin/gallery',           catalog.createGalleryImage],
  ['DELETE', '/admin/gallery/:id',       catalog.deleteGalleryImage],
  ['POST',   '/admin/announcements',     catalog.createAnnouncement],
  ['DELETE', '/admin/announcements/:id', catalog.deleteAnnouncement],
  ['POST',   '/admin/import',            catalog.importFromBrowser],
].map(([method, pattern, handler]) => {
  const names = []
  const regex = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return '([^/]+)' }) + '$')
  return { method, regex, names, handler }
})

function routePath(req) {
  const p = req.query?.p
  const raw = Array.isArray(p) ? p.join('/') : (p ?? '')
  return '/' + String(raw).split('/').filter(Boolean).join('/')
}

export default async function handler(req, res) {
  try {
    const path = routePath(req)
    let matchedPath = false
    for (const r of ROUTES) {
      const m = r.regex.exec(path)
      if (!m) continue
      matchedPath = true
      if (r.method !== req.method) continue
      req.params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]))
      return await r.handler(req, res)
    }
    throw new HttpError(matchedPath ? 405 : 404, matchedPath ? 'Method not allowed' : 'Not found')
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message })
    console.error(e)
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  }
}
