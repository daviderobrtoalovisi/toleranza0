# Linguaggio Siemens SINUMERIK

Nel menu **Linguaggio** si sceglie tra **Fanuc ISO** e **Siemens SINUMERIK**, sia per il tornio sia per la fresa. Esempi, bozza e guida cambiano con il linguaggio.

**Come funziona.** Il programma Siemens viene letto con la sua sintassi e ogni riga viene tradotta nei movimenti Fanuc equivalenti. Simulazione, collisioni, allarmi e grafica sono gli stessi dei programmi Fanuc: un test controlla che gli esempi Siemens producano **lo stesso pezzo** degli esempi Fanuc corrispondenti. Riga evidenziata, allarmi e pannello *Blocco corrente* si riferiscono sempre al programma Siemens scritto dallo studente, e i suggerimenti degli allarmi usano la sintassi Siemens (per esempio `LIMS=2000` invece di `G50 S2000`).

Tabelle dei codici: [`js/machines/lathe/codes-siemens.js`](../js/machines/lathe/codes-siemens.js) e [`js/machines/mill/codes-siemens.js`](../js/machines/mill/codes-siemens.js). Traduzione: [`js/interpreter/siemens-to-fanuc.js`](../js/interpreter/siemens-to-fanuc.js).

## Scrittura

| | Siemens | Come il Fanuc |
|---|---|---|
| Commenti | `; commento` fino a fine riga | `( commento )` |
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

- Cicli: `CYCLE95` (sgrossatura), `CYCLE93` (gola), `CYCLE97` (filettatura), `POCKET3`/`POCKET4` (tasche), `CYCLE71`/`72`
- Filettatura `G33`, sottoprogrammi (`M17`), variabili e parametri R, istruzioni come `MSG`, `IF`, `GOTO`
- Utensili con il nome (`T="FRESA10"`) e taglienti oltre il primo (`D2`…)
- Sulla fresa: `X=IC(..)` e `X=AC(..)` nei singoli blocchi (usare `G90`/`G91` per tutto il blocco) e `G95`

Il prossimo candidato è `CYCLE95` (sgrossatura del tornio).

## Esempi

| Esempio | Cosa mostra |
|---|---|
| *Tornio 1* (`tornio-siemens-01-cilindratura.nc`) | lo stesso pezzo dell'esempio Fanuc: `T1 D1`, `G95`, `G96 … LIMS=` |
| *Tornio 2* (`tornio-siemens-02-raccordi.nc`) | sgrossatura con `X=IC(1)`, finitura con `G42` e archi `CR=` |
| *Esercizio — Perché la macchina non parte?* (`esercizio-tornio-siemens-lims.nc`) | `G96` senza `LIMS`: allarme 2005 alla riga 5 |
| *Fresa 3* (`fresa-siemens-03-foratura.nc`) | gli stessi fori dell'esempio Fanuc: `MCALL CYCLE81`, poi `CYCLE83` a beccate |
| *Fresa 4* (`fresa-siemens-04-contorno-g41.nc`) | lo stesso contorno dell'esempio Fanuc: `T1 M6` senza `G43`, `G41`, `CR=`, `G74` |
