'use strict';

import { REFRESH_MS } from './config.js';
import { state } from './state.js';
import { fetchEvents } from './data.js';
import { applyFilters, computeStats } from './filters.js';
import { initMap, drawMarkers, focusEvent } from './map.js';
import { setStatus, renderList, renderStats } from './ui.js';

const $ = id => document.getElementById(id);

// Ricalcola i filtri sullo stato corrente e aggiorna mappa, lista e statistiche.
function refreshView() {
  state.filtered = applyFilters(state.raw, state.filters);
  drawMarkers(state.filtered, state.filters.region);
  renderList(state.filtered, e => focusEvent(e.lat, e.lon));
  renderStats(computeStats(state.filtered));
}

// Scarica i dati dalla sorgente per il periodo selezionato.
async function loadData() {
  setStatus('Carico dati reali…');
  try {
    state.raw = await fetchEvents(state.filters.period);
    state.lastUpdate = Date.now();
    setStatus('Aggiornato: ' + new Date().toLocaleTimeString('it-IT'));
  } catch (err) {
    state.raw = [];
    setStatus('Errore dati: ' + err.message + '. Riprova o avvia da HTTPS.');
  }
  refreshView();
}

// Collega gli elementi dell'interfaccia ai gestori.
function wireControls() {
  $('refreshBtn').addEventListener('click', loadData);

  $('periodSelect').addEventListener('change', e => {
    state.filters.period = e.target.value;
    loadData(); // il periodo cambia la sorgente: serve un nuovo fetch
  });

  $('areaSelect').addEventListener('change', e => {
    state.filters.region = e.target.value;
    refreshView(); // solo refiltro dei dati già scaricati
  });

  $('magRange').addEventListener('input', e => {
    state.filters.minMag = parseFloat(e.target.value);
    $('magValue').textContent = state.filters.minMag;
    refreshView();
  });
}

// Registra il service worker (solo su origini sicure, non da file://).
function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

window.addEventListener('load', () => {
  initMap();
  wireControls();
  loadData();
  setInterval(loadData, REFRESH_MS);
  registerServiceWorker();
});
