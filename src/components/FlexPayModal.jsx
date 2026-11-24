import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, CalendarClock, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { naira } from '../lib/format'
import { flexInstalment, weeksLabel, flexTerms } from '../lib/flexpay'

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

/** Opened from the cart: the customer picks how long they need and agrees to the terms. */
export default function FlexPayModal({ items, total, onClose, onDone }) {
  const { user } = useAuth()
  const [rules, setRules] = useState(null)
  const [weeks, setWeeks] = useState(8)
  const [accepted, setAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const keyRef = useRef(newKey())

  useEffect(() => {
    if (!user) return
    api('/me/flexpay').then(d => setRules(d.rules)).catch(() => setRules({ minWeeks: 2, maxWeeks: 22, refundPercent: 80, pendingDays: 7 }))
  }, [user])

  const submit = async () => {
    setBusy(true); setError('')
    try {
      await api('/me/flexpay', {
        method: 'POST',
        body: { items: items.map(i => ({ productId: i.id, qty: i.qty })), weeks, acceptTerms: true, idempotencyKey: keyRef.current },
      })
      setDone({ each })
      onDone?.()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const rate = rules || { minWeeks: 2, maxWeeks: 22, refundPercent: 80, pendingDays: 7 }
  const each = flexInstalment(total, weeks)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="FlexPay">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto glass-card rounded-t-2xl sm:rounded-2xl p-6" style={{ background: 'rgba(24,4,18,0.96)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white" aria-label="Close"><X size={20} /></button>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={18} className="text-brand-pink" />
          <h3 className="font-playfair text-white font-bold text-lg">Pay with FlexPay</h3>
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="body-copy text-sm">Please log in or create an account to set up a payment plan.</p>
            <Link to="/account" onClick={onClose} className="btn-primary w-full">Log in or sign up</Link>
          </div>
        ) : user.role !== 'customer' ? (
          <p className="body-copy text-sm">Payment plans are set up from a customer account.</p>
        ) : done ? (
          <div className="space-y-4">
            <p className="text-white font-semibold font-poppins">Your plan is ready.</p>
            <p className="body-copy text-sm">
              Pay your first {naira(done.each)} at the salon within {rate.pendingDays} days to start it. Your items are held for you from that first payment.
            </p>
            <Link to="/account" onClick={onClose} className="btn-primary w-full">View my plan</Link>
          </div>
        ) : (
          <div className="space-y-5">
            <ul className="text-sm font-poppins text-gray-200 space-y-1">
              {items.map(i => <li key={i.id} className="flex justify-between gap-3"><span className="truncate">{i.name} x{i.qty}</span><span className="shrink-0">{naira(i.price * i.qty)}</span></li>)}
              <li className="flex justify-between gap-3 pt-2 border-t border-white/10 text-white font-semibold"><span>Total</span><span>{naira(total)}</span></li>
            </ul>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="flex-weeks" className="text-xs text-gray-300 font-poppins">How long do you need?</label>
                <span className="text-white text-sm font-poppins font-semibold">{weeksLabel(weeks)}</span>
              </div>
              <input id="flex-weeks" type="range" min={rate.minWeeks} max={rate.maxWeeks} step="1" value={weeks}
                onChange={e => setWeeks(Number(e.target.value))} className="w-full accent-pink-500" />
              <div className="flex justify-between text-[11px] text-gray-400 font-poppins"><span>{rate.minWeeks} weeks</span><span>5 months</span></div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs text-gray-300 font-poppins">You pay about</p>
              <p className="text-white font-bold text-3xl mt-1">{naira(each)} <span className="text-sm font-normal text-gray-300">every week</span></p>
              <p className="body-copy text-xs mt-2">Your first payment of {naira(each)} starts the plan and holds your items. No late fees, no interest.</p>
            </div>

            <div>
              <button type="button" onClick={() => setShowTerms(s => !s)} className="text-brand-pink text-sm font-poppins flex items-center gap-1">
                Read the FlexPay terms <ChevronDown size={14} className={showTerms ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showTerms && (
                <div className="mt-3 max-h-48 overflow-y-auto space-y-3 pr-1 text-xs font-poppins text-gray-300">
                  {flexTerms(rate).map(([h, t]) => <div key={h}><p className="text-white font-semibold mb-0.5">{h}</p><p className="leading-relaxed">{t}</p></div>)}
                </div>
              )}
            </div>

            <label className="flex gap-3 items-start text-sm font-poppins text-gray-200">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" />
              <span>I have read and accept the FlexPay terms, including that stopping a plan refunds {rate.refundPercent}% of what I have paid.</span>
            </label>

            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
            <button onClick={submit} disabled={!accepted || busy} className="btn-primary w-full disabled:opacity-50">
              {busy ? 'Creating your plan…' : 'Create my plan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
