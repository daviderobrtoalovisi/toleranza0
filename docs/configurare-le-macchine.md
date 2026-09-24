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

## Database dei modelli

Oltre alla macchina didattica generica, nel menu **Modello** si può scegliere una macchina reale dai cataloghi dei produttori. I dati stanno in `js/machines/catalog-data.js`, uno per macchina, ciascuno con la **fonte** (pagina ufficiale) e il mese di controllo.

Scegliendo un modello il simulatore usa i suoi dati:

| Dato del catalogo | Nel simulatore |
|---|---|
| giri massimi | limite dei giri (anche con G96) |
| rapido | tempo dei G00 e tempo ciclo |
| corsa X del tornio | fine corsa X = 2 × corsa (X è in diametro) |
| corsa Z del tornio | circa il 30% davanti alla faccia del pezzo (al massimo 150 mm), il resto verso il mandrino |
| corse X, Y della fresa | ± metà corsa attorno allo zero pezzo |
| corsa Z della fresa | circa il 60% sopra il pezzo (al massimo 200 mm), il resto sotto |
| diametro e lunghezza tornibili, tavola | grezzo massimo impostabile |

Le ipotesi sulla posizione dello zero pezzo sono in `js/machines/catalog.js` (`latheModelData`, `millModelData`). Utensili, mandrino e morsa restano quelli del simulatore.

**Il linguaggio resta Fanuc ISO.** La scheda della macchina dice se il controllo vero lo accetta: *sì* (Fanuc, Haas…), *come modalità aggiuntiva* (per esempio Mazatrol con EIA/ISO, Okuma OSP) oppure *no* (Siemens, Heidenhain). Nell'ultimo caso il simulatore usa corse e giri della macchina, ma il programma va scritto in ISO.

### Aggiungere un modello

1. Aggiungere un oggetto in `MACHINE_DATA` (`js/machines/catalog-data.js`) copiando un modello dello stesso tipo.
2. `id` in minuscolo con trattini e unico; `sourceUrl` con la pagina ufficiale; `checked` con il mese (`2026-09`); `iso` = `yes`, `mode` o `no`.
3. I dati non trovati vanno lasciati a `null`: il simulatore usa quelli generici.
4. Aprire i test: ogni modello viene controllato (fonte presente, numeri validi, fine corsa coerenti).
