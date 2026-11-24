import { useState, useEffect, useCallback } from 'react'
import { CalendarClock, Check, X, Repeat } from 'lucide-react'
import { api } from '../../lib/api'
import { useStore } from '../../context/StoreContext'
import { naira } from '../../lib/format'
import { PLAN_STATUS, dayLabel } from '../../lib/flexpay'

const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }

/** Staff pick the new products for a plan. The server recalculates the total. */
function SwapEditor({ plan, onClose, onSaved }) {
  const { products } = useStore()
  const [qty, setQty] = useState(() => Object.fromEntries(plan.items.map(i => [i.productId, i.qty])))
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const chosen = products.filter(p => (qty[p.id] || 0) > 0)
  const total = chosen.reduce((s, p) => s + p.price * qty[p.id], 0)
  // items already on the plan may no longer be listed: keep them visible so they are not lost silently
  const missing = plan.items.filter(i => !products.some(p => p.id === i.productId) && (qty[i.productId] || 0) > 0)

  const save = async () => {
    setBusy(true); setMsg('')
    try {
      const items = [...chosen.map(p => ({ productId: p.id, qty: qty[p.id] })), ...missing.map(i => ({ productId: i.productId, qty: qty[i.productId] }))]
      await api(`/admin/flexpay/${plan.id}/items`, { method: 'POST', body: { items } })
      onSaved()
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="mt-3 rounded-xl p-4 space-y-3" style={box}>
      <p className="text-white text-sm font-semibold">Change items</p>
      <p className="text-xs text-gray-300 font-poppins">Set a quantity for each item the customer now wants. What they have paid ({naira(plan.paid)}) stays on the plan.</p>
      <ul className="space-y-2 max-h-56 overflow-y-auto">
        {products.map(p => (
          <li key={p.id} className="flex items-center justify-between gap-3 text-sm font-poppins">
            <span className="min-w-0 truncate text-gray-100">{p.name} <span className="text-gray-400">{naira(p.price)}</span></span>
            <input type="number" min="0" max="10" value={qty[p.id] || 0} aria-label={`Quantity of ${p.name}`}
              onChange={e => setQty(q => ({ ...q, [p.id]: Math.max(0, Math.min(10, Number(e.target.value) || 0)) }))}
              className="input-field w-20 py-1.5 text-center" />
          </li>
        ))}
      </ul>
      <p className="text-sm font-poppins text-white">New total: {naira(total + missing.reduce((s, i) => s + i.price * (qty[i.productId] || 0), 0))}</p>
      {msg && <p className="text-red-400 text-sm" role="alert">{msg}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn-primary flex-1 disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
        <button onClick={onClose} className="btn-outline">Cancel</button>
      </div>
    </div>
  )
}

export default function FlexPayPanel({ isManager }) {
  const [plans, setPlans] = useState(null)
  const [msg, setMsg] = useState('')
  const [swapId, setSwapId] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    try { setPlans((await api('/admin/flexpay')).plans) } catch (e) { setMsg(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  const collect = async (p) => {
    if (!window.confirm(`Mark ${p.customer}'s items as handed over?`)) return
    setBusyId(p.id); setMsg('')
    try { await api(`/admin/flexpay/${p.id}/collect`, { method: 'POST' }); await load() } catch (e) { setMsg(e.message) } finally { setBusyId('') }
  }
  const decide = async (p, decision) => {
    let note
    if (decision === 'reject') {
      note = window.prompt(`Decline ${p.customer}'s request to stop?\n\nType the reason the customer will see (required):`) || ''
      if (note.trim().length < 3) return
    } else {
      if (!window.confirm(`Approve stopping ${p.customer}'s plan?\n\nThey paid ${naira(p.paid)}. You must refund ${naira(p.refundIfStopped)} (80%) by cash or bank transfer. The salon keeps the rest.`)) return
      note = window.prompt('Optional note for the customer (for example, when to collect the refund):') || ''
    }
    setBusyId(p.id); setMsg('')
    try { await api(`/admin/flexpay/${p.id}/stop/decide`, { method: 'POST', body: { decision, note: note.trim() } }); await load() } catch (e) { setMsg(e.message) } finally { setBusyId('') }
  }

  const stopReqs = (plans || []).filter(p => p.stopRequested)
  const open = (plans || []).filter(p => (p.status === 'pending' || p.status === 'active') && !p.stopRequested)
  const ready = (plans || []).filter(p => p.status === 'completed')
  const closed = (plans || []).filter(p => ['collected', 'stopped', 'cancelled'].includes(p.status))

  const renderCard = (p) => (
    <li key={p.id} className="rounded-xl p-4" style={box}>
      <div className="flex justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold">{p.customer} <span className="text-gray-400 font-normal">{p.phone}</span></p>
          <p className="text-gray-200 text-sm font-poppins mt-0.5">{p.items.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ')}</p>
          <p className="text-xs text-gray-400 mt-1">{PLAN_STATUS[p.status]} · {p.weeks} weeks · {naira(p.instalment)} a week</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold">{naira(p.paid)} <span className="text-gray-400 font-normal text-sm">/ {naira(p.total)}</span></p>
          {p.overdue && <p className="text-amber-300 text-xs font-poppins">Behind by {naira(p.behindBy)}</p>}
        </div>
      </div>
      {(p.status === 'pending' || p.status === 'active') && (
        <p className="text-xs text-gray-300 font-poppins mt-2">
          {p.status === 'pending' ? `Waiting for the first payment of ${naira(p.instalment)}.` : p.next ? `Next: ${naira(p.next.amount)} due ${dayLabel(p.next.date)}.` : ''}
        </p>
      )}
      {p.stopRequested && <p className="text-xs text-amber-300 font-poppins mt-2">Wants to stop: &ldquo;{p.stopReason}&rdquo;. Refund if approved: {naira(p.refundIfStopped)}.</p>}
      {p.status === 'stopped' && <p className="text-xs text-gray-300 font-poppins mt-2">Refund to pay out: {naira(p.refund ?? 0)}{p.decisionNote ? ` · ${p.decisionNote}` : ''}</p>}
      <div className="flex flex-wrap gap-2 mt-3">
        {(p.status === 'pending' || p.status === 'active') && swapId !== p.id && (
          <button onClick={() => setSwapId(p.id)} className="btn-outline text-xs py-2 px-4"><Repeat size={13} /> Change items</button>
        )}
        {p.status === 'completed' && <button disabled={busyId === p.id} onClick={() => collect(p)} className="btn-primary text-xs py-2 px-4 disabled:opacity-60"><Check size={14} /> Mark collected</button>}
        {isManager && p.stopRequested && (
          <>
            <button disabled={busyId === p.id} onClick={() => decide(p, 'approve')} className="btn-primary text-xs py-2 px-4 disabled:opacity-60"><Check size={14} /> Approve stop</button>
            <button disabled={busyId === p.id} onClick={() => decide(p, 'reject')} className="btn-outline text-xs py-2 px-4 disabled:opacity-60"><X size={14} /> Decline</button>
          </>
        )}
      </div>
      {swapId === p.id && <SwapEditor plan={p} onClose={() => setSwapId('')} onSaved={() => { setSwapId(''); load() }} />}
    </li>
  )

  const section = (title, list, empty) => (
    <div className="glass-card p-6" key={title}>
      <h3 className="font-playfair text-white font-semibold text-lg mb-3">{title}</h3>
      {list.length === 0 ? <p className="text-gray-400 text-sm font-poppins">{empty}</p> : <ul className="space-y-3">{list.map(renderCard)}</ul>}
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-6">
        <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><CalendarClock size={20} className="text-brand-pink" /> FlexPay plans</h2>
        <p className="text-gray-300 text-sm font-poppins mt-1">
          Customers create plans from their cart. Record each instalment in the <b className="text-white">Payments</b> tab (choose &ldquo;FlexPay instalment&rdquo;). Hold the items until the plan shows fully paid.
        </p>
        {msg && <p className="text-sm font-poppins text-red-300 mt-3" role="alert">{msg}</p>}
      </div>
      {plans === null ? <div className="spinner mx-auto my-4" aria-label="Loading" /> : (
        <>
          {stopReqs.length > 0 && section('Stop requests', stopReqs, '')}
          {ready.length > 0 && section('Fully paid, ready to hand over', ready, '')}
          {section('Running plans', open, 'No running plans yet.')}
          {closed.length > 0 && section('Recent history', closed.slice(0, 10), '')}
        </>
      )}
    </div>
  )
}
