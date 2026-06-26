'use strict';

import { LIST_LIMIT } from './config.js';
import { fmtTime, timeAgo } from './geo.js';

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
    const dist =
      e._dist != null ? ` · ${e._dist.toFixed(0)} km ${e._dir}` : '';
    const div = document.createElement('div');
    div.className = 'event';
    div.innerHTML =
      `<strong>M ${e.mag.toFixed(1)} — ${e.place}` +
      `<span class="srcTag src-${e.source}">${e.source}</span></strong>` +
      `<small>${fmtTime(e.time)} · prof. ${e.depth.toFixed(1)} km${dist}</small>`;
    div.addEventListener('click', () => onSelect(e));
    box.appendChild(div);
  });
}

// Badge della fonte attiva, con indicazione di eventuale fallback automatico.
export function renderSourceInfo(res) {
  const el = document.getElementById('sourceInfo');
  if (!res || !res.activeSource) {
    el.textContent = 'Nessuna fonte disponibile.';
    el.className = 'sourceInfo err';
    return;
  }
  let txt = 'Fonte attiva: ' + res.activeSource;
  if (res.fellBack) txt += ` (fallback automatico da ${res.triedFirst})`;
  el.textContent = txt;
  el.className = 'sourceInfo' + (res.fellBack ? ' warn' : '');
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

// Card "Terremoto più vicino". `event` è null se la posizione non è nota.
export function renderNearest(event) {
  const body = $('nearestBody');
  if (!event || event._dist == null) {
    body.innerHTML =
      '<p class="nearestHint">Attiva la posizione per vedere l\'evento più vicino a te.</p>';
    return;
  }
  body.innerHTML =
    `<div class="nearGrid">` +
    `<div><span>Distanza</span><b>${event._dist.toFixed(1)} km ${event._dir}</b></div>` +
    `<div><span>Magnitudo</span><b>M ${event.mag.toFixed(1)}</b></div>` +
    `<div><span>Ora</span><b>${fmtTime(event.time)}</b></div>` +
    `<div><span>Tempo trascorso</span><b>${timeAgo(event.time)}</b></div>` +
    `</div>` +
    `<p class="nearPlace">${event.place}</p>`;
}

// Banner "La tua posizione". `pos` è null se la posizione non è nota.
export function renderBanner(pos) {
  const banner = $('posBanner');
  if (!pos) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  $('posCoords').textContent = `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`;
  $('posAccuracy').textContent =
    pos.accuracy != null ? `±${Math.round(pos.accuracy)} m` : '—';
  $('posUpdated').textContent = fmtTime(pos.timestamp);
  // Comune/Provincia richiederebbero un reverse-geocoding su server esterno:
  // per la promessa di privacy restano non rilevati in questa modalità.
  $('posComune').textContent = pos.comune || '—';
  $('posProvincia').textContent = pos.provincia || '—';
}
