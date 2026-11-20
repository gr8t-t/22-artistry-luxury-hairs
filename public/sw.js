/* 22 Artistry service worker.
   Its job: receive push notifications and open the right page when one is tapped.
   It deliberately does NOT cache pages, so customers always get the latest site. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: event.data ? event.data.text() : '' } }
  const title = data.title || '22 Artistry Luxury Hairs'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.type || 'general',
      renotify: true,
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Only ever open pages on this site, whatever the notification says
  let target = self.location.origin + '/'
  try {
    const u = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin)
    if (u.origin === self.location.origin) target = u.href
  } catch { /* keep the home page */ }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          return w.focus().then(() => ('navigate' in w ? w.navigate(target) : undefined))
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
