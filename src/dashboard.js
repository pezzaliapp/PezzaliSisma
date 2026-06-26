'use strict';

import { fmtTime } from './geo.js';

const $ = id => document.getElementById(id);

// Aggiorna la card "Attività attuale": eventi visualizzati, magnitudo massima,
// ultimo evento, sorgente attiva, ultimo aggiornamento, stato connessione ed
// eventuale fallback automatico.
//   snapshot: { online, activeSource, fellBack, triedFirst, shown, maxMag, lastTime, lastUpdate }
export function renderActivity(s) {
  const online = $('dashOnline');
  online.textContent = s.online ? 'Online' : 'Offline';
  online.className = 'badge ' + (s.online ? 'on' : 'off');

  $('dashCount').textContent = String(s.shown);
  $('dashMaxMag').textContent = s.maxMag != null ? s.maxMag.toFixed(1) : '–';
  $('dashLast').textContent = s.lastTime ? fmtTime(s.lastTime).replace(',', '') : '–';
  $('dashSource').textContent = s.activeSource || '–';
  $('dashUpdated').textContent = s.lastUpdate ? fmtTime(s.lastUpdate) : '–';

  const fb = $('dashFallback');
  if (!s.activeSource) {
    fb.hidden = false;
    fb.className = 'dashFallback err';
    fb.textContent = 'Nessuna fonte dati disponibile al momento.';
  } else if (s.fellBack) {
    fb.hidden = false;
    fb.className = 'dashFallback';
    fb.textContent = `Fallback automatico: ${s.triedFirst} non disponibile → uso ${s.activeSource}.`;
  } else {
    fb.hidden = true;
    fb.className = 'dashFallback';
    fb.textContent = '';
  }
}
