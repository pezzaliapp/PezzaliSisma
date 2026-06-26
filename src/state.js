'use strict';

// Stato applicativo centralizzato. Modulo unico condiviso fra i moduli.
export const state = {
  raw: [],          // eventi normalizzati provenienti dalla sorgente
  base: [],         // eventi dopo filtro regione+magnitudo (prima della distanza)
  filtered: [],     // eventi mostrati su mappa e lista (dopo tutti i filtri)
  nearest: null,    // evento più vicino alla posizione utente

  userPos: null,    // { lat, lon, accuracy, timestamp } — SOLO su questo dispositivo
  follow: false,    // "Segui la mia posizione" attivo (watchPosition)
  watchId: null,    // id del watch della Geolocation API

  filters: {
    period: 'week',   // day | week | month
    minMag: 0,        // magnitudo minima
    region: 'italy',  // world | italy | mediterranean
    maxDistance: 0,   // 0 = tutte; oppure 25 | 50 | 100 | 200 (km)
    source: 'auto'    // auto | USGS | INGV
  },

  activeSource: null, // fonte effettivamente usata nell'ultimo caricamento
  fellBack: false,    // l'ultimo caricamento è avvenuto via fallback
  triedFirst: null,   // sorgente tentata per prima nell'ultimo caricamento
  lastUpdate: null    // timestamp dell'ultimo caricamento dati riuscito
};
