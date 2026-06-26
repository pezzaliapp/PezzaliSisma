'use strict';

// Service worker di base (Vanilla, nessuna build).
// Strategie differenziate:
//  - app-shell (file locali): cache-first con precache all'install
//  - dati USGS: network-first con fallback alla cache (ultimo dato noto offline)
//  - tiles mappa / Leaflet CDN: cache-first (le tiles sono immutabili)

const VERSION = 'v11';
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
  './src/sismaradar/engine.js',
  './src/sismaradar/radar.js',
  './src/map.js',
  './src/ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const keep = [SHELL_CACHE, DATA_CACHE, TILE_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: prova la rete, in caso di errore usa la cache.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Cache-first: usa la cache se presente, altrimenti scarica e memorizza.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
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

  // Tiles OpenStreetMap → cache-first (le tiles sono immutabili).
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }

  // App-shell locale → cache-first con fallback rete.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Tutto il resto → rete con fallback cache.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
