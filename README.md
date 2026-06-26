# PezzaliSisma

PWA gratuita per il **monitoraggio sismico in tempo reale**. Mostra i terremoti
recenti su una mappa interattiva usando i dati pubblici **USGS**.

> ⚠️ **PezzaliSisma NON prevede i terremoti.** Mostra unicamente eventi già
> avvenuti e statistiche descrittive. Nessun metodo scientifico è oggi in grado
> di prevedere luogo, ora e magnitudo di un sisma.

Funziona da un **semplice link HTTPS** su iPhone, Android, Mac, Windows e Linux,
ed è installabile come app (PWA).

> 📱 **Fix mobile iOS: la mappa non blocca più lo scroll della pagina.** Su mobile
> la mappa non cattura lo scroll verticale; usa il pulsante **«Blocca mappa» /
> «Sblocca mappa»** per attivare pan e zoom. Vedi [CHANGELOG.md](CHANGELOG.md).

---

## Caratteristiche (Milestone 1 + 1.1)

- 🗺️ Mappa interattiva **Leaflet** (internalizzato in `vendor/`, niente CDN) con tiles OpenStreetMap
- 🌍 Tre viste: **Mondo**, **Italia**, **Mediterraneo**
- 📡 **Sorgenti dati multiple** (Milestone 2): **USGS** (globale) + **INGV** (Italia/Mediterraneo)
  - strategia **Auto**: Italia/Mediterraneo → INGV, Mondo → USGS, con **fallback automatico**
  - selettore manuale **Auto / USGS / INGV**, **fonte indicata per ogni evento**
  - normalizzazione tra schemi diversi, nessun dato inventato, nessun backend
- 📍 Marker proporzionali alla magnitudo con **popup** di dettaglio completo
- 📋 **Elenco** degli ultimi eventi (click per centrare la mappa)
- 🎚️ **Filtri**: periodo, vista geografica, magnitudo minima, distanza da me
- 📊 Quadro statistico rapido (conteggio, magnitudo massima, ultimo evento)
- 📌 **Geolocalizzazione** (Milestone 1.1):
  - «Usa la mia posizione», «Centra su di me», «Segui la mia posizione» (`watchPosition`)
  - marker blu, cerchio di accuratezza GPS, cerchi di distanza **25/50/100/200 km**
  - distanza e **direzione cardinale** (N/NE/E/SE/S/SW/W/NW) per ogni evento
  - colore di **prossimità** (scala fredda) distinto dalla magnitudo (scala calda)
  - card **«Terremoto più vicino»** e banner **«La tua posizione»**
  - reverse geocoding **opt-in** (Comune/Provincia) via OSM Nominatim, solo su richiesta
  - **«Cancella posizione»** per rimuovere ogni dato locale
- ⚡ Auto-aggiornamento ogni 5 minuti
- 📦 **PWA installabile** con service worker e funzionamento offline (ultimo dato noto + mappa)
- 🔒 **Privacy-first**: la posizione resta sul dispositivo, mai trasmessa a server di PezzaliSisma
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
├─ vendor/leaflet/         # Leaflet 1.9.4 internalizzato (css, js, images)
└─ src/                    # logica modulare (ES modules)
   ├─ main.js              # bootstrap e orchestrazione
   ├─ config.js            # endpoint USGS, regioni, fasce distanza, costanti
   ├─ state.js             # stato applicativo centralizzato
   ├─ data.js              # orchestratore sorgenti (strategia Auto + fallback)
   ├─ sources/             # adapter per fonte (modello normalizzato unico)
   │  ├─ http.js           #   fetch JSON con timeout (AbortController)
   │  ├─ usgs.js           #   USGS (feed globali)
   │  └─ ingv.js           #   INGV (FDSN, Italia/Mediterraneo)
   ├─ filters.js           # filtri (regione/mag/distanza), distanza/direzione, più vicino
   ├─ geo.js               # utilità geografiche (distanza, bearing, prossimità, tempo)
   ├─ geolocation.js       # Geolocation API + persistenza localStorage (device-only)
   ├─ geocode.js           # reverse geocoding opt-in (OSM Nominatim)
   ├─ dashboard.js         # card "Attività attuale" (eventi, mag max, sorgente, connessione, fallback)
   ├─ overview.js          # "Situazione generale" Italia/Mondo (ultime 24h, USGS)
   ├─ map.js               # mappa, marker eventi, marker utente, cerchi, popup, alone "Nuovo"
   └─ ui.js                # rendering lista, statistiche, banner, card più vicino
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

## Privacy della posizione

- Le coordinate GPS sono usate **solo sul dispositivo** e salvate esclusivamente in `localStorage`. Non esiste alcun backend di PezzaliSisma: le coordinate non vengono mai inviate a server dell'app.
- **Comune e Provincia** non sono rilevati automaticamente. Solo se premi **«Rileva Comune e Provincia»** viene inviata **una singola** richiesta al servizio pubblico **OpenStreetMap Nominatim** con le coordinate, previo consenso mostrato alla prima attivazione. Il risultato è salvato solo sul dispositivo e non viene richiesto di nuovo finché non ti sposti di oltre **500 metri** o non richiedi un aggiornamento.
- **«Cancella posizione»** rimuove tutte le informazioni di posizione memorizzate localmente (coordinate, comune/provincia e consenso).

---

## Licenza e dati

Dati forniti dallo **U.S. Geological Survey (USGS)**, di pubblico dominio.
Mappe © OpenStreetMap contributors. Progetto a scopo informativo e didattico.
