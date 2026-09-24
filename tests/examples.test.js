import { test, assertEqual } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { interpretLathe } from '../js/interpreter/interpret-lathe.js';
import { interpretMill } from '../js/interpreter/interpret-mill.js';
import { LATHE } from '../js/machines/lathe/codes.js';
import { LATHE_PARAMS, DEFAULT_SETUP, setupFromProgram } from '../js/machines/lathe/machine.js';
import { LATHE_TOOLS } from '../js/machines/lathe/tools.js';
import { createLatheSimulator, runAll } from '../js/machines/lathe/simulator.js';
import { MILL } from '../js/machines/mill/codes.js';
import { MILL_PARAMS, DEFAULT_MILL_SETUP, millSetupFromProgram } from '../js/machines/mill/machine.js';
import { MILL_TOOLS } from '../js/machines/mill/tools.js';
import { createMillSimulator, runAllMill } from '../js/machines/mill/simulator.js';

// Risultato atteso di ogni esempio eseguito per intero (sintassi + interprete + simulazione).
// Gli esercizi hanno errori voluti; tutti gli altri esempi devono arrivare a M30 senza allarmi.
const EXPECTED = {
  'esercizio-trova-errori.nc': { syntax: [1010, 1008, 1002, 1012, 1009, 1005, 1002, 1007, 1003, 1006] },
  'esercizio-collisione.nc': { run: { code: 4001, line: 14 } },
  'esercizio-fresa-g43.nc': { run: { code: 2008, line: 18 } }
};

const MACHINES = {
  lathe: {
    codes: LATHE,
    run(blocks, text) {
      const program = interpretLathe(blocks, { params: LATHE_PARAMS, tools: LATHE_TOOLS });
      const sim = createLatheSimulator({ params: LATHE_PARAMS, tools: LATHE_TOOLS });
      sim.reset(setupFromProgram(text) ?? DEFAULT_SETUP);
      return { program, alarm: runAll(program, sim) };
    }
  },
  mill: {
    codes: MILL,
    run(blocks, text) {
      const program = interpretMill(blocks, { params: MILL_PARAMS, tools: MILL_TOOLS });
      const sim = createMillSimulator({ params: MILL_PARAMS, tools: MILL_TOOLS });
      sim.reset(millSetupFromProgram(text) ?? DEFAULT_MILL_SETUP);
      return { program, alarm: runAllMill(program, sim) };
    }
  }
};

export function registerExampleTests(examples) {
  for (const { file, text, machine = 'lathe' } of examples) {
    const expected = EXPECTED[file] ?? {};
    const m = MACHINES[machine];
    const { blocks, alarms } = checkProgram(text, m.codes);

    test(`${file}: errori di sintassi attesi`, () => {
      assertEqual(alarms.map((a) => a.code), expected.syntax ?? []);
    });

    if (expected.syntax) continue;
    test(`${file}: esecuzione completa`, () => {
      const { program, alarm } = m.run(blocks, text);
      assertEqual(alarm && { code: alarm.code, line: alarm.line }, expected.run ?? null);
      if (!expected.run) assertEqual(program.steps[program.steps.length - 1].stop, 'end', 'il programma finisce con M30');
    });
  }
}
