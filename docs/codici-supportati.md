# Codici supportati

La tabella di riferimento è in [`js/machines/lathe/codes.js`](../js/machines/lathe/codes.js): questa pagina va tenuta allineata a quel file.

Legenda: ✅ supportato · 🕓 previsto (oggi dà l'allarme 1013)

Dalla v0.2 i codici supportati vengono anche simulati: movimenti, asportazione del materiale e tempo ciclo.

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
- `(GREZZO D50 L80)` in un commento: imposta il grezzo quando si apre il programma (Ø 50, sporgenza 80 mm). Con `S2` si cambia anche il sovrametallo sulla faccia: `(GREZZO D50 L80 S2)`.

### Come li simula il tornio

- **Macchina** (`js/machines/lathe/machine.js`): punto di riferimento X250 Z150, rapido 8000 mm/min, massimo 4000 giri/min, cambio utensile 2 s. Sono valori tipici, da adattare al tornio del laboratorio.
- **Zero pezzo**: Z0 è la faccia finita; il grezzo sporge di L mm dal mandrino e ha un sovrametallo sulla faccia (predefinito 1 mm).
- **G00**: in linea retta (interpolato), come sui controlli moderni.
- **G02 / G03**: orario / antiorario guardando il disegno con Z verso destra e X verso l'alto. Con `R` positivo l'arco è minore di 180°, con `R` negativo maggiore. `I` e `K` sono la distanza del centro dal punto iniziale, con `I` in raggio.
- **G28**: va in rapido al punto intermedio indicato (di solito `U0 W0`) e poi al punto di riferimento, solo per gli assi scritti.
- **G04**: sosta con `P` in millesimi di secondo (`P1500` = 1,5 s) oppure con `X`/`U` in secondi.
- **G96**: i giri si ricalcolano con il diametro, fino al limite di G50 e della macchina.
- **G20**: le quote vengono convertite in millimetri; S in G96 resta in m/min.
- **Correttori utensile** (le ultime due cifre di T, per esempio T0101): registri 01, 02 e 03 con l'usura in X (diametro) e Z, da impostare in *Utensili e correttori* sopra la simulazione. L'utensile si trova nella quota programmata più l'usura; le quote X/Z mostrate restano quelle programmate, come sulla macchina. `T0100` annulla il correttore. La geometria degli utensili si considera già misurata.
- **Fine corsa**: X da -10 a 300 (diametro), Z da -300 a 200, in quote pezzo.

### Utensili in torretta

Punto programmato: la punta teorica dell'utensile (orientamento 3). Senza G41/G42 cilindri e facce vengono esatti, mentre coni e raggi hanno il piccolo errore dovuto al raggio di punta, come sulla macchina vera.

| T | Utensile | Raggio di punta | Passata massima |
|---|---|---|---|
| T01 | Sgrossatore esterno 80° (CNMG), tagliente principale a 95° | 0,8 mm | 4 mm |
| T02 | Troncatore larghezza 3 mm, profondità 18 mm, riferimento sullo spigolo destro (lato Z+) | — | 3 mm |
| T03 | Finitore esterno 35° (VBMT), tagliente principale a 93° | 0,4 mm | 2 mm |

Anche il portautensile ha una forma e può urtare il pezzo (4003) o il mandrino (4002). La tabella è in `js/machines/lathe/tools.js`.

## Fresa 3 assi

Prevista dalla v0.5.
