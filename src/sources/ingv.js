'use strict';

import { INGV_EVENT, PERIOD_DAYS, REGIONS, INGV_LIMIT } from '../config.js';
import { fetchJson } from './http.js';

// Formatta una data in ISO UTC senza millisecondi: YYYY-MM-DDTHH:MM:SS
function isoUtc(date) {
  return date.toISOString().slice(0, 19);
}

// Normalizza una feature GeoJSON INGV nel modello unico SeismicEvent.
// Differenze rispetto a USGS gestite qui:
//  - `time` è una stringa ISO UTC SENZA 'Z' -> va interpretata come UTC;
//  - manca `url` -> link ufficiale costruito da `eventId`;
//  - manca `tsunami` -> false.
function normalize(feature) {
  const [lon, lat, depth] = feature.geometry.coordinates;
  const p = feature.properties || {};
  const raw = p.time || '';
  const time = raw ? Date.parse(raw.endsWith('Z') ? raw : raw + 'Z') : NaN;
  const eventId = p.eventId != null ? String(p.eventId) : feature.id;
  return {
    id: 'ingv-' + eventId,
    source: 'INGV',
    lat,
    lon,
    depth: depth || 0,
    mag: Number(p.mag) || 0,
    magType: p.magType || null,
    place: p.place || 'Evento sismico',
    time,
    url: p.eventId != null ? `https://terremoti.ingv.it/event/${p.eventId}` : null,
    tsunami: false
  };
}

// Scarica gli eventi INGV (FDSN event) per periodo e vista. Forte copertura
// su Italia e Mediterraneo. Lancia errore in caso di guasto/timeout.
export async function fetchIngv({ period, region }) {
  const days = PERIOD_DAYS[period] || 7;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);

  const params = new URLSearchParams({
    starttime: isoUtc(start),
    endtime: isoUtc(end),
    format: 'geojson',
    orderby: 'time',
    limit: String(INGV_LIMIT)
  });

  const bounds = (REGIONS[region] || {}).bounds;
  if (bounds) {
    params.set('minlatitude', String(bounds.minLat));
    params.set('maxlatitude', String(bounds.maxLat));
    params.set('minlongitude', String(bounds.minLon));
    params.set('maxlongitude', String(bounds.maxLon));
  }

  const json = await fetchJson(`${INGV_EVENT}?${params.toString()}`);
  return (json.features || []).map(normalize).filter(e => Number.isFinite(e.time));
}
