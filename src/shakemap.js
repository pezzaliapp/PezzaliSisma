'use strict';

// "Intensità stimata personale" (Milestone V2.0-A1).
//
// Stima PRUDENTE e SEMPLIFICATA dell'intensità macrosismica (scala MCS/MMI) su un
// luogo salvato, a partire da eventi UFFICIALI GIÀ REGISTRATI. NON è una ShakeMap
// ufficiale, NON è una previsione, NON è un'allerta. Tutto calcolato sul
// dispositivo: nessun backend, nessuna nuova richiesta di rete, nessun dato
// inviato o inventato.
//
// Modello: Allen, Wald & Worden (2012) — "Intensity attenuation for active
// crustal regions", J. Seismology 16: 409–433. Forma per distanza ipocentrale
// (Rhypo), eventi superficiali, come implementata in OpenQuake hazardlib:
//
//   MMI = c0 + c1*M + c2*ln( sqrt(Rhyp^2 + Rm^2) )   [ + c4*ln(Rhyp/50) se Rhyp>50 ]
//   Rm  = m1 + m2*exp(M - 5)
//
// (ln = logaritmo naturale). Vedi docs/SCIENZA.md per coefficienti, soglie delle
// classi e LIMITI (in particolare: il modello è tarato per M5.0–7.9 entro ~300 km;
// sotto M5 è un'estrapolazione prudente; ignora effetti di sito, geometria della
// faglia e direttività).

import { SHAKE_MIN_MAG, SHAKE_MAX_KM } from './config.js';
import { state } from './state.js';
import { haversineKm } from './geo.js';

const $ = id => document.getElementById(id);

// Coefficienti AWW2012 (Rhypo, eventi superficiali) — verbatim da OpenQuake.
const C = { c0: 2.085, c1: 1.428, c2: -1.402, c4: 0.078, m1: -0.209, m2: 2.042 };

export const SHAKE_PHRASE =
  'Stima semplificata basata su dati ufficiali e relazioni pubblicate. ' +
  'Non è una ShakeMap ufficiale e non sostituisce Protezione Civile, INGV o USGS.';

// Classi descrittive (5 livelli) mappate su intervalli MMI documentati.
const CLASSES = [
  { key: 'molto-lieve', label: 'molto lieve', max: 2.5 },
  { key: 'lieve', label: 'lieve', max: 4.5 },
  { key: 'moderata', label: 'moderata', max: 6.0 },
  { key: 'forte', label: 'forte', max: 7.5 },
  { key: 'molto-forte', label: 'molto forte', max: Infinity }
];

export function classifyIntensity(mmi) {
  for (const c of CLASSES) if (mmi < c.max) return { key: c.key, label: c.label };
  return { key: 'molto-forte', label: 'molto forte' };
}

// Stima d'intensità (MMI) per un evento su un punto. Funzione PURA.
// Ritorna null se i dati non sono utilizzabili.
export function estimateIntensity({ mag, depthKm, epicentralKm }) {
  const M = Number(mag);
  const dEpi = Number(epicentralKm);
  if (!Number.isFinite(M) || !Number.isFinite(dEpi) || dEpi < 0) return null;
  const h = Number.isFinite(Number(depthKm)) ? Math.max(0, Number(depthKm)) : 0;

  const rhypo = Math.sqrt(dEpi * dEpi + h * h);
  const Rm = C.m1 + C.m2 * Math.exp(M - 5);
  let mmi = C.c0 + C.c1 * M + C.c2 * Math.log(Math.sqrt(rhypo * rhypo + Rm * Rm));
  if (rhypo > 50) mmi += C.c4 * Math.log(rhypo / 50);
  mmi = Math.max(1, Math.min(10, mmi)); // intervallo MMI plausibile

  return { mmi, rhypo, depthKm: h, ...classifyIntensity(mmi) };
}

