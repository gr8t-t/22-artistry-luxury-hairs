import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Star, Wallet, Gift, UserRound, Users, Percent, CheckCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { naira, dateTime } from '../../lib/format'

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))
const label = 'block text-xs text-gray-400 font-poppins mb-1.5'

function Stat({ Icon, title, value }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs text-gray-300 font-poppins flex items-center gap-1.5"><Icon size={13} className="text-brand-pink" /> {title}</p>
      <p className="text-white font-bold text-xl mt-1">{value}</p>
    </div>
  )
}

const ACTIVITY_TEXT = {
  visit: 'Visit points', redeem: 'Free hair treatment', adjust: 'Adjustment',
  referral_reward: 'Referral reward', referral_reversal: 'Referral reward reversed',
  wallet_spend: 'Paid from Hair Wallet', wallet_refund: 'Hair Wallet refund', adjustment: 'Adjustment',
}

export default function RewardsPanel({ isManager }) {
  // ── customer lookup ──
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searchedFor, setSearchedFor] = useState('')
  const [customer, setCustomer] = useState(null)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const keyRef = useRef(newKey())
  const seq = useRef(0)

  useEffect(() => {
    const term = q.trim().replace(/\//g, '')
    if (term.length < 2 || customer) { setResults([]); return }
    const my = ++seq.current
    const t = setTimeout(async () => {
      try {
        const d = await api('/admin/customers/' + encodeURIComponent(term))
        if (my === seq.current) { setResults(d.customers); setSearchedFor(term) }
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(t)
  }, [q, customer])

  const loadCustomer = useCallback(async (c) => {
    const d = await api(`/admin/rewards/customer/${c.id}`)
    setCustomer(d.customer); setData(d.rewards); keyRef.current = newKey()
  }, [])

  const pick = async (c) => { setResults([]); setMsg(''); try { await loadCustomer(c) } catch (e) { setMsg(e.message) } }
  const clear = () => { setCustomer(null); setData(null); setQ(''); setMsg('') }

  const redeem = async () => {
    const first = customer.name.split(' ')[0]
    if (!window.confirm(`Redeem one FREE hair treatment for ${first}?\n\nThis uses ${data.pointsPerTreatment} of their points and cannot be undone.`)) return
    setBusy(true); setMsg('')
    try {
      const d = await api('/admin/rewards/redeem', { method: 'POST', body: { customerId: customer.id, idempotencyKey: keyRef.current } })
      setData(d.rewards); keyRef.current = newKey()
      setMsg(`Done. ${first}'s free hair treatment is redeemed.`)
      if (isManager) loadOverview()
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }

  // ── manager: settings + history ──
  const [ov, setOv] = useState(null)
  const [pct, setPct] = useState('')
  const [pctMsg, setPctMsg] = useState('')
  const loadOverview = useCallback(async () => {
    if (!isManager) return
    try { const d = await api('/admin/rewards/overview'); setOv(d); setPct(String(d.referralRatePercent)) } catch { /* ignore */ }
  }, [isManager])
  useEffect(() => { loadOverview() }, [loadOverview])

  const savePct = async () => {
    setPctMsg('')
    try {
      const d = await api('/admin/rewards/settings', { method: 'POST', body: { referralRatePercent: Number(pct) } })
      setPctMsg(`Saved. Referrers now earn ${d.referralRatePercent}% on payments recorded from now on.`)
      loadOverview()
    } catch (e) { setPctMsg(e.message) }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Lookup */}
      <div className="glass-card p-6 space-y-5">
        <div>
          <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><Gift size={20} className="text-brand-pink" /> Customer rewards</h2>
          <p className="text-gray-300 text-sm font-poppins mt-1">Look up a customer to see their points and Hair Wallet, or to redeem a free hair treatment.</p>
        </div>

        {customer ? (
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-brand-pink/40 bg-brand-pink/10">
            <div className="flex items-center gap-3 min-w-0">
              <UserRound size={16} className="text-brand-pink shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{customer.name}</p>
                <p className="text-gray-300 text-xs">{customer.phone}</p>
              </div>
            </div>
            <button onClick={clear} className="text-gray-300 hover:text-white" aria-label="Choose another customer"><X size={16} /></button>
          </div>
        ) : (
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-10" placeholder="Type name or phone number…" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
            {results.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-2 rounded-xl overflow-hidden border border-white/15" style={{ background: 'rgba(20,2,14,0.97)', backdropFilter: 'blur(20px)' }}>
                {results.map(c => (
                  <li key={c.id}>
                    <button type="button" onClick={() => pick(c)} className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors">
                      <span className="text-white text-sm block">{c.name}</span>
                      <span className="text-gray-400 text-xs">{c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim().length >= 2 && results.length === 0 && searchedFor === q.trim().replace(/\//g, '') && (
              <p className="text-xs text-gray-400 mt-2">No registered customer found.</p>
            )}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat Icon={Star} title="Points" value={data.points} />
              <Stat Icon={Gift} title="Free treatments" value={data.freeTreatments} />
              <Stat Icon={Wallet} title="Hair Wallet" value={naira(data.wallet)} />
              <Stat Icon={Users} title="Friends referred" value={data.referral.friends} />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 font-poppins mb-1.5">
                <span>Progress to the next free treatment</span>
                <span>{data.points % data.pointsPerTreatment} / {data.pointsPerTreatment}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-brand-pink" style={{ width: `${((data.points % data.pointsPerTreatment) / data.pointsPerTreatment) * 100}%` }} />
              </div>
            </div>

            {data.freeTreatments > 0 ? (
              <button onClick={redeem} disabled={busy} className="btn-primary w-full disabled:opacity-60">
                <CheckCircle size={16} /> {busy ? 'Redeeming…' : `Redeem a free hair treatment (${data.freeTreatments} available)`}
              </button>
            ) : (
              <p className="text-sm text-gray-300 font-poppins rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {customer.name.split(' ')[0]} needs {data.pointsToNext} more point{data.pointsToNext === 1 ? '' : 's'} for a free hair treatment.
              </p>
            )}

            {data.activity.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-poppins mb-2">Recent activity</p>
                <ul className="divide-y divide-white/10 text-sm font-poppins">
                  {data.activity.slice(0, 6).map((a, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2">
                      <span className="text-gray-200 min-w-0 truncate">{ACTIVITY_TEXT[a.type] || a.type}{a.kind === 'wallet' && a.note ? ` · ${a.note.split(' ')[0]}` : ''}</span>
                      <span className={`shrink-0 font-semibold ${a.amount < 0 ? 'text-red-300' : 'text-green-300'}`}>
                        {a.kind === 'points' ? `${a.amount > 0 ? '+' : ''}${a.amount} pts` : `${a.amount > 0 ? '+' : ''}${naira(a.amount)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {msg && <p className="text-sm font-poppins text-gray-100" role="status">{msg}</p>}
      </div>

      {/* Manager: referral percentage + history */}
      {isManager && ov && (
        <>
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-playfair text-white font-semibold text-lg flex items-center gap-2"><Percent size={18} className="text-brand-pink" /> Referral reward</h3>
            <p className="text-gray-300 text-sm font-poppins leading-relaxed">
              When a customer pays, the friend who invited them earns this percentage of the payment in their Hair Wallet.
              A change applies to payments recorded <b className="text-white">from now on</b>. Rewards already paid keep the rate they were earned at.
            </p>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className={label}>Percentage (0 to {ov.maxPercent})</label>
                <div className="relative w-36">
                  <input className="input-field pr-9" type="number" min="0" max={ov.maxPercent} step="0.01" value={pct} onChange={e => setPct(e.target.value)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
              </div>
              <button onClick={savePct} className="btn-primary">Save</button>
            </div>
            {pctMsg && <p className="text-sm font-poppins text-gray-100" role="status">{pctMsg}</p>}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Stat Icon={Users} title="Rewards paid (net)" value={naira(ov.totals.referralRewardsNet)} />
              <Stat Icon={Wallet} title="Held in wallets" value={naira(ov.totals.walletHeldByCustomers)} />
              <Stat Icon={Gift} title="Treatments given" value={ov.totals.treatmentsRedeemed} />
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-playfair text-white font-semibold text-lg mb-3">Recent referral rewards</h3>
            {ov.rewards.length === 0 ? <p className="text-gray-400 text-sm font-poppins">None yet.</p> : (
              <ul className="divide-y divide-white/10 text-sm font-poppins">
                {ov.rewards.slice(0, 10).map((r, i) => (
                  <li key={i} className="py-2.5 flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-gray-100 block truncate">{r.referrer} <span className="text-gray-400">earned from</span> {r.friend}</span>
                      <span className="text-gray-400 text-xs">{dateTime(r.createdAt)}{r.ratePercent ? ` · ${r.ratePercent}%` : ''}{r.receiptNo ? ` · ${r.receiptNo}` : ''}{r.type === 'referral_reversal' ? ' · reversed' : ''}</span>
                    </span>
                    <span className={`shrink-0 font-semibold ${r.amount < 0 ? 'text-red-300' : 'text-green-300'}`}>{r.amount > 0 ? '+' : ''}{naira(r.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-playfair text-white font-semibold text-lg mb-3">Free treatments given</h3>
            {ov.redemptions.length === 0 ? <p className="text-gray-400 text-sm font-poppins">None yet.</p> : (
              <ul className="divide-y divide-white/10 text-sm font-poppins">
                {ov.redemptions.slice(0, 10).map((r, i) => (
                  <li key={i} className="py-2.5 flex justify-between gap-3">
                    <span className="text-gray-100">{r.customer}</span>
                    <span className="text-gray-400 text-xs">{dateTime(r.createdAt)} · by {r.staff}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
