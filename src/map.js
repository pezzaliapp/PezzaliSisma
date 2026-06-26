'use strict';

import { REGIONS } from './config.js';
import { colorForMag, radiusForMag, fmtTime } from './geo.js';

// `L` è la variabile globale fornita da Leaflet (caricato via CDN in index.html).
const L = window.L;

let map = null;
let markerLayer = null;

// Inizializza la mappa Leaflet con il tile layer OpenStreetMap.
export function initMap() {
  map = L.map('map', { zoomControl: true }).setView([42.5, 12.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  // Leaflet a volte calcola male le dimensioni se il contenitore è in flex/grid.
  setTimeout(() => map.invalidateSize(), 250);
}

// Disegna i marker per gli eventi forniti e adatta la vista.
export function drawMarkers(events, regionKey) {
  markerLayer.clearLayers();
  const bounds = [];

  events.forEach(e => {
    const marker = L.circleMarker([e.lat, e.lon], {
      radius: radiusForMag(e.mag),
      color: '#fff',
      weight: 1,
      fillColor: colorForMag(e.mag),
      fillOpacity: 0.82
    }).bindPopup(
      `<b>M ${e.mag.toFixed(1)}</b><br>${e.place}<br>` +
        `${fmtTime(e.time)}<br>Profondità: ${e.depth.toFixed(1)} km` +
        (e.url ? `<br><a href="${e.url}" target="_blank" rel="noopener">Dettagli USGS</a>` : '')
    );
    marker.addTo(markerLayer);
    bounds.push([e.lat, e.lon]);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
  } else {
    const region = REGIONS[regionKey] || REGIONS.world;
    map.setView(region.view, region.zoom);
  }
  setTimeout(() => map.invalidateSize(), 100);
}

// Centra la mappa su un evento (usato dal click sulla lista).
export function focusEvent(lat, lon, zoom = 8) {
  if (map) map.setView([lat, lon], zoom);
}
