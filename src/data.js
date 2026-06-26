'use strict';

import { USGS_FEEDS } from './config.js';

// Converte una feature GeoJSON USGS nel nostro modello interno normalizzato.
// Avere un modello unico fin da ora rende semplice aggiungere altre sorgenti
// (INGV, EMSC, ...) nelle milestone successive senza toccare la UI.
function normalize(feature) {
  const [lon, lat, depth] = feature.geometry.coordinates;
  const p = feature.properties || {};
  return {
    id: feature.id,
    source: 'USGS',
    lat,
    lon,
    depth: depth || 0,
    mag: Number(p.mag) || 0,
    place: p.place || 'Evento sismico',
    time: p.time,
    url: p.url || null,
    tsunami: Boolean(p.tsunami)
  };
}

// Scarica gli eventi per il periodo richiesto e li restituisce normalizzati.
// Lancia un errore in caso di problemi di rete o risposta non valida.
export async function fetchEvents(period) {
  const endpoint = USGS_FEEDS[period] || USGS_FEEDS.week;
  const res = await fetch(endpoint, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  return (json.features || []).map(normalize);
}
