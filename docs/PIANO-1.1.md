# PezzaliSisma 1.1 — Piano tecnico

> **Missione 1.1 — "Aiutare a salvare vite".** Trasformare PezzaliSisma da
> osservatorio sismico a **strumento di supporto alle decisioni**, senza mai
> tradire i vincoli fondamentali del progetto.

## Vincoli permanenti (non negoziabili)

- Nessuna **previsione** sismica.
- Nessun **allarme ufficiale** simulato.
- Nessun **dato inventato**.
- Nessun comportamento **ingannevole**.
- Ogni funzione deve poter essere **spiegata scientificamente**.
- L'app **non sostituisce** Protezione Civile e sistemi ufficiali.

---

## 1. Obiettivi

| # | Obiettivo | Esito misurabile |
|---|---|---|
| O1 | Capire **cosa sta succedendo** | SismaRadar spiegabile, ogni numero tracciabile alla sua fonte |
| O2 | Sapere **cosa fare** | Schermata consigli + Modalità Emergenza, consultabili offline |
| O3 | Sapere **dove** conta | Luoghi importanti (Casa/Lavoro/Scuola/Familiari) monitorati localmente |
| O4 | Capire **quando** prestare attenzione | Early Warning **teorico** P/S, con disclaimer permanente |
| O5 | **Fiducia** totale | Trasparenza scientifica: ogni algoritmo documentato, ogni limite dichiarato |
| O6 | **Accessibilità** reale | VoiceOver/TalkBack, contrasto, uso a una mano, landscape, tablet |

---

## 2. Architettura

Invariata nei principi: **PWA 100% statica**, ES modules nativi, nessun build
step, nessun backend, **nessuna nuova libreria**. La 1.1 **estende**, non
riscrive. Grafo delle dipendenze aciclico mantenuto (`config ← geo ← {…} ← main`).

### Nuovi moduli

```
src/
 ├─ prepare.js      # Sezione "Preparazione & Emergenza": shell accessibile, schede, Modalità Evento
 ├─ places.js       # "La mia famiglia": luoghi importanti (localStorage, device-only)
 ├─ personalcard.js # Scheda personale (localStorage); blocco vista opzionale via WebAuthn
 ├─ share.js        # "Sto bene": Web Share API + fallback appunti
 ├─ explain.js      # Spiegazioni indicatori SismaRadar (su engine.js esistente)
 ├─ seismic.js      # Fisica teorica PURA: tempi onde P/S (usa geo.js)
 └─ earlywarning.js # Orchestrazione countdown teorico (usa seismic.js + state)
docs/
 ├─ PIANO-1.1.md    # questo documento
 └─ SCIENZA.md      # documentazione algoritmi, costanti, limiti (Modulo Trasparenza)
```

> **Nota:** la sezione **"Preparazione & Emergenza"** unifica quanto inizialmente
> previsto come Emergenza + Cosa fare + Luoghi, e aggiunge Scheda personale,
> "Sto bene" e Modalità Evento. È sviluppata in sotto-milestone A1–A5 (vedi §7).

### Estensioni
- `state.js`: aggiunte `places: []` ed `earlyWarning: null` (effimero). Nessuna
  modifica ai campi 1.0.
- `sw.js`: bump versione + precache dei nuovi moduli **e** della schermata
  Emergenza (deve funzionare offline). Strategia di caching invariata.
- Funzioni pure dove possibile (`seismic.js`, `explain.js`) → testabili in
  isolamento, come già `geo.js` ed `engine.js`.

---

## 3. Moduli — dettaglio

### Sezione — Preparazione & Emergenza (Milestone A, sotto-milestone A1–A5)
Sezione **permanente** e **interamente offline**, utilizzabile anche quando non
sta accadendo nulla. Overlay accessibile a schede, con **disclaimer sempre
visibile**. Sviluppata una funzione alla volta:

