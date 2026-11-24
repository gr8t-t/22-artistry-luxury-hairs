import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

/** Change your own password. Used on the first login of a new staff member and on the account page. */
export default function ChangePasswordForm({ onDone, submitLabel = 'Save new password' }) {
  const { refresh } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next !== again) return setError('The two new passwords do not match.')
    setBusy(true)
    try {
      await api('/me/password', { method: 'POST', body: { current, next } })
      await refresh()
      setCurrent(''); setNext(''); setAgain('')
      onDone?.()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const label = 'block text-sm font-poppins text-gray-400 mb-1.5'
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={label}>Current password</label>
        <input className="input-field" type={show ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required />
      </div>
      <div>
        <label className={label}>New password (at least 8 characters)</label>
        <div className="relative">
          <input className="input-field pr-10" type={show ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" minLength={8} required />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div>
        <label className={label}>New password again</label>
        <input className="input-field" type={show ? 'text' : 'password'} value={again} onChange={e => setAgain(e.target.value)} autoComplete="new-password" minLength={8} required />
      </div>
      {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
      <button className="btn-primary w-full disabled:opacity-60" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  )
}
