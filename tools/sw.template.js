/* Service worker de CPP Estudio — generado por tools/build.py. No editar sw.js a mano. */
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = 'cpp-estudio-' + VERSION;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('cpp-estudio-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skip') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html', { cacheName: CACHE }).then(r => r || fetch(req)));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true, cacheName: CACHE }).then(r => r || fetch(req).then(res => {
      if (res.ok && url.pathname.includes('/icons/')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
