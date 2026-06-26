'use strict';

import { PROXIMITY_COLORS, DISTANCE_BANDS } from './config.js';

// Distanza in km tra due coordinate (formula dell'emisenoverso / Haversine).
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Rotta iniziale (bearing) in gradi 0–360 dal punto 1 verso il punto 2.
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const toDeg = x => (x * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Converte un bearing in una delle 8 direzioni cardinali.
export function compass8(deg) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

// Verifica se una coordinata ricade dentro un bounding box.
export function inBounds(lat, lon, bounds) {
  if (!bounds) return true;
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lon >= bounds.minLon &&
    lon <= bounds.maxLon
  );
}

// Fascia di prossimità (25/50/100/200) per una distanza, oppure null se oltre.
export function proximityBand(distKm) {
  if (distKm == null) return null;
  for (const b of DISTANCE_BANDS) if (distKm <= b) return b;
  return null;
}

// Colore di prossimità (scala fredda). Bianco se fuori dalle fasce/sconosciuto.
export function proximityColor(distKm) {
  const band = proximityBand(distKm);
  return band ? PROXIMITY_COLORS[band] : '#ffffff';
}

// Spessore del bordo del marker: più vicino = più marcato.
export function proximityWeight(distKm) {
  const band = proximityBand(distKm);
  return band === 25 ? 4 : band === 50 ? 3 : band === 100 ? 2.5 : band === 200 ? 2 : 1;
}

// Colore in scala magnitudo (scala calda).
export function colorForMag(m) {
  return m >= 4 ? '#ff3b30' : m >= 3 ? '#ff8a00' : m >= 2 ? '#ffd23f' : '#2dd36f';
}

// Raggio del marker proporzionale alla magnitudo (con limiti minimo/massimo).
export function radiusForMag(m) {
  return Math.max(6, Math.min(22, 5 + (Number(m) || 0) * 3));
}

// Intensità heatmap [0.15..1] in base alla magnitudo. La densità (somma delle
// intensità sovrapposte) emerge naturalmente da Leaflet.heat.
export function heatIntensity(m) {
  return Math.max(0.15, Math.min(1, (Number(m) || 0) / 6));
}

// Formatta un timestamp (ms) in data/ora locale italiana.
export function fmtTime(ms) {
  return new Date(ms).toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

// Tempo trascorso in forma compatta ("12 min fa", "3 h fa", "2 g fa").
export function timeAgo(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return s + ' s fa';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min fa';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h fa';
  const d = Math.floor(h / 24);
  return d + ' g fa';
}
