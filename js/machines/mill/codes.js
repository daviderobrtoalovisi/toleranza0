// Codici della fresatrice 3 assi, Fanuc (serie M). Stesse regole della tabella del tornio:
// status 'planned' = esiste sulla macchina ma il simulatore non lo gestisce ancora (allarme 1013);
// group: codici con lo stesso gruppo si escludono nello stesso blocco; 0 = non modale.

export const MILL = {
  id: 'mill',
  name: 'Fresatrice 3 assi (Fanuc)',

  addresses: {
    O: 'Numero del programma',
    N: 'Numero di blocco',
    G: 'Funzione preparatoria',
    M: 'Funzione ausiliaria',
    T: 'Utensile da preparare (si monta con M06)',
    S: 'Velocità del mandrino (giri/min)',
    F: 'Avanzamento (mm/min)',
    X: 'Quota X',
    Y: 'Quota Y',
    Z: 'Quota Z',
    I: 'Centro dell\'arco in X (incrementale dal punto iniziale)',
    J: 'Centro dell\'arco in Y (incrementale dal punto iniziale)',
    K: 'Centro dell\'arco in Z (piani G18 e G19)',
    R: 'Raggio dell\'arco o piano R dei cicli di foratura',
    P: 'Sosta in ms (G04, G82)',
    Q: 'Profondità di ogni beccata (G83)',
    H: 'Correttore di lunghezza utensile (G43)',
    D: 'Correttore di raggio fresa (G41/G42)'
  },

  integerOnly: ['O', 'N', 'G', 'M', 'T', 'P', 'H', 'D'],
  nonNegative: ['O', 'N', 'T', 'S', 'F', 'P', 'Q', 'H', 'D'],

  g: {
    0: { group: 1, desc: 'Posizionamento in rapido' },
    1: { group: 1, desc: 'Interpolazione lineare in lavoro' },
    2: { group: 1, desc: 'Interpolazione circolare oraria' },
    3: { group: 1, desc: 'Interpolazione circolare antioraria' },
    4: { group: 0, desc: 'Sosta temporizzata' },
    17: { group: 2, desc: 'Piano di lavoro XY' },
    18: { group: 2, desc: 'Piano di lavoro ZX (archi con I e K)' },
    19: { group: 2, desc: 'Piano di lavoro YZ (archi con J e K)' },
    20: { group: 6, desc: 'Quote in pollici' },
    21: { group: 6, desc: 'Quote in millimetri' },
    28: { group: 0, desc: 'Ritorno al punto di riferimento' },
    40: { group: 7, desc: 'Annulla compensazione raggio utensile' },
    41: { group: 7, desc: 'Compensazione raggio fresa a sinistra del percorso' },
    42: { group: 7, desc: 'Compensazione raggio fresa a destra del percorso' },
    43: { group: 8, desc: 'Correzione lunghezza utensile' },
    49: { group: 8, desc: 'Annulla correzione lunghezza utensile' },
    54: { group: 14, desc: 'Origine pezzo 1' },
    55: { group: 14, desc: 'Origine pezzo 2' },
    56: { group: 14, desc: 'Origine pezzo 3' },
    57: { group: 14, desc: 'Origine pezzo 4' },
    58: { group: 14, desc: 'Origine pezzo 5' },
    59: { group: 14, desc: 'Origine pezzo 6' },
    80: { group: 9, desc: 'Annulla ciclo di foratura' },
    81: { group: 9, desc: 'Ciclo di foratura' },
    82: { group: 9, desc: 'Ciclo di foratura con sosta sul fondo' },
    83: { group: 9, desc: 'Ciclo di foratura profonda a beccate' },
    90: { group: 3, desc: 'Quote assolute' },
    91: { group: 3, desc: 'Quote incrementali' },
    94: { group: 5, desc: 'Avanzamento in mm/min' },
    95: { group: 5, desc: 'Avanzamento in mm/giro', status: 'planned' },
    98: { group: 10, desc: 'Ritorno al piano iniziale nei cicli' },
    99: { group: 10, desc: 'Ritorno al piano R nei cicli' }
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
    30: { desc: 'Fine programma e ritorno all\'inizio' },
    98: { desc: 'Chiamata sottoprogramma', status: 'planned' },
    99: { desc: 'Fine sottoprogramma', status: 'planned' }
  }
};
