'use strict';

import { NOMINATIM_REVERSE, GEO_CONSENT_KEY } from './config.js';

// Reverse geocoding OPZIONALE, eseguito SOLO su richiesta esplicita dell'utente.
// Invia una singola richiesta al servizio pubblico OpenStreetMap Nominatim.
// Nessun dato viene mai inviato a server di PezzaliSisma (non esistono backend).

export const GEOCODE_CONSENT_MESSAGE =
  'Per ottenere Comune e Provincia è necessario inviare una sola richiesta al ' +
  'servizio pubblico OpenStreetMap Nominatim utilizzando le coordinate GPS. ' +
  'Nessun dato viene inviato ai server di PezzaliSisma.';

// --- Consenso una-tantum ---------------------------------------------------

export function hasGeoConsent() {
  try {
    return localStorage.getItem(GEO_CONSENT_KEY) === '1';
  } catch (e) {
    return false;
  }
}

export function setGeoConsent() {
  try {
    localStorage.setItem(GEO_CONSENT_KEY, '1');
  } catch (e) {
    /* no-op */
  }
}

export function clearGeoConsent() {
  try {
    localStorage.removeItem(GEO_CONSENT_KEY);
  } catch (e) {
    /* no-op */
  }
}

// --- Richiesta reverse geocoding -------------------------------------------

// Esegue UNA richiesta e restituisce { comune, provincia } (campi eventualmente null).
export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lon),
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'it'
  });
  const res = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const a = json.address || {};
  const comune =
    a.city || a.town || a.village || a.municipality || a.hamlet || a.city_district || null;
  const provincia = a.province || a.county || a.state_district || a.state || null;
  return { comune, provincia };
}