// Per ogni luogo, fra gli eventi significativi (M>=minMag, dist<=maxKm) seleziona
// quello con intensità STIMATA più alta. Funzione PURA.
export function computeShakeForPlaces(events, places, opts = {}) {
  const minMag = Number.isFinite(Number(opts.minMag)) ? Number(opts.minMag) : SHAKE_MIN_MAG;
  const maxKm = Number.isFinite(Number(opts.maxKm)) ? Number(opts.maxKm) : SHAKE_MAX_KM;
  if (!Array.isArray(places) || !places.length) return [];
  const evs = Array.isArray(events) ? events : [];

  return places.map(place => {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return { place, estimate: null };
    let best = null;
    for (const ev of evs) {
      if (!(Number(ev.mag) >= minMag)) continue;
      if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) continue;
      const dEpi = haversineKm(place.lat, place.lon, ev.lat, ev.lon);
      if (dEpi > maxKm) continue;
      const est = estimateIntensity({ mag: ev.mag, depthKm: ev.depth, epicentralKm: dEpi });
      if (!est) continue;
      if (!best || est.mmi > best.estimate.mmi) {
        best = { place, event: ev, epicentralKm: dEpi, estimate: est };
      }
    }
    return best || { place, estimate: null };
  });
}

// --- Rendering --------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function placeLabel(p) {
  return p.name ? `${p.label} — ${p.name}` : p.label;
}

export function renderShake(results) {
  const list = $('shakeList');
  if (!list) return;

  if (!Array.isArray(results) || !results.length) {
    list.innerHTML = '<p class="shakeEmpty">Nessun luogo salvato. Aggiungi luoghi in «La mia famiglia» per vedere l\'intensità stimata.</p>';
    return;
  }

  list.innerHTML = results.map(r => {
    const title = escapeHtml(placeLabel(r.place));
    if (!r.estimate || !r.event) {
      return (
        `<div class="shakeItem shake-none">` +
        `<div class="shakeHead"><b>${title}</b></div>` +
        `<p class="shakeExpl">Nessun evento significativo (M ≥ ${SHAKE_MIN_MAG} entro ${SHAKE_MAX_KM} km) tra quelli attualmente caricati.</p>` +
        `</div>`
      );
    }
    const ev = r.event;
    const est = r.estimate;
    const mag = Number(ev.mag).toFixed(1);
    const dist = r.epicentralKm.toFixed(0);
    const depth = est.depthKm.toFixed(0);
    const source = escapeHtml(ev.source || '—');
    const expl =
      `${title}: intensità stimata <b>${est.label}</b>. ` +
      `Evento M${mag} a ${dist} km, profondità ${depth} km. ` +
      `Stima semplificata basata su magnitudo, distanza e profondità (modello Allen–Wald–Worden 2012). ` +
      `Non è una ShakeMap ufficiale.`;
    return (
      `<div class="shakeItem shake-${est.key}">` +
      `<div class="shakeHead"><span class="shakeClass">${escapeHtml(est.label)}</span><b>${title}</b></div>` +
      `<p class="shakeExpl">${expl}</p>` +
      `<details class="shakeDetails"><summary>Dettagli</summary>` +
      `<div class="shakeRow"><span>Intensità stimata (MCS/MMI)</span><b>~ ${est.mmi.toFixed(1)}</b></div>` +
      `<div class="shakeRow"><span>Magnitudo evento</span><b>M ${mag}</b></div>` +
      `<div class="shakeRow"><span>Distanza dall'epicentro</span><b>${dist} km</b></div>` +
      `<div class="shakeRow"><span>Profondità</span><b>${depth} km</b></div>` +
      `<div class="shakeRow"><span>Fonte dati</span><b>${source}</b></div>` +
      `<div class="shakeRow"><span>Modello</span><b>Allen–Wald–Worden (2012), IPE semplificata (estrapolata sotto M5)</b></div>` +
      `</details>` +
      `</div>`
    );
  }).join('');
}

// Ricalcola le stime dai dati già caricati e aggiorna la scheda.
export function refreshShake() {
  const results = computeShakeForPlaces(state.raw || [], state.places || [], {
    minMag: SHAKE_MIN_MAG,
    maxKm: SHAKE_MAX_KM
  });
  state.shake = results;
  renderShake(results);
}

export function initShake() {
  if (!$('shakeList')) return;
  refreshShake();
}
