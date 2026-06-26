'use strict';

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

// Colore in scala magnitudo.
export function colorForMag(m) {
  return m >= 4 ? '#ff3b30' : m >= 3 ? '#ff8a00' : m >= 2 ? '#ffd23f' : '#2dd36f';
}

// Raggio del marker proporzionale alla magnitudo (con limiti minimo/massimo).
export function radiusForMag(m) {
  return Math.max(6, Math.min(22, 5 + (Number(m) || 0) * 3));
}

// Formatta un timestamp (ms) in data/ora locale italiana.
export function fmtTime(ms) {
  return new Date(ms).toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}
