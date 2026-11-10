/* Lamplight service worker (generated at build time by integrations/service-worker.mjs). */
const VERSION = '__VERSION__';
const BASE = __BASE__;
const PRECACHE = __PRECACHE__;
const CORE = `core-${VERSION}`;
const PAGES = 'pages-v1';
const DATA = 'data-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CORE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('core-') && k !== CORE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const sameOrigin = (url) => url.origin === self.location.origin;

/** Network first (fresh pages), falling back to the saved copy, then /offline. */
async function page(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(PAGES)).put(request, response.clone());
    return response;
  } catch {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(`${BASE}offline`)) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

/** Saved copy first (instant), refreshed in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!sameOrigin(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(request));
  } else if (url.pathname.startsWith(`${BASE}_astro/`)) {
    // Hashed file names never change, so the cached copy is always right.
    event.respondWith(caches.match(request).then((hit) => hit || staleWhileRevalidate(request, CORE)));
  } else if (url.pathname.startsWith(`${BASE}data/`)) {
    // Bible chapters, search index and plans: saved as you use them.
    event.respondWith(staleWhileRevalidate(request, DATA));
  }
});
