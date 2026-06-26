'use strict';

// "Modalità Evento" (Milestone 1.1-A5): quando un evento UFFICIALE GIÀ AVVENUTO
// risulta significativo e vicino a un luogo salvato, la sezione Preparazione &
// Emergenza lo evidenzia in modo DESCRITTIVO e porta alle istruzioni.
//
// Reattiva, mai predittiva. Usa solo gli eventi GIÀ CARICATI (state.raw):
// nessuna nuova richiesta di rete, nessun backend, nessun dato inviato, nessun
// dato inventato. Dipende da area/periodo correnti e si aggiorna quando l'app è
// aperta. Lessico vietato: mai "allarme", "pericolo", "terremoto in arrivo",
// "previsione".

import { PLACE_THRESHOLD_KEY, PLACE_THRESHOLD_DEFAULT } from './config.js';
import { state } from './state.js';
import { haversineKm, fmtTime } from './geo.js';

const $ = id => document.getElementById(id);

// --- Soglia (device-only) ---------------------------------------------------

export function loadThreshold() {
  try {
    const raw = localStorage.getItem(PLACE_THRESHOLD_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (obj && Number.isFinite(Number(obj.minMag)) && Number.isFinite(Number(obj.maxKm))) {
      return { minMag: Number(obj.minMag), maxKm: Number(obj.maxKm) };
    }
  } catch {
    /* default sotto */
  }
  return { ...PLACE_THRESHOLD_DEFAULT };
}

export function saveThreshold(t) {
  try {
    localStorage.setItem(PLACE_THRESHOLD_KEY, JSON.stringify({ minMag: Number(t.minMag), maxKm: Number(t.maxKm) }));
  } catch {
    /* storage non disponibile */
  }
}

// --- Matching: funzione PURA (testabile senza DOM) --------------------------
// Per ogni luogo cerca negli eventi quelli con mag >= minMag entro maxKm.
// Ritorna { top, matches, eventCount, placeCount } ordinati per magnitudo desc.
export function findPlaceEvents(events, places, threshold) {
  const minMag = Number(threshold && threshold.minMag);
  const maxKm = Number(threshold && threshold.maxKm);
  const empty = { top: null, matches: [], eventCount: 0, placeCount: 0 };
  if (!Array.isArray(events) || !Array.isArray(places) || !places.length) return empty;
  if (!Number.isFinite(minMag) || !Number.isFinite(maxKm)) return empty;

  const matches = [];
  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) continue;
    for (const ev of events) {
      if (!(Number(ev.mag) >= minMag)) continue;
      if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) continue;
      const d = haversineKm(place.lat, place.lon, ev.lat, ev.lon);
      if (d <= maxKm) matches.push({ place, event: ev, distanceKm: d });
    }
  }
  matches.sort((a, b) => b.event.mag - a.event.mag);
  const eventCount = new Set(matches.map(m => m.event.id)).size;
  const placeCount = new Set(matches.map(m => m.place.id)).size;
  return { top: matches[0] || null, matches, eventCount, placeCount };
}

// Etichetta di un luogo: "Casa — Nonni" oppure "Casa".
function placeLabel(p) {
  return p.name ? `${p.label} — ${p.name}` : p.label;
}

// --- Rendering --------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function renderEventMode(result) {
  const banner = $('eventModeBanner');
  const flag = $('prepBtnFlag');
  const top = result && result.top;

  if (flag) flag.hidden = !top;
  if (!banner) return;

  if (!top) {
    banner.hidden = true;
    return;
  }

  const ev = top.event;
  const details = $('emDetails');
  if (details) {
    details.innerHTML =
      `<b>${escapeHtml(placeLabel(top.place))}</b>` +
      ` · M ${Number(ev.mag).toFixed(1)}` +
      ` · a ${top.distanceKm.toFixed(0)} km` +
      ` · ${escapeHtml(fmtTime(ev.time))}` +
      ` · Fonte: ${escapeHtml(ev.source || '—')}`;
  }

  const more = $('emMore');
  if (more) {
    const others = result.eventCount - 1;
    if (others > 0) {
      more.textContent = `Altri ${others} eventi vicino a ${result.placeCount} ` +
        (result.placeCount === 1 ? 'luogo' : 'luoghi') + '.';
      more.hidden = false;
    } else {
      more.hidden = true;
    }
  }

  banner.hidden = false;
}

// Ricalcola la Modalità Evento dai dati già caricati e aggiorna la UI.
export function refreshEventMode() {
  const threshold = loadThreshold();
  const result = findPlaceEvents(state.raw || [], state.places || [], threshold);
  state.eventMode = result.top ? result : null;
  renderEventMode(result);
}

// --- Wiring -----------------------------------------------------------------

export function initEventMode() {
  const minSel = $('thMinMag');
  const kmSel = $('thMaxKm');

  const t = loadThreshold();
  if (minSel) minSel.value = String(t.minMag);
  if (kmSel) kmSel.value = String(t.maxKm);

  const onChange = () => {
    saveThreshold({
      minMag: minSel ? Number(minSel.value) : PLACE_THRESHOLD_DEFAULT.minMag,
      maxKm: kmSel ? Number(kmSel.value) : PLACE_THRESHOLD_DEFAULT.maxKm
    });
    refreshEventMode();
  };
  if (minSel) minSel.addEventListener('change', onChange);
  if (kmSel) kmSel.addEventListener('change', onChange);

  // "Cosa fare" → apre la scheda "Durante".
  const cosaFare = $('emCosaFare');
  if (cosaFare) cosaFare.addEventListener('click', () => {
    const tab = $('tabDurante');
    if (tab) tab.click();
  });

  refreshEventMode();
}
