# Toleranza0 — Simulatore CNC didattico

Simulatore CNC che gira nel browser: lo studente scrive un programma ISO (Fanuc), preme **Avvia** e vede l'utensile togliere il materiale. La riga in esecuzione è evidenziata e, se c'è un errore, il programma si ferma con un allarme che spiega cosa è successo.

Così si provano i programmi **senza occupare la macchina e senza rischiare utensili**.

## Obiettivi

- **Editor** di testo per il programma CNC, con numeri di riga e apertura/salvataggio di file `.nc` / `.txt`
- **Simulazione grafica** dell'asportazione del materiale:
  - **Tornio 2 assi (X/Z)**: prima versione, vista 2D del profilo
  - **Fresa 3 assi (X/Y/Z)**: versione successiva, vista 3D
- **Esecuzione controllata**: avvio, pausa, blocco singolo (riga per riga), reset, regolazione velocità
- **Riga in esecuzione evidenziata** nell'editor, sincronizzata con la grafica
- **Allarmi** con codice, riga e spiegazione in italiano pensata per gli studenti
- **Nessuna installazione**: basta un browser (PC del laboratorio, da casa, tablet)

## Utilizzo (studenti)

1. Aprire la pagina del simulatore (pubblicata su GitHub Pages: `https://daviderobrtoalovisi.github.io/toleranza0/`)
2. Scegliere la macchina (tornio / fresa), le dimensioni del grezzo e gli utensili
3. Scrivere il programma o caricarne uno dalla cartella `examples/`
4. Premere **Avvia** oppure **Blocco singolo**
5. Se compare un allarme: leggere il messaggio, correggere la riga indicata e premere **Reset**

## Linguaggio supportato: ISO / Fanuc

Si parte dal sottoinsieme usato a scuola; l'elenco completo e aggiornato è in [`docs/codici-supportati.md`](docs/codici-supportati.md).

| Gruppo | Tornio (v0.x) | Fresa (dopo) |
|---|---|---|
| Movimenti | G00, G01, G02, G03, G04 | come il tornio + piano G17/G18/G19 |
| Quote | G90/G91, G20/G21, U/W incrementali | G90/G91, G20/G21 |
| Avanzamento / velocità | G94/G95, G96/G97, G50 (limite giri) | G94, S, F |
| Origini | G54–G59, G28 | G54–G59, G28 |
| Utensile | Txxyy, G40/G41/G42 | Txx M06, G43 H, G40/G41/G42 D |
| Cicli | G70, G71, G76 (in una fase successiva) | G81, G83 (in una fase successiva) |
| Funzioni M | M00, M01, M03, M04, M05, M08, M09, M30 | come il tornio + M06 |

## Allarmi

Ogni allarme ha un codice numerico, la riga incriminata e un messaggio in italiano. Catalogo completo: [`docs/allarmi.md`](docs/allarmi.md).

| Codici | Categoria | Esempi |
|---|---|---|
| 1000–1999 | Sintassi | codice G/M sconosciuto, indirizzo senza valore, numero non valido |
| 2000–2999 | Parametri mancanti | G01 senza F, movimento di lavoro con mandrino fermo, nessun utensile chiamato |
| 3000–3999 | Geometria e limiti | fuori corsa assi, arco G02/G03 con raggio incoerente, passata troppo profonda |
| 4000–4999 | Collisioni | G00 dentro il materiale, portautensile o mandrino contro il pezzo |

## Struttura del progetto

```
index.html              pagina principale
css/                    stili
js/
  main.js               collega interfaccia, interprete e grafica
  version.js            numero di versione
  parser/               lettura del testo ISO -> blocchi
  interpreter/          stato modale della macchina -> lista di movimenti
  alarms/               catalogo e gestione degli allarmi
  machines/lathe/       modello del tornio e asportazione 2D
  machines/mill/        modello della fresa e asportazione 3D (fase successiva)
  render/               disegno su canvas (2D) e Three.js (3D)
  ui/                   editor, pulsanti, pannelli
examples/               programmi di esempio (.nc) per le esercitazioni
tests/                  test nel browser (aprire tests/index.html)
docs/                   codici supportati, allarmi, note didattiche
```

## Sviluppo (docenti)

Nessuno strumento di build: HTML, CSS e JavaScript puro con moduli ES. Three.js viene caricato da CDN.

Poiché i moduli ES non funzionano aprendo il file con doppio clic, per provare in locale serve un piccolo server:

- **VS Code**: estensione *Live Server* → tasto destro su `index.html` → *Open with Live Server*
- **oppure** con Python installato, dalla cartella del progetto:

```bash
python -m http.server 8000
```

  e poi aprire `http://localhost:8000`.

I test si eseguono aprendo `http://localhost:8000/tests/` nel browser.

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

- [ ] **v0.1** — Editor, parser ISO, evidenziazione riga, allarmi di sintassi
- [ ] **v0.2** — Tornio: grezzo, utensili, simulazione 2D dell'asportazione (G00/G01/G02/G03)
- [ ] **v0.3** — Tornio: tutti gli allarmi (parametri, limiti, collisioni), blocco singolo, velocità
- [ ] **v0.4** — Tornio: cicli G70/G71, compensazione raggio G41/G42
- [ ] **v0.5** — Fresa 3 assi: simulazione 3D
- [ ] **v1.0** — Versione stabile usata in classe, con esercitazioni in `examples/`

## Licenza

Da definire (proposta: MIT per il codice, CC BY-SA per il materiale didattico).
