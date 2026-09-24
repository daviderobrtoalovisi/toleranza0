import { createAlarm } from '../alarms/alarm.js';

// Sintassi pura, indipendente dalla macchina: testo -> blocchi.
// Blocco: { line, words: [{ letter, value, raw, col }], comment, blockDelete, alarm }
// Per ogni riga si tiene solo il primo allarme, per non confondere lo studente con errori a cascata.

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const NUMBER_CHARS = /[0-9+\-.]/;

export function parseProgram(text) {
  return text.split(/\r?\n/).map((source, i) => parseLine(source, i + 1));
}

export function parseLine(source, line) {
  const block = { line, source, words: [], comment: '', blockDelete: false, alarm: null };
  const fail = (code, params) => {
    block.alarm = createAlarm(code, line, params);
    return block;
  };

  // Riga con solo % = delimitatore del programma
  if (source.trim() === '%') return block;

  let i = 0;
  const skipSpaces = () => {
    while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i++;
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

    if (ch === '(') {
      const end = source.indexOf(')', i + 1);
      if (end === -1) return fail(1007, { col: i + 1 });
      block.comment += (block.comment ? ' ' : '') + source.slice(i + 1, end).trim();
      i = end + 1;
      continue;
    }

    // ; è il fine blocco Fanuc: il resto della riga è commento
    if (ch === ';') {
      const rest = source.slice(i + 1).trim();
      if (rest) block.comment += (block.comment ? ' ' : '') + rest;
      break;
    }

    if (/[a-z]/i.test(ch)) {
      const letter = ch.toUpperCase();
      const col = i + 1;
      i++;
      let raw = '';
      while (i < source.length && NUMBER_CHARS.test(source[i])) raw += source[i++];
      if (!raw) return fail(1002, { letter, col });
      if (!NUMBER.test(raw)) return fail(1003, { letter, raw, col });
      block.words.push({ letter, value: Number(raw), raw, col });
      continue;
    }

    return fail(1001, { char: ch, col: i + 1 });
  }

  // Controlli di struttura del blocco
  const seen = new Set();
  for (const [index, word] of block.words.entries()) {
    if (word.letter === 'N' && index > 0) return fail(1012, { col: word.col });
    if (word.letter !== 'G' && seen.has(word.letter)) return fail(1008, { letter: word.letter, col: word.col });
    seen.add(word.letter);
  }

  return block;
}
