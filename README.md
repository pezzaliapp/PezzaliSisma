# PezzaliSisma

PWA gratuita per il **monitoraggio sismico in tempo reale**. Mostra i terremoti
recenti su una mappa interattiva usando i dati pubblici **USGS** e **INGV**.

> ⚠️ **PezzaliSisma NON prevede i terremoti.** Mostra unicamente eventi già
> avvenuti e statistiche descrittive. Nessun metodo scientifico è oggi in grado
> di prevedere luogo, ora e magnitudo di un sisma.

Funziona da un **semplice link HTTPS** su iPhone, Android, Mac, Windows e Linux,
ed è installabile come app (PWA).

> 📱 **Fix mobile iOS: la mappa non blocca più lo scroll della pagina.** Su mobile
> la mappa non cattura lo scroll verticale; usa il pulsante **«Blocca mappa» /
> «Sblocca mappa»** per attivare pan e zoom. Vedi [CHANGELOG.md](CHANGELOG.md).

---

## Caratteristiche (PezzaliSisma 1.0)

- 🗺️ Mappa interattiva **Leaflet** (internalizzato in `vendor/`, niente CDN) con tiles OpenStreetMap
- 🌍 Tre viste: **Mondo**, **Italia**, **Mediterraneo**
- 📡 **Sorgenti dati multiple** (Milestone 2): **USGS** (globale) + **INGV** (Italia/Mediterraneo)
  - strategia **Auto**: Italia/Mediterraneo → INGV, Mondo → USGS, con **fallback automatico**
  - selettore manuale **Auto / USGS / INGV**, **fonte indicata per ogni evento**
  - normalizzazione tra schemi diversi, nessun dato inventato, nessun backend
- ⏳ **Timeline + playback** (Milestone C1): periodi **24h / 7g / 30g / 365g**, con cursore temporale e riproduzione.
  - A **365 giorni** si applica una **magnitudo minima automatica** per limitare i dati: **Mondo ≥ 4.0**, **Italia/Mediterraneo ≥ 2.5** (dichiarata in app).
  - Tetto di **3000 marker** disegnati (i più recenti) con nota visibile; i conteggi statistici restano sull'insieme completo.
- 🔥 **Heatmap** (Milestone C2): layer attivabile, **indipendente** dai marker ("Livelli mappa"). Intensità per **magnitudo**, densità dalla sovrapposizione. Libreria **Leaflet.heat internalizzata** (`vendor/leaflet-heat/`, nessun CDN), tetto 5000 punti.
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
- 🧭 **SismaRadar** (Milestone C3): lettura **statistica** di eventi già registrati (numero, magnitudo, profondità, concentrazione, variazione vs finestra precedente reale). Indicatore **Normale / Da osservare / Attività elevata** con soglie trasparenti. **Non è una previsione né un'allerta.**
- ℹ️ **Box informativi** (Milestone D): overlay accessibile (pulsante «Info» / link «Informazioni», chiusura con ✕/click esterno/ESC) con **Come funziona**, **Fonti dati**, **Privacy**, **Limiti scientifici** e **Allerte sismiche su Android**.
- ⚡ Auto-aggiornamento ogni 5 minuti
- 📦 **PWA installabile** con service worker e funzionamento offline (ultimo dato noto + mappa)
- 🔒 **Privacy-first**: la posizione resta sul dispositivo, mai trasmessa a server di PezzaliSisma
- 🧱 **100% statica**, nessun backend, nessuna build: solo HTML, CSS e JavaScript modulare

---

## Stack tecnico

