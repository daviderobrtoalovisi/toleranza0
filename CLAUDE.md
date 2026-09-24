# CLAUDE.md — istruzioni per Claude Code

## Contesto

Toleranza0 è un simulatore CNC didattico per studenti. Programma ISO/Fanuc in un editor di testo → simulazione grafica dell'asportazione, riga in esecuzione evidenziata, allarmi in italiano. Vedi `README.md` per obiettivi e tabella di marcia.

- Due macchine: **tornio 2 assi** (X/Z, vista 2D su canvas) e **fresa 3 assi** (X/Y/Z, vista 3D Three.js, dalla v0.5)
- Fresa: **Fanuc serie M**. G90/G91, F in mm/min, T prepara e M06 monta, dopo ogni M06 serve G43 H(numero utensile) prima di muovere Z (allarmi 2008/2009).
- Tornio: **Fanuc sistema A**. X in diametro, X/Z assolute, U/W incrementali, G98/G99 per l'avanzamento. Sul tornio G90/G94 sono cicli, non assoluto/avanzamento.
- La tabella dei codici di ogni macchina (`js/machines/*/codes.js`) è la fonte unica: parser, pannello *Blocco corrente* e `docs/codici-supportati.md` devono essere coerenti con essa. Un codice che esiste sulla macchina ma non è ancora simulato ha `status: 'planned'` e dà l'allarme 1013.
- Utenti finali: studenti. I messaggi di allarme devono essere chiari per chi sta imparando: cosa è successo, su quale riga, come correggere.
- Sviluppatori: 2–5 docenti, tutti su `main`, alcuni usano Claude Code.

## Lingua

- Interfaccia, messaggi di allarme, documentazione e messaggi di commit: **italiano**
- Nomi di variabili, funzioni e file: **inglese** (`parseBlock`, `lathe2d.js`)
- Commenti nel codice: italiano, brevi

## Stack e vincoli

- **HTML + CSS + JavaScript puro, moduli ES**. Nessun Node, npm, bundler o TypeScript. Unico strumento di sviluppo: Python 3 per `tools/serve.py` (solo libreria standard).
- Unica libreria esterna prevista: **Three.js da CDN** (jsdelivr/cdnjs), solo per la fresa 3D. Non aggiungere altre dipendenze senza chiedere.
- Deve funzionare sui browser recenti (Chrome, Edge, Firefox) e servito come file statici (GitHub Pages).
- Test in `tests/` eseguiti nel browser (`tests/index.html`), con un piccolo runner fatto in casa (`tests/runner.js`): nessun framework. Il risultato è anche in `window.testResults` e nel titolo della pagina (`OK` / `FALLITI`). Ogni programma in `examples/` viene controllato automaticamente: gli esempi devono essere senza errori, tranne gli esercizi `esercizio-*` che hanno errori voluti ed elencati nel test.
- Per provare in locale usa **sempre** `python tools/serve.py` (porta 8000, sito su `http://localhost:8000/toleranza0/`, test su `/toleranza0/tests/`). Imita GitHub Pages: sottocartella `/toleranza0/` e nomi dei file che distinguono maiuscole e minuscole. Non usare `python -m http.server`, Live Server o server in PowerShell: nascondono gli errori di percorso che poi rompono il sito online. Per Claude Code desktop la configurazione di anteprima è in `.claude/launch.json`.
- Python serve solo come server di sviluppo: il sito pubblicato non deve mai dipendere da Python.

## Pubblicazione su GitHub Pages

Il sito è pubblicato con GitHub Pages dal branch `main`, cartella principale (`/`), all'indirizzo `https://daviderobrtoalovisi.github.io/toleranza0/`. **Ogni push su `main` va online entro pochi minuti** e lo vedono subito gli studenti. Tutto il codice deve rispettare questi vincoli:

