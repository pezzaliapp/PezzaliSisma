'use strict';

import { REFRESH_MS, GEOCODE_MIN_MOVE_M } from './config.js';
import { state } from './state.js';
import { loadEvents } from './data.js';
import { haversineKm } from './geo.js';
import {
  decorate,
  regionMagFilter,
  distanceFilter,
  findNearest,
  computeStats
} from './filters.js';
import {
  initMap,
  drawMarkers,
  drawUserLayer,
  clearUserLayer,
  focusEvent,
  centerOnUser,
  panToUser,
  openEventPopup
} from './map.js';
import {
  setStatus,
  renderList,
  renderNearest,
  renderImportant,
  renderBanner
} from './ui.js';
import { renderActivity } from './dashboard.js';
import { refreshOverview } from './overview.js';
import { initTimeline, setTimelineRange } from './timeline.js';
import { refreshRadar } from './sismaradar/radar.js';
import { initInfo } from './info.js';
import { initPrepare } from './prepare.js';
import { initPlaces } from './places.js';
import {
  loadStoredPosition,
  storePosition,
  clearStoredPosition,
  locateOnce,
  startWatch,
  stopWatch,
  geoErrorMessage
} from './geolocation.js';
import {
  reverseGeocode,
  hasGeoConsent,
  setGeoConsent,
  clearGeoConsent,
  GEOCODE_CONSENT_MESSAGE
} from './geocode.js';

const $ = id => document.getElementById(id);

// Evento "più importante" = magnitudo massima fra quelli visualizzati.
function mostImportant(events) {
  let best = null;
  for (const e of events) if (!best || e.mag > best.mag) best = e;
  return best;
}

// Aggiorna la card "Attività attuale" dallo stato corrente + connessione.
function renderActivityNow() {
  const stats = computeStats(state.filtered);
  renderActivity({
    online: navigator.onLine,
    activeSource: state.activeSource,
    fellBack: state.fellBack,
    triedFirst: state.triedFirst,
    shown: state.filtered.length,
    maxMag: stats.maxMag,
    lastTime: stats.lastTime,
    lastUpdate: state.lastUpdate
  });
}

function timeRange(events) {
  if (!events.length) return [0, 0];
  let lo = events[0].time;
  let hi = events[0].time;
  for (const e of events) {
    if (e.time < lo) lo = e.time;
    if (e.time > hi) hi = e.time;
  }
  return [lo, hi];
}

// Aggiorna la nota sulla mappa: soglia 365g e/o tetto di rendering.
function updateMapNote(info) {
  const el = $('mapNote');
  const parts = [];
  if (state.filters.period === 'year') {
    parts.push('365 giorni: M minima automatica (Mondo ≥4.0, Italia/Med ≥2.5).');
  }
  if (info && info.drawn < info.total) {
    parts.push(`Mostrati i ${info.drawn} eventi più recenti di ${info.total}.`);
  }
  if (parts.length) {
    el.textContent = parts.join(' ');
    el.hidden = false;
  } else {
    el.hidden = true;
    el.textContent = '';
  }
}

// Applica il cursore timeline agli insiemi pre-cursore e aggiorna la UI.
// `fit` = adatta la vista mappa (false durante scrub/playback).
function applyCursorAndRender(fit) {
  const cur = state.timelineCursor;
  state.base = cur ? state.baseAll.filter(e => e.time <= cur) : state.baseAll;
  state.filtered = cur ? state.filtAll.filter(e => e.time <= cur) : state.filtAll;
  state.nearest = findNearest(state.base, state.userPos);

  const info = drawMarkers(state.filtered, state.filters.region, state.userPos, {
    fit,
    markers: state.filters.showMarkers,
    heat: state.filters.showHeat
  });
  if (state.userPos) drawUserLayer(state.userPos);
  else clearUserLayer();

  renderList(state.filtered, e => focusEvent(e.lat, e.lon));
  renderActivityNow();
  renderNearest(state.nearest, e => focusEvent(e.lat, e.lon), onLocateClick);
  renderImportant(mostImportant(state.filtered), e => {
    focusEvent(e.lat, e.lon); // centra anche se i marker sono nascosti
    openEventPopup(e.id);
  });
  renderBanner(state.userPos);
  updateMapNote(info);
}

// Ridisegna solo i layer della mappa (toggle marker/heatmap) senza riadattare.
function redrawMapLayers() {
  const info = drawMarkers(state.filtered, state.filters.region, state.userPos, {
    fit: false,
    markers: state.filters.showMarkers,
    heat: state.filters.showHeat
  });
  updateMapNote(info);
}

