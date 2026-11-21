import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Receipt as ReceiptIcon, Banknote, CreditCard, Landmark, RotateCcw, UserRound, Wallet, Gift } from 'lucide-react'
import { api } from '../../lib/api'
import { naira, dateTime, PURPOSE_LABEL, METHOD_LABEL } from '../../lib/format'
import Receipt from '../Receipt'

const PURPOSES = ['service', 'product', 'booking_deposit', 'other']
const METHODS = [
  { id: 'cash', label: 'Cash', Icon: Banknote },
  { id: 'pos', label: 'POS (card)', Icon: CreditCard },
  { id: 'transfer', label: 'Transfer', Icon: Landmark },
  { id: 'wallet', label: 'Hair Wallet', Icon: Wallet },
]

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

export default function PaymentsPanel({ isManager }) {
  const [mode, setMode] = useState('registered') // registered | walkin
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searchedFor, setSearchedFor] = useState('')
  const [customer, setCustomer] = useState(null)
  const [walkName, setWalkName] = useState('')
  const [walkPhone, setWalkPhone] = useState('')
  const [purpose, setPurpose] = useState('service')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const keyRef = useRef(newKey())

  const [payments, setPayments] = useState([])
  const [today, setToday] = useState({ total: 0, count: 0 })
  const [listError, setListError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [rewardNote, setRewardNote] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await api('/admin/payments')
      setPayments(d.payments)
      setToday(d.today)
      setListError('')
    } catch (e) { setListError(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  // Customer search (ignores out-of-date answers)
  const searchSeq = useRef(0)
  useEffect(() => {
    const term = q.trim().replace(/\//g, '')
    if (term.length < 2 || customer) { setResults([]); return }
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      try {
        const d = await api('/admin/customers/' + encodeURIComponent(term))
        if (seq === searchSeq.current) { setResults(d.customers); setSearchedFor(term) }
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(t)
  }, [q, customer])

  const reset = () => {
    setCustomer(null); setQ(''); setResults([]); setWalkName(''); setWalkPhone('')
    setDescription(''); setAmount(''); setReference(''); setError('')
    keyRef.current = newKey()
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setRewardNote('')
    const value = Number(amount)
    if (!amount || !Number.isFinite(value) || value <= 0) return setError('Enter the amount received.')
    if (mode === 'registered' && !customer) return setError('Search and select the customer, or switch to Walk-in.')
    if (method === 'wallet' && mode !== 'registered') return setError('Hair Wallet can only be used for a registered customer.')
    if (mode === 'walkin' && !walkName.trim()) return setError('Enter the customer\'s name.')

    const who = mode === 'registered' ? customer.name : walkName.trim()
    if (!window.confirm(`Record ${naira(value)} received by ${METHOD_LABEL[method]} from ${who}?\n\nThis cannot be edited afterwards (only a manager can reverse it).`)) return

    setBusy(true)
    try {
      const d = await api('/admin/payments', {
        method: 'POST',
        body: {
          idempotencyKey: keyRef.current,
          customerId: mode === 'registered' ? customer.id : undefined,
          customerName: mode === 'walkin' ? walkName.trim() : undefined,
          customerPhone: mode === 'walkin' && walkPhone.trim() ? walkPhone.trim() : undefined,
          purpose, description: description.trim(), amount: value, method, reference: reference.trim(),
        },
      })
      setReceipt(d.payment)
      const r = d.rewards
      const bits = []
      if (r && r.points > 0) bits.push(`${r.points} loyalty point${r.points > 1 ? 's' : ''} earned (now ${r.totalPoints})`)
      if (r && r.unlockedFreeTreatment) bits.push('a FREE hair treatment is now available to claim')
      if (r && r.referralReward > 0) bits.push(`${naira(r.referralReward)} referral reward sent to the friend who invited them`)
      setRewardNote(bits.length ? bits.join('. ') + '.' : '')
      reset()
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reverse = async (p) => {
    const reason = window.prompt(`Reverse ${p.receiptNo} (${naira(p.amount)})?\n\nType the reason (required):`)
    if (!reason || reason.trim().length < 3) return
    try {
      await api(`/admin/payments/${p.id}/reverse`, { method: 'POST', body: { reason: reason.trim() } })
      load()
    } catch (err) { window.alert(err.message) }
  }

  const label = 'block text-xs text-gray-400 font-poppins mb-1.5'

  return (
    <div className="space-y-8">
      {/* Today */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-gray-400 font-poppins">Collected today</p>
          <p className="text-2xl font-bold text-white mt-1">{naira(today.total)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-gray-400 font-poppins">Payments today</p>
          <p className="text-2xl font-bold text-white mt-1">{today.count}</p>
        </div>
      </div>

      {/* Record payment */}
      <form onSubmit={submit} className="glass-card p-6 space-y-5">
        <h2 className="font-playfair text-white font-semibold text-xl">Record a payment</h2>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {[['registered', 'Registered customer'], ['walkin', 'Walk-in']].map(([m, t]) => (
            <button type="button" key={m} onClick={() => { setMode(m); setError('') }}
              className={`py-2 rounded-full text-sm font-poppins transition-all ${mode === m ? 'bg-brand-pink text-white' : 'text-gray-300 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {mode === 'registered' ? (
          <div>
            <label className={label}>Customer</label>
            {customer ? (
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-brand-pink/40 bg-brand-pink/10">
                <div className="flex items-center gap-3 min-w-0">
                  <UserRound size={16} className="text-brand-pink shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{customer.name}</p>
                    <p className="text-gray-300 text-xs">{customer.phone}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setCustomer(null); setQ('') }} className="text-gray-300 hover:text-white" aria-label="Change customer"><X size={16} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-10" placeholder="Type name or phone number…" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
                {results.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-2 rounded-xl overflow-hidden border border-white/15"
                    style={{ background: 'rgba(20,2,14,0.97)', backdropFilter: 'blur(20px)' }}>
                    {results.map(c => (
                      <li key={c.id}>
                        <button type="button" onClick={() => { setCustomer(c); setResults([]) }}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors">
                          <span className="text-white text-sm block">{c.name}</span>
                          <span className="text-gray-400 text-xs">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {q.trim().length >= 2 && results.length === 0 && searchedFor === q.trim().replace(/\//g, '') && (
                  <p className="text-xs text-gray-400 mt-2">No match yet — if they have no account, use the Walk-in tab.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Customer name *</label>
              <input className="input-field" value={walkName} onChange={e => setWalkName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className={label}>Phone (optional)</label>
              <input className="input-field" inputMode="tel" value={walkPhone} onChange={e => setWalkPhone(e.target.value)} placeholder="08012345678" />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Payment for</label>
            <select className="input-field" value={purpose} onChange={e => setPurpose(e.target.value)}>
              {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Amount received (₦) *</label>
            <input className="input-field" type="number" inputMode="decimal" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div>
          <label className={label}>Details (optional)</label>
          <input className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Frontal install + colour" maxLength={300} />
        </div>

        <div>
          <label className={label}>How was it paid?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {METHODS.map(({ id, label: t, Icon }) => (
              <button type="button" key={id} onClick={() => setMethod(id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-poppins transition-all ${
                  method === id ? 'border-brand-pink bg-brand-pink/20 text-white' : 'border-white/15 text-gray-300 hover:text-white hover:border-white/30'}`}>
                <Icon size={18} /> {t}
              </button>
            ))}
          </div>
        </div>

        {method !== 'cash' && method !== 'wallet' && (
          <div>
            <label className={label}>{method === 'pos' ? 'POS receipt / RRN number' : 'Transfer reference'} (optional)</label>
            <input className="input-field" value={reference} onChange={e => setReference(e.target.value)} maxLength={80} />
          </div>
        )}

        {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
        {rewardNote && (
          <p className="text-sm font-poppins text-green-200 rounded-xl px-4 py-3 flex gap-2" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }} role="status">
            <Gift size={16} className="shrink-0 mt-0.5" /> <span>Recorded. {rewardNote}</span>
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {busy ? 'Recording…' : 'Record payment & print receipt'}
        </button>
      </form>

      {/* Recent payments */}
      <div>
        <h3 className="font-playfair text-white font-semibold text-lg mb-4">Recent payments</h3>
        {listError && <p className="text-red-400 text-sm mb-3">{listError}</p>}
        {payments.length === 0 && !listError ? (
          <p className="text-gray-400 text-sm font-poppins text-center py-10">No payments recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className={`glass-card p-4 flex items-center gap-4 flex-wrap ${p.status === 'reversed' ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-white text-sm font-semibold">{p.customerName}</p>
                  <p className="text-gray-400 text-xs">
                    {PURPOSE_LABEL[p.purpose]} · {METHOD_LABEL[p.method]} · {dateTime(p.createdAt)}
                  </p>
                  <p className="text-gray-500 text-xs font-mono mt-0.5">{p.receiptNo} · by {p.recordedBy}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${p.status === 'reversed' ? 'line-through text-gray-500' : 'text-white'}`}>{naira(p.amount)}</p>
                  {p.status === 'reversed' && <p className="text-xs text-red-300">Reversed</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setReceipt(p)} className="px-3 py-2 rounded-full border border-white/15 text-gray-200 hover:text-white hover:border-white/40 text-xs flex items-center gap-1.5 transition-colors">
                    <ReceiptIcon size={13} /> Receipt
                  </button>
                  {isManager && p.status === 'confirmed' && (
                    <button onClick={() => reverse(p)} className="px-3 py-2 rounded-full border border-red-400/30 text-red-300 hover:bg-red-500/10 text-xs flex items-center gap-1.5 transition-colors">
                      <RotateCcw size={13} /> Reverse
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {receipt && <Receipt payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}
