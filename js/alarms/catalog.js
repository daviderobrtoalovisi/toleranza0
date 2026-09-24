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
  }
};
