const CACHE = 'murid-v18'; // bumped: dhikr texts & recitations saved on the device (utils/offline)
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon-512.png'];

// Also precache the app's own hashed bundle (the JS/CSS index.html points at). The very first
// page load happens before this worker controls the page, so without this the main bundle was
// never cached and the installed app couldn't start offline. Hashed names change every deploy,
// hence reading them from index.html rather than listing them here.
async function precacheShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll(PRECACHE);
  try {
    const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
    const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]))];
    await cache.addAll(assets);
  } catch { /* offline during install: the fetch handler fills the cache later */ }
}

self.addEventListener('install', e => {
  e.waitUntil(precacheShell());
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
  // Recitations are fetched in byte ranges (206), which this cache can't store; the page saves
  // full copies itself (utils/offline), so leave audio to the network/page.
  if (new URL(e.request.url).pathname.startsWith('/api/audio/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.status === 200) { // only whole responses; a 206 range can't be cached
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      });
      if (cached) { network.catch(() => {}); return cached; }
      // Offline and not cached: the app shell for page loads, otherwise a proper network error
      // (resolving with nothing makes the browser report a broken service worker instead).
      return network.catch(async () => {
        if (e.request.destination === 'document') return (await caches.match('/index.html')) || Response.error();
        return Response.error();
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
