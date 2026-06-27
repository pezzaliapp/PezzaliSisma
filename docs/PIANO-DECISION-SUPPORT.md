# PezzaliSisma — Decision Support esplicabile

> Documento tecnico di progettazione. **Nessun codice.** Da approvare prima di
> qualsiasi implementazione. Filosofia guida:
>
> **Non mostrare dati. Trasforma i dati in informazioni comprensibili.**
>
> PezzaliSisma resta un sistema di **monitoraggio e comprensione** di eventi
> **già registrati**. Mai previsione, mai allerta ufficiale, mai dato inventato.

---

## 0. Premessa: da "osservatorio" ad "assistente che spiega"

Oggi l'app **calcola** già molte cose corrette (distanze, intensità stimata,
statistiche SismaRadar) e le **mostra come numeri**. Il salto richiesto non è
aggiungere dati: è aggiungere un **livello che traduce** i numeri già calcolati
in **frasi comprensibili e giustificate**.

Il principio architetturale è quindi: **il Decision Support non produce nuovi
dati**. Si siede *sopra* i moduli esistenti, ne legge gli output e li trasforma
in **affermazioni esplicabili**, ognuna riconducibile a una regola dichiarata.

Niente testo generato casualmente, niente LLM a runtime: **template fissi**
riempiti solo con variabili dichiarate. Stessi fatti → stessa frase, sempre
(deterministico e testabile).

---

## 1. Architettura del Decision Support

### 1.1 Posizione nello stack (cosa esiste già — substrato)

Il livello DS **consuma** ciò che è già prodotto e verificato:

| Modulo esistente | Cosa fornisce (già calcolato) |
|---|---|
| Adapter `sources/usgs.js`, `sources/ingv.js` | Evento normalizzato `{id, source, lat, lon, depth, mag, magType, place, time, url, tsunami}` |
| `geo.js` → `haversineKm` | Distanza epicentrale luogo↔evento |
| `shakemap.js` → `estimateIntensity` (AWW2012) | `{ mmi, rhypo, depthKm, key, label }` — classi `molto-lieve / lieve / moderata / forte / molto-forte` |
| `sismaradar/engine.js` → `analyze` | `{ count, maxMag, meanMag, meanDepth, shallow, concentration, clusters }` |
| `sismaradar/engine.js` → `classify` / `frequencyVariation` | Livello `normale / osservare / elevata`; variazione % vs finestra precedente |
| `sismaradar/engine.js` → `seismicEnergy` / `temporalDistribution` / `depthDistribution` | Indicatori descrittivi B-1/B-2 |
| `eventmode.js` → `findPlaceEvents` | Eventi significativi vicini ai luoghi salvati (soglia device-only) |
| `state.js` | `raw` (eventi caricati), `places`, `userPos`, filtri correnti |

**Tutti dati ufficiali (INGV/USGS) o derivati documentati.** Il DS **non aggiunge
fetch**, non aggiunge backend, resta offline-first (lavora su `state.raw` già in
memoria/cache).

### 1.2 I tre strati del Decision Support

```
   [ Fatti ]  →  [ Motore di inferenza ]  →  [ Motore delle spiegazioni ]  →  UI
   (Fact base)     (Regole esplicabili)        (composizione prudente)
```

1. **Fact base** — un oggetto *normalizzato e dichiarato* di fatti, estratto SOLO
   dagli output dei moduli esistenti. È l'unica cosa che le regole possono leggere.
   Nessuna regola tocca direttamente la rete o il DOM.
2. **Motore di inferenza** — un insieme di **regole pure** (forward-chaining,
   deterministico). Ogni regola, dati i fatti, decide *se* attivarsi e produce una
   **Affermazione** strutturata (non una stringa libera).
3. **Motore delle spiegazioni** — raccoglie le Affermazioni attivate, le **ordina,
   deduplica, risolve i conflitti** con precedenze dichiarate, e compone una
   **narrazione breve e prudente** + il pannello «perché».

### 1.3 La Fact base (cosa leggono le regole)

