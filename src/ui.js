'use strict';

import { LIST_LIMIT } from './config.js';
import { fmtTime } from './geo.js';

const $ = id => document.getElementById(id);

// Aggiorna il messaggio di stato in basso al pannello controlli.
export function setStatus(message) {
  $('status').textContent = message;
}

// Renderizza la lista degli ultimi eventi. `onSelect(event)` viene invocato
// al click su una riga (per centrare la mappa).
export function renderList(events, onSelect) {
  const box = $('eventList');
  box.innerHTML = '';

  if (!events.length) {
    box.innerHTML = '<p>Nessun evento con questi filtri.</p>';
    return;
  }

  events.slice(0, LIST_LIMIT).forEach(e => {
    const div = document.createElement('div');
    div.className = 'event';
    div.innerHTML =
      `<strong>M ${e.mag.toFixed(1)} — ${e.place}</strong>` +
      `<small>${fmtTime(e.time)} · prof. ${e.depth.toFixed(1)} km</small>`;
    div.addEventListener('click', () => onSelect(e));
    box.appendChild(div);
  });
}

// Aggiorna il riquadro statistiche.
export function renderStats(stats) {
  $('count').textContent = stats.count;
  $('maxMag').textContent = stats.maxMag != null ? stats.maxMag.toFixed(1) : '–';
  $('lastEvent').textContent = stats.lastTime
    ? fmtTime(stats.lastTime).replace(',', '')
    : '–';

  $('signal').textContent = stats.count
    ? `Eventi filtrati: ${stats.count}, di cui ${stats.last24h} nelle ultime 24 ore. ` +
      `Dato statistico descrittivo, non previsionale.`
    : 'Nessun evento da mostrare con i filtri correnti.';
}
