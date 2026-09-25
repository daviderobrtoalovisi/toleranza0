import { ALARMS } from './catalog.js';

// Testi degli allarmi riscritti per chi programma in Siemens SINUMERIK: stesso codice e stesso
// significato, ma esempi con la sintassi Siemens (LIMS=, T1 D1, CR=, commenti con ;).
// Solo gli allarmi il cui testo cita la sintassi Fanuc; gli altri restano quelli del catalogo.

const SIEMENS = {
  1001: { hint: 'Nel programma sono ammessi lettere e nomi di indirizzo (X, CR, LIMS...), numeri, il segno = e i commenti dopo il punto e virgola ;.' },
  1007: { message: 'Parentesi non chiusa', hint: 'Una parentesi aperta ( va chiusa ) sulla stessa riga, per esempio X=IC(5) oppure CYCLE81(...).' },
  1010: { hint: 'Per N, G, M, T e D si usano solo numeri interi, per esempio M3 e non M3.5.' },
  2001: { hint: 'Prima di un movimento di lavoro G1, G2 o G3 serve un avanzamento, per esempio F0.2 (mm/giro con G95).' },
  2002: { hint: 'Avvia il mandrino con una velocità S e M3 (o M4) prima di G1, G2 o G3.' },
  2003: { hint: 'Chiama un utensile prima del primo movimento di lavoro: sul tornio T1 D1, sulla fresa T1 M6.' },
  2005: { message: 'G96 senza limite di giri LIMS', hint: 'Con la velocità di taglio costante i giri aumentano quando il diametro cala e vicino al centro diventerebbero pericolosi. Scrivi il limite, per esempio G96 S180 LIMS=2000.' },
  2006: { message: 'Correttore D non presente', hint: 'Usa il correttore D1 (D0 annulla il correttore): sul tornio per esempio T1 D1.' },
  2008: { message: 'Movimento in Z senza correttore D attivo', hint: 'Con D0 la lunghezza dell\'utensile non è attiva: scrivi D1 prima di muovere Z.' },
  3001: { message: 'Arco impossibile: raggio CR={r} troppo piccolo' },
  3006: {
    message: 'Etichetta {n}: del profilo non trovata',
    hint: 'CYCLE95("INIZIO:FINE", ...) cerca il profilo tra le righe che iniziano con INIZIO: e FINE:, scritte dopo M30. Controlla che i nomi siano uguali, con i due punti dopo il nome.'
  },
  3007: {
    hint: 'CYCLE95 lavora profili esterni longitudinali (VARI=1, 5 o 9) che salgono sempre in X e scendono sempre in Z, senza gole. Il profilo si scrive dopo M30 tra due etichette e il suo primo punto ha X e Z, per esempio INIZIO: G1 X18 Z0. Le gole si fanno a parte, per esempio con il troncatore.'
  }
};

// Restituisce l'allarme con i testi Siemens, se ce ne sono per quel codice
export function siemensAlarm(alarm) {
  const override = SIEMENS[alarm.code];
  if (!override) return alarm;
  const template = { ...ALARMS[alarm.code], ...override };
  const fill = (text) => text.replace(/\{(\w+)\}/g, (match, key) => (key in (alarm.params ?? {}) ? String(alarm.params[key]) : match));
  return { ...alarm, message: fill(template.message), hint: fill(template.hint) };
}
