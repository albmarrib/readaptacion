/* Recibe los avisos push con la app cerrada y los muestra como notificación del sistema.
   No usa librerías: Firebase Cloud Messaging entrega el aviso en un evento "push". */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let p = {}
  try { p = event.data ? event.data.json() : {} } catch { p = {} }
  const d = { ...(p.data || {}), ...(p.notification || {}) }
  const titulo = d.titulo || d.title || 'Entrenamiento Personal'
  // Siempre se muestra algo: iOS exige que cada aviso recibido sea visible
  event.waitUntil(self.registration.showNotification(titulo, {
    body: d.cuerpo || d.body || '',
    icon: '/icono-192.png',
    badge: '/icono-192.png',
    tag: 'readaptacion',
    renotify: true,
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
    for (const v of ventanas) {
      if ('focus' in v) { if ('navigate' in v) v.navigate(url); return v.focus() }
    }
    return self.clients.openWindow(url)
  }))
})
