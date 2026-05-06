/* FlowerDex Service Worker */
const CACHE   = 'flowerdex-v1';
const TFJS_VER  = '4.22.0';
const MNET_VER  = '2.1.1';

/* Files to precache on install */
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${TFJS_VER}/dist/tf.min.js`,
  `https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@${MNET_VER}/dist/mobilenet.min.js`,
];

/* ── Install ── pre-cache app shell + CDN scripts */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ── purge old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ── cache-first, fall back to network then cache at runtime */
self.addEventListener('fetch', event => {
  const { request } = event;

  /* Skip non-GET, chrome-extension, etc. */
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request, { mode: 'cors', credentials: 'omit' })
        .then(response => {
          /* Only cache valid responses from safe origins */
          if (
            response.ok &&
            (request.url.startsWith(self.location.origin) ||
             request.url.includes('cdn.jsdelivr.net') ||
             request.url.includes('storage.googleapis.com') ||
             request.url.includes('tfhub.dev'))
          ) {
            caches.open(CACHE).then(cache => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          /* Offline fallback for navigation */
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
