/* Service worker — offline app shell for the AP SE inspection app */
const CACHE = 'ap-inspect-v4';

/* Must succeed for the app to work offline. */
const CORE = [
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

/* Nice-to-have. Cached best-effort so a missing fonts/ folder never breaks install. */
const OPTIONAL = [
  'fonts/AP-Light300.ttf',
  'fonts/AP-Regular400.ttf',
  'fonts/AP-Medium500.ttf',
  'fonts/AP-Bold700.ttf'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(CORE).then(() =>
        Promise.all(OPTIONAL.map((u) => c.add(u).catch(() => null)))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Navigations → serve cached app shell first (offline-first SPA)
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