Per un **focus** (un luogo salvato, oppure la posizione utente) si costruisce una
Fact base a partire dall'**evento più rilevante già caricato** per quel focus
(stessa logica di selezione di `shakemap.js`/`eventmode.js`: il più significativo
entro soglia):

| Fatto | Origine | Note |
|---|---|---|
| `M`, `magType` | evento normalizzato | magnitudo e tipo |
| `h` (profondità km) | evento normalizzato | può mancare → regole con guardia |
| `dEpi` (km) | `haversineKm(luogo, evento)` | distanza epicentrale |
| `rHyp` (km) | `estimateIntensity.rhypo` | distanza ipocentrale `√(dEpi²+h²)` |
| `mmi`, `classe` | `estimateIntensity` | intensità **stimata** sul luogo |
| `Δt` (tempo trascorso) | `now − evento.time` | per nota "recente/rivedibile" |
| `source` | evento normalizzato | INGV / USGS |
| **Contesto area** | `analyze` + `classify` + `frequencyVariation` | livello, variazione, `maxMag` vs `STRONG_MAG[region]` |
| **Scope** | filtri correnti (`region`, `period`) | per dichiarare sempre l'ambito |

Se i fatti minimi mancano (`M` o `dEpi` non finiti, `estimateIntensity = null`),
la Fact base è **incompleta** e le regole che li richiedono **non si attivano**
(vedi §3, condizioni di soppressione).

### 1.4 Anatomia di un'Affermazione (oggetto tracciabile)

Ogni regola NON restituisce testo libero, ma un oggetto con questi campi
(descrizione, non codice):

| Campo | Significato |
|---|---|
| `ruleId` | identificatore stabile (es. `R1-intensita-significato`) |
| `testo` | frase da template fisso, con sole variabili dichiarate |
| `perché[]` | spiegazioni atomiche ("da quali dati", "quale regola") |
| `base` | àncora documentale alla scienza (`docs/SCIENZA.md#...`) |
| `inputs{}` | i valori esatti usati (M, dEpi, h, mmi…) — per tracciabilità |
| `limiti[]` | i limiti dichiarati di quella conclusione |
| `severità` | `neutro` \| `informativo` — **mai** "allarme" |
| `soppressaSe[]` | condizioni in cui NON deve comparire |

Questo rende **ogni frase risalibile**: dato il testo a schermo, si vede la regola,
i dati d'ingresso, la base scientifica e i limiti. La UI «perché» è la
visualizzazione diretta di questi campi.

---

## 2. Motore delle spiegazioni (come nasce la narrazione)

1. **Attivazione**: per il focus, ogni regola valuta guardia + soppressioni.
   Le regole attive emettono le loro Affermazioni.
2. **Ordinamento** (priorità fissa, dichiarata):
   `identità evento → intensità/significato → perché (attenuazione, profondità)
   → contesto d'area → ambito e limiti → eventuale ponte alle istruzioni`.
3. **Deduplica & conflitti**: le soppressioni sono progettate perché **due regole
   non possano affermare cose contraddittorie**. Dove due regole coprono lo stesso
   concetto, vince quella a priorità maggiore (tabella di precedenza dichiarata).
4. **Composizione**: i `testo` vengono concatenati in una narrazione **breve**.
   I `perché[]`, `base`, `limiti[]` confluiscono nel pannello espandibile
   «Perché questo?» (riuso del pattern B-2 già esistente).
5. **Determinismo**: nessuna casualità. Test: `(fatti) → (insieme di ruleId +
   testi)` verificabile con asserzioni, esattamente come gli altri moduli.

### 2.1 Esempio tracciato (la filosofia richiesta, mappata sulle regole)

Input: luogo "Casa"; evento M3.8, h=18 km, dEpi=42 km → `estimateIntensity` →
mmi ≈ classe **lieve**, rHyp ≈ 46 km.

