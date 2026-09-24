# CLAUDE.md — istruzioni per Claude Code

## Contesto

Toleranza0 è un simulatore CNC didattico per studenti. Programma ISO/Fanuc in un editor di testo → simulazione grafica dell'asportazione, riga in esecuzione evidenziata, allarmi in italiano. Vedi `README.md` per obiettivi e tabella di marcia.

- Prima il **tornio 2 assi (X/Z, vista 2D su canvas)**, poi la **fresa 3 assi (X/Y/Z, Three.js)**
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
- `js/ui/run-controller.js` — esecuzione blocco per blocco (avvio, pausa, blocco singolo, reset, M00/M01/M30). Dalla v0.2 riceverà i movimenti dall'interprete.
- `js/interpreter/` — mantiene lo stato modale (G00/G01, G90/G91, unità, F, S, utensile, mandrino) e produce movimenti `{ line, type, from, to, feed, ... }`. Comune a tornio e fresa dove possibile.
- `js/machines/lathe/`, `js/machines/mill/` — geometria del grezzo, utensili, calcolo dell'asportazione, controlli di collisione e fine corsa.
- `js/render/` — solo disegno. Non contiene logica CNC.
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
