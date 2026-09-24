import { test, assertEqual, assert } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { interpretLathe } from '../js/interpreter/interpret-lathe.js';
import { pointAt } from '../js/interpreter/path.js';
import { LATHE } from '../js/machines/lathe/codes.js';
import { LATHE_PARAMS } from '../js/machines/lathe/machine.js';
import { LATHE_TOOLS } from '../js/machines/lathe/tools.js';
import { createLatheSimulator, runAll } from '../js/machines/lathe/simulator.js';

// Cicli G71/G70 e compensazione del raggio di punta G41/G42

const run = (text) => interpretLathe(checkProgram(text, LATHE).blocks, { params: LATHE_PARAMS, tools: LATHE_TOOLS });
const alarmOf = (text) => run(text).steps.at(-1).alarm?.code ?? null;
const near = (a, b, eps) => Math.abs(a - b) <= eps;

function simulate(text, setup = { diameter: 40, length: 60, faceAllowance: 1 }) {
  const program = run(text);
  const sim = createLatheSimulator({ params: LATHE_PARAMS, tools: LATHE_TOOLS });
  sim.reset(setup);
  return { program, sim, alarm: runAll(program, sim) };
}

const HEAD = 'G21 G99\nT0101\nG50 S2500\nG96 S180 M03\n';
const PROFILE = [
  'N100 G00 X20',
  'N110 G01 Z-20',
  'N120 X30 Z-25',
  'N130 Z-40',
  'N140 X42'
].join('\n');
const G71 = `${HEAD}G00 X42 Z2\nG71 U2 R0.5\nG71 P100 Q140 U0.4 W0.1 F0.25\n${PROFILE}\nG00 X100 Z100\nM30`;

// G71
test('G71 salta il profilo e prosegue dopo Q', () => {
  const lines = run(G71).steps.map((s) => s.block.source.trim());
  assert(!lines.some((l) => l.startsWith('N110')), 'il profilo non va eseguito');
  assert(lines.includes('G00 X100 Z100'), 'deve proseguire dopo Q');
});
test('G71 torna al punto di partenza', () => {
  const step = run(G71).steps.find((s) => s.block.source.includes('P100'));
  assertEqual(step.moves.at(-1).to, { x: 42, z: 2 });
});
test('G71 lascia il sovrametallo e le passate sono di 2 mm', () => {
  const { sim, alarm } = simulate(G71);
  assertEqual(alarm, null);
  const c = sim.stock.c;
  // Profilo Ø20 fino a Z-20: con sovrametallo U0.4 resta Ø20.4
  assert(near(2 * sim.stock.radiusAt(-10), 20.4, 2 * c + 0.01), `Ø a Z-10: ${2 * sim.stock.radiusAt(-10)}`);
  assert(near(2 * sim.stock.radiusAt(-35), 30.4, 2 * c + 0.01), `Ø a Z-35: ${2 * sim.stock.radiusAt(-35)}`);
  // Oltre il profilo il grezzo resta intatto
  assert(near(2 * sim.stock.radiusAt(-50), 40, 2 * c), `Ø a Z-50: ${2 * sim.stock.radiusAt(-50)}`);
});
test('G71 + G70: il pezzo finito ha le quote del profilo', () => {
  const text = G71.replace('G00 X100 Z100\nM30', 'G70 P100 Q140\nG00 X100 Z100\nM30');
  const { sim, alarm } = simulate(text);
  assertEqual(alarm, null);
  const c = sim.stock.c;
  assert(near(2 * sim.stock.radiusAt(-10), 20, 2 * c + 0.01), `Ø a Z-10: ${2 * sim.stock.radiusAt(-10)}`);
  assert(near(2 * sim.stock.radiusAt(-35), 30, 2 * c + 0.01), `Ø a Z-35: ${2 * sim.stock.radiusAt(-35)}`);
});
test('G70 evidenzia le righe del profilo mentre le esegue', () => {
  const text = G71.replace('G00 X100 Z100\nM30', 'G70 P100 Q140\nG00 X100 Z100\nM30');
  const lines = run(text).steps.map((s) => s.block.source.trim().split(' ')[0]);
  const at = lines.indexOf('G70');
  assertEqual(lines.slice(at, at + 7), ['G70', 'N100', 'N110', 'N120', 'N130', 'N140', 'G70']);
});

