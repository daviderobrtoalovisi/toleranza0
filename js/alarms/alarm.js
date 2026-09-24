import { ALARMS } from './catalog.js';

// Crea un allarme dal catalogo. line è 1-based, params riempie i {segnaposto} del messaggio.
export function createAlarm(code, line, params = {}) {
  const entry = ALARMS[code];
  if (!entry) throw new Error(`Allarme ${code} non presente nel catalogo`);
  return {
    code,
    line,
    col: params.col ?? null,
    category: entry.category,
    message: fill(entry.message, params),
    hint: fill(entry.hint, params),
    params // per riscrivere i testi in un altro linguaggio (siemens-hints.js)
  };
}

function fill(text, params) {
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}
