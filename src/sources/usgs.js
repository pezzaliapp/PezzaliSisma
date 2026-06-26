'use strict';

import { USGS_FEEDS, USGS_FDSN, PERIOD_DAYS, YEAR_MIN_MAG, REGIONS } from '../config.js';
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
    time: p.time, // USGS: epoch ms (sia nei feed sommario sia in FDSN geojson)
    url: p.url || null,
    tsunami: Boolean(p.tsunami)
  };
}

function isoUtc(date) {
  return date.toISOString().slice(0, 19);
}

// Finestra a 365 giorni: i feed sommario USGS arrivano solo a 30 giorni, quindi
// si usa l'endpoint FDSN query con soglia di magnitudo automatica ed eventuale
// bounding box della vista.
async function fetchUsgsYear(region) {
  const end = new Date();
  const start = new Date(end.getTime() - PERIOD_DAYS.year * 86400000);
  const floor = YEAR_MIN_MAG[region] != null ? YEAR_MIN_MAG[region] : 4.0;

  const params = new URLSearchParams({
    format: 'geojson',
    starttime: isoUtc(start),
    endtime: isoUtc(end),
    minmagnitude: String(floor),
    orderby: 'time',
    limit: '20000'
  });
  const bounds = (REGIONS[region] || {}).bounds;
  if (bounds) {
    params.set('minlatitude', String(bounds.minLat));
    params.set('maxlatitude', String(bounds.maxLat));
    params.set('minlongitude', String(bounds.minLon));
    params.set('maxlongitude', String(bounds.maxLon));
  }

  const json = await fetchJson(`${USGS_FDSN}?${params.toString()}`);
  return (json.features || []).map(normalize).filter(e => e.time);
}

// Scarica gli eventi USGS per il periodo richiesto. day/week/month usano i feed
// sommario (veloci e stabili); year usa FDSN. Lancia errore in caso di guasto.
export async function fetchUsgs({ period, region }) {
  if (period === 'year') return fetchUsgsYear(region);
  const endpoint = USGS_FEEDS[period] || USGS_FEEDS.week;
  const json = await fetchJson(endpoint);
  return (json.features || []).map(normalize).filter(e => e.time);
}
