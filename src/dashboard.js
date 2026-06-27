'use strict';

import { fmtTime } from './geo.js';

const $ = id => document.getElementById(id);

// Motivo leggibile per il tipo di errore sorgente (diagnostica precisa).
const REASON = {
  timeout: 'risposta lenta',
  server: 'errore temporaneo API',
  client: 'dati non disponibili per questa area/periodo',
  network: 'errore temporaneo (rete)'
};

// Costruisce il messaggio diagnostico sorgente dati. Funzione PURA (testabile).
// Distingue: nessuna fonte / fallback con causa / nessun evento / tutto ok.
export function sourceMessage(s) {
  if (!s.activeSource) {
    const r = REASON[s.errorKind] || 'non disponibile';
    return { text: `Nessuna fonte dati disponibile. ${s.triedFirst || 'Sorgente'}: ${r}.`, cls: 'err' };
  }
  if (s.fellBack) {
    const r = REASON[s.errorKind] || 'non disponibile';
    return { text: `${s.triedFirst}: ${r}. Fonte attiva: ${s.activeSource} fallback.`, cls: '' };
  }
  if (s.shown === 0) {
    return { text: `${s.activeSource}: nessun evento nella selezione corrente.`, cls: '' };
  }
  return null;
}

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
  const msg = sourceMessage(s);
  if (msg) {
    fb.hidden = false;
    fb.className = 'dashFallback' + (msg.cls ? ' ' + msg.cls : '');
    fb.textContent = msg.text;
  } else {
    fb.hidden = true;
    fb.className = 'dashFallback';
    fb.textContent = '';
  }
}
