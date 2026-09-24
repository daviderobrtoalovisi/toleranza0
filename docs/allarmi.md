# Catalogo allarmi

Quando il simulatore trova un errore si ferma e mostra: **codice**, **riga**, **messaggio** e un **suggerimento** su come correggere. Per ogni riga viene segnalato solo il primo errore: dopo averlo corretto possono comparirne altri.

I testi mostrati agli studenti sono in [`js/alarms/catalog.js`](../js/alarms/catalog.js): se si modifica un messaggio lì, va aggiornato anche qui.

| Codici | Categoria | Stato |
|---|---|---|
| 1000–1999 | Sintassi | attivi dalla v0.1 |
| 2000–2999 | Parametri mancanti | primi allarmi dalla v0.2, altri nella v0.3 |
| 3000–3999 | Geometria e limiti | archi dalla v0.2, limiti nella v0.3 |
| 4000–4999 | Collisioni | rapido nel materiale e mandrino dalla v0.2, portautensile nella v0.3 |

**Quando scattano:** gli allarmi di sintassi, parametri e geometria compaiono già mentre si scrive, nel pannello *Allarmi*; per quelli di parametri e geometria viene mostrato solo il primo. Le collisioni si scoprono solo eseguendo il programma, come sulla macchina vera: l'esecuzione si ferma nel punto dell'urto, cerchiato in rosso nella simulazione.

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
| 1013 | Codice non ancora supportato dal simulatore | `G71 U2 R1`, `G50 X100 Z50`, `G01 X30 Z-5 R2` | vedi [codici supportati](codici-supportati.md) |
| 1014 | Quota assoluta e incrementale dello stesso asse nel blocco | `G00 X20 U5` | usare X oppure U (Z oppure W) |

Note:
- Le lettere minuscole sono accettate (`g01 x10` = `G01 X10`).
- `N`, `G`, `M`, `T`, `O`, `P`, `Q` accettano solo numeri interi.
- Nello stesso blocco si possono scrivere più codici G di gruppi diversi (`G21 G40 G99`), ma una sola funzione M.

## 2000–2999 Parametri mancanti

| Codice | Messaggio | Esempio che lo provoca | Correzione |
|---|---|---|---|
| 2001 | Avanzamento F non programmato | `G01 Z-10` senza nessun F prima | `G01 Z-10 F0.2` |
| 2002 | Movimento di lavoro con mandrino fermo | `G01` prima di `M03`, dopo `M05` o con `S0` | `G96 S180 M03` prima di tagliare |
| 2003 | Nessun utensile selezionato | `G01` prima di qualsiasi `T` | `T0101` all'inizio |
| 2004 | Utensile non presente nella torretta | `T0909` | usare T01, T02 o T03 |

Previsti per la v0.3: G96 senza limite G50, programma senza M30.

## 3000–3999 Geometria e limiti

| Codice | Messaggio | Esempio che lo provoca | Correzione |
|---|---|---|---|
| 3001 | Arco impossibile: raggio troppo piccolo | da X20 Z0: `G02 X40 Z-10 R5` | il raggio deve essere almeno metà della distanza tra i due punti |
| 3002 | Arco incoerente: centro I/K non equidistante | da X20 Z0: `G02 X30 Z-5 I10 K0` | ricontrollare I, K (I in raggio) e il punto finale |
| 3003 | Arco senza raggio né centro | `G02 X30 Z-5` | aggiungere R oppure I e K |

Previsti per la v0.3: fuori corsa degli assi, passata troppo profonda.

## 4000–4999 Collisioni

| Codice | Messaggio | Esempio che lo provoca | Correzione |
|---|---|---|---|
| 4001 | Rapido G00 dentro il materiale | `G00 Z-30` a un diametro più piccolo del pezzo | avvicinarsi in G00 a 1–2 mm, poi G01 |
| 4002 | Utensile contro il mandrino | `G01 Z-85` con sporgenza 80 mm | restare nella sporgenza del pezzo |

Previsto per la v0.3: portautensile contro il pezzo (oggi si controlla solo l'inserto).

L'esempio *Esercizio — Perché si rompe l'utensile?* mostra la collisione 4001.

## Aggiungere un allarme

1. Scegliere il primo codice libero **in fondo** all'intervallo della categoria (mai rinumerare quelli esistenti).
2. Aggiungerlo in `js/alarms/catalog.js` con `category`, `message` e `hint`.
3. Aggiungere una riga a questa pagina.
4. Aggiungere un test in `tests/`.
