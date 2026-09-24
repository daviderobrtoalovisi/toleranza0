import { test, assertEqual, assert } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { interpretLathe } from '../js/interpreter/interpret-lathe.js';
import { pointAt } from '../js/interpreter/path.js';
import { LATHE } from '../js/machines/lathe/codes.js';
import { LATHE_PARAMS } from '../js/machines/lathe/machine.js';
import { LATHE_TOOLS } from '../js/machines/lathe/tools.js';

const HEADER = 'G21 G99\nT0101\nG97 S1000 M03\n';
const run = (text) => interpretLathe(checkProgram(text, LATHE).blocks, { params: LATHE_PARAMS, tools: LATHE_TOOLS });
const lastStep = (text) => run(text).steps.at(-1);
const alarmOf = (text) => lastStep(text).alarm?.code ?? null;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('parte dal punto di riferimento', () => {
  assertEqual(lastStep('G00 U0').state.pos, LATHE_PARAMS.home);
});
test('X e Z assolute, U e W incrementali', () => {
  assertEqual(lastStep('G00 X50 Z2\nU-10 W-5').state.pos, { x: 40, z: -3 });
});
test('G00 è modale', () => {
  assertEqual(lastStep('G00 X50 Z2\nZ10').moves[0].type, 'rapid');
});
test('G20 converte i pollici in millimetri', () => {
  assertEqual(lastStep('G20 G00 X1 Z1').state.pos, { x: 25.4, z: 25.4 });
});
test('G28 U0 W0 torna al punto di riferimento', () => {
  const step = lastStep('G00 X50 Z2\nG28 U0 W0');
  assertEqual(step.state.pos, LATHE_PARAMS.home);
  assertEqual(step.moves.length, 2);
});
test('G28 U0 riporta a casa solo l\'asse X', () => {
  assertEqual(lastStep('G00 X50 Z2\nG28 U0').state.pos, { x: LATHE_PARAMS.home.x, z: 2 });
});
test('G04 P1500 è una sosta di 1,5 secondi', () => {
  const move = lastStep('G04 P1500').moves[0];
  assertEqual([move.type, move.duration], ['dwell', 1.5]);
});
test('tempo di G01 con avanzamento al giro', () => {
  // 40 mm a 0.25 mm/giro × 1000 giri/min = 250 mm/min -> 9,6 s
  const move = lastStep(`${HEADER}G00 X40 Z2\nG01 Z-38 F0.25`).moves[0];
  assert(near(move.duration, 9.6), `durata ${move.duration}`);
});
test('G96 aumenta i giri quando il diametro cala, fino al limite G50', () => {
  const program = run('G21 G99\nT0101\nG50 S2000\nG96 S200 M03\nG00 X100 Z0\nG01 X0 F0.1');
  const move = program.steps.at(-1).moves[0];
  // Senza limite servirebbero giri infiniti al centro: il tempo resta finito grazie a G50
  assert(Number.isFinite(move.duration) && move.duration > 0);
});

// Archi
test('G02 con R: raccordo concavo verso lo spallamento', () => {
  const move = lastStep(`${HEADER}G00 X20 Z-15\nG02 X30 Z-20 R5 F0.1`).moves[0];
  assert(near(move.center.z, -15) && near(move.center.r, 15), `centro ${JSON.stringify(move.center)}`);
  assert(move.sweep < 0, 'orario');
  const end = pointAt(move, 1);
  assert(near(end.x, 30, 1e-6) && near(end.z, -20, 1e-6));
});
test('G03 con R: raggio convesso sullo spigolo', () => {
  const move = lastStep(`${HEADER}G00 X34 Z-20\nG03 X40 Z-23 R3 F0.1`).moves[0];
  assert(near(move.center.z, -23) && near(move.center.r, 17), `centro ${JSON.stringify(move.center)}`);
  assert(move.sweep > 0, 'antiorario');
});
test('G03 con I e K', () => {
  const move = lastStep(`${HEADER}G00 X34 Z-20\nG03 X40 Z-23 I0 K-3 F0.1`).moves[0];
  assert(near(move.center.z, -23) && near(move.center.r, 17));
  assert(near(move.length, (Math.PI / 2) * 3), `lunghezza ${move.length}`);
});

// Allarmi dell'interprete
test('1013 G50 con quote', () => assertEqual(alarmOf('G50 X100 Z50'), 1013));
test('1013 R in G01', () => assertEqual(alarmOf(`${HEADER}G00 X20 Z2\nG01 X30 Z-5 R2 F0.1`), 1013));
test('1014 X e U nello stesso blocco', () => assertEqual(alarmOf('G00 X20 U5'), 1014));
test('2001 G01 senza avanzamento', () => assertEqual(alarmOf(`${HEADER}G00 X20 Z2\nG01 Z-10`), 2001));
test('2002 G01 con mandrino fermo', () => assertEqual(alarmOf('T0101\nG00 X20 Z2\nG01 Z-10 F0.2'), 2002));
test('2002 G01 dopo M05', () => assertEqual(alarmOf(`${HEADER}M05\nG00 X20 Z2\nG01 Z-10 F0.2`), 2002));
test('2003 G01 senza utensile', () => assertEqual(alarmOf('G97 S1000 M03\nG00 X20 Z2\nG01 Z-10 F0.2'), 2003));
test('2004 utensile inesistente', () => assertEqual(alarmOf('T0909'), 2004));
test('3001 raggio troppo piccolo', () => assertEqual(alarmOf(`${HEADER}G00 X20 Z0\nG02 X40 Z-10 R5 F0.1`), 3001));
test('3002 centro I/K incoerente', () => assertEqual(alarmOf(`${HEADER}G00 X20 Z0\nG02 X30 Z-5 I10 K0 F0.1`), 3002));
test('3003 arco senza R né I/K', () => assertEqual(alarmOf(`${HEADER}G00 X20 Z0\nG02 X30 Z-5 F0.1`), 3003));
test('dopo un allarme l\'interprete si ferma', () => {
  const program = run(`${HEADER}G00 X20 Z0\nG02 X30 Z-5 F0.1\nG00 X100`);
  assertEqual(program.steps.at(-1).alarm.code, 3003);
});
test('M30 chiude il programma', () => {
  assertEqual(lastStep('G00 X50\nM30\nG00 X10').stop, 'end');
});
