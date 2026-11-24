import { useState, useEffect, useCallback } from 'react'
import { CalendarClock, ChevronDown, Check } from 'lucide-react'
import { api } from '../lib/api'
import { naira } from '../lib/format'
import { PLAN_STATUS, dayLabel, flexTerms } from '../lib/flexpay'
import FinalReceipt from './FinalReceipt'

const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }

function Plan({ p, rules, reload, setMsg }) {
  const [open, setOpen] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const pct = Math.min(100, Math.floor((p.paid * 100) / p.total))
  const live = p.status === 'pending' || p.status === 'active'

  const cancel = async () => {
    if (!window.confirm('Cancel this plan? You have not paid anything, so it costs nothing.')) return
    try { await api(`/me/flexpay/${p.id}/cancel`, { method: 'POST' }); setMsg('Plan cancelled.'); reload() } catch (e) { setMsg(e.message) }
  }
  const viewReceipt = async () => {
    try { setReceipt((await api(`/me/flexpay/${p.id}/receipt`)).receipt) } catch (err) { setMsg(err.message) }
  }
  const stop = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const d = await api(`/me/flexpay/${p.id}/stop`, { method: 'POST', body: { reason: reason.trim() } })
      setStopping(false); setReason('')
      setMsg(`Request sent. If the manager approves, you will be refunded ${naira(d.refundIfStopped)}.`); reload()
    } catch (err) { setMsg(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl p-4" style={box}>
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{p.items.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ')}</p>
          <p className="text-xs text-gray-300 font-poppins mt-0.5">{PLAN_STATUS[p.status]}{p.stopRequested ? ' · stop request sent' : ''}</p>
        </div>
        <p className="text-white font-bold shrink-0">{naira(p.total)}</p>
      </div>

      {p.status !== 'cancelled' && p.status !== 'stopped' && (
        <>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-3 mb-1.5"><div className="h-full bg-brand-pink" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-gray-300 font-poppins">{naira(p.paid)} paid · {naira(p.remaining)} left · {p.weeks} weeks</p>
        </>
      )}

      {p.status === 'pending' && (
        <p className="text-xs text-brand-pink font-poppins mt-2">Pay your first {naira(p.instalment)} at the salon to start the plan and hold your items. {p.expiresAt ? `Please do this by ${dayLabel(p.expiresAt.slice(0, 10))}.` : ''}</p>
      )}
      {p.status === 'active' && p.next && (
        <p className={`text-xs font-poppins mt-2 ${p.overdue ? 'text-amber-300' : 'text-gray-200'}`}>
          {p.overdue ? `Behind by ${naira(p.behindBy)}. ` : ''}Next payment {naira(p.next.amount)} due {dayLabel(p.next.date)}. No late fees.
        </p>
      )}
      {p.status === 'completed' && <p className="text-xs text-green-300 font-poppins mt-2">Fully paid. Visit the salon to collect your items.</p>}
      {p.status === 'stopped' && <p className="text-xs text-gray-300 font-poppins mt-2">Stopped. Refund of {naira(p.refund ?? 0)} ({rules.refundPercent}% of what you paid) to be returned by the salon.{p.decisionNote ? ` Note: ${p.decisionNote}` : ''}</p>}
      {p.decisionNote && p.status === 'active' && <p className="text-xs text-gray-300 font-poppins mt-2">Manager note: {p.decisionNote}</p>}

      <div className="flex flex-wrap gap-4 mt-3 items-center">
        <button onClick={() => setOpen(o => !o)} className="text-brand-pink text-xs font-poppins flex items-center gap-1">
          Schedule <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {p.status === 'pending' && <button onClick={cancel} className="text-xs text-gray-300 hover:text-white font-poppins">Cancel plan</button>}
        {(p.status === 'completed' || p.status === 'collected') && <button onClick={viewReceipt} className="text-xs text-brand-pink font-poppins">View receipt</button>}
        {p.status === 'active' && !p.stopRequested && p.paid > 0 && !stopping && (
          <button onClick={() => { setMsg(''); setStopping(true) }} className="text-xs text-gray-300 hover:text-white font-poppins">Stop this plan</button>
        )}
      </div>

      {open && (
        <ul className="mt-3 divide-y divide-white/10 text-xs font-poppins">
          {p.schedule.map(s => (
            <li key={s.n} className="flex justify-between py-1.5 text-gray-200">
              <span className="flex items-center gap-1.5">{s.paid ? <Check size={12} className="text-green-300" /> : <span className="w-3" />} Payment {s.n}{s.date ? ` · ${dayLabel(s.date)}` : ''}</span>
              <span className={s.paid ? 'text-green-300' : ''}>{naira(s.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {receipt && <FinalReceipt receipt={receipt} onClose={() => setReceipt(null)} />}

      {stopping && live && (
        <form onSubmit={stop} className="mt-3 space-y-3">
          <p className="body-copy text-xs">
            If a manager approves, you will be refunded <b className="text-white">{naira(p.refundIfStopped)}</b> ({rules.refundPercent}% of the {naira(p.paid)} you have paid). The salon keeps the rest and your items are released.
          </p>
          <input className="input-field" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why do you want to stop?" maxLength={300} required />
          <div className="flex gap-2">
            <button className="btn-primary flex-1 disabled:opacity-60" disabled={busy}>{busy ? 'Sending…' : 'Send stop request'}</button>
            <button type="button" className="btn-outline" onClick={() => setStopping(false)}>Keep my plan</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function FlexPayCard() {
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [terms, setTerms] = useState(false)

  const load = useCallback(async () => {
    try { setData(await api('/me/flexpay')) } catch { /* card stays hidden */ }
  }, [])
  useEffect(() => { load() }, [load])

  if (!data) return null
  const shown = data.plans.filter(p => p.status !== 'cancelled')

  return (
    <div className="glass-card rounded-2xl p-6 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={16} className="text-brand-pink" />
        <p className="text-white font-semibold text-sm font-poppins">FlexPay plans</p>
      </div>
      {shown.length === 0 ? (
        <p className="body-copy text-xs">Pay for wigs and accessories in weekly instalments, from 2 weeks up to 5 months. Add items to your cart, then choose "Pay in instalments".</p>
      ) : (
        <div className="space-y-3">{shown.map(p => <Plan key={p.id} p={p} rules={data.rules} reload={load} setMsg={setMsg} />)}</div>
      )}
      {msg && <p className="text-sm font-poppins text-gray-100 mt-3" role="status">{msg}</p>}
      <button onClick={() => setTerms(t => !t)} className="text-brand-pink text-xs font-poppins flex items-center gap-1 mt-4">
        FlexPay terms <ChevronDown size={12} className={terms ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {terms && (
        <div className="mt-3 space-y-3 text-xs font-poppins text-gray-300">
          {flexTerms(data.rules).map(([h, t]) => <div key={h}><p className="text-white font-semibold mb-0.5">{h}</p><p className="leading-relaxed">{t}</p></div>)}
        </div>
      )}
    </div>
  )
}