// Ricalcola gli insiemi pre-cursore (region+mag+distanza) e ridisegna.
// `resetTimeline` ripristina il cursore e l'intervallo della timeline.
function refreshView(resetTimeline = false) {
  decorate(state.raw, state.userPos);
  state.baseAll = regionMagFilter(state.raw, state.filters);
  state.filtAll = distanceFilter(state.baseAll, state.filters.maxDistance, state.userPos);

  if (resetTimeline) {
    state.timelineCursor = null;
    const [lo, hi] = timeRange(state.filtAll);
    setTimelineRange(lo, hi);
  }
  applyCursorAndRender(true);
}

// Callback della timeline: imposta il cursore e ridisegna senza riadattare la vista.
function onTimelineChange(cursorMs) {
  state.timelineCursor = cursorMs;
  applyCursorAndRender(false);
}

// Traduce un errore tecnico in un messaggio chiaro per l'utente.
function errorMessage(err) {
  if (!err) return 'errore sconosciuto';
  if (err.message === 'timeout') return 'tempo scaduto (timeout)';
  return err.message;
}

// Scarica i dati applicando strategia sorgente e fallback automatico.
async function loadData() {
  setStatus('Carico dati reali…');
  const res = await loadEvents({
    period: state.filters.period,
    region: state.filters.region,
    source: state.filters.source
  });

  state.raw = res.events;
  state.activeSource = res.activeSource;
  state.fellBack = res.fellBack;
  state.triedFirst = res.triedFirst;

  if (res.activeSource) {
    state.lastUpdate = Date.now();
    const fb = res.fellBack ? ` · fallback da ${res.triedFirst}` : '';
    setStatus('Aggiornato: ' + new Date().toLocaleTimeString('it-IT') + fb);
  } else {
    setStatus('Nessuna fonte disponibile: ' + errorMessage(res.error) + '. Riprova.');
  }
  refreshView(true); // nuovo dataset: ripristina cursore e intervallo timeline
  refreshOverview(); // "Situazione generale" Italia/Mondo (USGS 24h), in parallelo
  // SismaRadar: lettura statistica dell'area nella finestra corrente.
  refreshRadar({
    raw: state.raw,
    region: state.filters.region,
    period: state.filters.period,
    source: state.activeSource,
    lastUpdate: state.lastUpdate
  });
}

// Applica una nuova posizione utente (da richiesta singola o da watch).
// Comune/Provincia già noti vengono conservati finché ci si sposta di meno di
// GEOCODE_MIN_MOVE_M metri; oltre quella soglia diventano obsoleti e vengono
// rimossi (nessuna nuova richiesta automatica: serve un gesto esplicito).
function setUserPos(pos, { center = false } = {}) {
  const prev = state.userPos;
  if (prev && prev.comune && prev.geocodedAt) {
    const movedM =
      haversineKm(prev.geocodedAt.lat, prev.geocodedAt.lon, pos.lat, pos.lon) * 1000;
    if (movedM <= GEOCODE_MIN_MOVE_M) {
      pos.comune = prev.comune;
      pos.provincia = prev.provincia;
      pos.geocodedAt = prev.geocodedAt;
    }
  }
  state.userPos = pos;
  storePosition(pos); // SOLO su questo dispositivo
  refreshView();
  if (center) centerOnUser(pos);
  else if (state.follow) panToUser(pos);
}

// --- Geolocalizzazione -----------------------------------------------------

async function onLocateClick() {
  setStatus('Richiesta posizione…');
  try {
    const pos = await locateOnce();
    setUserPos(pos, { center: true });
    setStatus('Posizione rilevata.');
  } catch (err) {
    setStatus(geoErrorMessage(err)); // nessun errore JS, l'app continua
  }
}

function onCenterClick() {
  if (state.userPos) centerOnUser(state.userPos);
  else onLocateClick();
}

function onFollowToggle(e) {
  state.follow = e.target.checked;
  if (state.follow) {
    setStatus('Monitoraggio posizione attivo…');
    state.watchId = startWatch(
      pos => {
        setUserPos(pos);
        setStatus('Posizione aggiornata: ' + new Date().toLocaleTimeString('it-IT'));
      },
      err => {
        // Disattiva in modo pulito in caso di errore/diniego.
        stopWatch(state.watchId);
        state.watchId = null;
        state.follow = false;
        $('followChk').checked = false;
        setStatus(geoErrorMessage(err));
      }
    );
  } else {
    stopWatch(state.watchId);
    state.watchId = null;
    setStatus('Monitoraggio posizione disattivato.');
  }
}

