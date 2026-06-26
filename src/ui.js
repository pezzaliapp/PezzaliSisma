'use strict';

import { LIST_LIMIT } from './config.js';
import { fmtTime, timeAgo } from './geo.js';

const $ = id => document.getElementById(id);

// Aggiorna il messaggio di stato (dentro la sezione Controlli).
export function setStatus(message) {
  $('status').textContent = message;
}

// Renderizza la lista degli ultimi eventi. `onSelect(event)` viene invocato
// al click (o Invio/Spazio) su una riga, per centrare la mappa.
export function renderList(events, onSelect) {
  const box = $('eventList');
  box.innerHTML = '';

  if (!events.length) {
    box.innerHTML = '<p>Nessun evento con questi filtri.</p>';
    return;
  }

  events.slice(0, LIST_LIMIT).forEach(e => {
    const dist = e._dist != null ? ` · ${e._dist.toFixed(0)} km ${e._dir}` : '';
    const div = document.createElement('div');
    div.className = 'event';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute(
      'aria-label',
      `Magnitudo ${e.mag.toFixed(1)}, ${e.place}. Premi per centrare sulla mappa.`
    );
    div.innerHTML =
      `<strong>M ${e.mag.toFixed(1)} — ${e.place}` +
      `<span class="srcTag src-${e.source}">${e.source}</span></strong>` +
      `<small>${fmtTime(e.time)} · prof. ${e.depth.toFixed(1)} km${dist}</small>`;
    div.addEventListener('click', () => onSelect(e));
    div.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        onSelect(e);
      }
    });
    box.appendChild(div);
  });
}

function makeButton(label, className, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

// Card "Evento più vicino". Se la posizione non è nota mostra l'invito ad
// attivare la geolocalizzazione.
//   onCenter(event) -> centra la mappa; onLocate() -> attiva la posizione.
export function renderNearest(event, onCenter, onLocate) {
  const body = $('nearestBody');
  body.innerHTML = '';

  if (!event || event._dist == null) {
    const p = document.createElement('p');
    p.className = 'nearestHint';
    p.textContent = 'Attiva la posizione per vedere l\'evento più vicino a te.';
    body.appendChild(p);
    body.appendChild(
      makeButton('Attiva geolocalizzazione', 'fullBtn', () => onLocate())
    );
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'nearGrid';
  grid.innerHTML =
    `<div><span>Magnitudo</span><b>M ${event.mag.toFixed(1)}</b></div>` +
    `<div><span>Distanza</span><b>${event._dist.toFixed(1)} km</b></div>` +
    `<div><span>Direzione</span><b>${event._dir}</b></div>` +
    `<div><span>Tempo trascorso</span><b>${timeAgo(event.time)}</b></div>`;
  body.appendChild(grid);

  const place = document.createElement('p');
  place.className = 'nearPlace';
  place.textContent = `${event.place} · ${fmtTime(event.time)}`;
  body.appendChild(place);

  body.appendChild(makeButton('Centra sulla mappa', 'fullBtn', () => onCenter(event)));
}

// Card "Evento più importante" (magnitudo massima fra gli eventi visualizzati).
//   onOpen(event) -> centra la mappa e apre il dettaglio.
export function renderImportant(event, onOpen) {
  const body = $('importantBody');
  body.innerHTML = '';

  if (!event) {
    const p = document.createElement('p');
    p.className = 'nearestHint';
    p.textContent = 'Nessun evento con i filtri correnti.';
    body.appendChild(p);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'nearGrid';
  grid.innerHTML =
    `<div><span>Magnitudo</span><b>M ${event.mag.toFixed(1)}</b></div>` +
    `<div><span>Fonte</span><b>${event.source}</b></div>`;
  body.appendChild(grid);

  const place = document.createElement('p');
  place.className = 'nearPlace';
  place.textContent = `${event.place} · ${fmtTime(event.time)}`;
  body.appendChild(place);

  body.appendChild(makeButton('Apri dettaglio', 'fullBtn', () => onOpen(event)));
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
  $('posComune').textContent = pos.comune || '—';
  $('posProvincia').textContent = pos.provincia || '—';
}
