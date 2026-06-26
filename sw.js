'use strict';

// Service worker (Vanilla, nessuna build). Strategie:
//  - navigazione/HTML  -> network-first  (online = sempre l'ultima index)
//  - JS/CSS same-origin -> stale-while-revalidate (si auto-aggiornano)
//  - tiles mappa        -> cache-first    (immutabili)
//  - dati USGS/INGV     -> network-first  (ultimo dato noto offline)
// Precache resiliente: un singolo asset non scaricabile NON blocca l'install,
// evitando di restare incastrati su una versione vecchia.

const VERSION = 'v20';
const SHELL_CACHE = 'sisma-shell-' + VERSION;
const DATA_CACHE = 'sisma-data-' + VERSION;
const TILE_CACHE = 'sisma-tiles-' + VERSION;

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet-heat/leaflet-heat.js',
  './src/main.js',
  './src/config.js',
  './src/state.js',
  './src/geo.js',
  './src/data.js',
  './src/sources/http.js',
  './src/sources/usgs.js',
  './src/sources/ingv.js',
  './src/filters.js',
  './src/geolocation.js',
  './src/geocode.js',
  './src/dashboard.js',
  './src/overview.js',
  './src/timeline.js',
  './src/info.js',
  './src/prepare.js',
  './src/places.js',
  './src/personalcard.js',
  './src/cardlock.js',
  './src/share.js',
  './src/sismaradar/engine.js',
  './src/sismaradar/radar.js',
  './src/map.js',
  './src/ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Resiliente: i fallimenti dei singoli asset non interrompono l'install.
    await Promise.allSettled(SHELL_ASSETS.map(u => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  const keep = [SHELL_CACHE, DATA_CACHE, TILE_CACHE];
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNavigation(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

// Network-first: rete se possibile (cache solo risposte valide), altrimenti cache.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (isNavigation(request)) {
      const idx = await cache.match('./index.html');
      if (idx) return idx;
    }
    throw err;
  }
}

// Cache-first: cache se presente, altrimenti rete (e memorizza).
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

// Stale-while-revalidate: serve la cache subito ma riscarica in background.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dati sismici (USGS, INGV) → network-first con fallback all'ultimo dato noto.
  if (url.hostname === 'earthquake.usgs.gov' || url.hostname === 'webservices.ingv.it') {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Tiles OpenStreetMap → cache-first (immutabili).
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }

  // Stessa origine.
  if (url.origin === self.location.origin) {
    if (isNavigation(request)) {
      // HTML sempre fresco quando online; cache come fallback offline.
      event.respondWith(networkFirst(request, SHELL_CACHE));
    } else {
      // JS/CSS/asset: veloci dalla cache ma si auto-aggiornano in background.
      event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    }
    return;
  }

  // Tutto il resto → rete con fallback cache.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
