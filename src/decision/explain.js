'use strict';

// Decision Support — DS-1: "Cosa significa" (significato dell'intensità per luogo).
//
// Motore di spiegazione ESPLICABILE: trasforma valori GIÀ calcolati (intensità
// stimata AWW2012, distanza, profondità) in una spiegazione a SCHEMA FISSO di 4
// parti, ognuna riconducibile a una regola dichiarata e a un modello documentato.
//
//   1) Fatto osservato   (R0)     — dati ufficiali, nessuna interpretazione
//   2) Significato       (R1)     — classe d'intensità -> effetti (scala MCS/MMI)
//   3) Perché            (R2)     — attenuazione con distanza/profondità (IPE)
//   4) Limiti            (R-LIM)  — natura di stima, non sostituisce gli enti
//
// PURO e DETERMINISTICO: stessi fatti -> stesse frase. Nessuna previsione, nessun
// allarme, nessun dato inventato, nessuna casualità, nessun testo "perché suona
// bene": ogni frase è giustificabile tecnicamente. Se la stima non è disponibile,
// non produce nulla (la conclusione che non si può difendere non compare).
//
// Base scientifica e limiti: vedi docs/SCIENZA.md (sezioni ShakeMap personale e
// Decision Support DS-1).

// Mappa DICHIARATA classe d'intensità -> effetti tipici (descrizione della scala
// macrosismica MCS/MMI applicata a eventi GIÀ AVVENUTI). Linguaggio prudente, al
// presente/passato, nessuna azione operativa, nessun futuro.
export const CLASS_EFFECT = {
  'molto-lieve': "Un'intensità di questo livello in genere non viene avvertita, o solo da poche persone in condizioni particolari, e non sono attesi effetti sulle strutture.",
  'lieve': 'Eventi di questo livello vengono normalmente percepiti da parte della popolazione, ma raramente provocano danni.',
  'moderata': "Un'intensità moderata viene generalmente avvertita dalla maggior parte delle persone; possono esserci lievi effetti su oggetti, mentre i danni alle costruzioni sono in genere assenti o molto limitati.",
  'forte': "Un'intensità forte viene avvertita da tutti e può accompagnarsi a danni leggeri o moderati, soprattutto agli edifici più vulnerabili.",
  'molto-forte': "Un'intensità molto forte può accompagnarsi a danni alle costruzioni; per gli eventi già avvenuti il riferimento restano le valutazioni ufficiali."
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function placeLabel(p) {
  return p && p.name ? `${p.label} — ${p.name}` : (p ? p.label : '');
}

// Costruisce la spiegazione a 4 parti per un risultato di computeShakeForPlaces:
//   item = { place, event, epicentralKm, estimate }
// Ritorna null se non c'è una stima difendibile (nessuna frase prodotta).
// Ogni parte porta con sé la tracciabilità: { dato, regola, modello }.
export function buildPlaceExplanation(item) {
  if (!item || !item.estimate || !item.event) return null;

  const ev = item.event;
  const est = item.estimate;
  const M = Number(ev.mag);
  const dEpi = Number(item.epicentralKm);
  if (!Number.isFinite(M) || !Number.isFinite(dEpi)) return null;

  const rawDepth = Number(ev.depth);
  // null/undefined -> profondità mancante; lo 0 reale (superficiale) è valido.
  const hasDepth = ev.depth != null && Number.isFinite(rawDepth) && rawDepth >= 0;

  const mag = M.toFixed(1);
  const dist = dEpi.toFixed(0);
  const depth = hasDepth ? rawDepth.toFixed(0) : null;
  const rhyp = Number.isFinite(est.rhypo) ? est.rhypo.toFixed(0) : dist;
  const mmiStr = Number.isFinite(est.mmi) ? est.mmi.toFixed(1) : '—';
  const place = placeLabel(item.place);
  const klass = est.key;
  const label = est.label;
  const source = ev.source || '—';
  const effect = CLASS_EFFECT[klass] || '';

  // 1) FATTO OSSERVATO (R0) — solo dati ufficiali.
  const p1 = {
    ruolo: 'Fatto osservato',
    ruleId: 'R0',
    testo: hasDepth
      ? `È stato registrato un evento di magnitudo ${mag} a ${dist} km dal luogo «${place}», con ipocentro a ${depth} km di profondità.`
      : `È stato registrato un evento di magnitudo ${mag} a ${dist} km dal luogo «${place}». La profondità dell'ipocentro non è disponibile per questo evento.`,
    dato: `Evento ${source}: M ${mag}${hasDepth ? `, profondità ${depth} km` : ''}; distanza ${dist} km (formula di Haversine).`,
    regola: 'R0 — fatto osservato (riesposizione di dati ufficiali)',
    modello: 'Nessun modello: dato osservato, non interpretato.'
  };

  // 2) SIGNIFICATO (R1) — classe d'intensità -> effetti (scala macrosismica).
  const lead = hasDepth ? 'Alla distanza e profondità osservate' : 'Alla distanza osservata';
  const p2 = {
    ruolo: 'Significato',
    ruleId: 'R1',
    testo: `${lead}, l'intensità stimata sul luogo è ${label}. ${effect}`,
    dato: `M ${mag}, distanza ${dist} km, profondità ${hasDepth ? depth + ' km' : '0 km (assunta)'} → MMI ≈ ${mmiStr} (classe «${label}»).`,
    regola: 'R1 — significato dell\'intensità (classe → effetti)',
    modello: 'IPE Allen–Wald–Worden (2012); descrizioni della scala macrosismica MCS/MMI.'
  };

  // 3) PERCHÉ (R2) — attenuazione con distanza e profondità (sempre vera: il
  // termine di attenuazione è monotòno nella distanza ipocentrale).
  const p3 = {
    ruolo: 'Perché',
    ruleId: 'R2',
    testo: hasDepth
      ? `Nel modello utilizzato l'intensità attesa diminuisce all'aumentare della distanza: la distanza dall'epicentro (${dist} km) e la profondità dell'ipocentro (${depth} km), combinate in una distanza ipocentrale di ${rhyp} km, riducono gli effetti attesi sul luogo rispetto a un punto più vicino alla sorgente.`
      : `Nel modello utilizzato l'intensità attesa diminuisce all'aumentare della distanza dall'epicentro (${dist} km): a distanza maggiore corrispondono effetti minori sul luogo rispetto a un punto più vicino alla sorgente.`,
    dato: `Distanza ipocentrale r = ${rhyp} km (da distanza ${dist} km e profondità ${hasDepth ? depth + ' km' : '0 km'}).`,
    regola: 'R2 — attenuazione con distanza e profondità',
    modello: 'Termine di attenuazione c₂·ln(r) dell\'IPE Allen–Wald–Worden (2012).'
  };

  // 4) LIMITI (R-LIM) — natura di stima; non sostituisce gli enti ufficiali.
  const p4 = {
    ruolo: 'Limiti',
    ruleId: 'R-LIM',
    testo: 'Questa è una stima basata su un modello pubblicato (Allen–Wald–Worden, 2012) e non sostituisce le valutazioni ufficiali di Protezione Civile, INGV o USGS. Non tiene conto degli effetti locali del terreno e, per magnitudo inferiori a 5, è un\'estrapolazione prudente.',
    dato: 'Identità e taratura del modello impiegato.',
    regola: 'R-LIM — limiti dichiarati',
    modello: 'Limiti AWW2012: nessun effetto di sito; sotto M5 estrapolazione.'
  };

  return { place, klass, label, parts: [p1, p2, p3, p4] };
}

// Compone il blocco HTML "Cosa significa": le 4 parti in ordine fisso + il
// pannello tracciabilità «Perché questo?» (dato / regola / modello per frase).
// Stringa PURA. Ritorna '' se non c'è spiegazione difendibile.
export function explanationHtml(explanation) {
  if (!explanation || !Array.isArray(explanation.parts) || !explanation.parts.length) return '';

  const sentences = explanation.parts.map(p => {
    const cls = p.ruleId === 'R-LIM' ? 'dsPart dsLimits' : 'dsPart';
    return `<p class="${cls}"><span class="dsLabel">${escapeHtml(p.ruolo)}</span>${escapeHtml(p.testo)}</p>`;
  }).join('');

  const prov = explanation.parts.map(p => (
    `<div class="dsProv">` +
    `<b>${escapeHtml(p.ruolo)} (${escapeHtml(p.ruleId)})</b>` +
    `<span>Dato: ${escapeHtml(p.dato)}</span>` +
    `<span>Regola: ${escapeHtml(p.regola)}</span>` +
    `<span>Modello: ${escapeHtml(p.modello)}</span>` +
    `</div>`
  )).join('');

  return (
    `<div class="dsBlock">` +
    sentences +
    `<details class="dsWhy"><summary>Perché questo?</summary>${prov}</details>` +
    `</div>`
  );
}
