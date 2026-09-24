import { test, assertEqual } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { interpretLathe } from '../js/interpreter/interpret-lathe.js';
import { LATHE } from '../js/machines/lathe/codes.js';
import { LATHE_PARAMS, DEFAULT_SETUP, setupFromProgram } from '../js/machines/lathe/machine.js';
import { LATHE_TOOLS } from '../js/machines/lathe/tools.js';
import { createLatheSimulator, runAll } from '../js/machines/lathe/simulator.js';

// Risultato atteso di ogni esempio eseguito per intero (sintassi + interprete + simulazione).
// Gli esercizi hanno errori voluti; tutti gli altri esempi devono arrivare a M30 senza allarmi.
const EXPECTED = {
  'esercizio-trova-errori.nc': { syntax: [1010, 1008, 1002, 1012, 1009, 1005, 1002, 1007, 1003, 1006] },
  'esercizio-collisione.nc': { run: { code: 4001, line: 14 } }
};

export function registerExampleTests(examples) {
  for (const { file, text } of examples) {
    const expected = EXPECTED[file] ?? {};
    const { blocks, alarms } = checkProgram(text, LATHE);

    test(`${file}: errori di sintassi attesi`, () => {
      assertEqual(alarms.map((a) => a.code), expected.syntax ?? []);
    });

    if (expected.syntax) continue;
    test(`${file}: esecuzione completa`, () => {
      const program = interpretLathe(blocks, { params: LATHE_PARAMS, tools: LATHE_TOOLS });
      const sim = createLatheSimulator({ params: LATHE_PARAMS, tools: LATHE_TOOLS });
      sim.reset(setupFromProgram(text) ?? DEFAULT_SETUP);
      const alarm = runAll(program, sim);
      assertEqual(alarm && { code: alarm.code, line: alarm.line }, expected.run ?? null);
      if (!expected.run) assertEqual(program.steps[program.steps.length - 1].stop, 'end', 'il programma finisce con M30');
    });
  }
}
