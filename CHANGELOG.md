# Changelog

Tutte le modifiche rilevanti del progetto PezzaliSisma.

## Milestone 1.2 — Fix mobile scroll mappa
- **Fix mobile iOS: la mappa non blocca più lo scroll della pagina.**
- Su mobile la mappa, di default, **non cattura** lo scroll verticale: la pagina scorre normalmente.
- Nuovo pulsante sulla mappa **«Blocca mappa» / «Sblocca mappa»** per attivare/disattivare pan e zoom.
- Layout mobile rivisto: header compatto, mappa a `48dvh` (non troppo alta), legenda compatta, documento scrollabile, `touch-action`/`overscroll-behavior`, `100dvh` per evitare il bug della barra indirizzi iOS, safe-area iPhone.
- Desktop invariato: mappa pienamente interattiva.

## Milestone 1.1 — Geolocalizzazione
- Posizione utente: «Usa la mia posizione», «Centra su di me», «Segui la mia posizione» (`watchPosition`).
- Marker blu, cerchio di accuratezza GPS, cerchi di distanza 25/50/100/200 km.
- Distanza e direzione cardinale per ogni evento; colore di prossimità distinto dalla magnitudo.
- Banner «La tua posizione» e card «Terremoto più vicino»; filtro per distanza.
- Reverse geocoding **opt-in** (Comune/Provincia) via OSM Nominatim, con consenso e cache (soglia 500 m).
- «Cancella posizione»; privacy on-device (coordinate mai inviate a server di PezzaliSisma).

## Milestone 1.1 / 1 — Base PWA e Stable
- Fix mappa: Leaflet internalizzato in `vendor/` (CSS bloccato da `integrity` SRI errato).
- PWA statica modulare (ES modules), mappa Leaflet, viste Mondo/Italia/Mediterraneo.
- Dati reali USGS (24h/7g/30g), marker e popup, lista eventi, filtri base, service worker offline.
