# Guida per studenti

**Toleranza0 — il simulatore CNC che gira nel browser**
Programmi tornio e fresa, premi Avvia e guardi nascere il pezzo. Senza occupare la macchina, senza rompere utensili.

---

## Che cos'è

È una macchina utensile finta, che funziona dentro un browser (Chrome, Edge, Firefox, Safari). Tu scrivi il programma — l'elenco di ordini che sulla macchina vera si scrive al controllo numerico — e il simulatore lo esegue davanti a te: l'utensile si muove, il materiale sparisce, il pezzo prende forma.

Se sbagli, il programma si ferma e ti dice che cosa non va e in quale riga. **Sbagliare qui non costa nulla**: nessun pezzo buttato, nessun utensile rotto, nessuna macchina ferma.

**Come si apre:** [daviderobrtoalovisi.github.io/toleranza0](https://daviderobrtoalovisi.github.io/toleranza0/) — da qualsiasi computer o telefono, anche da casa. Non c'è niente da installare.

## Come usare questa guida

Gli esercizi dell'ultima parte seguono tre passi, gli stessi che usa chi lavora in officina:

| | | |
|---|---|---|
| **1. Prevedi** | Prima di premere Avvia, di' cosa pensi che succederà. | Anche se non sei sicuro. |
| **2. Osserva** | Esegui e guarda con attenzione cosa fa la macchina. | Usa **Blocco singolo** per andare piano. |
| **3. Spiega** | Avevi indovinato? Se no, perché? | È qui che impari davvero. |

Prevedere e sbagliare non è un errore: è il modo più rapido per accorgersi di cosa non si era capito.

**Contenuto:** i comandi (§1) · le idee del CNC (§2) · esercizi guidati (§3) · parole da sapere (§4)

---

## 1. I comandi

### Lo schermo

| Riquadro | Che cosa contiene |
|---|---|
| **Programma** | Le istruzioni, una per riga, numerate. Quella in esecuzione resta illuminata. |
| **Simulazione** | Il pezzo mentre viene lavorato, con le quote in alto a destra e il tempo ciclo. |
| **Blocco corrente** | La riga di adesso spiegata parola per parola: comodissima quando non ricordi un codice. |
| **Allarmi** | Se qualcosa non va: che cosa, in quale riga, e come rimediare. |

Sul telefono i quattro riquadri diventano quattro schede: si tocca quella che serve.

### I pulsanti

| Pulsante | A cosa serve |
|---|---|
| **Avvia** | Esegue il programma dall'inizio alla fine. |
| **Pausa** | Ferma l'esecuzione; premendo Avvia riprende da dove era. |
| **Blocco singolo** | Esegue **una riga alla volta**: premi di nuovo per la riga dopo. Il modo migliore per capire. |
| **Reset** | Riporta tutto all'inizio, col grezzo intero. Si usa dopo un allarme. |
| **Velocità** | Quante volte più veloce della macchina vera (da ×1 a ×500). A ×1 il tempo è quello reale. |
| **Anteprima percorso** | Mostra in chiaro tutto il percorso dell'utensile prima ancora di eseguirlo. |
| **Esempi…** | Programmi già pronti: il modo più rapido per cominciare. |
| **Nuovo / Apri… / Salva** | Il programma resta sul tuo computer: **Salva** lo scarica, **Apri** lo ricarica. |
| **Guida** | Come si usa, i codici della macchina scelta e tutti gli allarmi. |

In alto si scelgono **Macchina** (tornio o fresa), **Linguaggio** (Fanuc ISO o Siemens) e **Modello**, cioè una macchina reale con i suoi giri e le sue corse.

### Con il mouse e con le dita

| Gesto | Che cosa fa |
|---|---|
| Rotella | Ingrandisce e rimpicciolisce il disegno. |
| Trascinamento | Sposta la vista. Sulla fresa, col tasto sinistro, ruota la scena in 3D. |
| Doppio clic sul disegno | Adatta la vista al pezzo (come il pulsante **Adatta vista**). |
| Due dita sul telefono | Ingrandiscono, come la rotella. |

### Con la tastiera

**Ctrl + Invio** avvia · **Esc** mette in pausa · **Ctrl + S** salva il programma · **F1** apre la guida

> **Un consiglio.** Se ti perdi, premi **Reset** e riparti: il grezzo torna intero e non hai combinato niente di male.

---

## 2. Le idee del CNC

### Il programma è un elenco di ordini

Ogni riga dice una cosa sola, e la macchina le esegue nell'ordine. Una riga si chiama **blocco** (ecco perché il pulsante si chiama *Blocco singolo*).

```
N50 G00 X52 Z0 M08
```

Letta a voce: «blocco numero 50: spostati in rapido (`G00`) fino al diametro 52 e alla faccia Z0, e accendi il refrigerante (`M08`)». Le lettere hanno sempre lo stesso significato: `G` sono i modi di muoversi, `M` i comandi alla macchina, `X` `Y` `Z` le posizioni, `F` l'avanzamento, `S` i giri, `T` l'utensile.

Le righe fra parentesi sono **commenti**: servono a chi legge, la macchina le ignora.

### Dove si trova l'utensile: le coordinate

Sul **tornio** bastano due numeri: `Z` è la posizione lungo l'asse del pezzo (`Z0` è la faccia finita, i valori negativi entrano nel pezzo) e `X` è **il diametro**, non il raggio. `X42` significa «porta l'utensile dove il pezzo resta Ø42».

Sulla **fresa** i numeri sono tre: `X` e `Y` sul piano, `Z` in altezza, con `Z0` sulla faccia superiore. Sopra il pezzo la quota è positiva, dentro il pezzo negativa.

### Rapido e lavoro: i due colori

| Codice | Come si muove | Nel disegno |
|---|---|---|
| `G00` | **Rapido**: alla massima velocità, per avvicinarsi. Non deve mai toccare il materiale. | tratteggio **rosso** |
| `G01` | **In lavoro**: alla velocità di avanzamento che hai scelto, e taglia. | linea **azzurra** |

Confondere i due è l'errore classico, e sulla macchina vera si paga con un utensile rotto. Nel simulatore scatta l'allarme 4001.

### Giri e avanzamento

- `S` sono i **giri del mandrino**, `M03` lo fa partire. Sul tornio si usa spesso `G96 S180`: significa «mantieni la velocità di taglio a 180 m/min», così quando il diametro cala i giri salgono. Proprio per questo serve un limite, `G50 S2000`, altrimenti vicino al centro la macchina impazzirebbe.
- `F` è l'**avanzamento**: quanto avanza l'utensile mentre taglia. Sul tornio con `G99` è in millimetri **per giro** (`F0.25`), sulla fresa in millimetri **al minuto** (`F600`).

### Il grezzo e gli utensili

Il **grezzo** è il pezzo di metallo di partenza: sul tornio un cilindro (Ø e lunghezza), sulla fresa un parallelepipedo. Si imposta sopra la simulazione, oppure si scrive nel programma: `(GREZZO D50 L80)`.

Gli utensili stanno in torretta: sul tornio `T0101` chiama l'utensile 1 col suo correttore. Ognuno ha una **passata massima**: se gliene chiedi di più, il simulatore ferma tutto (allarme 3005) come farebbe un capo officina attento.

### Gli allarmi non sono guasti

Sono il modo in cui la macchina ti dice che qualcosa non torna. Ogni allarme ha un numero, e il numero dice già di che famiglia si tratta:

| Numeri | Di che si tratta | Esempio |
|---|---|---|
| 1000 | Come è scritto il programma | una lettera che non esiste |
| 2000 | Manca qualcosa | avanzamento non impostato, utensile non chiamato |
| 3000 | Geometria e limiti | passata troppo profonda, fuori corsa |
| 4000 | Collisioni | rapido dentro il materiale, utensile contro il mandrino o la morsa |

> **Idea chiave.** Cambia **una cosa alla volta** e riprova. Se ne cambi tre insieme e il risultato migliora, non saprai quale delle tre ha funzionato.

---

## 3. Esercizi guidati

Ogni esercizio si apre dal menu **Esempi…**. Rispondi a *Prevedi* **prima** di premere Avvia.

### A · Rapido o lavoro?

**Prepara** — Apri *Esercizio — Perché si rompe l'utensile?* e leggilo senza eseguirlo.

**Prevedi** — Che cosa succederà?

- [ ] il programma arriva alla fine
- [ ] la macchina si ferma con un allarme
- [ ] il pezzo viene sbagliato ma il programma finisce

**Osserva** — Esegui con **Blocco singolo** e guarda dove si ferma. Leggi il numero dell'allarme e la riga.

**Spiega** — Che cosa sarebbe successo sulla macchina vera, alla velocità di un rapido? Correggi la riga e riesegui.

### B · Quanto materiale in una volta?

**Prepara** — Apri *Esercizio — Troppo materiale in una volta*. Il grezzo è Ø50 e il programma vuole arrivare a Ø40 in una sola passata.

**Prevedi** — Quanti millimetri di materiale toglie l'utensile per ogni lato?

- [ ] 10 mm
- [ ] 5 mm
- [ ] 2,5 mm

**Osserva** — Esegui. Poi apri **Utensili e correttori** sotto la simulazione e guarda la passata massima di T01.

**Spiega** — Riscrivi la lavorazione in due passate. Di quanto è cambiato il tempo ciclo (in alto a destra)?

### C · Perché la macchina non parte?

**Prepara** — Apri *Esercizio — Perché la macchina non parte?*

**Prevedi** — Il programma usa `G96`. Secondo te che cosa manca?

**Osserva** — Esegui e leggi il suggerimento dell'allarme.

**Spiega** — Con `G96` i giri salgono man mano che il diametro cala. Che cosa succederebbe, senza limite, quando l'utensile arriva vicino al centro del pezzo?

### D · Trova gli errori

**Prepara** — Apri *Esercizio — Trova gli errori*: contiene dieci errori di scrittura, uno per riga.

**Osserva** — Esegui, correggi il primo errore, riesegui. Avanti così finché arrivi a *Fine programma*.

**Spiega** — Quale errore ti ha fatto perdere più tempo? Come avresti potuto accorgertene leggendo, senza eseguire?

### E · Dopo il cambio utensile *(fresa)*

**Prepara** — In alto scegli **Fresa 3 assi**, poi apri *Esercizio fresa — Cosa manca dopo il cambio utensile?*

**Prevedi** — Dopo `T3 M06` manca una riga. Che cosa deve sapere la macchina, prima di muovere Z con un utensile nuovo?

**Osserva** — Esegui e leggi l'allarme.

**Spiega** — Ogni utensile ha la sua lunghezza. Se la macchina non la conosce, di quanto sbaglia la profondità?

### F · Attenzione alla morsa *(fresa)*

**Prepara** — Apri *Esercizio fresa — Attenzione alla morsa*.

**Prevedi** — La fresa scende a Z−12 accanto al pezzo. Che cosa trova?

**Osserva** — Esegui e guarda la vista 3D: ruotala col mouse per vedere le ganasce.

**Spiega** — Di quanto deve sporgere il pezzo dalla morsa per lavorarlo in sicurezza fino a quella profondità?

### Sfida libera

Scrivi da zero il programma di un perno a gradini: grezzo Ø40 lungo 70, da portare a Ø36 per 50 mm e Ø30 per 30 mm, con uno smusso 1×45°. Provalo nel simulatore finché non arriva a fine programma senza allarmi — poi confronta il tuo tempo ciclo con quello dei compagni.

---

## 4. Parole da sapere

**Blocco** — Una riga del programma.

**Grezzo** — Il pezzo di metallo di partenza, prima della lavorazione.

**Utensile** — La parte tagliente che asporta il materiale. Ogni lavorazione ha il suo: sgrossatore, finitore, troncatore, punta, fresa.

**Mandrino** — La parte che gira: sul tornio fa girare il pezzo, sulla fresa l'utensile.

**Avanzamento (F)** — Quanto avanza l'utensile mentre taglia: al giro sul tornio, al minuto sulla fresa.

**Velocità di taglio** — Quanto scorre veloce il tagliente sul materiale, in metri al minuto. Con `G96` la macchina la tiene costante cambiando i giri.

**Rapido (G00)** — Spostamento alla massima velocità, solo in aria.

**Passata** — Quanto materiale si toglie in un solo giro di lavorazione. Troppa passata rompe l'utensile.

**Sovrametallo** — Il materiale lasciato apposta da togliere dopo, con la finitura.

**Correttore** — I millimetri di correzione applicati a un utensile, per esempio quando si è consumato: se il pezzo esce Ø42,10 invece di 42,00 si mette usura X −0,1 e si riesegue.

**Tempo ciclo** — Quanto durerebbe la lavorazione sulla macchina vera: si legge in alto a destra nella simulazione.

**Allarme** — Non è un guasto: è la macchina che si ferma e ti dice dove hai sbagliato.

---

*Se una parola non è qui e non l'hai capita, chiedila: vuol dire che manca in questa guida.*
