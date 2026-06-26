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

// Intervallo di auto-aggiornamento dei dati (5 minuti).
export const REFRESH_MS = 5 * 60 * 1000;

// Numero massimo di eventi mostrati nella lista laterale.
export const LIST_LIMIT = 50;
