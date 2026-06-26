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
  panToUser
} from './map.js';
import {
  setStatus,
  renderList,
  renderStats,
  renderNearest,
  renderBanner
} from './ui.js';
import { renderDashboard } from './dashboard.js';
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

// Ricalcola filtri e aggiorna mappa, lista, statistiche, banner e card vicino.
function refreshView() {
  decorate(state.raw, state.userPos);
  state.base = regionMagFilter(state.raw, state.filters);
  state.nearest = findNearest(state.base, state.userPos);
  state.filtered = distanceFilter(state.base, state.filters.maxDistance, state.userPos);

  drawMarkers(state.filtered, state.filters.region, state.userPos);
  if (state.userPos) drawUserLayer(state.userPos);
  else clearUserLayer();

  renderList(state.filtered, e => focusEvent(e.lat, e.lon));
  renderStats(computeStats(state.filtered));
  renderNearest(state.nearest);
  renderBanner(state.userPos);
}

// Traduce un errore tecnico in un messaggio chiaro per l'utente.
function errorMessage(err) {
  if (!err) return 'errore sconosciuto';
  if (err.message === 'timeout') return 'tempo scaduto (timeout)';
  return err.message;
}

// Aggiorna il pannello "Stato" usando lo stato corrente + connessione.
function updateDashboard() {
  renderDashboard({
    online: navigator.onLine,
    activeSource: state.activeSource,
    fellBack: state.fellBack,
    triedFirst: state.triedFirst,
    downloaded: state.raw.length,
    lastUpdate: state.lastUpdate
  });
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
  updateDashboard();
  refreshView();
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
    loadData(); // la vista determina fonte (Auto) e bbox INGV: serve un nuovo fetch
  });

  $('sourceSelect').addEventListener('change', e => {
    state.filters.source = e.target.value;
    loadData();
  });

  $('magRange').addEventListener('input', e => {
    state.filters.minMag = parseFloat(e.target.value);
    $('magValue').textContent = state.filters.minMag;
    refreshView();
  });

  $('distanceSelect').addEventListener('change', onDistanceChange);
  $('locateBtn').addEventListener('click', onLocateClick);
  $('centerBtn').addEventListener('click', onCenterClick);
  $('followChk').addEventListener('change', onFollowToggle);
  $('geocodeBtn').addEventListener('click', onGeocodeClick);
  $('clearPosBtn').addEventListener('click', onClearPosClick);
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

  // Badge connessione: aggiorna lo stato al variare di online/offline.
  window.addEventListener('online', updateDashboard);
  window.addEventListener('offline', updateDashboard);
  updateDashboard();

  // Ripristina l'ultima posizione nota (salvata solo su questo dispositivo).
  const stored = loadStoredPosition();
  if (stored) state.userPos = stored;

  loadData();
  setInterval(loadData, REFRESH_MS);
  registerServiceWorker();
});
