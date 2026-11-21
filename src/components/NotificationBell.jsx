import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, BellOff, Banknote, CalendarCheck, Star, Megaphone, Download, Smartphone, Share } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { timeAgo } from '../lib/format'

const ICONS = { payment: Banknote, booking: CalendarCheck, review: Star, offer: Megaphone, system: Bell }

/** Turn push notifications on/off for this device. */
export function PushControls({ compact = false }) {
  const n = useNotifications()
  const [testMsg, setTestMsg] = useState('')

  const test = async () => {
    setTestMsg('')
    try { await n.sendTest(); setTestMsg('Sent — it should arrive in a moment.') } catch (e) { setTestMsg(e.message) }
  }

  const base = compact ? 'text-xs' : 'text-sm'

  if (!n.pushSupported) {
    return (
      <p className={`${base} text-gray-300 flex items-start gap-2`}>
        <Smartphone size={15} className="text-brand-pink shrink-0 mt-0.5" />
        {n.ios && !n.installed
          ? 'On iPhone, first add this app to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications.'
          : 'This browser cannot show phone notifications. Updates will still appear in your inbox here.'}
      </p>
    )
  }
  if (n.permission === 'denied') {
    return (
      <p className={`${base} text-gray-300 flex items-start gap-2`}>
        <BellOff size={15} className="text-brand-pink shrink-0 mt-0.5" />
        Notifications are blocked for this site. Allow them in your browser settings to get alerts on this device.
      </p>
    )
  }
  if (n.subscribed) {
    return (
      <div className={base}>
        <p className="text-green-300 flex items-center gap-2"><BellRing size={15} /> Notifications are on for this device</p>
        <div className="flex gap-4 mt-2">
          <button onClick={test} className="text-brand-pink hover:underline">Send a test</button>
          <button onClick={n.disablePush} disabled={n.pushBusy} className="text-gray-400 hover:text-white">Turn off</button>
        </div>
        {testMsg && <p className="text-gray-300 mt-1">{testMsg}</p>}
      </div>
    )
  }
  return (
    <div>
      <button onClick={n.enablePush} disabled={n.pushBusy} className="btn-primary w-full text-xs py-2.5 disabled:opacity-60">
        <BellRing size={14} /> {n.pushBusy ? 'Turning on…' : 'Turn on notifications on this device'}
      </button>
      {n.pushError && <p className="text-red-400 text-xs mt-2" role="alert">{n.pushError}</p>}
    </div>
  )
}

/** "Add to Home Screen" helper. */
export function InstallControls() {
  const n = useNotifications()
  if (n.installed) return <p className="text-sm text-green-300">The app is installed on this device.</p>
  if (n.canInstall) {
    return (
      <button onClick={n.install} className="btn-primary w-full text-sm py-3"><Download size={15} /> Install the app</button>
    )
  }
  return (
    <p className="text-sm text-gray-300 flex items-start gap-2">
      <Share size={15} className="text-brand-pink shrink-0 mt-0.5" />
      {n.ios
        ? 'On iPhone: tap the Share button in Safari, then “Add to Home Screen”.'
        : 'Open your browser menu and choose “Install app” or “Add to Home screen”.'}
    </p>
  )
}

export default function NotificationBell() {
  const { user } = useAuth()
  const { items, unread, refresh, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [fresh, setFresh] = useState(new Set())
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!user) return null

  const toggle = () => {
    if (open) return setOpen(false)
    setFresh(new Set(items.filter((i) => !i.read).map((i) => i.id)))
    setOpen(true)
    refresh()
    if (unread > 0) setTimeout(markAllRead, 1200)
  }

  const go = (url) => { setOpen(false); navigate(url || '/') }

  const panel = (
    <>
      <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Notifications"
        className="fixed z-[60] left-3 right-3 top-20 md:left-auto md:right-6 md:w-[390px] rounded-3xl overflow-hidden flex flex-col max-h-[75vh]"
        style={{
          background: 'linear-gradient(150deg, rgba(44,8,31,0.97), rgba(14,0,10,0.98))',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-base" style={{ fontFamily: 'Montserrat' }}>Notifications</h2>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-pink hover:underline">Mark all read</button>
          )}
        </div>

        <ul className="overflow-y-auto flex-1 divide-y divide-white/5">
          {items.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-gray-300">
              <Bell size={28} className="mx-auto mb-3 text-brand-pink/60" />
              Nothing yet. Updates about your bookings, payments and offers will appear here.
            </li>
          ) : items.map((n) => {
            const Icon = ICONS[n.type] || Bell
            const isNew = fresh.has(n.id)
            return (
              <li key={n.id}>
                <button onClick={() => go(n.url)} className={`w-full flex gap-3 text-left px-5 py-3.5 hover:bg-white/5 transition-colors ${isNew ? 'bg-brand-pink/10' : ''}`}>
                  <span className="mt-0.5 w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-brand-pink/15 border border-brand-pink/25">
                    <Icon size={16} className="text-brand-pink" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm text-white font-semibold leading-snug">{n.title}</span>
                      {isNew && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-pink shrink-0" aria-label="New" />}
                    </span>
                    {n.body && <span className="block text-xs text-gray-300 mt-0.5 leading-relaxed">{n.body}</span>}
                    <span className="block text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="px-5 py-4 border-t border-white/10">
          <PushControls compact />
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="relative p-2 text-gray-400 hover:text-brand-pink transition-colors"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 bg-brand-pink text-white rounded-full flex items-center justify-center font-semibold"
            style={{ minWidth: 17, height: 17, fontSize: 10, padding: '0 4px' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && createPortal(panel, document.body)}
    </>
  )
}
