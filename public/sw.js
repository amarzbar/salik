const CACHE = 'murid-v13'; // bumped: renamed to Salik, launch splash
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

// Periodic Background Sync (Chrome/Android only, best-effort — see push.ts).
// Reminders are actually delivered server-side via push regardless of this;
// this just gives the SW a chance to warm its cache when the OS wakes it.
self.addEventListener('periodicsync', e => {
  if (e.tag === 'adhan-refresh') {
    e.waitUntil(caches.open(CACHE).then(c => c.add('/')));
  }
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network.catch(() => {
        if (e.request.destination === 'document') return caches.match('/index.html');
      });
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json?.() ?? { title: 'Salik', body: 'Reminder' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      tag: data.tag ?? 'default',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/'));
});
