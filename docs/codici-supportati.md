# Codici supportati

La tabella di riferimento è in [`js/machines/lathe/codes.js`](../js/machines/lathe/codes.js): questa pagina va tenuta allineata a quel file.

Legenda: ✅ supportato · 🕓 previsto (oggi dà l'allarme 1013)

In v0.1 "supportato" vuol dire che il codice viene riconosciuto e spiegato nel pannello *Blocco corrente*. La simulazione dei movimenti arriva con la v0.2.

## Tornio 2 assi — Fanuc sistema A

Convenzioni:
- **X in diametro**, Z lungo l'asse del mandrino, zero pezzo di solito sulla faccia frontale
- **X Z** quote assolute, **U W** incrementali (non si usano G90/G91: sul tornio G90 è un ciclo)
- Avanzamento **G99** mm/giro (di solito sul tornio), **G98** mm/min
- Utensile **T0101** = utensile 01 con correttore 01

### Indirizzi

| Lettera | Significato |
|---|---|
| O | Numero del programma |
| N | Numero di blocco |
| G | Funzione preparatoria |
| M | Funzione ausiliaria |
| T | Utensile e correttore |
| S | Velocità mandrino (giri/min, oppure m/min con G96) |
| F | Avanzamento |
| X, Z | Quote assolute (X in diametro) |
| U, W | Spostamenti incrementali |
| I, K | Centro dell'arco (incrementale dal punto iniziale) |
| R | Raggio dell'arco o parametro di ciclo |
| P, Q | Parametri (sosta G04, blocchi dei cicli) |

### Codici G

| Codice | Significato | Stato |
|---|---|---|
| G00 | Posizionamento in rapido | ✅ |
| G01 | Interpolazione lineare | ✅ |
| G02 | Interpolazione circolare oraria | ✅ |
| G03 | Interpolazione circolare antioraria | ✅ |
| G04 | Sosta temporizzata | ✅ |
| G18 | Piano ZX | ✅ |
| G20 / G21 | Pollici / millimetri | ✅ |
| G28 | Ritorno al punto di riferimento | ✅ |
| G32 | Filettatura | 🕓 |
| G40 | Annulla compensazione raggio | ✅ |
| G41 / G42 | Compensazione raggio sinistra / destra | 🕓 v0.4 |
| G50 | Limite massimo giri mandrino | ✅ |
| G54–G59 | Origini pezzo | ✅ |
| G70 | Ciclo di finitura | 🕓 v0.4 |
| G71 | Sgrossatura longitudinale | 🕓 v0.4 |
| G72 | Sgrossatura frontale | 🕓 |
| G76 | Ciclo di filettatura | 🕓 |
| G90 | Ciclo di tornitura cilindrica/conica | 🕓 |
| G92 | Ciclo di filettatura semplice | 🕓 |
| G94 | Ciclo di sfacciatura | 🕓 |
| G96 / G97 | Velocità di taglio costante / giri costanti | ✅ |
| G98 / G99 | Avanzamento mm/min / mm/giro | ✅ |

### Codici M

| Codice | Significato | Stato |
|---|---|---|
| M00 | Arresto programmato (il simulatore va in pausa) | ✅ |
| M01 | Arresto opzionale (pausa se è attivo "Arresto M01") | ✅ |
| M02 | Fine programma | ✅ |
| M03 / M04 | Mandrino orario / antiorario | ✅ |
| M05 | Arresto mandrino | ✅ |
| M08 / M09 | Refrigerante acceso / spento | ✅ |
| M30 | Fine programma e ritorno all'inizio | ✅ |
| M98 / M99 | Sottoprogrammi | 🕓 |

### Altro

- `%` su una riga da sola: inizio/fine programma
- `( ... )` commento; `;` fine blocco, il resto della riga è commento
- `/` a inizio riga: salto blocco, attivo se è selezionato "Salta blocchi /"

## Fresa 3 assi

Prevista dalla v0.5.
