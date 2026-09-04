/* ═══════════════════════════════════════════════════════════
   Service Worker — Generador de Proformas La Cabaña Forestal
   · Precache del shell de la app (funciona sin internet)
   · Caché en tiempo de ejecución de las librerías CDN y fuentes
   · Firebase/Firestore SIEMPRE va a la red (nunca se cachea)
   Al publicar una versión nueva, sube VERSION para forzar la
   actualización en los equipos que ya tienen la app instalada.
═══════════════════════════════════════════════════════════ */
const VERSION    = 'v23.1';
const CACHE_APP  = 'proformas-app-' + VERSION;
const CACHE_LIB  = 'proformas-lib-' + VERSION;

// Shell de la aplicación (mismo origen)
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './favicon.png'
];

// Orígenes de librerías externas que sí conviene cachear
const CDN_OK = [
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://www.gstatic.com/firebasejs'
];

// Nunca cachear: APIs de Firestore/Google (datos en vivo)
const NUNCA = [
  'firestore.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebaseremoteconfig.googleapis.com',
  'google-analytics.com',
  'googletagmanager.com'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    // addAll falla completo si un archivo no existe: se agregan de a uno
    await Promise.all(SHELL.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(err =>
        console.warn('[SW] no se pudo precachear', url, err)
      )
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('proformas-') && k !== CACHE_APP && k !== CACHE_LIB)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// La app pide activar de inmediato la versión nueva
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (NUNCA.some(h => url.hostname.indexOf(h) >= 0)) return;   // datos en vivo: red directa

  // Navegación (abrir la app): red primero, caché si no hay internet
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_APP);
        cache.put('./index.html', res.clone());
        return res;
      } catch (e) {
        const cache = await caches.open(CACHE_APP);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  const esCDN = CDN_OK.some(o => req.url.indexOf(o) === 0);
  const esPropio = url.origin === self.location.origin;
  if (!esCDN && !esPropio) return;

  // Caché primero + actualización en segundo plano
  event.respondWith((async () => {
    const cache = await caches.open(esCDN ? CACHE_LIB : CACHE_APP);
    const hit = await cache.match(req);
    const red = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await red) || Response.error();
  })());
});
