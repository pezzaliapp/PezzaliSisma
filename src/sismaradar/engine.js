'use strict';

// Motore statistico di SismaRadar — funzioni PURE su eventi GIÀ REGISTRATI.
// Nessuna previsione, nessun allarme: solo descrizione di dati osservati.

// Magnitudo considerata "forte per l'area" (per il solo indicatore statistico).
export const STRONG_MAG = { world: 6.0, italy: 4.5, mediterranean: 4.5 };

// Statistiche descrittive sull'insieme di eventi fornito.
export function analyze(events) {
  const n = events.length;
  if (!n) {
    return {
      count: 0, maxMag: null, meanMag: null, meanDepth: null,
      shallow: 0, concentration: 0, clusters: 0
    };
  }
  let sumMag = 0, sumDepth = 0, maxMag = -Infinity, shallow = 0;
  const cells = new Map(); // griglia ~1° per concentrazione/sciami

  for (const e of events) {
    sumMag += e.mag;
    sumDepth += e.depth;
    if (e.mag > maxMag) maxMag = e.mag;
    if (e.depth <= 10) shallow++;
    const key = Math.floor(e.lat) + ',' + Math.floor(e.lon);
    cells.set(key, (cells.get(key) || 0) + 1);
  }

  let maxCell = 0;
  for (const c of cells.values()) if (c > maxCell) maxCell = c;
  const concentration = Math.round((maxCell / n) * 100);

  // "Sciame/cluster" statistico: cella della griglia con un numero di eventi
  // significativo rispetto al totale (soglia conservativa).
  const clusterMin = Math.max(5, Math.round(n * 0.08));
  let clusters = 0;
  for (const c of cells.values()) if (c >= clusterMin) clusters++;

  return {
    count: n,
    maxMag,
    meanMag: sumMag / n,
    meanDepth: sumDepth / n,
    shallow,
    concentration,
    clusters
  };
}

// Variazione percentuale della frequenza rispetto alla finestra precedente.
// Restituisce null se il dato non è disponibile (niente valori inventati).
export function frequencyVariation(currentCount, previousCount) {
  if (previousCount == null) return null;
  if (previousCount === 0) return null; // evita divisione per zero
  return Math.round(((currentCount - previousCount) / previousCount) * 100);
}

// Indicatore: 'normale' | 'osservare' | 'elevata'. Soglie trasparenti e
// conservative (confermate dall'utente).
export function classify(metrics, variation, region) {
  const strong = STRONG_MAG[region] != null ? STRONG_MAG[region] : 6.0;
  const hasStrong = metrics.maxMag != null && metrics.maxMag >= strong;
  const conc = metrics.concentration;

  if (variation != null && variation >= 50 && (hasStrong || conc >= 50)) return 'elevata';
  if ((variation != null && variation >= 25) || conc >= 40) return 'osservare';
  return 'normale';
}

export const LEVEL_LABEL = {
  normale: 'Normale',
  osservare: 'Da osservare',
  elevata: 'Attività elevata'
};

// Spiegazione testuale PRUDENTE, composta solo da frasi ammesse. Descrive dati
// osservati; non parla mai di rischio, allarme o previsione.
export function explain(metrics, variation) {
  const parts = [];
  if (variation == null) {
    parts.push('Variazione rispetto alla finestra precedente: dato non disponibile.');
  } else if (variation >= 25) {
    parts.push('Si osserva un aumento statistico degli eventi rispetto alla finestra precedente.');
  } else if (variation <= -25) {
    parts.push('Si osserva una diminuzione statistica degli eventi rispetto alla finestra precedente.');
  } else {
    parts.push('L\'attività osservata risulta in linea con la finestra precedente.');
  }
  if (metrics.concentration >= 40) {
    parts.push('Gli eventi risultano concentrati in una o più aree della mappa.');
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Indicatori descrittivi aggiuntivi (V2.0-B1). Funzioni PURE su eventi GIÀ
// REGISTRATI. Sono descrittivi: NON modificano il livello (Normale/Da
// osservare/Attività elevata) e non costituiscono una previsione.
// ---------------------------------------------------------------------------

// Energia sismica stimata con la relazione di Gutenberg–Richter:
//   log10(E[J]) = 1.5*M + 4.8   =>   E = 10^(1.5*M + 4.8)  (Joule)
// Ritorna energia totale stimata, quella dell'evento massimo e la sua quota.
// È una STIMA, dominata dagli eventi di magnitudo maggiore.
export function seismicEnergy(events) {
  const out = { totalJoule: 0, maxEventJoule: 0, dominantShare: 0 };
  if (!Array.isArray(events) || !events.length) return out;
  let total = 0, maxE = 0;
  for (const e of events) {
    const M = Number(e.mag);
    if (!Number.isFinite(M)) continue;
    const E = Math.pow(10, 1.5 * M + 4.8);
    total += E;
    if (E > maxE) maxE = E;
  }
  out.totalJoule = total;
  out.maxEventJoule = maxE;
  out.dominantShare = total > 0 ? maxE / total : 0;
  return out;
}

// Distribuzione temporale: conteggio eventi in `bins` intervalli uguali tra
// startMs e endMs (epoch ms). Ritorna [{ from, to, count }]. Funzione pura.
export function temporalDistribution(events, startMs, endMs, bins = 8) {
  const out = [];
  const a = Number(startMs), b = Number(endMs);
  const n = Math.max(1, Math.floor(Number(bins) || 0));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return out;
  const step = (b - a) / n;
  for (let i = 0; i < n; i++) out.push({ from: a + i * step, to: a + (i + 1) * step, count: 0 });
  if (!Array.isArray(events)) return out;
  for (const e of events) {
    const t = Number(e.time);
    if (!Number.isFinite(t) || t < a || t > b) continue;
    let idx = Math.floor((t - a) / step);
    if (idx >= n) idx = n - 1; // include l'estremo superiore nell'ultimo bucket
    if (idx < 0) idx = 0;
    out[idx].count++;
  }
  return out;
}

// Fasce di profondità (km) dichiarate, intervalli semiaperti [min, max).
export const DEPTH_BANDS = [
  { label: '0–10', min: 0, max: 10 },
  { label: '10–30', min: 10, max: 30 },
  { label: '30–70', min: 30, max: 70 },
  { label: '70–300', min: 70, max: 300 },
  { label: '>300', min: 300, max: Infinity }
];

// Distribuzione per profondità: conteggi per fascia. Funzione pura.
export function depthDistribution(events) {
  const out = DEPTH_BANDS.map(b => ({ label: b.label, min: b.min, max: b.max, count: 0 }));
  if (!Array.isArray(events)) return out;
  for (const e of events) {
    const d = Number(e.depth);
    if (!Number.isFinite(d) || d < 0) continue;
    for (const band of out) {
      if (d >= band.min && (d < band.max || band.max === Infinity)) { band.count++; break; }
    }
  }
  return out;
}