- **`main` deve funzionare sempre.** Non pubblicare codice a metà o rotto: prima del push i test devono passare e `index.html` deve caricarsi senza errori nella console. Una funzione non ancora pronta si nasconde (per esempio con un'opzione in `js/config.js` disattivata di default), non si pubblica rotta.
- **Solo file statici.** Niente codice lato server, database, API proprie o variabili d'ambiente. Tutto gira nel browser.
- **Solo percorsi relativi.** Il sito sta nella sottocartella `/toleranza0/`, quindi un percorso assoluto come `/js/main.js` si rompe. Scrivi sempre `./js/main.js` o `js/main.js`, sia negli `import` sia in HTML e CSS.
- **Maiuscole e minuscole contano.** Windows non le distingue, GitHub Pages sì: `Lathe2D.js` e `lathe2d.js` sono file diversi. Nomi di file e cartelle sempre in minuscolo, con trattini (`lathe-2d.js`), e gli `import` devono corrispondere esattamente.
- **File `.nojekyll` nella radice**: va lasciato lì, altrimenti GitHub Pages elabora il sito con Jekyll e ignora file e cartelle che iniziano con `_`.
- **`index.html` nella radice**: è la pagina che si apre all'indirizzo del sito.
- **Librerie esterne solo via HTTPS e con versione fissa** (per esempio `https://cdn.jsdelivr.net/npm/three@0.170.0/...`), mai `@latest`: un aggiornamento della libreria non deve rompere il sito durante una lezione.
- **Nessun dato riservato nel repository**: il sito e il repo sono pubblici. Niente password, chiavi API, nomi o dati degli studenti.
- **I programmi degli studenti restano sul loro PC**: si caricano e si salvano come file locali (apri/scarica). `localStorage` si può usare solo come comodità (per esempio l'ultimo programma aperto) e il sito deve funzionare anche se è vuoto o bloccato.
- **Cache del browser**: dopo un rilascio, se gli studenti vedono ancora la versione vecchia basta ricaricare con Ctrl+F5. La versione mostrata nell'interfaccia (da `js/version.js`) serve a controllare quale versione è attiva.
- **Peso contenuto**: niente video o file pesanti nel repo. Le immagini degli esempi vanno compresse.

## Architettura

Il flusso è a stadi separati; ogni stadio non conosce quelli successivi:

```
testo -> parser -> blocchi -> interpreter (stato modale) -> movimenti -> machines/* (asportazione) -> render/*
                                          \-> alarms (in ogni stadio)
```

- `js/parser/` — `parse-program.js` trasforma ogni riga in un blocco `{ line, source, words: [{ letter, value, raw, col }], comment, blockDelete, alarm }` (sintassi pura); `validate-block.js` controlla il blocco sulla tabella codici della macchina; `check-program.js` unisce le due cose.
- `js/interpreter/interpret-lathe.js` — stato modale del tornio (G00–G03, G20/G21, G96/G97, G98/G99, F, S, T, mandrino) → passi `{ block, moves, alarm, stop, state, time }`. Movimenti `{ type: 'rapid' | 'line' | 'arc' | 'dwell' | 'tool', from, to, length, duration, ... }` con posizioni `{ x (diametro), z }`. Controlla F, S, T e la geometria degli archi (allarmi 1013, 1014, 2xxx, 3xxx), non il grezzo. `path.js` contiene la geometria comune dei movimenti.
- `js/interpreter/lathe-geometry.js` — quote di arrivo, rapidi, linee e archi (usati da interprete e cicli). `cycles-lathe.js` — G71/G70: ricerca dei blocchi P/Q, geometria del profilo e controllo tipo I (3006, 3007), percorso di sgrossatura. Dopo G71 l'interprete salta al blocco dopo Q; G70 esegue i blocchi del profilo come passi propri (così si evidenziano le loro righe) e aggiunge il ritorno al punto di partenza.
- `js/interpreter/nose-compensation.js` — G41/G42: l'interprete segna i movimenti con `comp` e `rn`; dopo l'interpretazione `compensateNoseRadius()` sostituisce le catene di movimenti compensati con quelli della punta teorica (spigoli esterni con arco di raggio rn, interni accorciati al punto d'incontro, attivazione e annullamento come Fanuc). I movimenti di G71 non si compensano. Il tempo ciclo si calcola dopo la compensazione.
- `js/machines/lathe/` — `codes.js` codici, `machine.js` dati della macchina e del grezzo (anche la riga `(GREZZO D.. L..)`), `tools.js` forma degli utensili, `stock.js` grezzo a griglia di celle nel piano Z–r, `simulator.js` fa percorrere i movimenti all'utensile: toglie materiale in lavoro, allarmi 4xxx in rapido e contro il mandrino. `runAll()` esegue tutto senza animazione (per i test).
- `js/ui/run-controller.js` — anima l'esecuzione: tempo simulato = tempo reale × fattore di velocità (`CONFIG.speedFactors`); avvio, pausa, blocco singolo, reset, M00/M01/M30.
- `js/render/lathe-2d.js` — solo disegno su canvas (sezione del pezzo, mandrino, utensile, percorsi, zoom). Non contiene logica CNC; i colori vengono dalle variabili CSS `--sim-*`.
- Punto programmato degli utensili: punta teorica con orientamento 3 (troncatore: spigolo destro). Senza G41/G42 coni e raggi hanno l'errore reale del raggio di punta: è voluto, non correggerlo.
- Correttori: l'interprete mette in ogni movimento `offset: { x, z }` (usura del correttore attivo); il simulatore tiene `sim.pos` = quota programmata (mostrata nelle quote) e muove l'utensile in `sim.toolPos` = pos + offset.
- Profondità di passata (3005): distanza massima, perpendicolare alla direzione del movimento, tra il punto programmato e le celle tolte in quel passo; confrontata con `tool.maxDepth`. Il portautensile (`toolHolder`) è appoggiato sul retro dell'inserto e non deve mai coprire la zona che taglia, altrimenti scatta 4003 in passate normali (c'è un test).
- `simulator.follow()` restituisce `null` oppure `{ code, params }`; l'allarme lo crea chi chiama, con la riga del blocco.
- Ogni esempio in `examples/` viene eseguito per intero dai test: se si cambia la fisica del simulatore, gli esempi devono restare senza allarmi (o con quelli attesi in `tests/examples.test.js`).
- I dati del tornio in `machine.js` sono valori tipici, non quelli del laboratorio: vanno sostituiti quando i docenti li forniscono.
- **Due macchine con la stessa forma.** Ogni macchina ha un adattatore (`js/machines/lathe/adapter.js`, `js/machines/mill/adapter.js`) con codici, parametri, utensili, campi del grezzo, interprete, simulatore, vista e quote da mostrare. `main.js` parla solo con l'adattatore attivo: una funzione nuova per una macchina va nel suo adattatore, non in `main.js` con un `if`.
- `js/interpreter/interpret-mill.js` e `path-3d.js` — interprete della fresa (posizioni `{ x, y, z }`, archi nel piano XY con centro `{ x, y }`, anche elicoidali; cicli G81/G82/G83 con G98/G99). `js/machines/mill/` — `codes.js`, `machine.js` (grezzo in quote pezzo con `stockBox()`, riga `(GREZZO X.. Y.. Z..)`), `tools.js` (forma del fondo con `bottomAt()`), `stock.js` mappa delle altezze, `simulator.js` (asportazione, 3005, 3008, 4001, 4003 gambo e portautensile, 4004 morsa; `runAllMill()` per i test).
- `js/render/mill-3d.js` — vista 3D. **È l'unico file che importa Three.js** (`import ... from 'three'`, risolto dall'importmap in `index.html` con la versione fissa 0.170.0). Si carica solo quando si sceglie la fresa: nessun altro modulo, test compresi, deve importare `three`, così il tornio e i test funzionano anche senza rete.
- Le viste ricevono la scena solo quando la loro macchina è attiva (`getScene()` restituisce `null` altrimenti) e devono gestire quel caso.
- `examples/index.json` indica per ogni esempio la macchina (`"machine": "lathe" | "mill"`): il menu Esempi e i test la usano.
- `js/alarms/` — catalogo degli allarmi. Ogni allarme: `{ code, category, message, hint }`.
- Ogni movimento porta con sé il numero di riga di origine: serve per evidenziare la riga nell'editor e per gli allarmi.
- Parser e interpreter devono essere **funzioni pure** (niente DOM), così sono testabili.

## Allarmi

Intervalli di codici (vedi anche `docs/allarmi.md`):

| Codici | Categoria |
|---|---|
| 1000–1999 | Sintassi |
| 2000–2999 | Parametri mancanti (F, S/M03, T) |
| 3000–3999 | Geometria e limiti (fine corsa, archi incoerenti, profondità) |
| 4000–4999 | Collisioni (G00 nel materiale, portautensile/mandrino) |

- Un nuovo allarme va **aggiunto in fondo al suo intervallo**, mai rinumerare quelli esistenti.
- Ogni nuovo allarme va documentato in `docs/allarmi.md` e coperto da almeno un test.
- Un allarme ferma l'esecuzione e indica la riga; non tentare di "indovinare" cosa intendesse lo studente.

## Stile del codice

- 2 spazi, punto e virgola, apici singoli, LF (vedi `.editorconfig` e `.gitattributes`)
- File piccoli e con un solo compito: aiuta anche a ridurre i conflitti
- Non riformattare o rinominare codice che non riguarda il compito richiesto
- Le unità interne sono sempre **millimetri e minuti** (G20 viene convertito in ingresso)

## Versioni

- SemVer. Il numero di versione sta **solo** in `js/version.js`.
- Cambia la versione solo quando te lo chiede esplicitamente un docente, insieme al tag `vX.Y.Z`.

## Lavoro su `main` e gestione dei conflitti

Tutti lavorano direttamente su `main`. Quando esegui operazioni git:

### Prima di modificare
1. `git status`: se ci sono modifiche locali non tue o non committate, chiedi prima di procedere.
2. `git pull --rebase` per partire dalla versione più recente.

### Commit
- Commit piccoli, uno per modifica logica, messaggio in italiano all'imperativo: `Aggiunge allarme 2001 per G01 senza avanzamento`.
- Non committare file generati, file personali o configurazioni dell'editor.
- Prima di ogni commit apri o fai girare i test (`tests/`) se hai toccato parser, interpreter o machines.

### Push
Ricorda: ogni push su `main` va online su GitHub Pages.
1. `git pull --rebase` subito prima del push.
2. Se il rebase va a buon fine, riprova i test e controlla che `index.html` si carichi senza errori nella console, poi `git push`.
3. Se il push viene rifiutato perché qualcuno ha appena pubblicato, ripeti dal punto 1. Mai `--force`.

### Se c'è un conflitto
Risolvi tu il conflitto, seguendo questa procedura:

1. Elenca i file in conflitto (`git status`) e, per ciascuno, leggi **entrambe** le versioni e i commit che le hanno introdotte (`git log -p` sul file) per capire l'intento di ognuna.
2. **Il lavoro degli altri non va mai scartato.** L'obiettivo è una versione che contenga entrambe le modifiche.
   - Aggiunte indipendenti (nuovi allarmi, nuovi codici G, nuove funzioni, nuove voci in un elenco): tienile entrambe. Se due allarmi nuovi hanno preso lo stesso codice, mantieni il codice di quello già su `main` e assegna al tuo il successivo libero, aggiornando anche test e `docs/allarmi.md`.
   - Modifiche alla stessa logica: fondi le due versioni in modo che entrambi i comportamenti restino validi.
   - Se le due modifiche sono davvero incompatibili (comportamenti opposti, scelte di progetto diverse): **fermati e chiedi**, mostrando le due versioni e una proposta. Non scegliere da solo.
3. Rimuovi tutti i marcatori `<<<<<<<`, `=======`, `>>>>>>>` e verifica che non ne restino (`git diff --check`, ricerca nel progetto).
4. Riprova i test, poi `git add` e `git rebase --continue`.
5. Alla fine riassumi all'utente: quali file erano in conflitto, cosa aveva cambiato ciascuno, come li hai uniti.

Se il rebase diventa confuso, `git rebase --abort` riporta tutto allo stato precedente: usalo piuttosto che forzare.

### Cose da non fare mai
- `git push --force` / `--force-with-lease` su `main`
- `git reset --hard` o `git checkout -- .` su modifiche non tue senza chiedere
- Riscrivere la storia già pubblicata (amend o rebase di commit già su `origin/main`)
- Cambiare la struttura delle cartelle o le convenzioni di questo file senza l'accordo dei docenti
