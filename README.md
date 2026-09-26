# Toleranza0 — Simulatore CNC didattico

Simulatore CNC che gira nel browser: lo studente scrive un programma ISO (Fanuc), preme **Avvia** e vede l'utensile togliere il materiale. La riga in esecuzione è evidenziata e, se c'è un errore, il programma si ferma con un allarme che spiega cosa è successo.

Così si provano i programmi **senza occupare la macchina e senza rischiare utensili**.

## Obiettivi

- **Editor** di testo per il programma CNC, con numeri di riga e apertura/salvataggio di file `.nc` / `.txt`
- **Simulazione grafica** dell'asportazione del materiale:
  - **Tornio 2 assi (X/Z)**: prima versione, vista 2D del profilo
  - **Fresa 3 assi (X/Y/Z)**: vista 3D (Three.js), dalla v0.5
- **Esecuzione controllata**: avvio, pausa, blocco singolo (riga per riga), reset, regolazione velocità
- **Riga in esecuzione evidenziata** nell'editor, sincronizzata con la grafica
- **Allarmi** con codice, riga e spiegazione in italiano pensata per gli studenti
- **Nessuna installazione**: basta un browser (PC del laboratorio, da casa, tablet)

## Utilizzo (studenti)

1. Aprire la pagina del simulatore (pubblicata su GitHub Pages: `https://daviderobrtoalovisi.github.io/toleranza0/`)
2. Scrivere il programma o caricarne uno da **Esempi…**; gli errori di sintassi compaiono già mentre si scrive
3. Impostare il grezzo (Ø, sporgenza dal mandrino, sovrametallo sulla faccia) sopra la simulazione, oppure scrivere nel programma un commento come `(GREZZO D50 L80)`
4. Premere **Avvia** oppure **Blocco singolo**; con **Velocità** si sceglie quante volte più veloce della macchina vera (da ×1 a ×500)
5. Se compare un allarme: leggere il messaggio, correggere la riga indicata e premere **Reset**

Il menu **Modello**, accanto a **Macchina**, permette di scegliere una macchina reale (DMG MORI, Haas, Mazak, Okuma, DN Solutions, EMCO): il simulatore usa i suoi giri, rapidi e corse, e la scheda **Macchina** sotto la simulazione mostra i dati con la fonte e dice se il suo controllo accetta la programmazione ISO. Nel menu **Linguaggio** si sceglie **Fanuc ISO** oppure **Siemens SINUMERIK** (movimenti, utensili, avanzamenti, archi, compensazione cicli di foratura `CYCLE81`/`82`/`83` con `MCALL` sgrossatura `CYCLE95`, gole `CYCLE93`, tasche `POCKET3`/`POCKET4` e spianatura `CYCLE71`; filettature e contornature non ancora): vedi [`docs/siemens.md`](docs/siemens.md).

Il pulsante **Guida** (o F1) spiega come si usa il simulatore ed elenca codici G/M e allarmi della macchina scelta. Scorciatoie: **Ctrl+Invio** avvia, **Esc** mette in pausa, **Ctrl+S** salva.

Nella simulazione il tratteggio rosso è il rapido G00, il blu la lavorazione. L'**anteprima percorso** mostra in chiaro tutto il percorso prima di eseguirlo. Rotella del mouse = zoom, trascinamento = spostamento, doppio clic = adatta la vista. In alto a destra si leggono le quote X (in diametro) e Z, l'utensile, i giri, l'avanzamento e il tempo ciclo. Il menu **Utensili e correttori** elenca gli utensili in torretta (T01 sgrossatore, T02 troncatore, T03 finitore) con la passata massima di ciascuno. Lì si imposta anche l'usura dei correttori: se il pezzo esce Ø42,10 invece di 42,00, si mette usura X −0.1 e si riesegue, come sulla macchina.

**Fresa.** Si sceglie in alto a destra, in **Macchina**. Il grezzo si imposta con lunghezza X, larghezza Y, altezza Z, sovrametallo sopra e posizione dello zero (angolo o centro), oppure con `(GREZZO X100 Y80 Z30)` nel programma. La vista è in 3D: si ruota trascinando con il tasto sinistro, si sposta con il destro, si ingrandisce con la rotella; doppio clic = adatta la vista. Dopo ogni cambio utensile (`T1 M06`) serve `G43 H1` prima di muovere Z. La vista 3D usa Three.js scaricato da Internet: senza connessione la fresa non si apre, il tornio funziona lo stesso.

## Guida per studenti

Per chi comincia — e per chi non ha mai visto un CNC — c'è [`docs/guida-studenti.md`](docs/guida-studenti.md): che cos'è il simulatore, i comandi, le idee di base (coordinate, rapido e lavoro, giri e avanzamento, grezzo e utensili, a che servono gli allarmi), sei **esercizi guidati** con il metodo *Prevedi · Osserva · Spiega* costruiti sugli esempi del menu **Esempi…**, e un glossario finale.

