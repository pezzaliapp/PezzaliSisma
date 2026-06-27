'use strict';

// Stato applicativo centralizzato. Modulo unico condiviso fra i moduli.
export const state = {
  raw: [],          // eventi normalizzati provenienti dalla sorgente
  baseAll: [],      // regione+magnitudo, prima del cursore timeline
  filtAll: [],      // regione+magnitudo+distanza, prima del cursore timeline
  base: [],         // baseAll dopo l'eventuale cursore timeline
  filtered: [],     // eventi mostrati su mappa e lista (dopo tutti i filtri)
  nearest: null,    // evento più vicino alla posizione utente
  timelineCursor: null, // ms: mostra eventi con time <= cursore; null = tutti

  userPos: null,    // { lat, lon, accuracy, timestamp } — SOLO su questo dispositivo
  follow: false,    // "Segui la mia posizione" attivo (watchPosition)
  watchId: null,    // id del watch della Geolocation API

  places: [],       // "luoghi importanti" (La mia famiglia) — SOLO su questo dispositivo
  card: null,       // "scheda personale" (A3) — SOLO su questo dispositivo
  cardLocked: false,   // blocco visualizzazione attivo (A3-bis, persistito)
  cardUnlocked: false, // sbloccata in questa sessione (solo in memoria)
  eventMode: null,     // Modalità Evento (A5): match corrente o null
  shake: [],           // Intensità stimata personale (V2.0-A1): risultati per luogo

  filters: {
    period: 'week',   // day | week | month
    minMag: 0,        // magnitudo minima
    region: 'italy',  // world | italy | mediterranean
    maxDistance: 0,   // 0 = tutte; oppure 25 | 50 | 100 | 200 (km)
    source: 'auto',   // auto | USGS | INGV
    showMarkers: true, // layer marker visibile
    showHeat: false    // layer heatmap visibile (indipendente)
  },

  activeSource: null, // fonte effettivamente usata nell'ultimo caricamento
  fellBack: false,    // l'ultimo caricamento è avvenuto via fallback
  triedFirst: null,   // sorgente tentata per prima nell'ultimo caricamento
  sourceErrorKind: null, // tipo errore sorgente primaria: timeout|server|client|network
  lastUpdate: null    // timestamp dell'ultimo caricamento dati riuscito
};
