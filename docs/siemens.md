# Linguaggio Siemens SINUMERIK

Nel menu **Linguaggio** si sceglie tra **Fanuc ISO** e **Siemens SINUMERIK**, sia per il tornio sia per la fresa. Esempi, bozza e guida cambiano con il linguaggio.

**Come funziona.** Il programma Siemens viene letto con la sua sintassi e ogni riga viene tradotta nei movimenti Fanuc equivalenti. Simulazione, collisioni, allarmi e grafica sono gli stessi dei programmi Fanuc: un test controlla che gli esempi Siemens producano **lo stesso pezzo** degli esempi Fanuc corrispondenti. Riga evidenziata, allarmi e pannello *Blocco corrente* si riferiscono sempre al programma Siemens scritto dallo studente, e i suggerimenti degli allarmi usano la sintassi Siemens (per esempio `LIMS=2000` invece di `G50 S2000`).

Tabelle dei codici: [`js/machines/lathe/codes-siemens.js`](../js/machines/lathe/codes-siemens.js) e [`js/machines/mill/codes-siemens.js`](../js/machines/mill/codes-siemens.js). Traduzione: [`js/interpreter/siemens-to-fanuc.js`](../js/interpreter/siemens-to-fanuc.js).

## Scrittura

| | Siemens | Come il Fanuc |
|---|---|---|
| Commenti | `; commento` fino a fine riga | `( commento )` |
| Etichette | `INIZIO:` a inizio blocco (dopo l'eventuale N) | — |
| Grezzo nel programma | `; (GREZZO D50 L80)` | `(GREZZO D50 L80)` |
| Indirizzi con nome | `CR=5`, `LIMS=2000` | — |
| Quota incrementale in un blocco | `X=IC(2)`, assoluta `X=AC(20)` | `U2` (tornio) |
| Più funzioni M nello stesso blocco | `M3 M8` ammesso | una sola M |

## Tornio

| Siemens | Significato | Equivalente Fanuc |
|---|---|---|
| `DIAMON` / `DIAMOF` | X in diametro (predefinito) / in raggio | X in diametro |
| `T1 D1` | utensile 1, primo tagliente (`D0` annulla) | `T0101` |
| `G95` / `G94` | avanzamento mm/giro / mm/min | `G99` / `G98` |
| `G96 S180 LIMS=2000` | velocità di taglio costante con limite giri | `G50 S2000` + `G96 S180` |
| `G97` | annulla la velocità costante | `G97` |
| `G90` / `G91` | assolute / incrementali | X, Z / U, W |
| `G2 X.. Z.. CR=5` | arco con raggio | `R5` |
| `G4 F2` | sosta di 2 secondi | `G04 X2` |
| `G74 X1=0 Z1=0` | ritorno al punto di riferimento | `G28 U0 W0` |
| `G70` / `G71` | pollici / millimetri | `G20` / `G21` |
| `G41` / `G42` / `G40` | compensazione del raggio di punta | uguale |

| `CYCLE95("INIZIO:FINE", …, VARI)` | sgrossatura e finitura del profilo scritto dopo `M30` | `G71` / `G70` |
| `CYCLE93(SPD, SPL, WIDG, DIAG, …)` | gola rettangolare con il troncatore | affondamenti `G1 X` affiancati, `G4` |

### Ciclo di sgrossatura CYCLE95

`CYCLE95("INIZIO:FINE", MID, FALZ, FALX, FAL, FF1, FF2, FF3, VARI, DT, DAM, _VRT)`

- **"INIZIO:FINE"** le due etichette che racchiudono il profilo finito. Il profilo va scritto **dopo `M30`**: il programma finisce prima di arrivarci e il ciclo lo usa come disegno del pezzo
- **MID** profondità di passata, in raggio (come `U` nel primo blocco `G71`)
- **FALZ** e **FALX** sovrametallo per la finitura in Z e in X; FALX si scrive **in raggio** (in Fanuc `U` è in diametro: FALX=0.3 corrisponde a U0.6)
- **FF1** avanzamento di sgrossatura, **FF3** avanzamento di finitura
- **VARI** tipo di lavorazione: `1` sgrossatura, `5` finitura, `9` sgrossatura e finitura
- **_VRT** distacco dal profilo dopo ogni passata (vuoto: 1 mm; come `R` nel primo blocco `G71`)
- Il ciclo parte dalla posizione dell'utensile e alla fine ci ritorna: prima del ciclo si porta l'utensile fuori dal grezzo, per esempio `G0 X42 Z2`
- Il primo punto del profilo ha X e Z (`PROFILO_INIZIO: G1 X18 Z0`); poi le quote X devono salire sempre e le Z scendere sempre, senza gole (allarme 3007)
- Per la compensazione del raggio di punta si scrive `G42` prima del ciclo e `G40` dopo, come nell'esempio
- Non ancora simulati: `VARI` trasversali o interni (2–4, 6–8, 10–12), il sovrametallo lungo il profilo `FAL`, il profilo in un sottoprogramma (allarme 1013). `FF2`, `DT` e `DAM` si possono scrivere ma non cambiano la simulazione

### Ciclo di gola CYCLE93

`CYCLE93(SPD, SPL, WIDG, DIAG, STA1, ANG1, ANG2, RCO1, RCI1, RCO2, RCI2, FAL1, FAL2, IDEP, DTB, VARI, _VRT)`

- **SPD** diametro su cui si apre la gola, **SPL** quota Z di riferimento
- **VARI** `5` (o `15`): SPL è il **fianco destro** e la gola va verso il mandrino; `1` (o `11`): SPL è il fianco sinistro
- **WIDG** larghezza e **DIAG** profondità della gola (in raggio: DIAG=4 da Ø40 porta il fondo a Ø32)
- **STA1, ANG1, ANG2, RCO1, RCI1, RCO2, RCI2** angoli e raccordi: per ora vanno lasciati a `0` (gola rettangolare)
- **FAL1** sovrametallo sul fondo, **FAL2** sui fianchi (in raggio): se ci sono, dopo la sgrossatura il ciclo ripassa fianco destro, fianco sinistro e fondo
- **IDEP** profondità di ogni affondamento: dopo ogni tratto l'utensile risale di _VRT (vuoto: 1 mm) per rompere il truciolo; vuoto = tutta la profondità in una volta
- **DTB** sosta sul fondo in secondi
- Serve il **troncatore** (allarme 2011 con un altro utensile). Il ciclo usa la sua larghezza e il riferimento sullo spigolo destro, e affianca gli affondamenti con un passo mai più largo dell'utensile; se la gola è più stretta dell'utensile scatta l'allarme 3009
- L'avanzamento è quello attivo (`F` prima del ciclo). Il ciclo si sposta prima in Z e poi in X, a 1 mm sopra SPD: prima del ciclo si porta l'utensile sopra il pezzo, per esempio `G0 X42 Z-12`
- Non ancora simulati: gole frontali o interne (`VARI` 2–4, 6–8, 12–14, 16–18), fianchi obliqui e raccordi (allarme 1013)

Attenzione: in Siemens `G70`/`G71` sono le unità di misura, non i cicli di finitura e sgrossatura del Fanuc.

## Fresa

| Siemens | Significato | Equivalente Fanuc |
|---|---|---|
| `T1 M6` | cambio utensile; con `D1` (predefinito) lunghezza e raggio sono già attivi | `T1 M06` + `G43 H1` |
| `D0` | annulla il correttore: muovere Z dà l'allarme 2008 | `G49` |
| `G41` / `G42` | compensazione del raggio con il correttore attivo | `G41 D1` / `G42 D1` |
| `G2 X.. Y.. CR=8` | arco con raggio | `R8` |
| `G74 Z1=0` | ritorno al punto di riferimento in Z | `G91 G28 Z0` |
| `G4 F2` | sosta di 2 secondi | `G04 X2` |
| `CYCLE81(RTP, RFP, SDIS, DP, DPR)` | foratura nella posizione attuale | `G99 G81 Z.. R..` + `G80` + `G0 Z` RTP |
| `CYCLE82(RTP, RFP, SDIS, DP, DPR, DTB)` | foratura con sosta di DTB secondi sul fondo | `G99 G82 … P` (ms) |
| `CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, FDPR, …)` | foratura profonda a beccate | `G99 G83 … Q` |
| `MCALL CYCLE81(...)` | da qui ogni blocco con X/Y fora nella nuova posizione | un ciclo Fanuc per ogni foro |
| `MCALL` da solo | annulla il richiamo modale | `G80` |

### Parametri dei cicli di foratura

- **RTP** piano di ritorno: dopo ogni foro l'utensile risale qui in rapido
- **RFP** piano di riferimento, cioè la faccia del pezzo (di solito 0)
- **SDIS** distanza di sicurezza sopra RFP: il rapido arriva fino a RFP + SDIS (il piano R del Fanuc)
- **DP** fondo del foro in quota assoluta, oppure **DPR** profondità misurata da RFP (si lascia vuoto DP: `CYCLE81(10, 0, 2, , 15)`)
- **DTB** (CYCLE82) sosta sul fondo in secondi
- **FDEP** (CYCLE83) quota della prima foratura, oppure **FDPR** sua profondità da RFP: la beccata Q del Fanuc è la distanza tra RFP + SDIS e la prima foratura. Gli altri parametri di CYCLE83 (riduzione, soste, scarico) non sono simulati: si simula sempre lo scarico completo a ogni beccata
- I parametri vuoti si lasciano tra due virgole; RTP, RFP e il fondo sono obbligatori (altrimenti allarme 2007)
- Il ciclo va scritto in un blocco a parte (solo con il numero N); nei blocchi di posizionamento con `MCALL` attivo non si scrive Z

## Non ancora simulato (allarme 1013)

- Cicli: `CYCLE97` (filettatura), `POCKET3`/`POCKET4` (tasche), `CYCLE71`/`72`
- Filettatura `G33`, sottoprogrammi (`M17`), variabili e parametri R, istruzioni come `MSG`, `IF`, `GOTO`
- Utensili con il nome (`T="FRESA10"`) e taglienti oltre il primo (`D2`…)
- Sulla fresa: `X=IC(..)` e `X=AC(..)` nei singoli blocchi (usare `G90`/`G91` per tutto il blocco) e `G95`

I prossimi candidati sono le tasche della fresa (`POCKET3`, `POCKET4`).

## Esempi

| Esempio | Cosa mostra |
|---|---|
| *Tornio 1* (`tornio-siemens-01-cilindratura.nc`) | lo stesso pezzo dell'esempio Fanuc: `T1 D1`, `G95`, `G96 … LIMS=` |
| *Tornio 2* (`tornio-siemens-02-raccordi.nc`) | sgrossatura con `X=IC(1)`, finitura con `G42` e archi `CR=` |
| *Tornio 3* (`tornio-siemens-03-cycle95.nc`) | lo stesso pezzo dell'esempio Fanuc con G71/G70: `CYCLE95` con `VARI=1` e poi `VARI=5` con `G42`, profilo dopo `M30` tra due etichette |
| *Tornio 4* (`tornio-siemens-04-cycle93.nc`) | la stessa gola dell'esempio Fanuc: `CYCLE93` con `VARI=5`, il ciclo calcola le due passate del troncatore |
| *Esercizio — Perché il ciclo di gola non parte?* (`esercizio-tornio-siemens-gola.nc`) | `CYCLE93` con lo sgrossatore `T1`: allarme 2011 alla riga 9 |
| *Esercizio — Perché la macchina non parte?* (`esercizio-tornio-siemens-lims.nc`) | `G96` senza `LIMS`: allarme 2005 alla riga 5 |
| *Fresa 3* (`fresa-siemens-03-foratura.nc`) | gli stessi fori dell'esempio Fanuc: `MCALL CYCLE81`, poi `CYCLE83` a beccate |
| *Fresa 4* (`fresa-siemens-04-contorno-g41.nc`) | lo stesso contorno dell'esempio Fanuc: `T1 M6` senza `G43`, `G41`, `CR=`, `G74` |
