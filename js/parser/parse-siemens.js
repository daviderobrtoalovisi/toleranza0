import { createAlarm } from '../alarms/alarm.js';

// Sintassi Siemens SINUMERIK, indipendente dalla macchina: testo -> blocchi con la stessa forma del lettore Fanuc.
// Parole riconosciute:
//   G1  X20.5  S180  T1  D1  M30  N10      lettera + numero
//   CR=5  LIMS=2000  X=20  X1=0            nome = numero
//   X=IC(5)  X=AC(20)                      quota incrementale / assoluta nel singolo blocco (mode: 'IC' | 'AC')
//   DIAMON  DIAMOF                         parole chiave senza valore (value: null)
//   CYCLE81(...)                           chiamate di ciclo (value: null, call: true)
//   T="FRESA"                              nome utensile (value: null, text: 'FRESA')
//   ; commento                             fino a fine riga
// Come per il Fanuc, per ogni riga si tiene solo il primo allarme.

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const NUMBER_CHARS = /[0-9+\-.]/;

export function parseSiemensProgram(text) {
  return text.split(/\r?\n/).map((source, i) => parseSiemensLine(source, i + 1));
}

export function parseSiemensLine(source, line) {
  const block = { line, source, words: [], comment: '', blockDelete: false, alarm: null };
  const fail = (code, params) => {
    block.alarm = createAlarm(code, line, params);
    return block;
  };
  if (source.trim() === '%') return block;

  let i = 0;
  const skipSpaces = () => {
    while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i++;
  };
  const readNumber = () => {
    let raw = '';
    while (i < source.length && NUMBER_CHARS.test(source[i])) raw += source[i++];
    return raw;
  };

  skipSpaces();
  if (source[i] === '/') {
    block.blockDelete = true;
    i++;
  }

  while (i < source.length) {
    skipSpaces();
    if (i >= source.length) break;
    const ch = source[i];
    if (ch === ';') {
      block.comment = source.slice(i + 1).trim();
      break;
    }
    if (!/[a-z_]/i.test(ch)) return fail(1001, { char: ch, col: i + 1 });

    const col = i + 1;
    let name = '';
    while (i < source.length && /[a-z_]/i.test(source[i])) name += source[i++];
    name = name.toUpperCase();

    // Cifre dopo il nome: parte del nome se seguono "=" o "(" (X1=0, CYCLE81(...)), altrimenti valore (G1, X20)
    let digits = '';
    let j = i;
    while (j < source.length && /\d/.test(source[j])) digits += source[j++];
    let k = j;
    while (k < source.length && source[k] === ' ') k++;
    if (digits && (source[k] === '=' || (source[k] === '(' && name.length > 1))) {
      name += digits;
      i = j;
    }
    skipSpaces();

    if (source[i] === '(') {
      // Chiamata di ciclo: si legge fino alla parentesi chiusa
      const end = source.indexOf(')', i);
      if (end < 0) return fail(1007, { col });
      block.words.push({ letter: name, value: null, raw: source.slice(i, end + 1), col, call: true });
      i = end + 1;
      continue;
    }

    if (source[i] === '=') {
      i++;
      skipSpaces();
      if (source[i] === '"') {
        const end = source.indexOf('"', i + 1);
        if (end < 0) return fail(1003, { letter: name, raw: source.slice(i), col });
        block.words.push({ letter: name, value: null, raw: source.slice(i, end + 1), col, text: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      const mode = /^(IC|AC)\s*\(/i.exec(source.slice(i));
      if (mode) {
        i += mode[0].length;
        skipSpaces();
        const raw = readNumber();
        skipSpaces();
        if (!raw) return fail(1002, { letter: name, col });
        if (!NUMBER.test(raw) || source[i] !== ')') return fail(1003, { letter: name, raw: `${mode[1]}(${raw}`, col });
        i++;
        block.words.push({ letter: name, value: Number(raw), raw, col, mode: mode[1].toUpperCase() });
        continue;
      }
      const raw = readNumber();
      if (!raw) return fail(1002, { letter: name, col });
      if (!NUMBER.test(raw)) return fail(1003, { letter: name, raw, col });
      block.words.push({ letter: name, value: Number(raw), raw, col });
      continue;
    }

    if (name.length === 1) {
      const raw = readNumber();
      if (!raw) return fail(1002, { letter: name, col });
      if (!NUMBER.test(raw)) return fail(1003, { letter: name, raw, col });
      block.words.push({ letter: name, value: Number(raw), raw, col });
      continue;
    }

    // Nome seguito da un numero senza "=" (CR5 invece di CR=5): manca il valore nella forma giusta
    if (/\d/.test(source[i] ?? '')) return fail(1002, { letter: name, col });
    // Parola chiave senza valore (DIAMON, DIAMOF...)
    block.words.push({ letter: name, value: null, raw: '', col });
  }

  const seen = new Set();
  for (const [index, word] of block.words.entries()) {
    if (word.letter === 'N' && index > 0) return fail(1012, { col: word.col });
    // Come sui controlli Siemens, G e M possono comparire più volte nello stesso blocco
    if (word.letter !== 'G' && word.letter !== 'M' && seen.has(word.letter)) return fail(1008, { letter: word.letter, col: word.col });
    seen.add(word.letter);
  }
  return block;
}
