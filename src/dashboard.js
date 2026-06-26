'use strict';

import { fmtTime } from './geo.js';

const $ = id => document.getElementById(id);

// Aggiorna il pannello "Stato": connessione online/offline, sorgente dati
// attiva, numero eventi scaricati, ultimo aggiornamento ed eventuale fallback.
// `snapshot`:
//   { online, activeSource, fellBack, triedFirst, downloaded, lastUpdate }
export function renderDashboard(snapshot) {
  const online = $('dashOnline');
  online.textContent = snapshot.online ? 'Online' : 'Offline';
  online.className = 'badge ' + (snapshot.online ? 'on' : 'off');

  $('dashSource').textContent = snapshot.activeSource || '—';
  $('dashCount').textContent = snapshot.activeSource ? String(snapshot.downloaded) : '—';
  $('dashUpdated').textContent = snapshot.lastUpdate ? fmtTime(snapshot.lastUpdate) : '—';

  const fb = $('dashFallback');
  if (!snapshot.activeSource) {
    fb.hidden = false;
    fb.className = 'dashFallback err';
    fb.textContent = 'Nessuna fonte dati disponibile al momento.';
  } else if (snapshot.fellBack) {
    fb.hidden = false;
    fb.className = 'dashFallback';
    fb.textContent = `Fallback automatico: ${snapshot.triedFirst} non disponibile → uso ${snapshot.activeSource}.`;
  } else {
    fb.hidden = true;
    fb.className = 'dashFallback';
    fb.textContent = '';
  }
}
