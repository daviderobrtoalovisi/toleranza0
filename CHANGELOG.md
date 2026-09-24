# Registro delle versioni

Ogni versione ha un tag git (`vX.Y.Z`). Il numero è in `js/version.js` e si vede in alto nella pagina.

## 1.3.0 — Siemens fase 2: cicli di foratura

- Fresa in Siemens: cicli di foratura `CYCLE81`, `CYCLE82` (con sosta) e `CYCLE83` (a beccate), da soli nella posizione attuale oppure modali con `MCALL`; vengono simulati come i cicli Fanuc G81/G82/G83. Parametri mancanti: allarme 2007 con la scrittura Siemens del ciclo
- Nuovo esempio Siemens *Fresa 3* con gli stessi fori dell'esempio Fanuc (un test controlla che il pezzo sia identico)

## 1.2.0 — linguaggio Siemens SINUMERIK (fase 1)

- Menu **Linguaggio**: Fanuc ISO oppure Siemens SINUMERIK, per tornio e fresa. Il programma Siemens è tradotto nei movimenti equivalenti: stessa simulazione, stessi allarmi (con i suggerimenti in sintassi Siemens), stessa grafica. Guida in `docs/siemens.md`
- Siemens: `T1 D1`, `G95`/`G94`, `G96 … LIMS=`, `DIAMON`/`DIAMOF`, `X=IC()`, `CR=`, `G4 F`, `G74`, più M nello stesso blocco; sulla fresa `T1 M6` con la lunghezza già attiva e `G41`/`G42` con il correttore attivo. Cicli `CYCLE…` non ancora simulati (allarme 1013)
- Esempi Siemens per tornio e fresa ed esercizio su `LIMS`; un test controlla che diano lo stesso pezzo degli esempi Fanuc
- Profondità di passata del tornio misurata dal raggio di punta invece che dalla punta teorica: sui tratti obliqui con G41/G42 non segnala più passate di poco oltre il limite che in realtà non lo sono

## 1.1.0 — database delle macchine

- Database delle macchine utensili: menu **Modello** con 32 macchine reali (20 torni e 12 frese) di DMG MORI (6 torni e 2 centri di lavoro), Haas, Mazak, Okuma, DN Solutions ed EMCO, più la macchina didattica generica. Il simulatore usa giri, rapido, corse e grezzo massimo del modello scelto; una scheda mostra dati, fonte ufficiale e compatibilità del controllo con la programmazione ISO
- Corregge un caso in cui, cambiando macchina mentre si caricava un esempio, l'esempio finiva nella bozza dell'altra macchina

## 1.0.0 — prima versione stabile per la classe

- Guida dentro la pagina (pulsante **Guida** o F1): uso, codici G/M e allarmi della macchina attiva, sempre allineati al simulatore
- Scorciatoie da tastiera: Ctrl+Invio avvia, Esc mette in pausa, Ctrl+S salva
- Cinque nuovi esercizi "trova l'errore" (G96 senza G50, passate troppo profonde, punta usata come fresa, morsa); guida per il docente in `docs/esercitazioni.md` con soluzioni e tracce da disegno
- Dati del mandrino e della morsa spostati nei file dei dati macchina; guida `docs/configurare-le-macchine.md`
- Test di robustezza: programmi strani e 300 programmi casuali non bloccano mai la pagina

## 0.6.0

- Fresa: compensazione del raggio fresa G41/G42 con D (allarme 2010)
- Fresa: archi nei piani G18 e G19
- Nucleo della compensazione del raggio comune a tornio e fresa

## 0.5.0

- Fresa 3 assi con vista 3D (Three.js): G90/G91, archi anche elicoidali, T/M06/G43, cicli G81/G82/G83
- Morsa, gambo e portautensile nelle collisioni; allarmi 2008, 2009, 3008, 4004
- Scelta della macchina nell'interfaccia; esempi e bozze separati per macchina

## 0.4.0

- Tornio: cicli G71 (sgrossatura) e G70 (finitura), compensazione del raggio di punta G41/G42

## 0.3.0

- Tornio: fine corsa, profondità di passata, portautensile contro il pezzo, G96 senza G50, correttori utensile

## 0.2.0

- Tornio: simulazione 2D dell'asportazione, tempo ciclo, prime collisioni

## 0.1.0

- Editor, lettura del codice ISO, riga evidenziata, allarmi di sintassi
