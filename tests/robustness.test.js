import { test, assert } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { latheAdapter, createLatheAdapter } from '../js/machines/lathe/adapter.js';
import { millAdapter, createMillAdapter } from '../js/machines/mill/adapter.js';
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

// Siemens SINUMERIK: stessi programmi strani più quelli tipici della sua sintassi
const SIEMENS_STRANGE = [
  'CR=', 'CR', 'CR5', 'X=', 'X=IC(', 'X=IC()', 'X=IC(5', 'X=AC(-)', 'X==5', 'LIMS=-1', 'DIAMON=5',
  'T="', 'T=""', 'CYCLE81(', 'CYCLE81()', 'CYCLE95("P",2)', 'CYCLE95("A:B",2)', 'CYCLE95("A:B", 2, , , , 0.2, , 0.1, 9)\nM30\nA: G1 X10 Z0\nB: X20', 'AA: G0 X10', 'CYCLE93()', 'CYCLE93(40, -12, 6, 4)', 'T2 D1\nF0.05\nCYCLE93(40, -12, 0.1, 50, 0, 0, 0, 0, 0, 0, 0, -1, -1, -3, -1, 15)', 'T2 D1\nCYCLE93(0, 0, 100, 0.01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.001, 0, 1)', 'N5 AA: BB: X1', 'X: G0', 'G74', 'G74 X1=0', 'G74 Z1=5',
  'D0', 'D1', 'T1 D0\nG0 X10', 'T1 D2', 'G91 X=AC(5)', 'G90 X=IC(5)', 'DIAMOF\nG0 X10\nDIAMON',
  'G4 F2', 'G4 S10', 'G4', 'M3 M8 M5 M9', 'M6 M6', 'T2 M6\nG41 X0 Y0\nG40', 'G41 X0 Y0',
  'G96 S100 LIMS=0 M3', 'G70\nG0 X1 Z1', ';;;', 'N10 ; solo commento', '((((', ';(GREZZO D50 L80)'
];

for (const [name, adapter, run] of [
  ['tornio Siemens', createLatheAdapter(undefined, 'siemens'), runAll],
  ['fresa Siemens', createMillAdapter(undefined, 'siemens'), runAllMill]
]) {
  test(`${name}: programmi strani non bloccano il simulatore`, () => {
    const machine = { adapter, runAll: run, offsets: adapter.offsets?.defaults ?? null };
    for (const text of [...STRANGE, ...SIEMENS_STRANGE]) {
      const crash = crashOf(text, machine);
      assert(!crash, `«${text.replace(/\n/g, '⏎')}»: ${crash?.message}`);
    }
  });
}
