// Codici del tornio 2 assi, Fanuc sistema A (X in diametro, U/W incrementali).
// status 'planned' = esiste sulla macchina ma il simulatore non lo gestisce ancora (allarme 1013).
// group: codici con lo stesso gruppo si escludono nello stesso blocco; 0 = non modale.

export const LATHE = {
  id: 'lathe',
  name: 'Tornio 2 assi (Fanuc sistema A)',

  addresses: {
    O: 'Numero del programma',
    N: 'Numero di blocco',
    G: 'Funzione preparatoria',
    M: 'Funzione ausiliaria',
    T: 'Utensile e correttore (T0101 = utensile 1, correttore 1)',
    S: 'Velocità del mandrino (giri/min o m/min con G96)',
    F: 'Avanzamento (mm/giro con G99, mm/min con G98)',
    X: 'Quota X assoluta (diametro)',
    Z: 'Quota Z assoluta',
    U: 'Spostamento incrementale in X (diametro)',
    W: 'Spostamento incrementale in Z',
    I: 'Centro dell\'arco in X (incrementale dal punto iniziale)',
    K: 'Centro dell\'arco in Z (incrementale dal punto iniziale)',
    R: 'Raggio dell\'arco o parametro del ciclo',
    P: 'Parametro: tempo di sosta in ms (G04) o blocco iniziale (cicli)',
    Q: 'Parametro: blocco finale (cicli)'
  },

  integerOnly: ['O', 'N', 'G', 'M', 'T', 'P', 'Q'],
  nonNegative: ['O', 'N', 'T', 'S', 'F', 'P', 'Q'],

  g: {
    0: { group: 1, desc: 'Posizionamento in rapido' },
    1: { group: 1, desc: 'Interpolazione lineare in lavoro' },
    2: { group: 1, desc: 'Interpolazione circolare oraria' },
    3: { group: 1, desc: 'Interpolazione circolare antioraria' },
    4: { group: 0, desc: 'Sosta temporizzata' },
    18: { group: 16, desc: 'Piano di lavoro ZX' },
    20: { group: 6, desc: 'Quote in pollici' },
    21: { group: 6, desc: 'Quote in millimetri' },
    28: { group: 0, desc: 'Ritorno al punto di riferimento' },
    32: { group: 1, desc: 'Filettatura', status: 'planned' },
    40: { group: 7, desc: 'Annulla compensazione raggio utensile' },
    41: { group: 7, desc: 'Compensazione raggio utensile a sinistra' },
    42: { group: 7, desc: 'Compensazione raggio utensile a destra' },
    50: { group: 0, desc: 'Limite massimo giri mandrino' },
    54: { group: 14, desc: 'Origine pezzo 1' },
    55: { group: 14, desc: 'Origine pezzo 2' },
    56: { group: 14, desc: 'Origine pezzo 3' },
    57: { group: 14, desc: 'Origine pezzo 4' },
    58: { group: 14, desc: 'Origine pezzo 5' },
    59: { group: 14, desc: 'Origine pezzo 6' },
    70: { group: 0, desc: 'Ciclo di finitura' },
    71: { group: 0, desc: 'Ciclo di sgrossatura longitudinale' },
    72: { group: 0, desc: 'Ciclo di sgrossatura frontale', status: 'planned' },
    76: { group: 0, desc: 'Ciclo di filettatura', status: 'planned' },
    90: { group: 1, desc: 'Ciclo di tornitura cilindrica/conica', status: 'planned' },
    92: { group: 1, desc: 'Ciclo di filettatura semplice', status: 'planned' },
    94: { group: 1, desc: 'Ciclo di sfacciatura', status: 'planned' },
    96: { group: 2, desc: 'Velocità di taglio costante (m/min)' },
    97: { group: 2, desc: 'Giri mandrino costanti (giri/min)' },
    98: { group: 5, desc: 'Avanzamento in mm/min' },
    99: { group: 5, desc: 'Avanzamento in mm/giro' }
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
    30: { desc: 'Fine programma e ritorno all\'inizio' },
    98: { desc: 'Chiamata sottoprogramma', status: 'planned' },
    99: { desc: 'Fine sottoprogramma', status: 'planned' }
  }
};