- **A1 — Sezione + Prima/Durante/Dopo + Numeri utili.** Pulsante header
  «Preparazione & Emergenza»; contenuti **statici** (in precache, offline):
  preparazione (kit, punto di ritrovo, sicurezza casa, bambini, animali), durante
  (pochissimo testo, **icone grandi**), dopo; **numeri utili** (112, 115, 118,
  1515, 1530) come link `tel:`; link ufficiali (Protezione Civile, INGV).
  Attribuito alla Protezione Civile, nessun allarmismo.
- **A2 — La mia famiglia.** CRUD luoghi su `localStorage` (nome, coordinate,
  note): Casa/Lavoro/Scuola/Genitori/personalizzato. Coordinate **solo
  on-device**, mai trasmesse; cancellazione granulare e globale. Riusa
  `haversineKm`.
- **A3 — Scheda personale.** Campi **facoltativi** (ICE, gruppo sanguigno,
  allergie, farmaci, patologie, indirizzo, note) su `localStorage`, **mai
  inviati**. Blocco di **visualizzazione opzionale** via **WebAuthn** (Face
  ID/Touch ID) con disclaimer: *«Questa protezione non è cifratura completa. I
  dati restano salvati solo sul dispositivo.»* La scheda resta usabile **anche
  senza** biometria. Niente WebCrypto complesso in questa fase.
- **A4 — Sto bene.** Nessun invio automatico: usa la **Web Share API** (quando
  disponibile) per condivisione **volontaria** (WhatsApp/SMS/email/…); messaggio
  predefinito *«Sto bene. Messaggio condiviso tramite PezzaliSisma.»* editabile.
  Fallback **copia negli appunti**. Nessun backend.
- **A5 — Modalità Evento.** Quando un evento ufficiale **già rilevato** supera la
  **soglia configurabile** (default **M ≥ 3 / ≤ 50 km**, salvata in
  `localStorage`, condivisa con «La mia famiglia») rispetto a un luogo salvato,
  la sezione cambia aspetto e mostra **Evento rilevato, Magnitudo, Distanza, Ora,
  Fonte** + scorciatoia alle istruzioni. **Lessico vietato**: mai *ALLARME,
  PERICOLO, TERREMOTO IN ARRIVO, PREVISIONE*. Linguaggio descrittivo.

### Modulo — SismaRadar spiegabile (Milestone D)
Il motore `engine.js` **già calcola** tutto (variazione frequenza, profondità
media, concentrazione, cluster, conteggi). Si aggiunge la UI
«**Perché questo indicatore?**» che mostra, per ogni metrica: **valore, soglia
applicata, finestra usata, fonte**. Nessuna scatola nera.

### Modulo — Early Warning teorico (Milestone E)
`seismic.js` (puro): dato un evento ufficiale (tempo origine, epicentro) e la
posizione utente → distanza, **tempo teorico onde P**, **tempo teorico onde S**,
differenza.

