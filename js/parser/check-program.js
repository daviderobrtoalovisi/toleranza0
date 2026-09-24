import { parseProgram } from './parse-program.js';
import { validateBlock } from './validate-block.js';

// Analizza tutto il programma per la macchina indicata.
// Restituisce i blocchi (uno per riga) e l'elenco degli allarmi di sintassi.
// La tabella dei codici può indicare un lettore diverso (per esempio Siemens) con parseProgram.
export function checkProgram(text, machine) {
  const parse = machine.parseProgram ?? parseProgram;
  const blocks = parse(text).map((block) => validateBlock(block, machine));
  const alarms = blocks.filter((block) => block.alarm).map((block) => block.alarm);
  return { blocks, alarms };
}

// Un blocco "esegue qualcosa" se ha almeno un indirizzo (esclusi i soli commenti e le righe vuote)
export function isExecutable(block) {
  return block.words.length > 0 || block.alarm !== null;
}
