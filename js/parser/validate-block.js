import { createAlarm } from '../alarms/alarm.js';

// Controlli che dipendono dalla macchina (tabella codici in js/machines/*/codes.js).
// Modifica il blocco impostando block.alarm se trova un errore e lo restituisce.

export function validateBlock(block, machine) {
  if (block.alarm) return block;
  const fail = (code, params) => {
    block.alarm = createAlarm(code, block.line, params);
    return block;
  };

  const groups = new Map();
  for (const word of block.words) {
    const { letter, value, raw, col } = word;

    if (!(letter in machine.addresses)) return fail(1004, { letter, col });
    if (machine.integerOnly.includes(letter) && !Number.isInteger(value)) return fail(1010, { letter, raw, col });
    if (machine.nonNegative.includes(letter) && value < 0) return fail(1011, { letter, raw, col });

    if (letter === 'G') {
      const def = machine.g[value];
      if (!def) return fail(1005, { code: pad(value), col });
      if (def.status === 'planned') return fail(1013, { word: `G${pad(value)} (${def.desc})`, col });
      if (def.group !== 0) {
        if (groups.has(def.group)) return fail(1009, { first: pad(groups.get(def.group)), second: pad(value), col });
        groups.set(def.group, value);
      }
    }

    if (letter === 'M') {
      const def = machine.m[value];
      if (!def) return fail(1006, { code: pad(value), col });
      if (def.status === 'planned') return fail(1013, { word: `M${pad(value)} (${def.desc})`, col });
    }
  }
  return block;
}

export function pad(value) {
  return String(value).padStart(2, '0');
}
