import { useState, useEffect, useCallback, useRef } from 'react'
import { Wallet, Target, Undo2, X } from 'lucide-react'
import { api } from '../lib/api'
import { naira, dateTime } from '../lib/format'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))
const TYPE_TEXT = {
  topup: 'Top-up at the salon', topup_reversal: 'Top-up reversed', referral_reward: 'Referral reward', referral_reversal: 'Referral reward reversed',
  wallet_spend: 'Paid with Hair Wallet', wallet_refund: 'Hair Wallet refund', refund_hold: 'Refund requested', refund_release: 'Refund request released', adjustment: 'Adjustment',
}
const STATUS_TEXT = { pending: 'Waiting for approval', approved: 'Approved', rejected: 'Declined', cancelled: 'Cancelled' }
const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
const lab = 'block text-xs text-gray-300 font-poppins mb-1.5'

export default function WalletCard() {
  const [w, setW] = useState(null)
  const [editGoal, setEditGoal] = useState(false)
  const [gTitle, setGTitle] = useState('')
  const [gTarget, setGTarget] = useState('')
  const [gDay, setGDay] = useState(1)
  const [gOn, setGOn] = useState(true)
  const [showRefund, setShowRefund] = useState(false)
  const [rAmount, setRAmount] = useState('')
  const [rReason, setRReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const keyRef = useRef(newKey())

  const load = useCallback(async () => {
    try { setW(await api('/me/wallet')) } catch { /* card simply stays hidden */ }
  }, [])
  useEffect(() => { load() }, [load])

  if (!w) return null

  const openGoal = () => {
    setGTitle(w.goal?.title || ''); setGTarget(w.goal ? String(w.goal.target) : '')
    setGDay(w.goal?.remindWeekday || 1); setGOn(w.goal ? w.goal.remindersOn : true)
    setMsg(''); setEditGoal(true)
  }
  const saveGoal = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try {
      await api('/me/wallet/goal', { method: 'POST', body: { title: gTitle.trim(), target: Number(gTarget), remindWeekday: gDay, remindersOn: gOn } })
      setEditGoal(false); await load()
    } catch (err) { setMsg(err.message) } finally { setBusy(false) }
  }
  const removeGoal = async () => {
    if (!window.confirm('Remove your savings goal? Your money stays in the wallet.')) return
    try { await api('/me/wallet/goal', { method: 'DELETE' }); setEditGoal(false); await load() } catch (err) { setMsg(err.message) }
  }
  const sendRefund = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try {
      await api('/me/wallet/refund', { method: 'POST', body: { amount: Number(rAmount), reason: rReason.trim(), idempotencyKey: keyRef.current } })
      keyRef.current = newKey(); setShowRefund(false); setRAmount(''); setRReason('')
      setMsg('Request sent. The manager will review it and you will get a notification.'); await load()
    } catch (err) { setMsg(err.message) } finally { setBusy(false) }
  }
  const cancel = async (id) => {
    try { await api(`/me/wallet/refund/${id}/cancel`, { method: 'POST' }); setMsg('Request cancelled. The money is back in your wallet.'); await load() } catch (err) { setMsg(err.message) }
  }
  const pending = w.refunds.find(r => r.status === 'pending')

  return (
    <div className="glass-card rounded-2xl p-6 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={16} className="text-brand-pink" />
        <p className="text-white font-semibold text-sm font-poppins">My Hair Wallet</p>
      </div>

      <div className="rounded-xl p-4 mb-4" style={box}>
        <p className="text-xs text-gray-300 font-poppins">Balance</p>
        <p className="text-white font-bold text-3xl mt-1">{naira(w.balance)}</p>
        <p className="body-copy text-xs mt-2">Save weekly towards your next hairstyle. Pay at the salon and the staff will add your money to this wallet. Wallet money can only be spent at the salon.</p>
      </div>

      {/* Savings goal */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-sm font-poppins flex items-center gap-1.5"><Target size={14} className="text-brand-pink" /> Savings goal</p>
          {!editGoal && <button onClick={openGoal} className="text-brand-pink text-xs font-poppins">{w.goal ? 'Edit' : 'Set a goal'}</button>}
        </div>
        {editGoal ? (
          <form onSubmit={saveGoal} className="space-y-3">
            <div><label className={lab}>What are you saving for?</label>
              <input className="input-field" value={gTitle} onChange={e => setGTitle(e.target.value)} placeholder="e.g. Frontal install" maxLength={60} required /></div>
            <div><label className={lab}>Target amount (₦)</label>
              <input className="input-field" type="number" min="1000" step="1" value={gTarget} onChange={e => setGTarget(e.target.value)} placeholder="50000" required /></div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-200 font-poppins">
                <input type="checkbox" checked={gOn} onChange={e => setGOn(e.target.checked)} /> Weekly reminder on
              </label>
              {gOn && (
                <select className="input-field w-auto py-2" value={gDay} onChange={e => setGDay(Number(e.target.value))} aria-label="Reminder day">
                  {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1 disabled:opacity-60" disabled={busy}>{busy ? 'Saving…' : 'Save goal'}</button>
              <button type="button" className="btn-outline" onClick={() => setEditGoal(false)}>Cancel</button>
            </div>
            {w.goal && <button type="button" onClick={removeGoal} className="text-xs text-red-300 font-poppins">Remove this goal</button>}
          </form>
        ) : w.goal ? (
          <div>
            <div className="flex justify-between text-xs text-gray-300 font-poppins mb-1.5">
              <span className="truncate pr-2">{w.goal.title}</span>
              <span className="shrink-0">{naira(Math.min(w.balance, w.goal.target))} / {naira(w.goal.target)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <div className="h-full bg-brand-pink" style={{ width: `${w.goal.percent}%` }} />
            </div>
            <p className="body-copy text-xs">
              {w.goal.reached ? 'Goal reached. Book it at the salon whenever you are ready.' : `${w.goal.percent}% saved.`}
              {w.goal.remindersOn ? ` Reminder every ${DAYS[w.goal.remindWeekday - 1]}.` : ' Reminders are off.'}
            </p>
          </div>
        ) : <p className="body-copy text-xs">Pick something you are saving for and we will remind you every week.</p>}
      </div>

      {/* Refund */}
      <div className="border-t border-white/10 pt-4">
        {pending ? (
          <div className="rounded-xl p-4" style={box}>
            <p className="text-white text-sm font-poppins">Refund request: {naira(pending.amount)}</p>
            <p className="text-xs text-gray-300 font-poppins mt-1">{STATUS_TEXT.pending}. This amount is set aside until the manager decides.</p>
            <button onClick={() => cancel(pending.id)} className="text-xs text-brand-pink font-poppins mt-2 flex items-center gap-1"><X size={12} /> Cancel request</button>
          </div>
        ) : showRefund ? (
          <form onSubmit={sendRefund} className="space-y-3">
            <p className="body-copy text-xs">You can ask for up to <b className="text-white">{naira(w.refundable)}</b> back. Only money you paid in is refundable, not referral rewards. A manager approves each request.</p>
            <div><label className={lab}>Amount (₦)</label>
              <input className="input-field" type="number" min="1" max={w.refundable} step="1" value={rAmount} onChange={e => setRAmount(e.target.value)} required /></div>
            <div><label className={lab}>Why?</label>
              <input className="input-field" value={rReason} onChange={e => setRReason(e.target.value)} maxLength={300} required /></div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1 disabled:opacity-60" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
              <button type="button" className="btn-outline" onClick={() => setShowRefund(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => { setMsg(''); setShowRefund(true) }} disabled={w.refundable <= 0}
            className="text-sm font-poppins text-brand-pink disabled:text-gray-500 flex items-center gap-1.5">
            <Undo2 size={14} /> Request a refund
          </button>
        )}
        {w.refunds.filter(r => r.status !== 'pending' && r.status !== 'cancelled').slice(0, 2).map(r => (
          <p key={r.id} className="text-xs text-gray-300 font-poppins mt-2">
            {naira(r.amount)} refund {STATUS_TEXT[r.status].toLowerCase()} · {dateTime(r.decidedAt || r.createdAt)}{r.decisionNote ? ` · ${r.decisionNote}` : ''}
          </p>
        ))}
        {msg && <p className="text-sm font-poppins text-gray-100 mt-3" role="status">{msg}</p>}
      </div>

      {w.history.length > 0 && (
        <ul className="divide-y divide-white/10 mt-4 text-sm font-poppins">
          {w.history.slice(0, 6).map((h, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="text-gray-200 block truncate">{TYPE_TEXT[h.type] || h.type}</span>
                <span className="text-gray-500 text-xs">{dateTime(h.createdAt)}</span>
              </span>
              <span className={`shrink-0 font-semibold ${h.amount < 0 ? 'text-red-300' : 'text-green-300'}`}>{h.amount > 0 ? '+' : ''}{naira(h.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
