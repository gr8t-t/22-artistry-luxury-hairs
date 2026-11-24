import { useState, useEffect, useCallback } from 'react'
import { Undo2, Check, X } from 'lucide-react'
import { api } from '../../lib/api'
import { naira, dateTime } from '../../lib/format'

const STATUS = { pending: 'Waiting', approved: 'Approved', rejected: 'Declined', cancelled: 'Cancelled' }

export default function RefundsPanel() {
  const [list, setList] = useState(null)
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    try { setList((await api('/admin/wallet/refunds')).requests) } catch (e) { setMsg(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  const decide = async (r, decision) => {
    let note
    if (decision === 'reject') {
      note = window.prompt(`Decline ${naira(r.amount)} for ${r.customer}?\n\nType the reason the customer will see (required):`) || ''
      if (note.trim().length < 3) return
    } else {
      if (!window.confirm(`Approve ${naira(r.amount)} for ${r.customer}?\n\nYou must then pay them back yourself by cash or bank transfer. The amount stays deducted from their wallet.`)) return
      note = window.prompt('Optional note for the customer (for example, when to collect):') || ''
    }
    setBusyId(r.id); setMsg('')
    try {
      await api(`/admin/wallet/refunds/${r.id}/decide`, { method: 'POST', body: { decision, note: note.trim() } })
      await load()
    } catch (e) { setMsg(e.message) } finally { setBusyId('') }
  }

  const pending = (list || []).filter(r => r.status === 'pending')
  const done = (list || []).filter(r => r.status !== 'pending')

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="glass-card p-6">
        <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><Undo2 size={20} className="text-brand-pink" /> Hair Wallet refund requests</h2>
        <p className="text-gray-300 text-sm font-poppins mt-1 mb-5">
          Wallet money is not withdrawable. A customer can ask for their own top-ups back, and you decide. When you approve, pay the customer yourself by cash or bank transfer.
        </p>
        {msg && <p className="text-sm font-poppins text-red-300 mb-3" role="alert">{msg}</p>}
        {list === null ? <div className="spinner mx-auto my-4" aria-label="Loading" /> : pending.length === 0 ? (
          <p className="text-gray-400 text-sm font-poppins">No requests waiting.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map(r => (
              <li key={r.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">{r.customer} <span className="text-gray-400 font-normal">{r.phone}</span></p>
                    <p className="text-gray-300 text-sm font-poppins mt-1">&ldquo;{r.reason}&rdquo;</p>
                    <p className="text-gray-500 text-xs mt-1">{dateTime(r.createdAt)}</p>
                  </div>
                  <p className="text-white font-bold text-lg shrink-0">{naira(r.amount)}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'approve')} className="btn-primary text-xs py-2 px-4 disabled:opacity-60"><Check size={14} /> Approve</button>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'reject')} className="btn-outline text-xs py-2 px-4 disabled:opacity-60"><X size={14} /> Decline</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-playfair text-white font-semibold text-lg mb-3">Recent decisions</h3>
          <ul className="divide-y divide-white/10 text-sm font-poppins">
            {done.slice(0, 15).map(r => (
              <li key={r.id} className="py-2.5 flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-gray-100 block truncate">{r.customer} · {naira(r.amount)}</span>
                  <span className="text-gray-400 text-xs">{dateTime(r.decidedAt || r.createdAt)}{r.decisionNote ? ` · ${r.decisionNote}` : ''}</span>
                </span>
                <span className={`shrink-0 text-xs font-semibold ${r.status === 'approved' ? 'text-green-300' : 'text-gray-400'}`}>{STATUS[r.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
