'use strict';

import { REGIONS, DISTANCE_BANDS, PROXIMITY_COLORS, MAX_MARKERS } from './config.js';
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
let markerLayer = null;     // eventi sismici
let userLayer = null;       // posizione utente + cerchi di distanza
let highlightLayer = null;  // alone "Nuovo" sull'ultimo evento
let lockBtnEl = null;       // pulsante "Blocca/Sblocca mappa"
let mapInteractive = true;  // true = la mappa cattura i gesti (pan/zoom)
let mqMobile = null;        // media query mobile
const markerById = new Map(); // id evento -> marker (per "Apri dettaglio")

function isMobile() {
  return mqMobile ? mqMobile.matches : false;
}

// Abilita/disabilita la cattura dei gesti da parte della mappa.
// Quando NON interattiva, `touch-action: pan-y` (via classe) lascia scorrere
// verticalmente la pagina: i marker restano comunque cliccabili (tap = click),
// e i pulsanti +/- continuano a funzionare.
function setMapInteractive(on) {
  mapInteractive = on;
  const c = map.getContainer();
  if (on) {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    if (!isMobile()) map.scrollWheelZoom.enable();
    c.classList.add('map-locked');
    if (lockBtnEl) lockBtnEl.textContent = 'Sblocca mappa';
  } else {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    c.classList.remove('map-locked');
    if (lockBtnEl) lockBtnEl.textContent = 'Blocca mappa';
  }
}

// Default per viewport: desktop sempre interattivo; mobile NON cattura lo scroll.
function applyDefaultInteractivity() {
  setMapInteractive(!isMobile());
}

// Pulsante "Blocca/Sblocca mappa" come controllo Leaflet (visibile su mobile).
function addLockControl() {
  const LockControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'map-lock-btn');
      btn.type = 'button';
      btn.textContent = 'Blocca mappa';
      btn.setAttribute('aria-label', 'Blocca o sblocca l\'interazione con la mappa');
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', e => {
        L.DomEvent.preventDefault(e);
        setMapInteractive(!mapInteractive);
      });
      lockBtnEl = btn;
      return btn;
    }
  });
  map.addControl(new LockControl());
}

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
  highlightLayer = L.layerGroup().addTo(map); // alone "Nuovo" sopra tutto

  // Toggle Blocca/Sblocca + interattività di default in base al viewport.
  mqMobile = window.matchMedia('(max-width: 900px)');
  addLockControl();
  applyDefaultInteractivity();
  mqMobile.addEventListener('change', applyDefaultInteractivity);

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
    rows.push(
      `<a href="${e.url}" target="_blank" rel="noopener">Scheda ufficiale ${escapeHtml(e.source)}</a>`
    );
  }
  return rows.join('<br>');
}

// Disegna i marker per gli eventi forniti e adatta la vista.
// Il riempimento codifica la magnitudo (scala calda); il bordo codifica la
// prossimità alla posizione utente (scala fredda), così "piccolo ma vicino" e
// "forte ma lontano" sono distinguibili a colpo d'occhio.
export function drawMarkers(events, regionKey, userPos, opts = {}) {
  const fit = opts.fit !== false; // durante scrub/playback NON riadattare la vista
  markerLayer.clearLayers();
  highlightLayer.clearLayers();
  markerById.clear();
  const pts = [];

  // Tetto di rendering: gli eventi sono ordinati dal più recente, quindi si
  // disegnano i più recenti fino a MAX_MARKERS. I conteggi statistici, calcolati
  // altrove, restano sull'insieme completo.
  const total = events.length;
  const drawn = total > MAX_MARKERS ? events.slice(0, MAX_MARKERS) : events;

  drawn.forEach(e => {
    const hasDist = userPos && e._dist != null;
    const marker = L.circleMarker([e.lat, e.lon], {
      radius: radiusForMag(e.mag),
      color: hasDist ? proximityColor(e._dist) : '#ffffff',
      weight: hasDist ? proximityWeight(e._dist) : 1,
      fillColor: colorForMag(e.mag),
      fillOpacity: 0.82
    }).bindPopup(popupHtml(e));
    marker.addTo(markerLayer);
    markerById.set(e.id, marker);
    pts.push([e.lat, e.lon]);
  });

  // Evidenzia l'evento più recente (drawn è ordinato per tempo discendente)
  // con un alone pulsante discreto e l'etichetta "Nuovo". Non intercetta i click.
  if (drawn.length) {
    const last = drawn[0];
    const icon = L.divIcon({
      className: 'pulseIcon',
      html: '<span class="pulse-ring"></span><span class="new-badge">Nuovo</span>',
      iconSize: [0, 0]
    });
    L.marker([last.lat, last.lon], {
      icon,
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000
    }).addTo(highlightLayer);
  }

  // Aggiorna la legenda (la parte di prossimità appare solo con posizione nota).
  updateLegend(userPos);

  // Adatta la vista solo quando richiesto (non durante scrub/playback timeline).
  if (fit) {
    if (userPos) pts.push([userPos.lat, userPos.lon]);
    if (pts.length) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 9 });
    } else {
      const region = REGIONS[regionKey] || REGIONS.world;
      map.setView(region.view, region.zoom);
    }
    setTimeout(() => map.invalidateSize(), 100);
  }

  return { total, drawn: drawn.length };
}

// Mostra/nasconde la parte "prossimità" della legenda in base alla posizione.
function updateLegend(userPos) {
  const prox = document.querySelector('.legendProx');
  if (prox) prox.hidden = !userPos;
}

// Centra la mappa su un evento e ne apre il popup ("Apri dettaglio").
export function openEventPopup(id) {
  const marker = markerById.get(id);
  if (!marker || !map) return;
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 7));
  marker.openPopup();
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
