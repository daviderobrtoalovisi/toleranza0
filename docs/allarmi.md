# Catalogo allarmi

Quando il simulatore trova un errore si ferma e mostra: **codice**, **riga**, **messaggio** e un **suggerimento** su come correggere. Per ogni riga viene segnalato solo il primo errore: dopo averlo corretto possono comparirne altri.

I testi mostrati agli studenti sono in [`js/alarms/catalog.js`](../js/alarms/catalog.js): se si modifica un messaggio lì, va aggiornato anche qui.

| Codici | Categoria | Stato |
|---|---|---|
| 1000–1999 | Sintassi | attivi dalla v0.1 |
| 2000–2999 | Parametri mancanti | previsti per la v0.3 |
| 3000–3999 | Geometria e limiti | previsti per la v0.3 |
| 4000–4999 | Collisioni | previsti per la v0.3 |

## 1000–1999 Sintassi

| Codice | Messaggio | Esempio che lo provoca | Correzione |
|---|---|---|---|
| 1001 | Carattere non valido | `G00 X10 #` | togliere il carattere |
| 1002 | Indirizzo senza valore | `G01 Z-30 F` | `G01 Z-30 F0.2` |
| 1003 | Numero non valido | `Z-1.2.5` | `Z-1.25` |
| 1004 | Indirizzo non riconosciuto da questa macchina | `G00 Y10` sul tornio | il tornio ha solo X/Z (U/W) |
| 1005 | Codice G sconosciuto | `G13 X40` | `G01 X40` |
| 1006 | Codice M sconosciuto | `M33` | `M03` |
| 1007 | Commento non chiuso | `G01 Z-20 (FINE PASSATA` | `(FINE PASSATA)` |
| 1008 | Indirizzo ripetuto nello stesso blocco | `G01 X46 Z0 X44` | dividere in due blocchi |
| 1009 | Due codici G dello stesso gruppo nello stesso blocco | `G00 G01 Z2` | tenerne uno solo |
| 1010 | Valore decimale non ammesso | `M3.5` | `M03` |
| 1011 | Valore negativo non ammesso | `F-0.2` | `F0.2` |
| 1012 | N non all'inizio della riga | `X50 N85` | `N85 X50` |
| 1013 | Codice non ancora supportato dal simulatore | `G71 U2 R1` | vedi [codici supportati](codici-supportati.md) |

Note:
- Le lettere minuscole sono accettate (`g01 x10` = `G01 X10`).
- `N`, `G`, `M`, `T`, `O`, `P`, `Q` accettano solo numeri interi.
- Nello stesso blocco si possono scrivere più codici G di gruppi diversi (`G21 G40 G99`), ma una sola funzione M.

## 2000–2999 Parametri mancanti (v0.3)

Previsti: avanzamento F assente in G01/G02/G03, movimento di lavoro con mandrino fermo, nessun utensile chiamato, G96 senza G50.

## 3000–3999 Geometria e limiti (v0.3)

Previsti: fuori corsa degli assi, arco G02/G03 con raggio incoerente, passata troppo profonda, programma senza M30.

## 4000–4999 Collisioni (v0.3)

Previsti: rapido G00 dentro il materiale, portautensile contro il pezzo, utensile contro il mandrino.

## Aggiungere un allarme

1. Scegliere il primo codice libero **in fondo** all'intervallo della categoria (mai rinumerare quelli esistenti).
2. Aggiungerlo in `js/alarms/catalog.js` con `category`, `message` e `hint`.
3. Aggiungere una riga a questa pagina.
4. Aggiungere un test in `tests/`.