È pensata per essere stampata o proiettata: si può assegnare per casa, usare in laboratorio come traccia, o dare a un supplente che non conosce il simulatore. Le soluzioni degli esercizi restano in [`docs/esercitazioni.md`](docs/esercitazioni.md), riservato ai docenti.

Dentro il simulatore, il pulsante **Guida** (F1) ha una scheda **In parole semplici** con la versione breve degli stessi contenuti.

## Linguaggio supportato: ISO / Fanuc

Si parte dal sottoinsieme usato a scuola; l'elenco completo e aggiornato è in [`docs/codici-supportati.md`](docs/codici-supportati.md).

Il tornio segue il **Fanuc sistema A**, il più diffuso nelle scuole: X in diametro, X/Z assolute e U/W incrementali.

| Gruppo | Tornio (Fanuc sistema A) | Fresa (Fanuc serie M) |
|---|---|---|
| Movimenti | G00, G01, G02, G03, G04 | G00–G04, archi nei piani G17/G18/G19 anche elicoidali |
| Quote | X/Z assolute, U/W incrementali, G20/G21 | G90/G91, G20/G21 |
| Avanzamento / velocità | G98/G99, G96/G97, G50 (limite giri) | G94 (mm/min), S, F |
| Origini | G54–G59, G28 | G54–G59, G28 |
| Utensile | T0101 con correttori, G40/G41/G42 | T1 M06, G43 H / G49, G41/G42 D / G40 |
| Cicli | G71 sgrossatura, G70 finitura; G72, G76, G90, G94 più avanti | G81, G82, G83, G80, G98/G99 |
| Funzioni M | M00, M01, M02, M03, M04, M05, M08, M09, M30 | come il tornio + M06 |

## Allarmi

Ogni allarme ha un codice numerico, la riga incriminata e un messaggio in italiano. Catalogo completo: [`docs/allarmi.md`](docs/allarmi.md).

| Codici | Categoria | Esempi |
|---|---|---|
| 1000–1999 | Sintassi | codice G/M sconosciuto, indirizzo senza valore, numero non valido |
| 2000–2999 | Parametri mancanti | G01 senza F, movimento di lavoro con mandrino fermo, nessun utensile chiamato |
| 3000–3999 | Geometria e limiti | arco G02/G03 impossibile o incoerente, fuori corsa, passata troppo profonda |
| 4000–4999 | Collisioni | G00 dentro il materiale, utensile o portautensile contro il mandrino o il pezzo |

## Struttura del progetto

```
index.html              pagina principale
css/                    stili
js/
  main.js               collega interfaccia, interprete e grafica
  version.js            numero di versione
  parser/               lettura del testo ISO -> blocchi
  interpreter/          stato modale della macchina -> lista di movimenti con tempi
  alarms/               catalogo e gestione degli allarmi
  machines/lathe/       dati del tornio, utensili, grezzo, asportazione e collisioni
  machines/mill/        dati della fresa, utensili, grezzo a mappa di altezze, morsa e collisioni
  render/               disegno su canvas (2D) e Three.js (3D)
  ui/                   editor, pulsanti, pannelli
examples/               programmi di esempio (.nc) per le esercitazioni
tests/                  test nel browser (aprire tests/index.html)
tools/serve.py          server locale in Python che imita GitHub Pages
docs/                   guida per studenti, codici supportati, allarmi, esercitazioni, configurazione delle macchine
```

## Per i docenti

- [Esercitazioni](docs/esercitazioni.md): esercizi "trova l'errore" con soluzioni e tracce da disegno
- [Configurare le macchine del laboratorio](docs/configurare-le-macchine.md): dove inserire corse, giri, mandrino, morsa e utensili reali, e come aggiungere un modello al database
- [Codici supportati](docs/codici-supportati.md), [linguaggio Siemens](docs/siemens.md) e [catalogo allarmi](docs/allarmi.md)

## Sviluppo (docenti)

Nessuno strumento di build: HTML, CSS e JavaScript puro con moduli ES. Three.js viene caricato da CDN.

