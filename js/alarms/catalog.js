// Catalogo degli allarmi. Nuovi allarmi in fondo al loro intervallo, mai rinumerare.
// {nome} nel testo viene sostituito con il valore passato a createAlarm.

export const ALARMS = {
  // 1000–1999 Sintassi
  1001: {
    category: 'sintassi',
    message: 'Carattere non valido: «{char}»',
    hint: 'Nel programma sono ammessi solo lettere di indirizzo, numeri, punto decimale, segno e commenti tra parentesi ( ).'
  },
  1002: {
    category: 'sintassi',
    message: 'Indirizzo {letter} senza valore',
    hint: 'Ogni lettera deve essere seguita da un numero, per esempio X20 oppure F0.2.'
  },
  1003: {
    category: 'sintassi',
    message: 'Numero non valido dopo {letter}: «{raw}»',
    hint: 'Un numero può avere un solo segno all\'inizio e un solo punto decimale, per esempio X-12.5.'
  },
  1004: {
    category: 'sintassi',
    message: 'Indirizzo {letter} non riconosciuto da questa macchina',
    hint: 'Controlla di aver scritto la lettera giusta. Le lettere ammesse sono elencate nella guida dei codici.'
  },
  1005: {
    category: 'sintassi',
    message: 'Codice G{code} sconosciuto',
    hint: 'Questo codice G non esiste su questa macchina. Controlla il numero, per esempio G01 e non G10.'
  },
  1006: {
    category: 'sintassi',
    message: 'Codice M{code} sconosciuto',
    hint: 'Questa funzione M non esiste su questa macchina. Esempi validi: M03, M05, M08, M30.'
  },
  1007: {
    category: 'sintassi',
    message: 'Commento non chiuso',
    hint: 'Un commento inizia con ( e deve finire con ) sulla stessa riga.'
  },
  1008: {
    category: 'sintassi',
    message: 'Indirizzo {letter} ripetuto nello stesso blocco',
    hint: 'In un blocco ogni lettera (tranne G) può comparire una sola volta. Dividi il blocco in due righe.'
  },
  1009: {
    category: 'sintassi',
    message: 'G{first} e G{second} non possono stare nello stesso blocco',
    hint: 'I due codici appartengono allo stesso gruppo e si escludono a vicenda: tienine solo uno.'
  },
  1010: {
    category: 'sintassi',
    message: 'Valore decimale non ammesso per {letter}: «{raw}»',
    hint: 'Per N, G, M, T, O, P e Q si usano solo numeri interi, per esempio M03 e non M3.5.'
  },
  1011: {
    category: 'sintassi',
    message: 'Valore negativo non ammesso per {letter}: «{raw}»',
    hint: 'Avanzamento F, velocità S, utensile T e numeri di blocco non possono essere negativi.'
  },
  1012: {
    category: 'sintassi',
    message: 'Il numero di blocco N deve essere all\'inizio della riga',
    hint: 'Scrivi prima N e poi gli altri indirizzi, per esempio N10 G00 X50.'
  },
  1013: {
    category: 'sintassi',
    message: '{word} non è ancora supportato dal simulatore',
    hint: 'Il codice esiste sulla macchina reale ma il simulatore non lo gestisce ancora. Vedi docs/codici-supportati.md.'
  },
  1014: {
    category: 'sintassi',
    message: '{a} e {b} nello stesso blocco',
    hint: 'Usa la quota assoluta ({a}) oppure lo spostamento incrementale ({b}), non tutti e due.'
  },

  // 2000–2999 Parametri mancanti
  2001: {
    category: 'parametri',
    message: 'Avanzamento F non programmato',
    hint: 'Prima di un movimento di lavoro G01, G02 o G03 serve un avanzamento, per esempio F0.2 (mm/giro con G99).'
  },
  2002: {
    category: 'parametri',
    message: 'Movimento di lavoro con mandrino fermo',
    hint: 'Avvia il mandrino con una velocità S e M03 (o M04) prima di G01, G02 o G03.'
  },
  2003: {
    category: 'parametri',
    message: 'Nessun utensile selezionato',
    hint: 'Chiama un utensile con T, per esempio T0101, prima del primo movimento di lavoro.'
  },
  2004: {
    category: 'parametri',
    message: 'Utensile T{tool} non presente nella torretta',
    hint: 'Gli utensili disponibili sono elencati sotto la simulazione, in «Utensili».'
  },
  2005: {
    category: 'parametri',
    message: 'G96 senza limite di giri G50',
    hint: 'Con la velocità di taglio costante i giri aumentano quando il diametro cala e vicino al centro diventerebbero pericolosi. Prima di G96 scrivi il limite, per esempio G50 S2000.'
  },
  2006: {
    category: 'parametri',
    message: 'Correttore {offset} non presente',
    hint: 'Le ultime due cifre di T sono il correttore: quelli disponibili sono {available}. Scrivi per esempio T0101.'
  },

  // 3000–3999 Geometria e limiti
  3001: {
    category: 'geometria',
    message: 'Arco impossibile: raggio R{r} troppo piccolo',
    hint: 'Il punto iniziale e quello finale distano {chord} mm, quindi il raggio deve essere almeno {min} mm. Controlla le quote o il raggio.'
  },
  3002: {
    category: 'geometria',
    message: 'Arco incoerente: il centro I/K non è alla stessa distanza dai due punti',
    hint: 'Il centro dista {r1} mm dal punto iniziale e {r2} mm da quello finale. Controlla I, K e il punto finale (I si scrive in raggio, non in diametro).'
  },
  3003: {
    category: 'geometria',
    message: 'Arco senza raggio né centro',
    hint: 'Per G02 e G03 indica il raggio R oppure il centro con I e K.'
  },
  3004: {
    category: 'geometria',
    message: 'Fuori corsa: {axis}{value} oltre il limite della macchina',
    hint: 'L\'asse {axis} può andare da {min} a {max}. Controlla il valore e il segno della quota.'
  },
  3005: {
    category: 'geometria',
    message: 'Passata troppo profonda: {depth} mm',
    hint: 'L\'utensile T{tool} può togliere al massimo {max} mm per passata. Dividi la lavorazione in più passate.'
  },

  // 4000–4999 Collisioni
  4001: {
    category: 'collisione',
    message: 'Collisione: rapido G00 dentro il materiale',
    hint: 'In rapido l\'utensile non deve mai toccare il pezzo. Avvicinati con G00 fermandoti ad almeno 1–2 mm dal materiale, poi taglia con G01.'
  },
  4002: {
    category: 'collisione',
    message: 'Collisione: utensile contro il mandrino',
    hint: 'L\'utensile o il portautensile ha toccato le griffe del mandrino. Controlla le quote Z negative rispetto alla sporgenza del pezzo.'
  },
  4003: {
    category: 'collisione',
    message: 'Collisione: portautensile contro il pezzo',
    hint: 'Non ha tagliato solo l\'inserto: anche il portautensile ha urtato il materiale. Succede se la gola è più profonda del troncatore o se l\'utensile scende dietro uno spallamento. Controlla il percorso o scegli un utensile adatto.'
  }
};
