'use strict';

// Pannello "Perché questo indicatore?" di SismaRadar (V2.0-B2).
// SOLO presentazione di indicatori DESCRITTIVI già calcolati dal motore B-1 su
// eventi GIÀ REGISTRATI. Nessuna fetch, nessun dato inventato, nessuna
// previsione: non modifica il livello (Normale/Da osservare/Attività elevata).

// Apici Unicode per gli esponenti (notazione scientifica leggibile, no librerie).
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function supExp(n) {
  return String(n).split('').map(c => SUP[c] || c).join('');
}

// Formatta un'energia in Joule in notazione scientifica (es. "1,2 × 10¹³ J").
// Pura. Restituisce '—' per valori non positivi o non finiti (niente invenzioni).
export function formatEnergy(joule) {
  const v = Number(joule);
  if (!Number.isFinite(v) || v <= 0) return '—';
  const exp = Math.floor(Math.log10(v));
  const mantissa = v / Math.pow(10, exp);
  // Una cifra decimale, separatore italiano.
  const m = mantissa.toFixed(1).replace('.', ',');
  return `${m} × 10${supExp(exp)} J`;
}

// Normalizza una lista di conteggi in percentuali 0–100 sul massimo (per le
// mini-barre CSS). Pura. Lista vuota o tutti zero -> tutti 0.
export function barPercents(counts) {
  if (!Array.isArray(counts) || !counts.length) return [];
  let max = 0;
  for (const c of counts) { const n = Number(c); if (Number.isFinite(n) && n > max) max = n; }
  if (max <= 0) return counts.map(() => 0);
  return counts.map(c => {
    const n = Number(c);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round((n / max) * 100);
  });
}

// Frase obbligatoria (testo unico, senza a-capo: resta identica nel markup).
export const SR_CLAIM = 'Questi indicatori descrivono eventi già registrati e non costituiscono una previsione sismica né un\'allerta ufficiale.';

const $ = id => document.getElementById(id);

// Escape minimale per testo inserito via innerHTML (etichette controllate, ma
// per prudenza: nessun dato esterno non sanificato finisce nel markup).
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Costruisce le righe di un mini-grafico a barre orizzontali (HTML CSS puro).
function barsHtml(rows) {
  const pcts = barPercents(rows.map(r => r.count));
  return rows.map((r, i) => `
    <div class="srBarRow">
      <span class="srBarLabel">${esc(r.label)}</span>
      <span class="srBarTrack"><i style="width:${pcts[i]}%"></i></span>
      <span class="srBarVal">${esc(r.count)}</span>
    </div>`).join('');
}

function pct(n) {
  return Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) : null;
}

// Aggiorna il pannello esplicativo. `data` raccoglie indicatori GIÀ calcolati:
//   { metrics, variation, energy, temporal, depth }
// Tutti descrittivi; in assenza di eventi mostra '—' coerenti.
export function renderDetail(data) {
  const body = $('srDetailBody');
  if (!body) return;

  const { metrics, variation, energy, temporal, depth } = data;

  if (!metrics || !metrics.count) {
    body.innerHTML =
      '<p class="srDExpl">Dati non sufficienti per gli indicatori descrittivi.</p>' +
      `<p class="srDClaim">${SR_CLAIM}</p>`;
    return;
  }

  const totShare = pct(energy && energy.dominantShare);
  const energyStr = formatEnergy(energy && energy.totalJoule);
  const variationStr = variation == null || variation === 'pending'
    ? 'dato non disponibile'
    : (variation >= 0 ? '+' : '') + variation + '%';

  const temporalRows = (temporal || []).map((b, i) => ({ label: 'int. ' + (i + 1), count: b.count }));
  const depthRows = (depth || []).map(b => ({ label: b.label + ' km', count: b.count }));

  body.innerHTML = `
    <div class="srDItem">
      <div class="srDHead"><span>Energia sismica stimata (totale)</span><b>${esc(energyStr)}</b></div>
      <p class="srDExpl">Stima dell'energia rilasciata dagli eventi del periodo (Gutenberg–Richter).
        Il valore è <strong>dominato dagli eventi di magnitudo maggiore</strong>${totShare != null ? ` (l'evento massimo pesa circa il ${totShare}% del totale)` : ''}.</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Distribuzione temporale</span><b>${(temporal || []).length} intervalli</b></div>
      <div class="srBars">${barsHtml(temporalRows)}</div>
      <p class="srDExpl">Numero di eventi in intervalli uguali del periodo: mostra se l'attività è
        più o meno concentrata nel tempo.</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Distribuzione per profondità</span><b>km</b></div>
      <div class="srBars">${barsHtml(depthRows)}</div>
      <p class="srDExpl">Numero di eventi per fascia di profondità (ipocentro).</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Frequenza eventi</span><b>${esc(metrics.count)}</b></div>
      <p class="srDExpl">Eventi registrati nel periodo e nella regione selezionati.</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Confronto con la finestra precedente</span><b>${esc(variationStr)}</b></div>
      <p class="srDExpl">Variazione del numero di eventi rispetto al periodo precedente di pari durata.
        “Dato non disponibile” quando il conteggio precedente non è ottenibile (nessun valore inventato).</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Magnitudo</span><b>max ${metrics.maxMag != null ? esc(metrics.maxMag.toFixed(1)) : '—'} · media ${metrics.meanMag != null ? esc(metrics.meanMag.toFixed(1)) : '—'}</b></div>
      <p class="srDExpl">Valore massimo e medio delle magnitudo osservate nel periodo.</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Profondità media</span><b>${metrics.meanDepth != null ? esc(metrics.meanDepth.toFixed(1)) + ' km' : '—'}</b></div>
      <p class="srDExpl">Profondità media degli ipocentri degli eventi osservati.</p>
    </div>

    <div class="srDItem">
      <div class="srDHead"><span>Sciami / cluster</span><b>${esc(metrics.clusters)}</b></div>
      <p class="srDExpl">Aree con un numero di eventi addensato rispetto al totale (criterio statistico
        conservativo su griglia ~1°).</p>
    </div>

    <p class="srDClaim">${SR_CLAIM}</p>`;
}