| Frase prodotta | Regola | Da quali dati | Base scientifica | Limiti |
|---|---|---|---|---|
| "Evento registrato a 42 km dal luogo Casa. M 3.8, profondità 18 km." | R0 identità | evento normalizzato + `haversineKm` | dati ufficiali INGV/USGS | nessuna interpretazione |
| "L'intensità stimata sul luogo è lieve." | R1 | `estimateIntensity` (mmi→classe) | AWW2012 IPE (SCIENZA.md) | stima, no effetti di sito |
| "Eventi di questo tipo vengono normalmente percepiti ma raramente provocano danni." | R1 (mappa classe→effetti) | classe MMI | descrizione scala macrosismica MCS/MMI | l'intensità reale varia localmente |
| "La distanza e la profondità riducono gli effetti attesi sul luogo." | R2 | dEpi, h, rHyp, M | termine di attenuazione `c2·ln(r)` dell'IPE | no amplificazione di sito/directività |

Nessuna delle frasi è "inventata": ognuna è l'**applicazione di una regola
dichiarata** a dati ufficiali.

---

## 3. Regole di inferenza (catalogo)

Per ciascuna: **dati → regola → perché è corretta → limiti → quando NON mostrarla.**
(Le soglie citate sono quelle *già esistenti e dichiarate* nel codice/SCIENZA.md.)

### R0 — Identità dell'evento (fattuale)
- **Dati**: evento normalizzato + `haversineKm`.
- **Regola**: enuncia luogo, distanza, M, profondità, ora, fonte. Nessuna interpretazione.
- **Perché corretta**: pura riesposizione di dati ufficiali.
- **Limiti**: M e profondità preliminari possono essere riviste dagli enti (→ R6).
- **Non mostrare**: se non esiste un evento di riferimento per il focus.

### R1 — Significato dell'intensità (percezione/danno)
- **Dati**: `estimateIntensity → classe` (`molto-lieve … molto-forte`).
- **Regola**: mappa **dichiarata** classe→effetti, usando le descrizioni standard
  della scala macrosismica (MCS/MMI): es. *lieve* → "percepito da parte della
  popolazione, raramente danni"; *moderata* → "percepito da molti, possibili
  danni leggeri a oggetti"; *forte/molto-forte* → "possibili danni: seguire le
  istruzioni". Testo prudente, al passato/presente, **mai** al futuro.
- **Perché corretta**: le scale macrosismiche **sono definite dagli effetti
  osservati**; mappare classe→effetti è la *definizione* della scala, non una
  previsione. Si parla di un evento **già avvenuto**.
- **Limiti**: MMI è **stimata** (non misurata); ignora effetti di sito; sotto M5 è
  estrapolazione prudente (come dichiarato in SCIENZA.md).
- **Non mostrare**: se `estimateIntensity = null` (M < `SHAKE_MIN_MAG`, dEpi >
  `SHAKE_MAX_KM`, dati mancanti).

### R2 — Perché: attenuazione con distanza e profondità
- **Dati**: `dEpi`, `h`, `rHyp`, `M`.
- **Regola**: se `rHyp` è abbastanza grande da rendere l'attenuazione
  significativa, spiega che **distanza e profondità riducono gli effetti attesi**.
- **Perché corretta**: è **letteralmente** il termine `c2·ln(√(rHyp²+Rm²))`
  dell'IPE AWW2012 usata dall'app (spreading geometrico + attenuazione anelastica).
- **Limiti**: non cattura amplificazione di sito, effetti di bacino, direttività.
- **Non mostrare**: in **near-field** (rHyp piccolo) dove ridurrebbe in modo
  fuorviante; o se `h`/`dEpi` mancano.

### R3 — Contesto d'area (tipico / da osservare)
- **Dati**: `analyze.maxMag` vs `STRONG_MAG[region]`; `classify`; `frequencyVariation`.
- **Regola**: se `M < STRONG_MAG[region]` e livello `normale` → "evento in linea con
  l'attività ordinaria recente dell'area"; se livello `osservare/elevata`, riusa il
  testo prudente già esistente di `explain` (nessun nuovo giudizio).
- **Perché corretta**: statistica descrittiva su eventi **già registrati**, con
  soglie dichiarate; non è una baseline di pericolosità né una previsione.
- **Limiti**: descrive la **finestra recente** caricata, non la sismicità storica.
- **Non mostrare**: `count = 0` o `variation = null` (dato non disponibile).