// Reverse geocoding su richiesta esplicita (Comune/Provincia).
async function onGeocodeClick() {
  if (!state.userPos) {
    setStatus('Attiva prima la posizione.');
    return;
  }
  // Comune già noto e ancora valido (entro la soglia): nessuna nuova richiesta.
  if (state.userPos.comune) {
    setStatus('Comune e Provincia già rilevati.');
    return;
  }
  // Consenso una-tantum alla prima attivazione.
  if (!hasGeoConsent()) {
    if (!window.confirm(GEOCODE_CONSENT_MESSAGE)) {
      setStatus('Rilevamento Comune/Provincia annullato.');
      return;
    }
    setGeoConsent();
  }
  setStatus('Rilevo Comune e Provincia…');
  try {
    const { comune, provincia } = await reverseGeocode(state.userPos.lat, state.userPos.lon);
    state.userPos.comune = comune;
    state.userPos.provincia = provincia;
    state.userPos.geocodedAt = { lat: state.userPos.lat, lon: state.userPos.lon };
    storePosition(state.userPos); // SOLO su questo dispositivo
    renderBanner(state.userPos);
    setStatus(comune ? `Rilevato: ${comune}.` : 'Comune non disponibile per queste coordinate.');
  } catch (err) {
    setStatus('Reverse geocoding non riuscito: ' + err.message);
  }
}

// Cancella ogni informazione di posizione memorizzata localmente.
function onClearPosClick() {
  if (state.follow) {
    stopWatch(state.watchId);
    state.watchId = null;
    state.follow = false;
    $('followChk').checked = false;
  }
  state.userPos = null;
  clearStoredPosition();
  clearGeoConsent();
  refreshView();
  setStatus('Posizione cancellata dal dispositivo.');
}

function onDistanceChange(e) {
  state.filters.maxDistance = parseInt(e.target.value, 10) || 0;
  if (state.filters.maxDistance && !state.userPos) {
    setStatus('Attiva prima la posizione per filtrare per distanza.');
  }
  refreshView(true);
}

// Collega gli elementi dell'interfaccia ai gestori.
function wireControls() {
  $('refreshBtn').addEventListener('click', loadData);

  $('periodSelect').addEventListener('change', e => {
    state.filters.period = e.target.value;
    $('floorNote').hidden = e.target.value !== 'year';
    loadData(); // il periodo cambia la sorgente: serve un nuovo fetch
  });

  $('areaSelect').addEventListener('change', e => {
    state.filters.region = e.target.value;
    loadData(); // la vista determina fonte (Auto) e bbox INGV: serve un nuovo fetch
  });

  $('sourceSelect').addEventListener('change', e => {
    state.filters.source = e.target.value;
    loadData();
  });

  $('magRange').addEventListener('input', e => {
    state.filters.minMag = parseFloat(e.target.value);
    $('magValue').textContent = state.filters.minMag;
    refreshView(true);
  });

  wireLayerToggle('markersToggle', 'showMarkers');
  wireLayerToggle('heatToggle', 'showHeat');

  $('distanceSelect').addEventListener('change', onDistanceChange);
  $('locateBtn').addEventListener('click', onLocateClick);
  $('centerBtn').addEventListener('click', onCenterClick);
  $('followChk').addEventListener('change', onFollowToggle);
  $('geocodeBtn').addEventListener('click', onGeocodeClick);
  $('clearPosBtn').addEventListener('click', onClearPosClick);
}

// Pulsante toggle livello mappa (Marker / Heatmap): touch-friendly, stato visibile.
function wireLayerToggle(btnId, filterKey) {
  const btn = $(btnId);
  if (!btn) return;
  const syncUI = () => {
    const on = !!state.filters[filterKey];
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const lab = btn.querySelector('.layerState');
    if (lab) lab.textContent = on ? 'ON' : 'OFF';
  };
  syncUI();
  btn.addEventListener('click', () => {
    state.filters[filterKey] = !state.filters[filterKey];
    syncUI();
    redrawMapLayers();
  });
}

// Registra il service worker (solo su origini sicure, non da file://).
function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// Sezioni comprimibili (Controlli/Posizione): aperte su desktop, chiuse su mobile.
function initCollapsibles() {
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  document.querySelectorAll('details.collapsible').forEach(d => {
    d.open = !mobile;
  });
}

window.addEventListener('load', () => {
  initMap();
  wireControls();
  initCollapsibles();
  initTimeline(onTimelineChange);
  initInfo();
  initPrepare();
  initPlaces();

  // Badge connessione: aggiorna l'attività al variare di online/offline.
  window.addEventListener('online', renderActivityNow);
  window.addEventListener('offline', renderActivityNow);
  renderActivityNow();

  // Ripristina l'ultima posizione nota (salvata solo su questo dispositivo).
  const stored = loadStoredPosition();
  if (stored) state.userPos = stored;

  loadData();
  setInterval(loadData, REFRESH_MS);
  registerServiceWorker();
});
