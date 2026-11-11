// ── OralAI Service Worker v4 ──
const CACHE_NAME  = 'oralai-v7';  // bumped — 19-feature sprint
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  // Core
  '/assets/styles.css',
  '/assets/router.js',
  '/assets/store.js',
  '/assets/pages.js',
  '/assets/app.js',
  '/assets/assistant.js',
  '/assets/icons/icon.svg',
  // Pages (all 15)
  '/pages/auth.js',
  '/pages/dashboard.js',
  '/pages/upload.js',
  '/pages/report.js',
  '/pages/scans.js',
  '/pages/sensors.js',
  '/pages/analytics.js',
  '/pages/telehealth.js',
  '/pages/compare.js',
  '/pages/notifications.js',
  '/pages/settings.js',
  '/pages/calculator.js',
  '/pages/onboarding.js',
  '/pages/landing.js',
  '/pages/treatments.js',
  '/pages/progress.js',
  '/pages/enhancements.js',
  '/pages/camera.js',
  '/pages/symptom.js',
  '/pages/reminders.js',
  '/pages/dentist.js',
  '/pages/family.js',
  '/pages/accessibility.js',
  '/pages/iot_health.js',
  '/pages/clinic.js',
  '/pages/privacy.js',
  '/pages/profile.js',
  '/pages/notfound.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API — always network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — API unavailable' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Navigation — network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { caches.open(CACHE_NAME).then(c => c.put(request, res.clone())); return res; })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static — cache first, update in background
  event.respondWith(
    caches.match(request).then(cached => {
      const net = fetch(request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

self.addEventListener('push', event => {
  const d = event.data?.json() || { title: 'OralAI', body: 'New notification' };
  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body, icon: '/assets/icons/icon.svg',
      tag: 'oralai', data: { url: d.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const w = list.find(c => c.url.includes(self.location.origin));
      return w ? w.focus() : clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
