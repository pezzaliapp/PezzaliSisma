'use strict';

import { fetchUsgs } from './sources/usgs.js';
import { REGIONS } from './config.js';
import { inBounds } from './geo.js';

const $ = id => document.getElementById(id);

function summarize(events) {
  return {
    count: events.length,
    maxMag: events.length ? Math.max(...events.map(e => e.mag)) : null
  };
}

function render(prefix, data) {
  $(prefix + 'Count').textContent = data ? String(data.count) : '–';
  $(prefix + 'Mag').textContent = data && data.maxMag != null ? data.maxMag.toFixed(1) : '–';
}

// "Situazione generale": eventi delle ultime 24 ore per Italia e Mondo.
// Usa un'unica richiesta USGS all_day (globale) e filtra l'Italia per bounding
// box. Dati reali, nessuna richiesta aggiuntiva oltre a questa.
export async function refreshOverview() {
  try {
    const events = await fetchUsgs({ period: 'day' });
    const italia = events.filter(e => inBounds(e.lat, e.lon, REGIONS.italy.bounds));
    render('ovWo', summarize(events));
    render('ovIt', summarize(italia));
  } catch (e) {
    // In caso di errore lascia i trattini, senza bloccare il resto della UI.
    render('ovWo', null);
    render('ovIt', null);
  }
}
