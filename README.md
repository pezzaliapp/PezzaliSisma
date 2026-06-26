# PezzaliSisma

PWA gratuita per il **monitoraggio sismico in tempo reale**. Mostra i terremoti
recenti su una mappa interattiva usando i dati pubblici **USGS**.

> ⚠️ **PezzaliSisma NON prevede i terremoti.** Mostra unicamente eventi già
> avvenuti e statistiche descrittive. Nessun metodo scientifico è oggi in grado
> di prevedere luogo, ora e magnitudo di un sisma.

Funziona da un **semplice link HTTPS** su iPhone, Android, Mac, Windows e Linux,
ed è installabile come app (PWA).

---

## Caratteristiche (Milestone 1)

- 🗺️ Mappa interattiva **Leaflet** con tiles OpenStreetMap
- 🌍 Tre viste: **Mondo**, **Italia**, **Mediterraneo**
- 📡 Caricamento dati reali da **USGS** (24 ore / 7 giorni / 30 giorni)
- 📍 Marker proporzionali alla magnitudo con **popup** di dettaglio
- 📋 **Elenco** degli ultimi eventi (click per centrare la mappa)
- 🎚️ **Filtri base**: periodo, vista geografica, magnitudo minima
- 📊 Quadro statistico rapido (conteggio, magnitudo massima, ultimo evento)
- ⚡ Auto-aggiornamento ogni 5 minuti
- 📦 **PWA installabile** con service worker e funzionamento offline (ultimo dato noto)
- 🧱 **100% statica**, nessun backend, nessuna build: solo HTML, CSS e JavaScript modulare

---

## Stack tecnico

- **Vanilla JavaScript** organizzato in moduli ES nativi (`<script type="module">`) — nessun build step
- **Leaflet 1.9** via CDN per la mappa
- **Service Worker** scritto a mano con caching differenziato (shell / dati / tiles)
- Dati: [USGS Earthquake GeoJSON Feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)

---

## Struttura del progetto

```
PezzaliSisma/
├─ index.html              # shell dell'interfaccia
├─ style.css               # stile (dark theme, responsive)
├─ manifest.webmanifest    # manifest PWA
├─ sw.js                   # service worker (cache shell/dati/tiles)
├─ icon.svg                # icona dell'app
├─ README.md
└─ src/                    # logica modulare (ES modules)
   ├─ main.js              # bootstrap e orchestrazione
   ├─ config.js            # endpoint USGS, regioni, costanti
   ├─ state.js             # stato applicativo centralizzato
   ├─ data.js              # fetch + normalizzazione eventi
   ├─ filters.js           # applicazione filtri e statistiche
   ├─ geo.js               # utilità geografiche (distanza, bounds, formattazione)
   ├─ map.js               # gestione mappa e marker Leaflet
   └─ ui.js                # rendering lista, statistiche e stato
```

---

## Avvio in locale

I moduli ES e il service worker richiedono un'origine HTTP(S): non aprire il file
direttamente da `file://`. Avvia un piccolo server statico dalla cartella del progetto:

```bash
# con Python 3
python3 -m http.server 8000

# oppure con Node
npx serve .
```

Poi apri <http://localhost:8000>.

---

## Deploy su GitHub Pages

1. Esegui il push del repository su GitHub.
2. Vai in **Settings → Pages**.
3. Imposta **Source: Deploy from a branch**, branch `main`, cartella `/ (root)`.
4. L'app sarà disponibile su `https://<utente>.github.io/PezzaliSisma/`.

Tutti i percorsi sono relativi, quindi funziona correttamente anche in un
sottopercorso come quello di GitHub Pages.

---

## Roadmap (fasi future, non incluse in questa milestone)

- Sorgenti dati aggiuntive (INGV per l'Italia, EMSC, stream real-time)
- Geolocalizzazione utente e distanza dagli eventi
- Grafici statistici (magnitudo nel tempo, profondità)
- Allerte in foreground e notifiche browser dove supportate
- Tema chiaro/scuro, internazionalizzazione (IT/EN)

> Non sono previste funzioni di previsione sismica in nessuna fase.

---

## Licenza e dati

Dati forniti dallo **U.S. Geological Survey (USGS)**, di pubblico dominio.
Mappe © OpenStreetMap contributors. Progetto a scopo informativo e didattico.
