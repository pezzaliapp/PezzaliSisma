'use strict';

import { REGIONS, DISTANCE_BANDS, PROXIMITY_COLORS } from './config.js';
import {
  colorForMag,
  radiusForMag,
  proximityColor,
  proximityWeight,
  fmtTime
} from './geo.js';

// `L` è la variabile globale fornita da Leaflet (caricato in index.html).
const L = window.L;

let map = null;
let markerLayer = null; // eventi sismici
let userLayer = null;   // posizione utente + cerchi di distanza

// Inizializza la mappa Leaflet con il tile layer OpenStreetMap.
export function initMap() {
  map = L.map('map', { zoomControl: true }).setView([42.5, 12.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  // userLayer aggiunto per primo: i marker degli eventi restano cliccabili sopra.
  userLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  setTimeout(() => map.invalidateSize(), 250);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

// Costruisce il contenuto del popup di un evento.
function popupHtml(e) {
  const rows = [
    `<b>Magnitudo M ${e.mag.toFixed(1)}</b>`,
    `<b>Località:</b> ${escapeHtml(e.place)}`,
    `<b>Ora locale:</b> ${fmtTime(e.time)}`,
    `<b>Profondità:</b> ${e.depth.toFixed(1)} km`,
    `<b>Coordinate:</b> ${e.lat.toFixed(3)}, ${e.lon.toFixed(3)}`,
    `<b>Fonte:</b> ${escapeHtml(e.source)}`
  ];
  if (e._dist != null) {
    rows.push(`<b>Distanza da me:</b> ${e._dist.toFixed(1)} km`);
    rows.push(`<b>Direzione:</b> ${e._dir}`);
  }
  if (e.url) {
    rows.push(`<a href="${e.url}" target="_blank" rel="noopener">Scheda ufficiale USGS</a>`);
  }
  return rows.join('<br>');
}

// Disegna i marker per gli eventi forniti e adatta la vista.
// Il riempimento codifica la magnitudo (scala calda); il bordo codifica la
// prossimità alla posizione utente (scala fredda), così "piccolo ma vicino" e
// "forte ma lontano" sono distinguibili a colpo d'occhio.
export function drawMarkers(events, regionKey, userPos) {
  markerLayer.clearLayers();
  const pts = [];

  events.forEach(e => {
    const hasDist = userPos && e._dist != null;
    const marker = L.circleMarker([e.lat, e.lon], {
      radius: radiusForMag(e.mag),
      color: hasDist ? proximityColor(e._dist) : '#ffffff',
      weight: hasDist ? proximityWeight(e._dist) : 1,
      fillColor: colorForMag(e.mag),
      fillOpacity: 0.82
    }).bindPopup(popupHtml(e));
    marker.addTo(markerLayer);
    pts.push([e.lat, e.lon]);
  });

  // Adatta la vista includendo anche la posizione utente, se presente.
  if (userPos) pts.push([userPos.lat, userPos.lon]);
  if (pts.length) {
    map.fitBounds(pts, { padding: [40, 40], maxZoom: 9 });
  } else {
    const region = REGIONS[regionKey] || REGIONS.world;
    map.setView(region.view, region.zoom);
  }
  setTimeout(() => map.invalidateSize(), 100);
}

// Disegna marker blu della posizione, cerchio di accuratezza GPS e i cerchi
// di distanza (25/50/100/200 km). I cerchi non intercettano i click.
export function drawUserLayer(userPos) {
  userLayer.clearLayers();
  if (!userPos) return;

  const center = [userPos.lat, userPos.lon];

  // Cerchi di distanza, dal più esterno al più interno.
  [...DISTANCE_BANDS].reverse().forEach(km => {
    L.circle(center, {
      radius: km * 1000,
      color: PROXIMITY_COLORS[km],
      weight: 1,
      opacity: 0.6,
      fill: false,
      dashArray: '4 6',
      interactive: false
    }).addTo(userLayer);
  });

  // Cerchio di accuratezza GPS (raggio in metri).
  if (userPos.accuracy != null) {
    L.circle(center, {
      radius: userPos.accuracy,
      color: '#3291ff',
      weight: 1,
      opacity: 0.5,
      fillColor: '#3291ff',
      fillOpacity: 0.12,
      interactive: false
    }).addTo(userLayer);
  }

  // Marker blu della posizione.
  L.circleMarker(center, {
    radius: 8,
    color: '#ffffff',
    weight: 2,
    fillColor: '#3291ff',
    fillOpacity: 1
  })
    .bindPopup('La tua posizione')
    .addTo(userLayer);
}

export function clearUserLayer() {
  if (userLayer) userLayer.clearLayers();
}

// Centra la mappa su un evento (click dalla lista).
export function focusEvent(lat, lon, zoom = 8) {
  if (map) map.setView([lat, lon], zoom);
}

// Centra la mappa sulla posizione utente.
export function centerOnUser(userPos, zoom = 9) {
  if (map && userPos) map.setView([userPos.lat, userPos.lon], zoom);
}

// Pan morbido verso la posizione utente (modalità "Segui").
export function panToUser(userPos) {
  if (map && userPos) map.panTo([userPos.lat, userPos.lon]);
}