- **Framing didattico/teorico** confermato. I tempi P/S si mostrano **sempre**,
  anche **retrospettivi** (es. «le onde S sarebbero teoricamente arrivate N s
  dopo l'origine»).
- Il **countdown live** si mostra **solo quando il tempo stimato è ancora
  positivo**, senza forzarlo (quindi raramente — vedi Limiti).
- Disclaimer **sempre** presente: *«Stima teorica basata su dati ufficiali. Non
  costituisce un'allerta ufficiale.»* Vietati i termini *allarme*, *previsione*,
  *rischio imminente*.

**Costanti fisiche** (documentate in `SCIENZA.md`):
- onde **P ≈ 6 km/s**
- onde **S ≈ 3,5 km/s**

> Sono **valori medi semplificati** (crostali). **Non sostituiscono** i modelli
> sismologici professionali: ignorano profondità ipocentrale, struttura a strati
> della Terra, rifrazione e anisotropie. Servono a *capire*, non a operare.

### Modulo — Accessibilità e rifinitura (Milestone F)
VoiceOver/TalkBack (ruoli, label, ordine focus), contrasto AA, dimensioni testo,
**uso a una mano** (azioni primarie raggiungibili in basso), landscape, layout
tablet. Audit con strumenti reali. Nessuna nuova funzione, solo qualità.

---

## 4. Limiti (dichiarati)

- **Nessun Early Warning reale**: l'EEW professionale richiede reti sismiche
  dedicate sub-secondo e canali push. Qui c'è **polling pubblico ogni 5 minuti**
  più la latenza di pubblicazione delle sorgenti: per un sisma locale le onde S
  sono **quasi sempre già passate** quando l'app vede l'evento. Il Modulo Early
  Warning è perciò **teorico/didattico per costruzione**.
- **Modello P/S approssimato**: velocità costanti, Terra non stratificata,
  profondità trascurata.
- **Niente push/notifiche**: la PWA (in particolare su iOS) ha forti limiti;
  l'app è di **consultazione**, non di notifica. Non promettiamo avvisi.
- **Consigli generali**, non personalizzati né a norma di legge: rinviano sempre
  agli enti ufficiali.
- **Copertura** legata ai feed USGS/INGV e alle loro soglie/latenza.

## 5. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| L'utente lo scambia per allerta reale | Disclaimer permanenti, lessico vietato, framing didattico, separazione netta dai sistemi ufficiali |
| Falsa rassicurazione ("aspetto il countdown") | Spiegare la latenza; countdown assente per design; testo che invita a non attendere l'app |
| Responsabilità su consigli localizzati | Attribuzione Protezione Civile, link ufficiali, "non sostituisce" |
| Privacy luoghi salvati | Solo `localStorage`, mai trasmessi, cancellazione granulare |
| Regressioni sulla 1.0 | Una milestone per volta, test reali, niente modifiche a mappa/timeline/heatmap/sorgenti se non per bug |
| Peso/performance su mobile | Contenuti statici leggeri, nessuna libreria nuova, precache mirato |

## 6. Benefici per l'utente

- **Comprende** cosa indica ogni numero (fine della scatola nera) → fiducia.
- **Sa reagire** subito grazie a consigli chiari e Modalità Emergenza offline.
- **Accede rapidamente** a numeri e link ufficiali quando conta.
- **Monitora i luoghi** che gli stanno a cuore, in privacy totale.
- **Impara** la fisica delle onde sismiche in modo onesto, senza illusioni di
  allerta.

---

## 7. Milestone (ordine approvato)

| Milestone | Contenuto |
|---|---|
| **1.1-A** | **Preparazione & Emergenza** (sezione unificata, sotto-milestone A1–A5) |
| → A1 | Sezione + Prima/Durante/Dopo + Numeri utili + disclaimer + offline |
| → A2 | La mia famiglia (luoghi, localStorage) |
| → A3 | Scheda personale (localStorage, WebAuthn opzionale) |
| → A4 | Pulsante "Sto bene" (Web Share + fallback appunti) |
| → A5 | Modalità Evento (soglia configurabile M≥3 / ≤50 km) |
| **1.1-D** | **SismaRadar spiegabile** ("Perché questo indicatore?" + `docs/SCIENZA.md`) |
| **1.1-E** | **Early Warning teorico** (tempi P/S, countdown solo se positivo) |
| **1.1-F** | **Accessibilità e rifinitura 1.1** |

> Motivo dell'ordine: se l'obiettivo è aiutare concretamente le persone, la
> sezione Preparazione & Emergenza e le istruzioni pratiche vengono **prima** del
> countdown teorico.

### Modalità di lavoro (per ogni milestone)
1. riepilogo/piano della milestone;
2. **attesa approvazione**;
3. implementazione;
4. **test reali** prima del commit;
5. commit `Milestone 1.1-X - …` (senza firme: né Co-Authored-By né firme Anthropic);
6. **stop** e attesa verifica su device dell'utente.