### R4 — Contesto di profondità (superficiale/profondo)
- **Dati**: `h`, `DEPTH_BANDS`.
- **Regola**: a parità di M e distanza, eventi **superficiali (≤10 km)** tendono a
  essere percepiti più intensamente; eventi profondi meno. Lo enuncia come *perché*
  a supporto di R1.
- **Perché corretta**: la profondità entra in `rHyp`; minore profondità → minore
  `rHyp` → scuotimento atteso maggiore (stessa IPE).
- **Limiti**: semplificazione; la relazione esatta dipende dal contesto.
- **Non mostrare**: se `h` manca o è marcata incerta.

### R5 — Assenza di eventi significativi (rassicurazione prudente)
- **Dati**: nessun evento ≥ soglia vicino ad alcun luogo, nella selezione corrente.
- **Regola**: "Nessun evento significativo vicino ai tuoi luoghi nella selezione
  corrente" + suggerimento a **ampliare** periodo/area/abbassare la magnitudo
  (riuso del messaggio UX SismaRadar già introdotto).
- **Perché corretta**: assenza **fattuale** nel dataset caricato, **con ambito
  esplicito**.
- **Limiti**: dipende da area/periodo caricati; **assenza ≠ assenza di sismicità**.
  L'ambito va sempre dichiarato.
- **Non mostrare**: se esiste almeno un evento significativo (allora R0–R4).

### R6 — Qualità del dato (magnitudo rivedibile)
- **Dati**: `source`, `magType`, `Δt`.
- **Regola**: per eventi **molto recenti**, nota che magnitudo/profondità possono
  essere **aggiornate** dagli enti.
- **Perché corretta**: pratica reale delle agenzie (soluzioni preliminari→riviste).
- **Limiti**: l'app non traccia le revisioni; è solo un avviso di prudenza.
- **Non mostrare**: per eventi non recenti (oltre una finestra dichiarata).

### R7 — Ponte alle istruzioni (decisione, non allarme)
- **Dati**: classe ≥ `moderata` **oppure** presenza di un match `eventmode`.
- **Regola**: invita a consultare "Durante/Dopo" della sezione Preparazione,
  **senza** suggerire imminenza. Linguaggio: comportamenti utili, non urgenza.
- **Perché corretta**: è guida su un evento **già avvenuto** / preparazione
  generale; coerente con la sezione esistente.
- **Limiti**: consigli generici di protezione civile, non personalizzati.
- **Non mostrare**: quando nulla di rilevante (evita assillo/affaticamento).

### Frase obbligatoria (sempre presente, come negli altri moduli)
> «Stima basata su dati ufficiali e relazioni pubblicate. Non è una ShakeMap
> ufficiale, non è una previsione e non sostituisce Protezione Civile, INGV o USGS.»
(coerente con `SHAKE_PHRASE` e con la nota SismaRadar.)

---

## 4. Priorità di sviluppo

