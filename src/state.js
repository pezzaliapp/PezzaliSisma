'use strict';

// Stato applicativo centralizzato. Modulo unico condiviso fra i moduli.
export const state = {
  raw: [],          // eventi normalizzati provenienti dalla sorgente
  filtered: [],     // eventi dopo l'applicazione dei filtri
  userPos: null,    // { lat, lon } se la geolocalizzazione è attiva (Milestone futura)
  filters: {
    period: 'week', // day | week | month
    minMag: 0,      // magnitudo minima
    region: 'italy' // world | italy | mediterranean
  },
  lastUpdate: null  // timestamp dell'ultimo caricamento riuscito
};
