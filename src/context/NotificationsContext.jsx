import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)

const POLL_MS = 45000

function urlB64ToUint8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id

  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  // ── push ──
  const pushSupported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [permission, setPermission] = useState(pushSupported ? Notification.permission : 'unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')

  // ── install as app ──
  const deferredPrompt = useRef(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); deferredPrompt.current = e; setCanInstall(true) }
    const onInstalled = () => { setInstalled(true); setCanInstall(false); deferredPrompt.current = null }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    const e = deferredPrompt.current
    if (!e) return
    e.prompt()
    try { await e.userChoice } catch { /* ignore */ }
    deferredPrompt.current = null
    setCanInstall(false)
  }, [])

  // ── inbox ──
  // Each request gets a number; an older response never overwrites a newer state.
  const seq = useRef(0)
  const refresh = useCallback(async () => {
    if (!userId) return
    const mine = ++seq.current
    try {
      const d = await api('/me/notifications')
      if (mine !== seq.current) return
      setItems(d.notifications)
      setUnread(d.unread)
    } catch { /* offline or session ended: keep what we have */ }
  }, [userId])

  useEffect(() => {
    if (!userId) { setItems([]); setUnread(0); return }
    refresh()
    const tick = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [userId, refresh])

  const markAllRead = useCallback(async () => {
    seq.current++ // ignore any refresh that is still on its way
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
    try { await api('/me/notifications/read', { method: 'POST', body: {} }) } catch { /* next refresh corrects it */ }
  }, [])

  // ── keep this device's push subscription tied to whoever is logged in ──
  useEffect(() => {
    if (!pushSupported) return
    let cancelled = false
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (cancelled) return
        setPermission(Notification.permission)
        setSubscribed(!!sub && Notification.permission === 'granted')
        if (sub && userId && Notification.permission === 'granted') {
          api('/me/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } }).catch(() => {})
        }
      } catch { /* service worker not ready */ }
    })()
    return () => { cancelled = true }
  }, [pushSupported, userId])

  const enablePush = useCallback(async () => {
    setPushError('')
    setPushBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setPushError(result === 'denied' ? 'Notifications are blocked. Allow them in your browser settings for this site.' : '')
        return false
      }
      const { key } = await api('/push/key')
      if (!key) throw new Error('Notifications are not switched on for this site yet.')
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) }))
      await api('/me/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } })
      setSubscribed(true)
      return true
    } catch (e) {
      setPushError(e.message || 'Could not turn on notifications.')
      return false
    } finally {
      setPushBusy(false)
    }
  }, [])

  const disablePush = useCallback(async () => {
    setPushBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api('/me/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {})
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setPushBusy(false)
    }
  }, [])

  const sendTest = useCallback(async () => {
    await api('/me/push/test', { method: 'POST' })
    refresh()
  }, [refresh])

  return (
    <Ctx.Provider value={{
      items, unread, refresh, markAllRead,
      pushSupported, permission, subscribed, pushBusy, pushError, enablePush, disablePush, sendTest,
      canInstall, installed, install, ios: isIOS(),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