I moduli ES non funzionano aprendo il file con doppio clic, quindi per provare in locale serve un piccolo server. Usiamo **Python 3** (da [python.org](https://www.python.org/downloads/) o dal Microsoft Store). Dalla cartella del progetto:

```bash
python tools/serve.py
```

Poi aprire:

- simulatore: `http://localhost:8000/toleranza0/`
- test: `http://localhost:8000/toleranza0/tests/`

`tools/serve.py` imita GitHub Pages: il sito sta in `/toleranza0/` e i nomi dei file distinguono maiuscole e minuscole. Se una cosa funziona qui, funzionerà anche online; un percorso assoluto o un nome con la maiuscola sbagliata dà errore 404 già in locale. Per fermare il server: `Ctrl+C`. Per usare un'altra porta: `python tools/serve.py 8080`.

Evitate `python -m http.server`: serve il sito dalla radice e non distingue le maiuscole, quindi nasconde proprio gli errori che poi rompono il sito su GitHub Pages.

## Pubblicazione su GitHub Pages

Il simulatore è pubblicato su **https://daviderobrtoalovisi.github.io/toleranza0/**.

Attivazione (una volta sola, a cura del proprietario del repository): *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, cartella `/ (root)` → Save*.

Dopo l'attivazione **ogni push su `main` viene pubblicato automaticamente** entro pochi minuti, quindi:

- su `main` va solo codice che funziona: prima di ogni push i test devono passare e la pagina deve aprirsi senza errori
- nel codice si usano solo **percorsi relativi** (`js/main.js`, non `/js/main.js`), perché il sito sta nella sottocartella `/toleranza0/`
- nomi di file **tutti in minuscolo**: il server di GitHub distingue maiuscole e minuscole, Windows no
- il file `.nojekyll` nella radice non va cancellato
- niente dati riservati nel repository: è pubblico

Se dopo un aggiornamento si vede ancora la versione vecchia, ricaricare con **Ctrl+F5**. Il numero di versione è visibile nell'interfaccia.

## Lavorare insieme su `main`

Lavoriamo tutti direttamente su `main`, quindi seguiamo queste regole per evitare conflitti:

1. **Prima di iniziare**: `git pull`
2. **Commit piccoli e frequenti**, uno per modifica logica
3. **Prima di ogni push**: `git pull` di nuovo, poi riprovare i test, poi `git push`
4. **Dichiarare su cosa si lavora**: aprire o assegnarsi una *Issue* su GitHub prima di iniziare, per non toccare in due lo stesso file
5. **Mai** `git push --force` su `main`
6. **Niente riformattazioni di massa** (indentazione, rinomina di file) senza avvisare gli altri

Configurazione una tantum consigliata (ogni PC):

```bash
git config --global pull.rebase true
```

```bash
git config --global rebase.autoStash true
```

In caso di conflitto potete chiedere a Claude Code di risolverlo: la procedura che segue è descritta in [`CLAUDE.md`](CLAUDE.md).

## Versioni

Usiamo il [Semantic Versioning](https://semver.org/lang/it/): `MAGGIORE.MINORE.CORREZIONE`. Il numero è in `js/version.js` e ogni rilascio ha un tag git (`v0.1.0`, ...).

## Tabella di marcia

- [x] **v0.1** — Editor, parser ISO, evidenziazione riga, allarmi di sintassi
- [x] **v0.2** — Tornio: grezzo, utensili, simulazione 2D dell'asportazione (G00/G01/G02/G03), tempo ciclo, prime collisioni
- [x] **v0.3** — Tornio: fine corsa, profondità di passata, portautensile contro il pezzo, G96 senza G50, correttori utensile
- [ ] Dati del tornio del laboratorio (corse, giri, rapido, utensili reali) al posto dei valori tipici
- [x] **v0.4** — Tornio: cicli G71/G70, compensazione del raggio di punta G41/G42
- [x] **v0.5** — Fresa 3 assi: vista 3D, G90/G91, archi anche elicoidali, T/M06/G43, cicli G81/G82/G83, morsa
- [x] **v0.6** — Fresa: compensazione raggio G41/G42 con D, piani G18/G19
- [x] **v1.0** — Versione stabile per la classe: guida nella pagina, esercitazioni con guida per il docente, test di robustezza
- [x] **v1.1** — Database delle macchine utensili
- [x] **v1.2** — Linguaggio Siemens SINUMERIK, fase 1
- [x] **v1.3** — Siemens fase 2: cicli di foratura `CYCLE81`/`82`/`83` e `MCALL`
- [x] **v1.4** — Siemens: sgrossatura e finitura `CYCLE95`
- [x] **v1.5** — Siemens: gole `CYCLE93`
- [x] **v1.6** — Siemens: tasche `POCKET3` e `POCKET4`
- [x] **v1.7** — Siemens: spianatura `CYCLE71`
- [ ] Siemens: contornatura `CYCLE72`, filettatura `CYCLE97`
- [ ] Dati reali delle macchine del laboratorio (vedi [`docs/configurare-le-macchine.md`](docs/configurare-le-macchine.md))

Le novità di ogni versione sono in [`CHANGELOG.md`](CHANGELOG.md).

## Licenza

Da definire (proposta: MIT per il codice, CC BY-SA per il materiale didattico).
