/* Digital Trust App — service worker (cache app shell, offline-capable) */
const CACHE = 'dt-cache-v1.1.0';
const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'assets/logo.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/i18n.js',
  'js/store.js',
  'js/utils.js',
  'js/icons.js',
  'js/app.js',
  'js/auth.js',
  'js/home.js',
  'js/sign.js',
  'js/admin.js',
  'js/recipient.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // never cache POSTs (signing API, etc.)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // let CDN libs / external APIs hit the network

  // cache-first for same-origin app shell, with network fallback + runtime caching
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
