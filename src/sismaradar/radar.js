'use strict';

import {
  USGS_FDSN, INGV_EVENT, PERIOD_DAYS, REGIONS, YEAR_MIN_MAG
} from '../config.js';
import { fetchJson } from '../sources/http.js';
import { inBounds, fmtTime } from '../geo.js';
import {
  analyze, frequencyVariation, classify, explain, LEVEL_LABEL,
  seismicEnergy, temporalDistribution, depthDistribution
} from './engine.js';
import { renderDetail } from './detail.js';

const $ = id => document.getElementById(id);

function isoUtc(d) {
  return d.toISOString().slice(0, 19);
}

function setBounds(params, region) {
  const b = (REGIONS[region] || {}).bounds;
  if (b) {
    params.set('minlatitude', String(b.minLat));
    params.set('maxlatitude', String(b.maxLat));
    params.set('minlongitude', String(b.minLon));
    params.set('maxlongitude', String(b.maxLon));
  }
}

// Conteggio reale degli eventi nella finestra PRECEDENTE [now-2T, now-T].
// USGS espone /count (numero puro); per INGV si conta dal /query.
// Restituisce null in caso di errore: nessun valore inventato.
async function previousCount(source, region, period, effMin) {
  const days = PERIOD_DAYS[period] || 7;
  const now = Date.now();
  const end = new Date(now - days * 86400000);
  const start = new Date(now - 2 * days * 86400000);

  if (source === 'USGS') {
    const p = new URLSearchParams({ format: 'text', starttime: isoUtc(start), endtime: isoUtc(end) });
    if (effMin > 0) p.set('minmagnitude', String(effMin));
    setBounds(p, region);
    const url = USGS_FDSN.replace('/query', '/count') + '?' + p.toString();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const n = parseInt((await res.text()).trim(), 10);
    return Number.isFinite(n) ? n : null;
  }

  const p = new URLSearchParams({
    format: 'geojson', starttime: isoUtc(start), endtime: isoUtc(end),
    orderby: 'time', limit: '20000'
  });
  if (effMin > 0) p.set('minmagnitude', String(effMin));
  setBounds(p, region);
  const json = await fetchJson(`${INGV_EVENT}?${p.toString()}`);
  return (json.features || []).length;
}

function renderRadar(metrics, variation, level, explanation, lastUpdate) {
  $('srCount').textContent = metrics.count;
  $('srMeanMag').textContent = metrics.meanMag != null ? metrics.meanMag.toFixed(1) : '—';
  $('srMaxMag').textContent = metrics.maxMag != null ? metrics.maxMag.toFixed(1) : '—';
  $('srMeanDepth').textContent = metrics.meanDepth != null ? metrics.meanDepth.toFixed(1) + ' km' : '—';
  $('srShallow').textContent = metrics.shallow;
  $('srClusters').textContent = metrics.clusters;

  const idx = $('srIndex');
  if (!metrics.count) {
    idx.textContent = 'Dati insufficienti';
    idx.className = 'srIndex';
  } else {
    idx.textContent = LEVEL_LABEL[level] || '—';
    idx.className = 'srIndex ' + (level || '');
  }

  const tr = $('srTrend');
  if (variation === 'pending') tr.textContent = 'trend: calcolo…';
  else if (variation == null) tr.textContent = 'trend: dato non disponibile';
  else tr.textContent = 'trend: ' + (variation >= 0 ? '+' : '') + variation + '%';

  $('srExplain').textContent =
    explanation || (metrics.count ? '' : 'Dati non sufficienti per l\'analisi statistica.');
  $('srUpdated').textContent = 'Ultimo aggiornamento: ' + (lastUpdate ? fmtTime(lastUpdate) : '—');
}

// Aggiorna SismaRadar per la vista/finestra corrente. Analizza gli eventi del
// periodo nella regione (indipendente dai filtri di magnitudo/distanza della
// dashboard: è una lettura statistica dell'area nel periodo).
export async function refreshRadar({ raw, region, period, source, lastUpdate }) {
  const events = raw.filter(e => inBounds(e.lat, e.lon, (REGIONS[region] || {}).bounds));
  const metrics = analyze(events);

  // Indicatori descrittivi B-1 (nessuna nuova fetch): energia, distribuzione
  // temporale (finestra coerente con previousCount) e per profondità.
  const days = PERIOD_DAYS[period] || 7;
  const now = Date.now();
  const energy = seismicEnergy(events);
  const temporal = temporalDistribution(events, now - days * 86400000, now, 8);
  const depth = depthDistribution(events);

  // Stato immediato (descrittivo); il trend arriva dopo il conteggio precedente.
  renderRadar(metrics, 'pending', null, '', lastUpdate);
  renderDetail({ metrics, variation: 'pending', energy, temporal, depth });
  if (!metrics.count) {
    renderRadar(metrics, null, null, 'Dati non sufficienti per l\'analisi statistica.', lastUpdate);
    renderDetail({ metrics, variation: null, energy, temporal, depth });
    return;
  }

  const floor = period === 'year' ? (YEAR_MIN_MAG[region] != null ? YEAR_MIN_MAG[region] : 0) : 0;

  let prev = null;
  try {
    prev = source ? await previousCount(source, region, period, floor) : null;
  } catch (e) {
    prev = null; // dato non disponibile: nessun valore inventato
  }

  const variation = frequencyVariation(metrics.count, prev);
  const level = classify(metrics, variation, region);
  renderRadar(metrics, variation, level, explain(metrics, variation), lastUpdate);
  renderDetail({ metrics, variation, energy, temporal, depth });
}
