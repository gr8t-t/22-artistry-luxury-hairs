import { useState, useEffect, useCallback } from 'react'
import { UserCog, UserPlus, Copy, Check, KeyRound, Power, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { dateTime } from '../../lib/format'

const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }

export default function TeamPanel({ me }) {
  const [team, setTeam] = useState(null)
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [creds, setCreds] = useState(null) // { name, phone, password }
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try { setTeam((await api('/admin/team')).team) } catch (e) { setMsg(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(''); setCreds(null)
    try {
      const d = await api('/admin/team', { method: 'POST', body: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined } })
      setCreds({ name: d.member.name, phone: d.member.phone, password: d.tempPassword })
      setName(''); setPhone(''); setEmail(''); await load()
    } catch (err) { setMsg(err.message) } finally { setBusy(false) }
  }

  const reset = async (m) => {
    if (!window.confirm(`Give ${m.name} a new temporary password?\n\nThey will be logged out everywhere and must choose their own password when they log in again.`)) return
    setMsg(''); setCreds(null)
    try {
      const d = await api(`/admin/team/${m.id}/reset-password`, { method: 'POST' })
      setCreds({ name: m.name, phone: m.phone, password: d.tempPassword }); await load()
    } catch (err) { setMsg(err.message) }
  }
  const toggle = async (m) => {
    const on = !m.active
    if (!on && !window.confirm(`Switch off ${m.name}'s login?\n\nThey will be logged out straight away and cannot log in until you switch it on again.`)) return
    setMsg('')
    try { await api(`/admin/team/${m.id}/active`, { method: 'POST', body: { active: on } }); await load() } catch (err) { setMsg(err.message) }
  }
  const edit = async (m) => {
    const n = window.prompt('Name:', m.name); if (n === null) return
    const p = window.prompt('Phone number (they log in with it):', m.phone || ''); if (p === null) return
    setMsg('')
    try { await api(`/admin/team/${m.id}`, { method: 'PATCH', body: { name: n.trim(), phone: p.trim() } }); await load() } catch (err) { setMsg(err.message) }
  }

  const message = creds && creds.password
    ? `Hello ${creds.name.split(' ')[0]}, your 22 Artistry staff login is ready.\nGo to ${window.location.origin}/admin\nPhone: ${creds.phone}\nTemporary password: ${creds.password}\nYou will be asked to choose your own password the first time you log in.`
    : ''
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-6 space-y-3">
        <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><UserCog size={20} className="text-brand-pink" /> Team</h2>
        <p className="text-gray-300 text-sm font-poppins">Create logins for your staff. They sign in at the same admin page with their phone number, and see only what they need for the front desk.</p>
        <div className="grid sm:grid-cols-2 gap-3 pt-1 text-sm font-poppins">
          <div className="rounded-xl p-4" style={box}>
            <p className="text-green-300 font-semibold mb-1">Staff can use</p>
            <p className="text-gray-200">Payments, Orders, Clients, FlexPay, Rewards (look up and redeem) and Bookings.</p>
          </div>
          <div className="rounded-xl p-4" style={box}>
            <p className="text-amber-300 font-semibold mb-1">Only you can use</p>
            <p className="text-gray-200">Reversing payments, wallet refunds, the referral percentage, Products, Gallery, Reviews, Announcements and this Team tab.</p>
          </div>
        </div>
      </div>

      <form onSubmit={add} className="glass-card p-6 space-y-4">
        <h3 className="font-playfair text-white font-semibold text-lg">Add a staff member</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="input-field" placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} maxLength={80} required />
          <input className="input-field" placeholder="Phone number *" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
          <input className="input-field" placeholder="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <p className="text-xs text-gray-400 font-poppins">We create a temporary password for you to share. They must choose their own the first time they log in.</p>
        {msg && <p className="text-sm font-poppins text-red-300" role="alert">{msg}</p>}
        <button className="btn-primary disabled:opacity-60" disabled={busy}><UserPlus size={16} /> {busy ? 'Creating…' : 'Create staff login'}</button>
      </form>

      {creds && creds.password && (
        <div className="glass-card p-6 space-y-3 border border-brand-pink/40">
          <p className="text-white font-semibold font-poppins">Login ready for {creds.name}</p>
          <p className="text-sm text-gray-300 font-poppins">This temporary password is shown <b className="text-white">only now</b>. Copy it and send it to them privately.</p>
          <pre className="text-sm text-gray-100 whitespace-pre-wrap rounded-xl p-4 font-mono" style={box}>{message}</pre>
          <button onClick={copy} className="btn-outline text-sm py-2 px-4">{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy message</>}</button>
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="font-playfair text-white font-semibold text-lg mb-3">Everyone with a login</h3>
        {team === null ? <div className="spinner mx-auto my-4" aria-label="Loading" /> : (
          <ul className="space-y-3">
            {team.map(m => (
              <li key={m.id} className="rounded-xl p-4" style={box}>
                <div className="flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">{m.name} <span className="text-gray-400 font-normal">· {m.role === 'manager' ? 'Manager' : 'Staff'}{m.id === me?.id ? ' (you)' : ''}</span></p>
                    <p className="text-gray-300 text-xs font-poppins mt-0.5">{m.phone}{m.email ? ` · ${m.email}` : ''}</p>
                    <p className="text-gray-500 text-xs font-poppins mt-0.5">Last login: {m.lastLogin ? dateTime(m.lastLogin) : 'never'}{m.mustChangePassword ? ' · has not chosen a password yet' : ''}</p>
                  </div>
                  <span className={`text-xs font-poppins h-fit px-2.5 py-1 rounded-full border ${m.active ? 'border-green-400/40 text-green-300' : 'border-red-400/40 text-red-300'}`}>{m.active ? 'Active' : 'Switched off'}</span>
                </div>
                {m.role === 'staff' && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => edit(m)} className="btn-outline text-xs py-2 px-3"><Pencil size={13} /> Edit</button>
                    <button onClick={() => reset(m)} className="btn-outline text-xs py-2 px-3"><KeyRound size={13} /> New password</button>
                    <button onClick={() => toggle(m)} className="btn-outline text-xs py-2 px-3"><Power size={13} /> {m.active ? 'Switch off' : 'Switch on'}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
