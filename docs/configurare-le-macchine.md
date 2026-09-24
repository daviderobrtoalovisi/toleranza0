# Configurare le macchine del laboratorio

Il simulatore usa **valori tipici** di un tornio e di una fresa didattici. Perché gli allarmi siano quelli della vostra officina (fine corsa, giri, collisioni con mandrino e morsa, passate massime), vanno inseriti i dati delle macchine vere.

Tutti i dati stanno in quattro file, tutti con commenti in italiano. Non serve toccare nient'altro.

| Macchina | Dati della macchina | Utensili |
|---|---|---|
| Tornio | `js/machines/lathe/machine.js` → `LATHE_PARAMS` | `js/machines/lathe/tools.js` → `LATHE_TOOLS` |
| Fresa | `js/machines/mill/machine.js` → `MILL_PARAMS` | `js/machines/mill/tools.js` → `MILL_TOOLS` |

## Dati da raccogliere in officina

### Tornio

| Dato | Dove | Valore attuale | Note |
|---|---|---|---|
| Punto di riferimento (G28) | `home` | X250 Z150 | in quote pezzo, X in diametro |
| Rapido | `rapidRate` | 8000 mm/min | serve per il tempo ciclo |
| Giri massimi | `maxRpm` | 4000 giri/min | limite anche con G96 |
| Cambio utensile | `toolChangeTime` | 2 s | |
| Fine corsa X e Z | `limits` | X da -10 a 300, Z da -300 a 200 | quote pezzo; oltre scatta 3004 |
| Griffe del mandrino | `chuck.jawHeight`, `chuck.jawLength` | 12 mm sopra il grezzo, lunghe 25 mm | collisione 4002 |
| Corpo del mandrino | `chuck.bodyHeight` | 45 mm sopra il grezzo | collisione 4002 |

Per ogni utensile in torretta (`LATHE_TOOLS`): nome, forma (`rhombic` per gli inserti, `groove` per il troncatore), angolo dell'inserto (`tipAngle`), angolo del tagliente (`approach`), raggio di punta (`noseRadius`), dimensione dell'inserto (`size`), passata massima (`maxDepth`). Per il troncatore: larghezza (`width`) e profondità massima della gola (`depth`).

### Fresa

| Dato | Dove | Valore attuale | Note |
|---|---|---|---|
| Punto di riferimento (G28) | `home` | X0 Y0 Z150 | quote pezzo |
| Rapido | `rapidRate` | 10000 mm/min | |
| Giri massimi | `maxRpm` | 8000 giri/min | |
| Cambio utensile | `toolChangeTime` | 5 s | |
| Fine corsa X, Y, Z | `limits` | X ±250, Y ±200, Z da -100 a 200 | quote pezzo; oltre scatta 3004 |
| Sporgenza del pezzo dalla morsa | `vise.maxProtrusion` | 10 mm | collisione 4004 |
| Ganasce e base della morsa | `vise.jawThickness`, `vise.margin`, `vise.baseHeight` | 20, 15, 30 mm | |

Per ogni utensile (`MILL_TOOLS`): nome, tipo (`flat` fresa piana, `ball` sferica, `drill` punta), diametro, lunghezza del tagliente (`fluteLength`), sporgenza dal portautensile (`stickout`), diametro del portautensile (`holderDiameter`), passata massima (`maxDepth`, `Infinity` per le punte).

## Come fare la modifica

1. Aggiornare il repository (`git pull`) e modificare i valori nei file indicati.
2. Avviare il server locale e aprire i test: `python tools/serve.py`, poi `http://localhost:8000/toleranza0/tests/`.
3. **Se un esempio o un esercizio ora dà un allarme diverso**, è normale: la macchina vera ha limiti diversi. Correggere l'esempio (o il risultato atteso in `tests/examples.test.js`) in modo che rispetti la macchina del laboratorio.
4. Quando i test sono verdi: commit e push. Dopo pochi minuti il sito online usa i nuovi dati.

Se gli utensili cambiano, aggiornare anche le tabelle in `docs/codici-supportati.md`.
