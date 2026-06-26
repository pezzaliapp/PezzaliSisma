'use strict';

import { REGIONS } from './config.js';
import { inBounds } from './geo.js';

// Applica i filtri attivi a un elenco di eventi normalizzati e li ordina
// dal più recente al più vecchio.
export function applyFilters(events, filters) {
  const region = REGIONS[filters.region] || REGIONS.world;
  return events
    .filter(e => e.mag >= filters.minMag)
    .filter(e => inBounds(e.lat, e.lon, region.bounds))
    .sort((a, b) => b.time - a.time);
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
