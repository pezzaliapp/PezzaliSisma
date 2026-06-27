# Documentazione scientifica — PezzaliSisma

> Ogni indicatore di PezzaliSisma è **descrittivo** e si basa su **eventi già
> registrati** e su **relazioni pubblicate**. Nessuna previsione, nessun dato
> inventato, nessuna allerta ufficiale. Tutto è calcolato **sul dispositivo**.

---

## Intensità stimata personale (V2.0-A1)

Stima **prudente e semplificata** dell'intensità macrosismica (scala MCS/MMI) su
un luogo salvato, a partire da un evento **ufficiale già registrato**.

> **Frase obbligatoria, sempre mostrata:** «Stima semplificata basata su dati
> ufficiali e relazioni pubblicate. Non è una ShakeMap ufficiale e non
> sostituisce Protezione Civile, INGV o USGS.»

### Modello (riferimento)
**Allen, T. I., Wald, D. J., & Worden, C. B. (2012).** *Intensity attenuation for
active crustal regions.* Journal of Seismology, 16(3), 409–433.

Si usa la **Intensity Prediction Equation (IPE)** per **distanza ipocentrale
(Rhypo)**, eventi superficiali, nella forma implementata da OpenQuake
`hazardlib` (`AllenEtAl2012Rhypo`):

```
MMI = c0 + c1·M + c2·ln( √(Rhyp² + Rm²) )          (Rhyp ≤ 50 km)
MMI = c0 + c1·M + c2·ln( √(Rhyp² + Rm²) ) + c4·ln(Rhyp/50)   (Rhyp > 50 km)
Rm  = m1 + m2·exp(M − 5)
Rhyp = √( D_epi² + h² )
```

- `ln` = logaritmo naturale; `M` = magnitudo; `D_epi` = distanza epicentro–luogo
  (formula dell'emisenoverso); `h` = profondità dell'evento.
- Il risultato è limitato all'intervallo plausibile **MMI ∈ [1, 10]**.

### Coefficienti (verbatim, AWW2012 Rhypo, eventi superficiali)
| c0 | c1 | c2 | c4 | m1 | m2 |
|----|----|----|----|----|----|
| 2.085 | 1.428 | −1.402 | 0.078 | −0.209 | 2.042 |

(Fonte: implementazione OpenQuake `openquake/hazardlib/gsim/allen_2012_ipe.py`.)

### Classi descrittive (soglie su MMI)
| Intervallo MMI | Classe |
|---|---|
| MMI < 2.5 | **molto lieve** |
| 2.5 ≤ MMI < 4.5 | **lieve** |
| 4.5 ≤ MMI < 6.0 | **moderata** |
| 6.0 ≤ MMI < 7.5 | **forte** |
| MMI ≥ 7.5 | **molto forte** |

La **classe** è mostrata in primo piano; il valore numerico MCS/MMI è un dettaglio
secondario (pannello «Dettagli»), per non dare falsa precisione.

### Significatività dell'evento
Per ciascun luogo si considera solo l'evento **più rilevante** (intensità stimata
più alta) fra quelli con **M ≥ 3.5** ed **entro 200 km** dal luogo, presi dagli
eventi **già caricati** in app.

### Limiti dichiarati
- **Intervallo di validità del modello**: AWW2012 è tarato per **M 5.0–7.9** entro
  **~300 km**. Sotto M5 (la nostra soglia parte da M3.5) il modello è
  **un'estrapolazione**, usata in modo prudente.
- **Sorgente puntiforme**: ignora geometria/estensione della faglia e direttività.
- **Nessun effetto di sito**: non considera l'amplificazione locale (suolo/Vs30),
  che le ShakeMap ufficiali includono.
- **Attenuazione media globale**: non calibrata regione per regione.
- **Dipende dai dati caricati** (area/periodo selezionati) e si aggiorna quando
  l'app è aperta.
- È una **stima**, non una misura strumentale, **non una previsione**, **non
  un'allerta**. Non sostituisce **INGV/USGS/Protezione Civile**.

---

## SismaRadar (Milestone C3 + V2.0-B)
Motore statistico **puro** su eventi già registrati. Indicatore Normale / Da
osservare / Attività elevata con soglie dichiarate. **Non è una previsione.**

### Indicatori base (C3)
Numero eventi, magnitudo media/massima, profondità media, eventi superficiali
(≤10 km), concentrazione geografica (griglia ~1°), sciami/cluster, variazione di
frequenza rispetto alla **finestra precedente reale**.

