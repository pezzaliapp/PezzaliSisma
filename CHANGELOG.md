# Changelog

Tutte le modifiche rilevanti del progetto PezzaliSisma.

## Milestone C3 — SismaRadar base
- Card SismaRadar trasformata da segnaposto a **pannello di analisi statistica** di eventi **già registrati** (nessuna previsione, nessun allarme).
- Calcoli sulla vista/finestra corrente: numero eventi, magnitudo massima e media, profondità media, eventi superficiali ≤10 km, **concentrazione geografica** (griglia ~1°), **sciami/cluster** semplici.
- **Variazione frequenza** rispetto alla **finestra precedente reale** (USGS `/count`, INGV `/query`); se non disponibile mostra "dato non disponibile" senza inventare valori.
- Indicatore: **Normale / Da osservare / Attività elevata** (soglie trasparenti: elevata = variazione ≥ +50% e (evento forte per l'area o concentrazione ≥50%); da osservare = variazione ≥ +25% o concentrazione ≥40%).
- Spiegazione testuale **prudente** (solo frasi descrittive ammesse) e **frase obbligatoria** sempre presente: «L'indicatore è ottenuto da analisi statistiche di eventi già registrati e non costituisce una previsione sismica né un'allerta ufficiale.»
- Indipendente dai filtri magnitudo/distanza della dashboard; nessuna modifica a dashboard/geolocalizzazione/mappa mobile/timeline/sorgenti.

## Milestone C1 — Timeline e playback
- **Periodo 365 giorni**: nuova opzione "Ultimi 365 giorni". A 30 giorni si usano i feed sommario USGS; a 365 giorni si passa all'endpoint **FDSN** (USGS) e a INGV FDSN con **soglia di magnitudo automatica dichiarata**: **Mondo ≥ 4.0**, **Italia/Mediterraneo ≥ 2.5** (per limitare i dati). Nota visibile in UI quando attivo.
- **Timeline interattiva** con **playback** leggero a passi discreti (slider tempo + play/pausa): il cursore mostra gli eventi fino all'istante scelto; "Tutti" mostra l'intero intervallo. Durante scrub/playback la vista non si riadatta (niente salti).
- **Tetto di rendering** (3000 marker più recenti) con nota visibile "Mostrati i N di M": evita rallentamenti su dataset ampi (es. Mondo 365 g). I conteggi statistici restano sull'insieme completo. Nessun dato inventato.
- Comportamento stabile invariato (mappa mobile, lock, sorgenti/fallback, dashboard, geolocalizzazione).

## Milestone B — Dashboard professionale 1.0 (UX)
- **Home dashboard** con gerarchia di informazioni in primo piano: **Attività attuale** (eventi visualizzati, magnitudo max, ultimo evento, sorgente, ultimo aggiornamento, connessione), **Evento più vicino** (con «Centra sulla mappa» / «Attiva geolocalizzazione»), **Evento più importante** (con «Apri dettaglio»), **Situazione generale** Italia/Mondo (eventi ultime 24 h, da una sola richiesta USGS), card **SismaRadar** segnaposto («In preparazione», slot Indice/Trend/Sciami/Cluster — motore non implementato).
- **Mappa**: alone pulsante + etichetta «Nuovo» sull'ultimo evento (animazione discreta, rispetta `prefers-reduced-motion`); legenda di prossimità mostrata solo con posizione attiva. Comportamento mappa stabile invariato.
- **Controlli** ridotti a sezioni **comprimibili** (aperte su desktop, chiuse su smartphone), funzionalità identiche.
- **Responsive** mobile: Dashboard → Mappa → Controlli → Lista; desktop: dashboard laterale + mappa.
- Nessuna nuova dipendenza, nessuna funzione sperimentale (timeline/heatmap/grafici/ricerca/preferiti/alert/export/SismaRadar non inclusi).

## Fase A — Audit UI e dashboard 1.0
- **Pannello "Stato" (dashboard)**: connessione online/offline (badge), sorgente dati attiva, numero eventi scaricati, ultimo aggiornamento, indicazione di fallback automatico. Stato sorgente consolidato qui (rimosso il riquadro duplicato nei Controlli).
- **Accessibilità**: focus visibile da tastiera (`:focus-visible`), righe della lista eventi attivabili da tastiera (`role=button`, `tabindex`, Invio/Spazio), `aria-live` su stato e dashboard, `aria-label` sulla mappa, `color-scheme`.
- **Leggibilità**: contrasto del testo secondario migliorato, target touch ≥44px, spaziature/line-height, `prefers-reduced-motion`.
- Nessuna nuova funzione avanzata (timeline, heatmap, grafici, ricerca, preferiti, alert, export, SismaRadar non inclusi).

## Milestone 2 — Sorgenti dati multiple (USGS + INGV)
- Layer **adapter sorgenti** (`src/sources/`) con modello evento normalizzato unico per tutte le fonti.
- **USGS** (globale, stabile) e **INGV** (forte su Italia/Mediterraneo), entrambe accessibili da PWA statica (CORS).
- **Strategia Auto**: Italia/Mediterraneo → INGV primaria, Mondo → USGS primaria, con **fallback incrociato automatico**. Selettore manuale **Auto / USGS / INGV** (la scelta manuale è rispettata, senza fallback).
- **Normalizzazione** tra schemi diversi: `time` INGV (ISO UTC senza `Z`) → epoch ms; link ufficiale INGV costruito da `eventId`; campi comuni garantiti.
- **Indicazione fonte per ogni evento**: tag nella lista, "Fonte" nel popup, badge "Fonte attiva" con avviso di fallback.
- **Gestione errori chiara**: timeout (`AbortController`), rete, risposta non valida, entrambe le fonti non disponibili.
- Service worker: network-first anche per INGV (ultimo dato noto offline).
- Nessun merge/deduplica (una fonte per volta), nessun backend, nessun dato inventato.

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
