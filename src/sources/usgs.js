'use strict';

import { USGS_FEEDS } from '../config.js';
import { fetchJson } from './http.js';

// Normalizza una feature GeoJSON USGS nel modello unico SeismicEvent.
function normalize(feature) {
  const [lon, lat, depth] = feature.geometry.coordinates;
  const p = feature.properties || {};
  return {
    id: 'usgs-' + feature.id,
    source: 'USGS',
    lat,
    lon,
    depth: depth || 0,
    mag: Number(p.mag) || 0,
    magType: p.magType || null,
    place: p.place || 'Evento sismico',
    time: p.time,
    url: p.url || null,
    tsunami: Boolean(p.tsunami)
  };
}

// Scarica gli eventi USGS per il periodo richiesto (feed sommario pubblico).
// Copertura globale, sorgente stabile e veloce. Lancia errore in caso di guasto.
export async function fetchUsgs({ period }) {
  const endpoint = USGS_FEEDS[period] || USGS_FEEDS.week;
  const json = await fetchJson(endpoint);
  return (json.features || []).map(normalize).filter(e => e.time);
}
