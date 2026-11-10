/* Service worker de CPP Estudio — generado por tools/build.py. No editar sw.js a mano. */
const VERSION = '754f6452d4';
const ASSETS = ["./", "index.html", "styles.css", "app.js", "assets.js", "manifest.webmanifest", "vendor/katex/katex.min.css", "vendor/katex/fonts/KaTeX_AMS-Regular.woff2", "vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2", "vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2", "vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2", "vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2", "vendor/katex/fonts/KaTeX_Main-Bold.woff2", "vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2", "vendor/katex/fonts/KaTeX_Main-Italic.woff2", "vendor/katex/fonts/KaTeX_Main-Regular.woff2", "vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2", "vendor/katex/fonts/KaTeX_Math-Italic.woff2", "vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2", "vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2", "vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2", "vendor/katex/fonts/KaTeX_Script-Regular.woff2", "vendor/katex/fonts/KaTeX_Size1-Regular.woff2", "vendor/katex/fonts/KaTeX_Size2-Regular.woff2", "vendor/katex/fonts/KaTeX_Size3-Regular.woff2", "vendor/katex/fonts/KaTeX_Size4-Regular.woff2", "vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2", "vendor/fonts/chakra-petch-latin-500-normal.woff2", "vendor/fonts/chakra-petch-latin-600-normal.woff2", "vendor/fonts/chakra-petch-latin-700-normal.woff2", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "data/index.js", "data/business.js", "data/en/business.js", "data/physical.js", "data/en/physical.js", "data/personnel.js", "data/en/personnel.js", "data/investigations.js", "data/en/investigations.js", "data/crisis.js", "data/en/crisis.js", "data/security.js", "data/en/security.js"];
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