- **Vanilla JavaScript** organizzato in moduli ES nativi (`<script type="module">`) — nessun build step
- **Leaflet 1.9.4** + **Leaflet.heat 0.2.0** **internalizzati** in `vendor/` (nessun CDN)
- **Service Worker** scritto a mano (v14) con caching differenziato: network-first per HTML e dati, stale-while-revalidate per JS/CSS, cache-first per le tiles; precache resiliente
- Dati: [USGS Earthquake Feeds/FDSN](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) e [INGV FDSN](https://webservices.ingv.it/) — pubblici, accessibili da PWA statica (CORS)

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
├─ CHANGELOG.md
├─ vendor/leaflet/         # Leaflet 1.9.4 internalizzato (css, js, images)
├─ vendor/leaflet-heat/    # Leaflet.heat 0.2.0 internalizzato (heatmap)
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
   ├─ timeline.js          # timeline + playback temporale (24h/7g/30g/365g)
   ├─ info.js              # box informativi (overlay accessibile, nessuna libreria)
   ├─ sismaradar/          # SismaRadar: lettura statistica (NON previsione)
   │  ├─ engine.js         #   funzioni pure (analyze/classify/explain)
   │  └─ radar.js          #   conteggio finestra precedente + render card
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

## Roadmap (fasi future, non incluse nella 1.0)

- **1.1**: grafici statistici (magnitudo nel tempo, profondità), filtri persistenti, tema chiaro/scuro, internazionalizzazione (IT/EN), miglioramenti accessibilità.
- **2.0**: sorgenti aggiuntive (EMSC, stream near-real-time) con deduplica multi-fonte, condivisione/permalink di una vista, tile offline più estese.

> Non sono previste funzioni di previsione sismica in nessuna fase.

---

## Privacy della posizione

- Le coordinate GPS sono usate **solo sul dispositivo** e salvate esclusivamente in `localStorage`. Non esiste alcun backend di PezzaliSisma: le coordinate non vengono mai inviate a server dell'app.
- **Comune e Provincia** non sono rilevati automaticamente. Solo se premi **«Rileva Comune e Provincia»** viene inviata **una singola** richiesta al servizio pubblico **OpenStreetMap Nominatim** con le coordinate, previo consenso mostrato alla prima attivazione. Il risultato è salvato solo sul dispositivo e non viene richiesto di nuovo finché non ti sposti di oltre **500 metri** o non richiedi un aggiornamento.
- **«Cancella posizione»** rimuove tutte le informazioni di posizione memorizzate localmente (coordinate, comune/provincia e consenso).

---

## Scheda personale e blocco di visualizzazione

- La **Scheda personale** (sezione «Preparazione & Emergenza») contiene campi **facoltativi** (nome, contatto/telefono ICE, gruppo sanguigno, allergie, farmaci, patologie, indirizzo, note), salvati **solo su questo dispositivo** in `localStorage` e **mai trasmessi**. «Cancella scheda» li rimuove.
- È disponibile un **blocco di visualizzazione aggiuntivo e opzionale** basato su **WebAuthn** (autenticatore di piattaforma: Face ID/Touch ID/PIN), quando supportato dal browser.
  - **Non è cifratura.** «Questa protezione non cifra i dati. La scheda resta salvata solo sul dispositivo. Il blocco serve solo a richiedere una conferma biometrica/PIN prima della visualizzazione, quando supportato dal browser.»
  - L'app **non gestisce alcun dato biometrico** (Face ID/Touch ID/PIN sono gestiti dal sistema operativo); riceve solo un identificativo opaco della credenziale e un esito. **Nessun backend, nessuna trasmissione.** `crypto.getRandomValues` è usato **solo** per generare la *challenge* richiesta dall'API WebAuthn (numeri casuali), **non** per cifrare i dati.
  - **Completamente opzionale** con «Attiva blocco visualizzazione» / «Disattiva blocco visualizzazione» e «Blocca ora». Se WebAuthn non è supportato, la scheda resta utilizzabile normalmente.
  - **Anti-lock-out**: dalla schermata di blocco è sempre possibile disattivare il blocco; se la biometria/PIN non è disponibile o fallisce, una semplice conferma rimuove comunque il blocco. L'utente non resta mai chiuso fuori dai propri dati. Lo sblocco vale per la sessione: alla chiusura/ricarica dell'app la scheda torna bloccata.

---

## Licenza e dati

Dati forniti dallo **U.S. Geological Survey (USGS)** (di pubblico dominio) e
dall'**Istituto Nazionale di Geofisica e Vulcanologia (INGV)**.
Mappe © OpenStreetMap contributors. Progetto a scopo informativo e didattico.
