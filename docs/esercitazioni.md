# Esercitazioni — guida per il docente

Questa pagina contiene le **soluzioni**: è pensata per i docenti. Agli studenti basta il menu **Esempi…** del simulatore.

Due tipi di esercizio:

1. **Trova l'errore**: un programma già scritto che contiene uno sbaglio tipico. Lo studente lo esegue, legge l'allarme, capisce cosa succederebbe sulla macchina vera e corregge.
2. **Dal disegno al programma**: lo studente scrive il programma partendo da una quota o da un disegno, e lo prova nel simulatore prima di andare in macchina.

## 1. Trova l'errore

Ogni esercizio è in `examples/` e i test controllano che dia proprio l'allarme indicato: se qualcuno modifica il simulatore e l'esercizio smette di funzionare, i test falliscono.

### Tornio

| Esempio | Cosa succede | Allarme | Correzione | Cosa si impara |
|---|---|---|---|---|
| *Trova gli errori* (`esercizio-trova-errori.nc`) | 10 errori di scrittura, uno per riga | 1002, 1003, 1005, 1006, 1007, 1008, 1009, 1010, 1012 | una riga alla volta, seguendo i suggerimenti | leggere un programma ISO con attenzione |
| *Perché si rompe l'utensile?* (`esercizio-collisione.nc`) | `N110 G00 Z-30`: rapido dentro il pezzo | 4001 alla riga 14 | `G01 Z-30` | G00 solo in aria, G01 per tagliare |
| *Perché la macchina non parte?* (`esercizio-tornio-g96.nc`) | G96 senza limite di giri | 2005 alla riga 6 | `G50 S2000` prima di `G96` | con G96 i giri salgono quando il diametro cala |
| *Troppo materiale in una volta* (`esercizio-tornio-passata.nc`) | da Ø50 a Ø40 in una passata: 5 mm per lato | 3005 alla riga 11 | due passate: `X45` e poi `X40` | profondità di passata e limiti dell'utensile |

### Fresa

| Esempio | Cosa succede | Allarme | Correzione | Cosa si impara |
|---|---|---|---|---|
| *Cosa manca dopo il cambio utensile?* (`esercizio-fresa-g43.nc`) | dopo `T3 M06` manca la correzione di lunghezza | 2008 alla riga 18 | `G43 H3 Z50` dopo `T3 M06` | ogni utensile ha la sua lunghezza |
| *La fresa piccola non ce la fa* (`esercizio-fresa-passata.nc`) | fresa Ø6 con 5 mm di materiale in una passata | 3005 alla riga 11 | due passate da 2,5 mm oppure la fresa Ø10 | passata massima in funzione del diametro |
| *Si può fresare con la punta?* (`esercizio-fresa-punta.nc`) | la punta scende e poi si sposta di lato | 3008 alla riga 11 | risalire (`G00 Z2`) e usare una fresa | la punta taglia solo lungo il suo asse |
| *Attenzione alla morsa* (`esercizio-fresa-morsa.nc`) | discesa a Z-12 accanto al pezzo, sopra le ganasce | 4004 alla riga 10 | lavorare solo la parte che sporge (qui Z > -9) o cambiare il bloccaggio | il pezzo sporge dalla morsa solo di pochi millimetri |

### Proposta di svolgimento (20–30 minuti)

1. Lo studente apre l'esercizio da **Esempi…** e lo legge **senza eseguirlo**: prova a trovare l'errore da solo.
2. Esegue con **Blocco singolo** e osserva cosa succede prima dell'allarme.
3. Legge messaggio e suggerimento, corregge, riesegue fino a **Fine programma**.
4. Scrive in due righe cosa sarebbe successo sulla macchina vera.

## 2. Dal disegno al programma

Tracce da assegnare. Il grezzo si imposta con la riga indicata, da copiare in cima al programma.

### Tornio

**T1 — Perno a gradini** `(GREZZO D40 L70)`
Sfacciare, poi cilindrare Ø36 per 50 mm, Ø30 per 30 mm, Ø24 per 15 mm. Smusso 1×45° sullo spigolo di Ø24. Passate massime 2 mm per lato con T01.
*Da controllare:* nessun allarme 3005; con **Blocco singolo** verificare ogni diametro sulle quote X.

**T2 — Lo stesso perno con G71** `(GREZZO D40 L70)`
Rifare T1 con `G71` (sgrossatura) e `G70` con `G42` (finitura con T03). Confrontare il tempo ciclo con quello di T1: si legge in alto a destra.

**T3 — Raccordi** `(GREZZO D40 L60)`
Ø20 per 15 mm con raggio concavo R2 verso lo spallamento Ø30 e raggio convesso R3 sullo spigolo di Ø30. Prima senza `G42`, poi con `G42`: confrontare la vista in sezione (con la rotella si ingrandisce il raccordo).

**T4 — Gola** `(GREZZO D40 L60)`
Gola larga 6 mm con fondo a Ø30, tra Z-20 e Z-26, con il troncatore T02 (riferimento sullo spigolo destro). *Da controllare:* il troncatore è largo 3 mm, quindi servono due passate.

### Fresa

**F1 — Spianatura e contorno** `(GREZZO X100 Y80 Z30)`
Spianare la faccia (sovrametallo 1 mm), poi contornare un rettangolo 90×70 centrato sul grezzo, profondo 4 mm, con `G41 D1`. *Da controllare:* la discesa in Z va fatta fuori dal pezzo.

**F2 — Tasca rettangolare** `(GREZZO X100 Y80 Z30 CENTRO)`
Tasca 40×30 profonda 4 mm al centro del pezzo con la fresa Ø10: passate a zig-zag interne più una passata di contorno. *Da controllare:* passate da 2 mm in Z, allarme 3005 se se ne fa una sola.

**F3 — Piastra forata** `(GREZZO X100 Y80 Z30)`
Quattro fori Ø8 passanti a 10 mm dai bordi con `G83` (Q5), poi un foro centrale profondo 15 mm con `G81`. *Da controllare:* G98 o G99 tra un foro e l'altro, cosa cambia nel percorso.

**F4 — Scanalatura curva** `(GREZZO X100 Y80 Z30 CENTRO S0)`
Cava ad arco R30 da 0° a 180° con la fresa Ø6, profonda 2 mm, con `G02`/`G03` e `R` oppure `I`/`J`. Provare a sbagliare apposta il centro: allarme 3002.

## Aggiungere un esercizio

1. Salvare il programma in `examples/` con un nome che inizia per `esercizio-` (solo minuscole e trattini).
2. Aggiungerlo in `examples/index.json` con la macchina (`"lathe"` o `"mill"`) e un titolo che sia una domanda.
3. Aggiungere in `tests/examples.test.js`, nella tabella `EXPECTED`, l'allarme atteso e la sua riga: un esercizio senza errore atteso fa fallire i test.
4. Aggiungere una riga alle tabelle di questa pagina.
