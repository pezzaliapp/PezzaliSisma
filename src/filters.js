'use strict';

import { REGIONS } from './config.js';
import { inBounds, haversineKm, bearingDeg, compass8 } from './geo.js';

// Annota ogni evento con distanza (_dist, km) e direzione (_dir) rispetto
// alla posizione utente. Se la posizione non è nota, azzera i campi.
// Tutto il calcolo avviene sul dispositivo: nessun dato lascia il client.
export function decorate(events, userPos) {
  events.forEach(e => {
    if (userPos) {
      e._dist = haversineKm(userPos.lat, userPos.lon, e.lat, e.lon);
      e._dir = compass8(bearingDeg(userPos.lat, userPos.lon, e.lat, e.lon));
    } else {
      e._dist = null;
      e._dir = null;
    }
  });
  return events;
}

// Filtro per regione e magnitudo minima, ordinato dal più recente.
export function regionMagFilter(events, filters) {
  const region = REGIONS[filters.region] || REGIONS.world;
  return events
    .filter(e => e.mag >= filters.minMag)
    .filter(e => inBounds(e.lat, e.lon, region.bounds))
    .sort((a, b) => b.time - a.time);
}

// Filtro per distanza massima dalla posizione utente (0 = disattivato).
export function distanceFilter(events, maxDistance, userPos) {
  if (!maxDistance || !userPos) return events;
  return events.filter(e => e._dist != null && e._dist <= maxDistance);
}

// Evento più vicino alla posizione utente fra quelli forniti.
export function findNearest(events, userPos) {
  if (!userPos) return null;
  let best = null;
  for (const e of events) {
    if (e._dist == null) continue;
    if (!best || e._dist < best._dist) best = e;
  }
  return best;
}

// Statistiche descrittive (NON previsionali) sull'insieme filtrato.
export function computeStats(events) {
  if (!events.length) {
    return { count: 0, maxMag: null, lastTime: null, last24h: 0 };
  }
  const now = Date.now();
  const mags = events.map(e => e.mag);
  return {
    count: events.length,
    maxMag: Math.max(...mags),
    lastTime: events[0].time, // events è già ordinato per tempo discendente
    last24h: events.filter(e => now - e.time <= 86400000).length
  };
}