**Livello (soglie trasparenti):** *Attività elevata* = variazione ≥ +50% **e**
(evento forte per l'area **o** concentrazione ≥ 50%); *Da osservare* = variazione
≥ +25% **o** concentrazione ≥ 40%; altrimenti *Normale*. Magnitudo «forte per
l'area»: Mondo 6.0, Italia/Mediterraneo 4.5.

### Indicatori descrittivi aggiuntivi (V2.0-B)
Sono **descrittivi**: non modificano il livello e non costituiscono una previsione.

- **Energia sismica stimata** — relazione di **Gutenberg–Richter**
  `log10(E[J]) = 1.5·M + 4.8`, sommata sugli eventi. È una **stima**, il cui
  valore è **dominato dagli eventi di magnitudo maggiore** (scala esponenziale).
  *Limite:* dipende solo dalla magnitudo; non considera meccanismo o durata.
- **Distribuzione temporale** — conteggio eventi in intervalli uguali entro la
  finestra. *Limite:* descrive il passato recente, non indica evoluzioni future.
- **Distribuzione per profondità** — conteggi per fasce (km), intervalli
  semiaperti `[min, max)`: **0–10, 10–30, 30–70, 70–300, >300**. *Limite:* le
  profondità possono essere riviste dagli enti.

Ogni indicatore è mostrato con valore, spiegazione, limite e la frase «non è una
previsione». Tutto calcolato **sul dispositivo**, sui dati già caricati.

**Visualizzazione (V2.0-B2).** Gli indicatori sono mostrati nella card SismaRadar
in un pannello espandibile **«Perché questo indicatore?»** (chiuso di default):
energia totale stimata (con nota «dominata dagli eventi di magnitudo maggiore»),
distribuzione temporale e per profondità come **mini-grafici a barre in CSS puro**
(nessuna libreria), frequenza eventi, confronto con la finestra precedente,
magnitudo max/media, profondità media e sciami/cluster. Il pannello **non modifica
il livello** e si chiude con: «Questi indicatori descrivono eventi già registrati e
non costituiscono una previsione sismica né un'allerta ufficiale.»

## Decision Support — DS-1: «Cosa significa»

Per ogni **luogo salvato** con un evento significativo già caricato, l'app
trasforma i valori già calcolati (intensità stimata, distanza, profondità) in una
spiegazione a **schema fisso di 4 parti**, ognuna riconducibile a una **regola
dichiarata** e a un **modello documentato** (tracciabilità completa: per ogni frase
si conosce *dato → regola → modello*). Niente previsione, niente allarme, niente
testo casuale: **se la stima non è disponibile, non viene prodotta alcuna frase**.

| Parte | Regola | Da quale dato | Modello/base |
|---|---|---|---|
| **Fatto osservato** | R0 | evento ufficiale (M, profondità) + distanza Haversine | nessun modello: dato osservato |
| **Significato** | R1 | classe d'intensità da `estimateIntensity` | IPE AWW2012 + descrizioni scala macrosismica MCS/MMI |
| **Perché** | R2 | distanza ipocentrale `r` | termine di attenuazione `c₂·ln(r)` dell'IPE AWW2012 |
| **Limiti** | R-LIM | identità/taratura del modello | limiti dichiarati AWW2012 |

**Mappa classe → effetti (R1).** È la descrizione della scala macrosismica (effetti
osservati) applicata a eventi **già avvenuti**, non una previsione:

| Classe (MMI) | Significato |
|---|---|
| molto lieve (<2.5) | in genere non avvertita; nessun effetto sulle strutture |
| lieve (2.5–4.5) | normalmente percepita da parte della popolazione; raramente danni |
| moderata (4.5–6.0) | avvertita dai più; lievi effetti su oggetti; danni in genere assenti/limitati |
| forte (6.0–7.5) | avvertita da tutti; possibili danni leggeri/moderati agli edifici più vulnerabili |
| molto forte (≥7.5) | possibili danni alle costruzioni; riferimento alle valutazioni ufficiali |

**Perché l'attenuazione è sempre corretta (R2).** L'IPE è **monotòna decrescente**
nella distanza ipocentrale: a distanza/profondità maggiori corrispondono effetti
attesi minori sul luogo rispetto a un punto più vicino alla sorgente. La frase
descrive la relazione del modello, non un confronto inventato.

**Limiti (R-LIM).** È una **stima** (non una misura), basata su Allen–Wald–Worden
(2012); ignora gli effetti locali del terreno, geometria di faglia e direttività;
sotto M5 è un'estrapolazione prudente. **Non sostituisce** Protezione Civile, INGV o
USGS. Tutto è calcolato **sul dispositivo**, sui dati ufficiali già caricati.
