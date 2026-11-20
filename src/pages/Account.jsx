import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Copy, Check, LogOut, Phone, Mail, Gift, ReceiptText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { naira, dateTime, PURPOSE_LABEL } from '../lib/format'
import Receipt from '../components/Receipt'
import { PushControls, InstallControls } from '../components/NotificationBell'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-poppins text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function AuthForms() {
  const { login, register } = useAuth()
  const [params] = useSearchParams()
  const refFromLink = (params.get('ref') || '').toUpperCase()
  const [mode, setMode] = useState(refFromLink ? 'register' : 'login')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    identifier: '', password: '', name: '', phone: '', email: '', referralCode: refFromLink,
  })
  const set = (k) => (e) => { setF(p => ({ ...p, [k]: e.target.value })); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(f.identifier, f.password)
      } else {
        await register({
          name: f.name, phone: f.phone, email: f.email || undefined,
          password: f.password, referralCode: f.referralCode || undefined,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const pwInput = (
    <div className="relative">
      <input
        type={showPw ? 'text' : 'password'}
        value={f.password}
        onChange={set('password')}
        placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        className="input-field pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setShowPw(v => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        aria-label={showPw ? 'Hide password' : 'Show password'}
      >
        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <p className="eyebrow mb-3">My Account</p>
        <h1 className="display-md">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="body-copy mt-3">
          {mode === 'login'
            ? 'Log in with your phone number or email.'
            : 'Join to book faster, earn rewards and track your orders.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[['login', 'Log in'], ['register', 'Sign up']].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError('') }}
            className={`py-2.5 rounded-full text-sm font-poppins font-medium transition-all ${
              mode === m ? 'bg-brand-pink text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="glass-card rounded-2xl p-7 space-y-4">
        {mode === 'login' ? (
          <Field label="Phone number or email">
            <input
              value={f.identifier}
              onChange={set('identifier')}
              placeholder="08012345678 or you@email.com"
              autoComplete="username"
              className="input-field"
              required
            />
          </Field>
        ) : (
          <>
            <Field label="Full name *">
              <input value={f.name} onChange={set('name')} placeholder="Your full name" autoComplete="name" className="input-field" required />
            </Field>
            <Field label="Phone number *">
              <input value={f.phone} onChange={set('phone')} placeholder="08012345678" inputMode="tel" autoComplete="tel" className="input-field" required />
            </Field>
            <Field label="Email (optional)">
              <input type="email" value={f.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" className="input-field" />
            </Field>
          </>
        )}

        <Field label="Password *">{pwInput}</Field>

        {mode === 'register' && (
          <Field label="Referral code (optional)">
            <input
              value={f.referralCode}
              onChange={e => { setF(p => ({ ...p, referralCode: e.target.value.toUpperCase() })); setError('') }}
              placeholder="Got a code from a friend?"
              className="input-field uppercase"
              maxLength={10}
            />
          </Field>
        )}

        {error && <p className="text-red-400 text-xs font-poppins" role="alert">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

function Profile() {
  const { user, logout, isStaff } = useAuth()
  const [copied, setCopied] = useState(false)
  const [payments, setPayments] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const link = `${window.location.origin}/account?ref=${user.referralCode}`

  useEffect(() => {
    let cancelled = false
    api('/me/payments').then(d => { if (!cancelled) setPayments(d.payments) }).catch(() => { if (!cancelled) setPayments([]) })
    return () => { cancelled = true }
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const whatsappText = encodeURIComponent(
    `Join me at 22 Artistry Luxury Hairs! Sign up with my link: ${link}`
  )

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <p className="eyebrow mb-3">My Account</p>
        <h1 className="display-md">Hello, {user.name.split(' ')[0]}</h1>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 text-sm font-poppins text-gray-300">
          <Phone size={16} className="text-brand-pink shrink-0" /> {user.phone}
        </div>
        {user.email && (
          <div className="flex items-center gap-3 text-sm font-poppins text-gray-300">
            <Mail size={16} className="text-brand-pink shrink-0" /> {user.email}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 mt-4">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={16} className="text-brand-pink" />
          <p className="text-white font-semibold text-sm font-poppins">Your referral code</p>
        </div>
        <p className="body-copy text-xs mb-4">Invite friends with your code. You earn a reward every time they pay.</p>
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-brand-border bg-brand-card">
          <span className="font-mono tracking-widest text-white">{user.referralCode}</span>
          <button onClick={copy} className="text-brand-pink text-xs font-poppins flex items-center gap-1.5">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
          </button>
        </div>
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noreferrer"
          className="btn-outline w-full mt-3 text-xs"
        >
          Share on WhatsApp
        </a>
      </div>

      <div className="glass-card rounded-2xl p-6 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <ReceiptText size={16} className="text-brand-pink" />
          <p className="text-white font-semibold text-sm font-poppins">My payments</p>
        </div>
        {payments === null ? (
          <div className="spinner mx-auto my-4" aria-label="Loading" />
        ) : payments.length === 0 ? (
          <p className="body-copy text-xs">Payments you make at the salon will appear here with your receipts.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {payments.map(p => (
              <li key={p.id}>
                <button onClick={() => setReceipt(p)} className="w-full flex items-center justify-between gap-3 py-3 text-left">
                  <span className="min-w-0">
                    <span className="block text-sm text-white truncate">{PURPOSE_LABEL[p.purpose] || p.purpose}</span>
                    <span className="block text-xs text-gray-400">{dateTime(p.createdAt)} · {p.receiptNo}</span>
                  </span>
                  <span className={`text-sm font-semibold shrink-0 ${p.status === 'reversed' ? 'line-through text-gray-500' : 'text-white'}`}>{naira(p.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 mt-4 space-y-5">
        <div>
          <p className="text-white font-semibold text-sm font-poppins mb-1">Phone notifications</p>
          <p className="body-copy text-xs mb-3">Get an alert for bookings, payments and offers, even when the app is closed.</p>
          <PushControls />
        </div>
        <div className="border-t border-white/10 pt-5">
          <p className="text-white font-semibold text-sm font-poppins mb-1">Get the app</p>
          <p className="body-copy text-xs mb-3">Add 22 Artistry to your phone for one-tap booking, like any other app.</p>
          <InstallControls />
        </div>
      </div>

      {receipt && <Receipt payment={receipt} onClose={() => setReceipt(null)} />}

      <div className="flex flex-col gap-3 mt-6">
        {isStaff && <Link to="/admin" className="btn-primary w-full">Open admin portal</Link>}
        <button onClick={logout} className="btn-ghost justify-center">
          <LogOut size={15} /> Log out
        </button>
      </div>
    </div>
  )
}

export default function Account() {
  const { user, loading } = useAuth()
  return (
    <div className="pt-28 pb-20 min-h-screen px-5 flex justify-center">
      {loading ? <div className="spinner mt-20" /> : user ? <Profile /> : <AuthForms />}
    </div>
  )
}
