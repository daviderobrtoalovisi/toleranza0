import { test, assert } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { latheAdapter } from '../js/machines/lathe/adapter.js';
import { millAdapter } from '../js/machines/mill/adapter.js';
import { runAll } from '../js/machines/lathe/simulator.js';
import { runAllMill } from '../js/machines/mill/simulator.js';

// Robustezza: qualunque cosa scriva lo studente, il simulatore deve rispondere con allarmi,
// mai con un errore JavaScript che bloccherebbe la pagina.

const MACHINES = [
  { adapter: latheAdapter, runAll, offsets: latheAdapter.offsets.defaults },
  { adapter: millAdapter, runAll: runAllMill, offsets: null }
];

// Esegue tutto: sintassi, interprete, simulazione. Restituisce l'errore JavaScript o null.
function crashOf(text, { adapter, runAll: run, offsets }) {
  try {
    const { blocks } = checkProgram(text, adapter.codes);
    const program = adapter.interpret(blocks, { offsets, blockDelete: false });
    const sim = adapter.createSimulator();
    sim.reset(adapter.defaultSetup);
    run(program, sim);
    for (const step of program.steps) {
      for (const move of step.moves) {
        assert(Number.isFinite(move.duration) && move.duration >= 0, `durata non valida: ${move.duration} (${step.block.source})`);
      }
    }
    return null;
  } catch (error) {
    return error;
  }
}

const STRANGE = [
  '', '%', '%\n%', '(solo un commento)', ';', ';;;', '\t\t', '    ', '\n\n\n',
  'G01', 'G02', 'X', 'X-', 'X.', 'X+-1', 'G1.5', 'N', 'N1 N2', 'O', 'M', 'T',
  'X99999999999', 'X1e5', 'Z-0', 'G00 X0 Z0\nG00 X0 Z0',
  'M30\nM30', 'M00\nM01\nM02', '/G00 X10', '(((', ')))', 'G00 X10 (commento) Z5 ; nota',
  'G02 X10 Z10 R0', 'G03 X10 Y10 R-5', 'G02 I0 K0', 'G02 X0 Y0 I0 J0', 'G03 I10', 'G03 J10',
  'G71 U2 R1\nG71 P1 Q2', 'G70 P5 Q1', 'G71 P1 Q1', 'N1 G71 U2 R1\nN2 G71 P1 Q2 U0 W0 F0.2',
  'T0101\nG41 G00 X0\nG40', 'T0101\nG42 G01 X10 F0.1\nG40', 'G96 S0 M03', 'G50 S0\nG96 S200 M03',
  'G81', 'G80', 'G81 Z-5 R2', 'G83 Z-5 R2 Q0 F100', 'G98 G81 X10 Y10 Z-5 R2 F100\nG80',
  'T1 M06\nG43 H1 Z50\nG41 D1 X0 Y0\nG40', 'T1 M06\nG43 H1 Z50\nG18 G02 X10 Z0 R5 F100',
  'G91 G28 Z0', 'G28', 'G04', 'G04 P-5', 'F0\nG01 X10', 'S99999 M03',
  'G20 G00 X1 Z1', 'g0 x10 z-5 m3 s100 t0101', 'G00 X10 X20', 'G00 G01 X10'
];

for (const machine of MACHINES) {
  test(`${machine.adapter.id}: programmi strani non bloccano il simulatore`, () => {
    for (const text of STRANGE) {
      const crash = crashOf(text, machine);
      assert(!crash, `«${text.replace(/\n/g, '⏎')}»: ${crash?.message}`);
    }
  });
}

// Programmi casuali ma riproducibili (sempre gli stessi a ogni esecuzione dei test).
// Blocchi plausibili: ogni lettera una volta, un solo G, mai X con U né Z con W, codici G/M della macchina.
function randomPrograms(seed, count, { letters, g, m, header }) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const pick = (list) => list[Math.floor(random() * list.length)];
  const excludes = { X: 'U', U: 'X', Z: 'W', W: 'Z' };
  const programs = [];
  for (let p = 0; p < count; p++) {
    const lines = [];
    for (let l = 0; l < 25; l++) {
      const words = [];
      const used = new Set();
      const n = 1 + Math.floor(random() * 4);
      for (let w = 0; w < n; w++) {
        const letter = pick(letters);
        if (used.has(letter) || used.has(excludes[letter])) continue;
        used.add(letter);
        const value = letter === 'G' ? pick(g)
          : letter === 'M' ? pick(m)
          : letter === 'P' || letter === 'Q' ? pick(['1', '2', '5', '10', '500'])
          : letter === 'D' ? '1'
          : letter === 'F' ? pick(['0.1', '0.2', '100', '300'])
          : pick(['0', '1', '2', '3', '4', '-5', '10', '0.5', '-0.2', '0.1', '20', '40', '100', String(Math.round(random() * 200 - 100))]);
        words.push(letter + value);
      }
      lines.push(words.join(' '));
    }
    programs.push(header + lines.join('\n'));
  }
  return programs;
}

// Intestazioni valide (utensile, mandrino, posizione), così i programmi casuali arrivano a muovere l'utensile
const LATHE_RANDOM = {
  letters: ['G', 'G', 'X', 'Z', 'X', 'Z', 'U', 'W', 'F', 'R', 'I', 'K', 'P', 'Q', 'M'],
  g: ['0', '1', '2', '3', '0', '1', '2', '3', '4', '28', '40', '41', '42', '70', '71', '96', '97', '98', '99'],
  m: ['3', '5', '8', '9', '0', '1'],
  header: 'G50 S2000\nT0101\nG97 S1000 M03\nG00 X60 Z5\nF0.2\n'
};
const MILL_RANDOM = {
  letters: ['G', 'G', 'X', 'Y', 'Z', 'X', 'Y', 'F', 'D', 'R', 'I', 'J', 'K', 'Q', 'P', 'M'],
  g: ['0', '1', '2', '3', '0', '1', '2', '3', '4', '17', '18', '19', '28', '40', '41', '42', '80', '81', '83', '90', '91'],
  m: ['3', '5', '8', '9', '6', '0', '1'],
  header: 'T1 M06\nG43 H1 Z50\nS3000 M03\nG00 X-10 Y-10\nF300\n'
};

test('tornio: 150 programmi casuali senza errori JavaScript', () => {
  for (const text of randomPrograms(7, 150, LATHE_RANDOM)) {
    const crash = crashOf(text, MACHINES[0]);
    assert(!crash, `${crash?.message}\n${text}`);
  }
});

test('fresa: 150 programmi casuali senza errori JavaScript', () => {
  for (const text of randomPrograms(11, 150, MILL_RANDOM)) {
    const crash = crashOf(text, MACHINES[1]);
    assert(!crash, `${crash?.message}\n${text}`);
  }
});

test('i programmi casuali arrivano davvero a muovere l\'utensile', () => {
  // Controllo del test stesso: almeno un programma casuale su cinque deve produrre movimenti di lavoro
  for (const [machine, programs] of [
    [MACHINES[0], randomPrograms(7, 150, LATHE_RANDOM)],
    [MACHINES[1], randomPrograms(11, 150, MILL_RANDOM)]
  ]) {
    const moving = programs.filter((text) => {
      const program = machine.adapter.interpret(checkProgram(text, machine.adapter.codes).blocks, { offsets: machine.offsets });
      return program.steps.some((s) => s.moves.some((m) => m.type === 'line' || m.type === 'arc'));
    }).length;
    assert(moving >= 30, `${machine.adapter.id}: solo ${moving} programmi su 150 muovono l'utensile`);
  }
});