// Allarmi dei cicli
test('2007 G71 senza il primo blocco', () => {
  assertEqual(alarmOf(`${HEAD}G00 X42 Z2\nG71 P100 Q140 U0.4 W0.1 F0.25\n${PROFILE}`), 2007);
});
test('2007 G70 senza Q', () => assertEqual(alarmOf(`${HEAD}G00 X42 Z2\nG70 P100\n${PROFILE}`), 2007));
test('3006 blocco del profilo inesistente', () => {
  assertEqual(alarmOf(`${HEAD}G00 X42 Z2\nG71 U2 R0.5\nG71 P100 Q999 U0.4 W0.1 F0.25\n${PROFILE}`), 3006);
});
test('3007 primo blocco del profilo con Z', () => {
  const bad = PROFILE.replace('N100 G00 X20', 'N100 G00 X20 Z0');
  assertEqual(alarmOf(`${HEAD}G00 X42 Z2\nG71 U2 R0.5\nG71 P100 Q140 U0.4 W0.1 F0.25\n${bad}`), 3007);
});
test('3007 profilo con una gola', () => {
  const bad = PROFILE.replace('N130 Z-40', 'N130 Z-30\nN135 X26 Z-32\nN137 Z-40');
  const program = run(`${HEAD}G00 X42 Z2\nG71 U2 R0.5\nG71 P100 Q140 U0.4 W0.1 F0.25\n${bad}`);
  const alarm = program.steps.at(-1).alarm;
  assertEqual(alarm?.code, 3007);
  assert(alarm.message.includes('X'), alarm.message);
});
test('G72 resta non supportato', () => assertEqual(alarmOf('G72 W2 R1'), 1013));

// Compensazione del raggio di punta
const T3 = 'G21 G99\nT0303\nG97 S1000 M03\n';
test('G42 su un cilindro non cambia il percorso della punta', () => {
  const steps = run(`${T3}G00 G42 X20 Z2\nG01 Z-10 F0.1\nG00 G40 X50`).steps;
  const cut = steps.find((s) => s.block.source.startsWith('G01')).moves[0];
  assert(near(cut.from.x, 20, 1e-9) && near(cut.to.x, 20, 1e-9), `X ${cut.from.x} -> ${cut.to.x}`);
});
const T1 = 'G21 G99\nT0101\nG97 S1000 M03\n';
test('G42 sullo smusso a 45°: il pezzo viene esatto', () => {
  // Smusso da Ø20 a Ø30 in 5 mm con T01 (raggio di punta 0.8): a Z-2.5 il diametro deve essere 25
  const program = `${T1}G00 X44 Z2\nG00 G42 X20\nG01 Z0 F0.1\nX30 Z-5\nZ-10\nX44\nG00 G40 X60`;
  const setup = { diameter: 28, length: 40, faceAllowance: 0 };
  const plain = simulate(program.replace(' G42', '').replace(' G40', ''), setup);
  const comp = simulate(program, setup);
  assertEqual(comp.alarm, null);
  const c = comp.sim.stock.c;
  const dPlain = 2 * plain.sim.stock.radiusAt(-2.5);
  const dComp = 2 * comp.sim.stock.radiusAt(-2.5);
  assert(near(dComp, 25, 2 * c + 0.02), `con G42 Ø ${dComp}`);
  assert(dPlain > dComp + 0.2, `senza G42 deve restare materiale: ${dPlain} contro ${dComp}`);
});
test('G42 sul raccordo concavo R2: raggio corretto', () => {
  const program = `${T1}G00 X44 Z2\nG00 G42 X20\nG01 Z-10 F0.1\nG02 X24 Z-12 R2\nG01 X44\nG00 G40 X60 Z2`;
  const { sim, alarm } = simulate(program, { diameter: 26, length: 40, faceAllowance: 0 });
  assertEqual(alarm, null);
  const c = sim.stock.c;
  // A 45° sul raccordo: centro (Z-10, r12), punto a Z-10-√2, r 12-√2
  const z = -10 - Math.SQRT2;
  assert(near(sim.stock.radiusAt(z), 12 - Math.SQRT2, c + 0.03), `r a Z${z.toFixed(2)}: ${sim.stock.radiusAt(z)}`);
});
test('dopo G40 la punta torna sulla quota programmata', () => {
  const steps = run(`${T3}G00 X44 Z2\nG00 G42 X20\nG01 Z0 F0.1\nX30 Z-5\nG00 G40 X60 Z10`).steps;
  const last = steps.at(-1).moves.at(-1);
  assertEqual({ x: +last.to.x.toFixed(6), z: +last.to.z.toFixed(6) }, { x: 60, z: 10 });
});
test('il tempo ciclo tiene conto della compensazione', () => {
  const program = run(`${T3}G00 X44 Z2\nG00 G42 X20\nG01 Z0 F0.1\nX30 Z-5\nG00 G40 X60`);
  assert(Number.isFinite(program.totalTime) && program.totalTime > 0);
  for (const step of program.steps) for (const m of step.moves) {
    if (m.type === 'arc') {
      const end = pointAt(m, 1);
      assert(near(end.x, m.to.x, 1e-6) && near(end.z, m.to.z, 1e-6), 'arco coerente');
    }
  }
});
