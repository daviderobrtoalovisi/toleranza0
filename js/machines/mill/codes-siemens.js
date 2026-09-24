import { parseSiemensProgram } from '../../parser/parse-siemens.js';

// Codici della fresatrice 3 assi in linguaggio Siemens SINUMERIK.
// Stesse regole della tabella Fanuc: status 'planned' = allarme 1013; group = codici che si escludono.
// Il programma viene tradotto nei movimenti Fanuc equivalenti da js/interpreter/siemens-to-fanuc.js.
// Differenza importante rispetto al Fanuc: con il correttore D (D1 di solito) la lunghezza dell'utensile
// è già attiva dopo T.. M6, senza G43.

export const MILL_SIEMENS = {
  id: 'mill',
  dialect: 'siemens',
  name: 'Fresatrice 3 assi (Siemens SINUMERIK)',
  parseProgram: parseSiemensProgram,

  addresses: {
    N: 'Numero di blocco',
    G: 'Funzione preparatoria',
    M: 'Funzione ausiliaria',
    T: 'Utensile da preparare (si monta con M6)',
    D: 'Correttore dell\'utensile: lunghezza e raggio (D1 di solito; D0 annulla)',
    S: 'Velocità del mandrino (giri/min)',
    F: 'Avanzamento (mm/min); con G4 tempo di sosta in secondi',
    X: 'Quota X',
    Y: 'Quota Y',
    Z: 'Quota Z',
    I: 'Centro dell\'arco in X (incrementale dal punto iniziale)',
    J: 'Centro dell\'arco in Y (incrementale dal punto iniziale)',
    K: 'Centro dell\'arco in Z (piani G18 e G19)',
    CR: 'Raggio dell\'arco (CR=5; negativo per archi oltre 180°)',
    X1: 'Asse X per il ritorno al punto di riferimento G74 (X1=0)',
    Y1: 'Asse Y per il ritorno al punto di riferimento G74 (Y1=0)',
    Z1: 'Asse Z per il ritorno al punto di riferimento G74 (Z1=0)'
  },
  keywords: [],
  planned: {
    CYCLE81: 'ciclo di foratura',
    CYCLE82: 'ciclo di foratura con sosta',
    CYCLE83: 'ciclo di foratura profonda',
    POCKET3: 'ciclo di tasca rettangolare',
    POCKET4: 'ciclo di tasca circolare',
    CYCLE71: 'ciclo di spianatura',
    CYCLE72: 'ciclo di contornatura'
  },

  integerOnly: ['N', 'G', 'M', 'T', 'D'],
  nonNegative: ['N', 'T', 'D', 'S', 'F'],

  g: {
    0: { group: 1, desc: 'Posizionamento in rapido' },
    1: { group: 1, desc: 'Interpolazione lineare in lavoro' },
    2: { group: 1, desc: 'Interpolazione circolare oraria' },
    3: { group: 1, desc: 'Interpolazione circolare antioraria' },
    4: { group: 0, desc: 'Sosta temporizzata (G4 F = secondi)' },
    17: { group: 6, desc: 'Piano di lavoro XY' },
    18: { group: 6, desc: 'Piano di lavoro ZX' },
    19: { group: 6, desc: 'Piano di lavoro YZ' },
    40: { group: 7, desc: 'Annulla compensazione raggio fresa' },
    41: { group: 7, desc: 'Compensazione raggio fresa a sinistra del percorso' },
    42: { group: 7, desc: 'Compensazione raggio fresa a destra del percorso' },
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
    95: { group: 15, desc: 'Avanzamento in mm/giro', status: 'planned' }
  },

  m: {
    0: { desc: 'Arresto programmato' },
    1: { desc: 'Arresto opzionale' },
    2: { desc: 'Fine programma' },
    3: { desc: 'Mandrino orario' },
    4: { desc: 'Mandrino antiorario' },
    5: { desc: 'Arresto mandrino' },
    6: { desc: 'Cambio utensile' },
    8: { desc: 'Refrigerante acceso' },
    9: { desc: 'Refrigerante spento' },
    17: { desc: 'Fine sottoprogramma', status: 'planned' },
    30: { desc: 'Fine programma e ritorno all\'inizio' }
  }
};
