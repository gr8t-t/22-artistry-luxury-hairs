import { useState, useEffect, useCallback } from 'react'
import { Users, Search, UserPlus, ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { naira, dateTime, PURPOSE_LABEL, METHOD_LABEL } from '../../lib/format'
import { PLAN_STATUS } from '../../lib/flexpay'

const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
const ORDER_STATUS = { new: 'New', confirmed: 'Confirmed', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }

const Badge = ({ type }) => (
  <span className={`text-[11px] font-poppins px-2 py-0.5 rounded-full border ${type === 'walkin' ? 'border-amber-300/40 text-amber-200' : 'border-brand-pink/40 text-brand-pink'}`}>
    {type === 'walkin' ? 'In-salon' : 'Online'}
  </span>
)

function Detail({ id, onBack, onGo }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { setD(await api('/admin/clients/' + id)) } catch (e) { setErr(e.message) }
  }, [id])
  useEffect(() => { load() }, [load])

  if (err) return <p className="text-red-300 text-sm" role="alert">{err}</p>
  if (!d) return <div className="spinner mx-auto my-6" aria-label="Loading" />
  const c = d.client
  const stat = (t, v) => <div className="rounded-xl p-4" style={box}><p className="text-xs text-gray-300 font-poppins">{t}</p><p className="text-white font-bold text-xl mt-1">{v}</p></div>

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-brand-pink text-sm font-poppins flex items-center gap-1"><ArrowLeft size={14} /> All clients</button>
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-playfair text-white font-semibold text-xl">{c.name}</h2><Badge type={c.type} />
        </div>
        <p className="text-gray-300 text-sm font-poppins mt-1">
          {c.phone || 'No phone number'}{c.email ? ` · ${c.email}` : ''} · joined {dateTime(c.createdAt)}{c.addedBy ? ` · added by ${c.addedBy}` : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {stat('Money paid in', naira(d.totals.moneyIn))}
          {stat('Hair Wallet', naira(d.rewards.wallet))}
          {stat('Points', `${d.rewards.points}${d.rewards.freeTreatments ? ` (${d.rewards.freeTreatments} free)` : ''}`)}
          {stat('Visits / bookings', `${d.totals.payments} / ${d.totals.bookings}`)}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => onGo('Payments', { id: c.id, name: c.name, phone: c.phone })} className="btn-primary text-xs py-2 px-4">Record a payment or top up wallet</button>
          <button onClick={() => onGo('FlexPay', { id: c.id, name: c.name, phone: c.phone })} className="btn-outline text-xs py-2 px-4">Start a FlexPay plan</button>
          <button onClick={() => onGo('Rewards', null)} className="btn-outline text-xs py-2 px-4">Rewards</button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-playfair text-white font-semibold text-lg mb-3">FlexPay plans</h3>
        {d.plans.length === 0 ? <p className="text-gray-400 text-sm font-poppins">None.</p> : (
          <ul className="space-y-2 text-sm font-poppins">
            {d.plans.map(p => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="min-w-0"><span className="text-gray-100 block truncate">{p.items.map(i => i.name).join(', ')}</span><span className="text-gray-400 text-xs">{PLAN_STATUS[p.status]}{p.overdue ? ' · behind' : ''}</span></span>
                <span className="text-gray-100 shrink-0">{naira(p.paid)} / {naira(p.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-playfair text-white font-semibold text-lg mb-3">Orders</h3>
        {d.orders.length === 0 ? <p className="text-gray-400 text-sm font-poppins">None.</p> : (
          <ul className="space-y-2 text-sm font-poppins">
            {d.orders.map(o => (
              <li key={o.id} className="flex justify-between gap-3">
                <span className="min-w-0"><span className="text-gray-100 block truncate">{o.orderNo} · {o.items.map(i => i.name).join(', ')}</span><span className="text-gray-400 text-xs">{ORDER_STATUS[o.status]} · {dateTime(o.createdAt)}</span></span>
                <span className="text-gray-100 shrink-0">{naira(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-playfair text-white font-semibold text-lg mb-3">Payments</h3>
        {d.payments.length === 0 ? <p className="text-gray-400 text-sm font-poppins">None yet.</p> : (
          <ul className="divide-y divide-white/10 text-sm font-poppins">
            {d.payments.map(p => (
              <li key={p.id} className="py-2 flex justify-between gap-3">
                <span className="min-w-0"><span className="text-gray-100 block truncate">{PURPOSE_LABEL[p.purpose] || p.purpose} · {METHOD_LABEL[p.method]}</span>
                  <span className="text-gray-400 text-xs">{dateTime(p.createdAt)} · {p.receiptNo} · by {p.recordedBy}{p.status === 'reversed' ? ' · reversed' : ''}</span></span>
                <span className={`shrink-0 ${p.status === 'reversed' ? 'line-through text-gray-500' : 'text-gray-100'}`}>{naira(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {d.rewards.activity.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-playfair text-white font-semibold text-lg mb-3">Wallet and points activity</h3>
          <ul className="divide-y divide-white/10 text-sm font-poppins">
            {d.rewards.activity.slice(0, 10).map((a, i) => (
              <li key={i} className="py-2 flex justify-between gap-3">
                <span className="text-gray-200 truncate">{a.type.replace(/_/g, ' ')} · <span className="text-gray-400 text-xs">{dateTime(a.createdAt)}</span></span>
                <span className={`shrink-0 font-semibold ${a.amount < 0 ? 'text-red-300' : 'text-green-300'}`}>{a.kind === 'points' ? `${a.amount > 0 ? '+' : ''}${a.amount} pts` : `${a.amount > 0 ? '+' : ''}${naira(a.amount)}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ClientsPanel({ onGo }) {
  const [q, setQ] = useState('')
  const [clients, setClients] = useState(null)
  const [openId, setOpenId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (term) => {
    try { setClients((await api('/admin/clients?q=' + encodeURIComponent(term))).clients) } catch (e) { setMsg(e.message) }
  }, [])
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q, load])

  const add = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try {
      const d = await api('/admin/clients', { method: 'POST', body: { name: name.trim(), phone: phone.trim() || undefined } })
      setName(''); setPhone(''); setShowAdd(false); await load(q.trim()); setOpenId(d.client.id)
    } catch (err) { setMsg(err.message) } finally { setBusy(false) }
  }

  if (openId) return <div className="max-w-3xl"><Detail id={openId} onBack={() => setOpenId('')} onGo={onGo} /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><Users size={20} className="text-brand-pink" /> Clients</h2>
        <p className="text-gray-300 text-sm font-poppins">Everyone who does business with the salon, online and in person. Open a client to see their payments, wallet, FlexPay plans and orders in one place.</p>
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search by name or phone…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="btn-outline text-sm py-2 px-4"><UserPlus size={15} /> Add an in-salon client (no phone needed)</button>
        ) : (
          <form onSubmit={add} className="rounded-xl p-4 space-y-3" style={box}>
            <p className="text-white text-sm font-semibold">New in-salon client</p>
            <p className="text-xs text-gray-300 font-poppins">For people who do not use the website. Their wallet, FlexPay, points and visits are tracked under their name.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input-field" placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} maxLength={80} required />
              <input className="input-field" placeholder="Phone (optional)" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-sm py-2 px-5 disabled:opacity-60" disabled={busy}>{busy ? 'Adding…' : 'Add client'}</button>
              <button type="button" className="btn-outline text-sm py-2 px-4" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        )}
        {msg && <p className="text-sm font-poppins text-red-300" role="alert">{msg}</p>}
      </div>

      <div className="glass-card p-6">
        {clients === null ? <div className="spinner mx-auto my-4" aria-label="Loading" /> : clients.length === 0 ? (
          <p className="text-gray-400 text-sm font-poppins">No clients found.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {clients.map(c => (
              <li key={c.id}>
                <button onClick={() => setOpenId(c.id)} className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2"><span className="text-white text-sm font-semibold truncate">{c.name}</span><Badge type={c.type} /></span>
                    <span className="text-gray-400 text-xs font-poppins">{c.phone || 'No phone'}</span>
                  </span>
                  <span className="text-right shrink-0 text-xs font-poppins text-gray-300">{naira(c.wallet)} wallet<br />{c.points} pts</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