| Priorità | Contenuto | Perché prima |
|---|---|---|
| **P1** | Schema Affermazione + motore spiegazioni (scheletro) + **R0 + R1** | Massimo valore, minimo rischio: riusa `estimateIntensity` già verificato |
| **P2** | **R2 + R4** (il "perché": attenuazione e profondità) | Completano il significato dell'intensità |
| **P3** | **R3** (contesto d'area) | Riusa SismaRadar; aggiunge prospettiva statistica |
| **P4** | **R5 + R6** (ambito assente + qualità dato) | Onestà scientifica e gestione dei vuoti |
| **P5** | **R7** (ponte alle istruzioni) | Trasforma la comprensione in decisione |

Regola trasversale: **se una conclusione non è sostenibile scientificamente, non
si implementa**. Meglio non dire che dire troppo.

---

## 5. Piano delle milestone (workflow consolidato)

Ogni milestone: **piano → approvazione → implementazione → test → commit → tua
verifica su iPhone → push**. Una funzione alla volta. Nessuna firma nei commit.

| Milestone | Obiettivo | Test chiave | Note |
|---|---|---|---|
| **DS-0** | *Questo documento* approvato | — | nessun codice |
| **DS-1** | Motore core + Affermazione + registro regole + **R0+R1**. UI: blocco "Cosa significa" per luogo (riusa dati ShakeMap). `docs/SCIENZA.md` con le mappe classe→effetti e le àncore | `(fatti)→(ruleId+testi)` deterministico; frase obbligatoria; soppressione su `estimate=null` | nessuna nuova fetch |
| **DS-2** | **R2 + R4** (perché attenuazione/profondità) | near-field NON mostra R2; `h` mancante NON mostra R4 | pure |
| **DS-3** | **R3** contesto d'area | `count=0`/`variation=null` → niente R3 | riuso engine |
| **DS-4** | **R5 + R6** ambito/qualità | scope sempre dichiarato; R6 solo eventi recenti | onestà |
| **DS-5** | **R7** ponte istruzioni | nessun linguaggio d'urgenza; non assillante | link a Preparazione |
| **DS-6** | Consolidamento spiegazioni (ordinamento/dedup/conflitti) + audit lessicale | test del "vocabolario vietato"; ordine stabile | rifinitura |

Ogni milestone aggiorna `docs/SCIENZA.md` (base scientifica e limiti) e bumpa il SW.

---

## 6. Analisi dei rischi

| Rischio | Mitigazione |
|---|---|
| **Falsa rassicurazione** ("è tutto a posto") | Mai sicurezza assoluta; R5 dichiara sempre l'ambito; "assenza ≠ assenza di sismicità" |
| **Allarmismo / panico** | Lessico vietato (sotto §7); template prudenti; mai futuro su terremoti; severità solo `neutro/informativo` |
| **Eccesso di fiducia nella stima** | Sempre la parola "stima"; limiti visibili; frase obbligatoria |
| **Non tracciabilità / frasi "a caso"** | Template fissi + `ruleId` + `inputs{}` + `base`; test deterministici |
| **Dati mancanti** (M/h/dEpi nulli) | Condizioni di soppressione per ogni regola |
| **Confusione di ambito** (finestra caricata ≠ tutta la sismicità) | Riga di scope esplicita (region/period) accanto a ogni conclusione d'area |
| **Magnitudo rivista** | R6 avvisa per eventi recenti |
| **Contraddizioni tra regole** | Precedenze dichiarate + soppressioni progettate per escludersi |
| **Scope creep** ("aggiungiamo un altro dato") | Il DS **non** introduce nuove sorgenti; consuma solo l'esistente |
| **Sensazione di "app che sa il futuro"** | §7 e audit lessicale in DS-6 |

---

## 7. Cosa PezzaliSisma NON deve MAI fare

1. **Prevedere terremoti** o presentare probabilità di scosse future come previsione.
2. **Emettere allerte ufficiali** o imitarne l'aspetto/linguaggio.
3. **Inventare o interpolare** dati non provenienti da INGV/USGS (o non già
   calcolati e documentati dall'app).
4. **Usare linguaggio sensazionalistico o allarmistico** ("pericolo", "in arrivo",
   "catastrofe", "sciame che cresce", urgenza emotiva).
5. **Affermare sicurezza assoluta** ("non succederà nulla", "zona sicura").
6. **Sostituirsi** a Protezione Civile, INGV o USGS.
7. **Inviare dati fuori dal dispositivo** o richiedere un backend obbligatorio.
8. **Generare testo casualmente** o con un modello linguistico a runtime: ogni
   frase nasce da una regola dichiarata e documentabile.
9. **Parlare al futuro** di un evento specifico ("ci sarà", "potrebbe arrivare").
10. **Mostrare conclusioni non sostenibili**: in dubbio, **tace**.

---

### Sintesi
Il Decision Support è un **sistema esperto a regole esplicabili** che siede sopra i
moduli esistenti, non aggiunge dati né rete, e trasforma valori già calcolati in
**frasi prudenti, deterministiche e tracciabili** — ognuna riconducibile a una
regola fisica/statistica/sismologica dichiarata, con i suoi limiti e le condizioni
in cui **non** deve comparire. Si costruisce una regola alla volta, con il workflow
consolidato, partendo da R0+R1 (il caso dell'esempio) e ampliando solo ciò che è
scientificamente difendibile.
