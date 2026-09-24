# Registro delle versioni

Ogni versione ha un tag git (`vX.Y.Z`). Il numero è in `js/version.js` e si vede in alto nella pagina.

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
