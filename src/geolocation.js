'use strict';

import { STORAGE_KEY } from './config.js';

// --- Persistenza locale (SOLO su questo dispositivo) -----------------------
// La posizione viene salvata esclusivamente in localStorage del browser e non
// viene mai trasmessa ad alcun server.

export function loadStoredPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.lat === 'number' && typeof p.lon === 'number') return p;
  } catch (e) {
    /* localStorage non disponibile o dato corrotto: si procede senza */
  }
  return null;
}

export function storePosition(pos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch (e) {
    /* es. modalità privata con storage pieno: si ignora silenziosamente */
  }
}

export function clearStoredPosition() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* no-op */
  }
}

// --- Geolocation API -------------------------------------------------------

function toPos(geo) {
  return {
    lat: geo.coords.latitude,
    lon: geo.coords.longitude,
    accuracy: geo.coords.accuracy,
    timestamp: geo.timestamp || Date.now()
  };
}

// Richiesta singola della posizione (con consenso utente). Ritorna una Promise.
export function locateOnce() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocalizzazione non supportata dal browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      geo => resolve(toPos(geo)),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Avvia il monitoraggio continuo (watchPosition). Ritorna l'id del watch.
export function startWatch(onUpdate, onError) {
  if (!('geolocation' in navigator)) {
    onError(new Error('Geolocalizzazione non supportata dal browser.'));
    return null;
  }
  return navigator.geolocation.watchPosition(
    geo => onUpdate(toPos(geo)),
    err => onError(err),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}

export function stopWatch(id) {
  if (id != null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(id);
  }
}

// Messaggio chiaro e leggibile a partire dall'errore della Geolocation API.
export function geoErrorMessage(err) {
  switch (err && err.code) {
    case 1:
      return 'Permesso negato. L\'app continua normalmente, senza calcolo delle distanze.';
    case 2:
      return 'Posizione non disponibile in questo momento.';
    case 3:
      return 'Tempo scaduto nel rilevare la posizione. Riprova.';
    default:
      return (err && err.message) || 'Errore di geolocalizzazione.';
  }
}
