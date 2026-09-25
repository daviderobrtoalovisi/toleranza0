import { parseSiemensProgram } from '../../parser/parse-siemens.js';

// Codici del tornio in linguaggio Siemens SINUMERIK (tornitura a 2 assi, X in diametro con DIAMON).
// Stesse regole della tabella Fanuc: status 'planned' = allarme 1013; group = codici che si escludono.
// Il programma viene tradotto nei movimenti Fanuc equivalenti da js/interpreter/siemens-to-fanuc.js.

export const LATHE_SIEMENS = {
  id: 'lathe',
  dialect: 'siemens',
  name: 'Tornio 2 assi (Siemens SINUMERIK)',
  parseProgram: parseSiemensProgram,

  addresses: {
    N: 'Numero di blocco',
    G: 'Funzione preparatoria',
    M: 'Funzione ausiliaria',
    T: 'Utensile (T1 = utensile 1)',
    D: 'Correttore dell\'utensile (D1 di solito; D0 annulla)',
    S: 'Velocità del mandrino (giri/min, oppure m/min con G96)',
    F: 'Avanzamento (mm/giro con G95, mm/min con G94); con G4 tempo di sosta in secondi',
    X: 'Quota X (diametro con DIAMON); X=IC(..) incrementale, X=AC(..) assoluta',
    Z: 'Quota Z; Z=IC(..) incrementale, Z=AC(..) assoluta',
    I: 'Centro dell\'arco in X (incrementale dal punto iniziale, in raggio)',
    K: 'Centro dell\'arco in Z (incrementale dal punto iniziale)',
    CR: 'Raggio dell\'arco (CR=5; negativo per archi oltre 180°)',
    LIMS: 'Limite dei giri con la velocità di taglio costante G96',
    X1: 'Asse X per il ritorno al punto di riferimento G74 (X1=0)',
    Z1: 'Asse Z per il ritorno al punto di riferimento G74 (Z1=0)',
    DIAMON: 'Quote X in diametro (predefinito sul tornio)',
    DIAMOF: 'Quote X in raggio',
    CYCLE95: 'Sgrossatura e finitura: CYCLE95("INIZIO:FINE", MID, FALZ, FALX, FAL, FF1, FF2, FF3, VARI) = etichette del profilo (scritto dopo M30), passata in raggio, sovrametalli Z e X (raggio), avanzamenti, tipo (1 sgrossatura, 5 finitura, 9 completa)',
    CYCLE93: 'Gola: CYCLE93(SPD, SPL, WIDG, DIAG, STA1, ANG1, ANG2, RCO1, RCI1, RCO2, RCI2, FAL1, FAL2, IDEP, DTB, VARI) = diametro e Z di partenza, larghezza, profondità (raggio), angoli e raccordi (0), sovrametalli fondo e fianchi, affondamento a beccate, sosta, tipo (1 SPL a sinistra, 5 a destra)'
  },
  keywords: ['DIAMON', 'DIAMOF'],
  planned: {
    CYCLE97: 'ciclo di filettatura',
    CYCLE81: 'ciclo di foratura',
    CYCLE82: 'ciclo di foratura con sosta',
    CYCLE83: 'ciclo di foratura profonda'
  },

  integerOnly: ['N', 'G', 'M', 'T', 'D'],
  nonNegative: ['N', 'T', 'D', 'S', 'F', 'LIMS'],

  g: {
    0: { group: 1, desc: 'Posizionamento in rapido' },
    1: { group: 1, desc: 'Interpolazione lineare in lavoro' },
    2: { group: 1, desc: 'Interpolazione circolare oraria' },
    3: { group: 1, desc: 'Interpolazione circolare antioraria' },
    4: { group: 0, desc: 'Sosta temporizzata (G4 F = secondi)' },
    17: { group: 6, desc: 'Piano di lavoro XY' },
    18: { group: 6, desc: 'Piano di lavoro ZX (tornitura)' },
    19: { group: 6, desc: 'Piano di lavoro YZ' },
    33: { group: 1, desc: 'Filettatura', status: 'planned' },
    40: { group: 7, desc: 'Annulla compensazione raggio utensile' },
    41: { group: 7, desc: 'Compensazione raggio utensile a sinistra' },
    42: { group: 7, desc: 'Compensazione raggio utensile a destra' },
    54: { group: 8, desc: 'Origine pezzo 1' },
    55: { group: 8, desc: 'Origine pezzo 2' },
    56: { group: 8, desc: 'Origine pezzo 3' },
    57: { group: 8, desc: 'Origine pezzo 4' },
    500: { group: 8, desc: 'Annulla origine pezzo' },
    70: { group: 13, desc: 'Quote in pollici' },
    71: { group: 13, desc: 'Quote in millimetri' },
    700: { group: 13, desc: 'Quote e avanzamenti in pollici' },
    710: { group: 13, desc: 'Quote e avanzamenti in millimetri' },
    74: { group: 0, desc: 'Ritorno al punto di riferimento' },
    90: { group: 14, desc: 'Quote assolute' },
    91: { group: 14, desc: 'Quote incrementali' },
    94: { group: 15, desc: 'Avanzamento in mm/min' },
    95: { group: 15, desc: 'Avanzamento in mm/giro' },
    96: { group: 15, desc: 'Velocità di taglio costante (m/min), avanzamento al giro' },
    97: { group: 15, desc: 'Annulla la velocità di taglio costante' }
  },

  m: {
    0: { desc: 'Arresto programmato' },
    1: { desc: 'Arresto opzionale' },
    2: { desc: 'Fine programma' },
    3: { desc: 'Mandrino orario' },
    4: { desc: 'Mandrino antiorario' },
    5: { desc: 'Arresto mandrino' },
    8: { desc: 'Refrigerante acceso' },
    9: { desc: 'Refrigerante spento' },
    17: { desc: 'Fine sottoprogramma', status: 'planned' },
    30: { desc: 'Fine programma e ritorno all\'inizio' }
  }
};
