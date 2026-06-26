'use strict';

import { fetchUsgs } from './sources/usgs.js';
import { fetchIngv } from './sources/ingv.js';

// Determina l'ordine di priorità delle sorgenti.
//  - Selezione manuale (USGS/INGV): una sola sorgente, scelta rispettata.
//  - Auto: in base alla vista — Italia/Mediterraneo -> INGV (fallback USGS),
//    Mondo -> USGS (fallback INGV).
function resolveOrder(region, source) {
  if (source === 'USGS') return ['USGS'];
  if (source === 'INGV') return ['INGV'];
  if (region === 'italy' || region === 'mediterranean') return ['INGV', 'USGS'];
  return ['USGS', 'INGV'];
}

function fetchFrom(key, period, region) {
  return key === 'INGV' ? fetchIngv({ period, region }) : fetchUsgs({ period });
}

// Carica gli eventi applicando la strategia e il fallback automatico.
// Restituisce SEMPRE un esito (non lancia): la UI mostra dati o messaggio chiaro.
//   { events, activeSource, fellBack, triedFirst, error }
export async function loadEvents({ period, region, source }) {
  const order = resolveOrder(region, source);
  let lastError = null;

  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    try {
      const events = await fetchFrom(key, period, region);
      return {
        events,
        activeSource: key,
        fellBack: i > 0,
        triedFirst: order[0],
        error: null
      };
    } catch (err) {
      lastError = err;
    }
  }

  return {
    events: [],
    activeSource: null,
    fellBack: order.length > 1,
    triedFirst: order[0],
    error: lastError
  };
}
