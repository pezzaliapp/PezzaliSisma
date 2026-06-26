'use strict';

// Sorgente dati pubblica USGS (GeoJSON real-time). Nessuna chiave richiesta.
export const USGS_FEEDS = {
  day:   'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week:  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
};

// Regioni selezionabili. `bounds: null` = nessun filtro geografico (mondo intero).
export const REGIONS = {
  world: {
    label: 'Mondo',
    bounds: null,
    view: [20, 0],
    zoom: 2
  },
  italy: {
    label: 'Italia',
    bounds: { minLat: 35, maxLat: 48.5, minLon: 5.5, maxLon: 19.5 },
    view: [42.5, 12.5],
    zoom: 6
  },
  mediterranean: {
    label: 'Mediterraneo',
    bounds: { minLat: 30, maxLat: 47.5, minLon: -7, maxLon: 38 },
    view: [38, 14],
    zoom: 5
  }
};

// Sorgente dati INGV (FDSN event): forte copertura su Italia e Mediterraneo.
export const INGV_EVENT = 'https://webservices.ingv.it/fdsnws/event/1/query';
// Endpoint FDSN USGS (usato per la finestra a 365 giorni; i feed sommario
// USGS arrivano solo a 30 giorni).
export const USGS_FDSN = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
// Giorni corrispondenti a ciascun periodo.
export const PERIOD_DAYS = { day: 1, week: 7, month: 30, year: 365 };
// Soglia di magnitudo minima AUTOMATICA per la finestra a 365 giorni, per
// evitare payload enormi. Dichiarata in UI e nel README.
export const YEAR_MIN_MAG = { world: 4.0, italy: 2.5, mediterranean: 2.5 };
// Tetto di marker disegnati sulla mappa (solo rendering): i conteggi statistici
// restano sull'insieme completo. Mostrati i più recenti, con nota visibile.
export const MAX_MARKERS = 3000;
// Limite massimo di eventi richiesti via FDSN (richiede un limit esplicito).
export const INGV_LIMIT = 3000;
// Timeout (ms) per ogni richiesta di rete alle sorgenti dati.
export const REQUEST_TIMEOUT_MS = 12000;
// Chiavi delle sorgenti selezionabili.
export const SOURCES = { AUTO: 'auto', USGS: 'USGS', INGV: 'INGV' };

// Intervallo di auto-aggiornamento dei dati (5 minuti).
export const REFRESH_MS = 5 * 60 * 1000;

// Numero massimo di eventi mostrati nella lista laterale.
export const LIST_LIMIT = 50;

// Fasce di distanza (km) usate per cerchi, colori di prossimità e filtri.
export const DISTANCE_BANDS = [25, 50, 100, 200];

// Scala cromatica FREDDA per la prossimità, volutamente diversa dalla scala
// CALDA della magnitudo: così un evento "piccolo ma molto vicino" e uno
// "forte ma lontano" restano distinguibili a colpo d'occhio.
export const PROXIMITY_COLORS = {
  25: '#00e5ff',
  50: '#3291ff',
  100: '#7c5cff',
  200: '#b388ff'
};

// Chiave localStorage per l'ultima posizione nota (SOLO su questo dispositivo).
export const STORAGE_KEY = 'pezzalisisma:userpos';

// Chiave localStorage dei "luoghi importanti" — La mia famiglia (A2).
// Salvati SOLO su questo dispositivo, mai trasmessi.
export const PLACES_KEY = 'pezzalisisma:places';

// Chiave localStorage della "Scheda personale" (A3). SOLO su questo dispositivo,
// mai trasmessa. Nessuna cifratura: protezione = blocco schermo del dispositivo.
export const PERSONAL_CARD_KEY = 'pezzalisisma:card';

// Chiave localStorage del blocco di visualizzazione OPZIONALE (A3-bis).
// Memorizza solo { enabled, credId } (id opaco della credenziale WebAuthn).
// NON è cifratura: i dati della scheda restano in chiaro in PERSONAL_CARD_KEY.
export const PERSONAL_LOCK_KEY = 'pezzalisisma:cardlock';

// Reverse geocoding OPZIONALE e su richiesta esplicita (servizio pubblico OSM).
export const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
// Chiave localStorage del consenso una-tantum al reverse geocoding.
export const GEO_CONSENT_KEY = 'pezzalisisma:geoconsent';
// Spostamento minimo (metri) oltre il quale Comune/Provincia sono ricalcolabili.
export const GEOCODE_MIN_MOVE_M = 500;
