import { test, assertEqual } from './runner.js';
import { createLatheAdapter } from '../js/machines/lathe/adapter.js';
import { createMillAdapter } from '../js/machines/mill/adapter.js';
import { runAll } from '../js/machines/lathe/simulator.js';
import { runAllMill } from '../js/machines/mill/simulator.js';

// Risultato atteso di ogni esempio eseguito per intero (sintassi + interprete + simulazione),
// con la macchina e il linguaggio indicati in examples/index.json.
// Gli esercizi hanno errori voluti; tutti gli altri esempi devono arrivare a M30 senza allarmi.
const EXPECTED = {
  'esercizio-trova-errori.nc': { syntax: [1010, 1008, 1002, 1012, 1009, 1005, 1002, 1007, 1003, 1006] },
  'esercizio-collisione.nc': { run: { code: 4001, line: 14 } },
  'esercizio-fresa-g43.nc': { run: { code: 2008, line: 18 } },
  'esercizio-tornio-g96.nc': { run: { code: 2005, line: 6 } },
  'esercizio-tornio-passata.nc': { run: { code: 3005, line: 11 } },
  'esercizio-fresa-passata.nc': { run: { code: 3005, line: 11 } },
  'esercizio-fresa-punta.nc': { run: { code: 3008, line: 11 } },
  'esercizio-fresa-morsa.nc': { run: { code: 4004, line: 10 } },
  'esercizio-tornio-siemens-lims.nc': { run: { code: 2005, line: 5 } },
  'esercizio-tornio-siemens-gola.nc': { run: { code: 2011, line: 9 } }
};

// Ogni esercizio deve avere il suo risultato atteso qui: un esercizio senza errore non insegna niente
export const EXERCISE_PREFIX = 'esercizio-';

// Esegue un esempio per intero; restituisce programma, simulatore e primo allarme
export function runExample({ text, machine = 'lathe', dialect = 'fanuc' }) {
  const adapter = machine === 'mill' ? createMillAdapter(undefined, dialect) : createLatheAdapter(undefined, dialect);
  const { blocks, alarms } = adapter.check(text);
  const program = adapter.interpret(blocks, { offsets: adapter.offsets?.defaults ?? null, blockDelete: false });
  const sim = adapter.createSimulator();
  sim.reset(adapter.setupFromProgram(text) ?? adapter.defaultSetup);
  const alarm = (machine === 'mill' ? runAllMill : runAll)(program, sim);
  return { alarms, program, sim, alarm };
}

export function registerExampleTests(examples) {
  for (const example of examples) {
    const { file } = example;
    const expected = EXPECTED[file] ?? {};
    if (file.startsWith(EXERCISE_PREFIX)) {
      test(`${file}: l'esercizio ha un errore atteso dichiarato nel test`, () => {
        assertEqual(Boolean(EXPECTED[file]), true);
      });
    }
    const { alarms, program, alarm } = runExample(example);

    test(`${file}: errori di sintassi attesi`, () => {
      assertEqual(alarms.map((a) => a.code), expected.syntax ?? []);
    });

    if (expected.syntax) continue;
    test(`${file}: esecuzione completa`, () => {
      assertEqual(alarm && { code: alarm.code, line: alarm.line }, expected.run ?? null);
      if (!expected.run) assertEqual(program.steps[program.steps.length - 1].stop, 'end', 'il programma finisce con M30');
    });
  }
}
