import { test, assertEqual, assert } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { interpretMill } from '../js/interpreter/interpret-mill.js';
import { pointAt3 } from '../js/interpreter/path-3d.js';
import { MILL } from '../js/machines/mill/codes.js';
import { MILL_PARAMS, millSetupFromProgram, stockBox } from '../js/machines/mill/machine.js';
import { MILL_TOOLS, bottomAt } from '../js/machines/mill/tools.js';
import { createMillSimulator, runAllMill } from '../js/machines/mill/simulator.js';

// Fresatrice 3 assi: interprete e simulatore

const SETUP = { length: 100, width: 80, height: 30, topAllowance: 1, zero: 'corner' };
const HEAD = 'G21 G90 G94\nT1 M06\nG43 H1 Z50\nS3000 M03\n';
const run = (text) => interpretMill(checkProgram(text, MILL).blocks, { params: MILL_PARAMS, tools: MILL_TOOLS });
const last = (text) => run(text).steps.at(-1);
const alarmOf = (text) => last(text).alarm?.code ?? null;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

function simulate(text, setup = SETUP) {
  const program = run(text);
  const sim = createMillSimulator({ params: MILL_PARAMS, tools: MILL_TOOLS });
  sim.reset(setup);
  return { program, sim, alarm: runAllMill(program, sim) };
}

// Sintassi e codici
test('fresa: Y e H sono indirizzi validi', () => assertEqual(checkProgram('G43 H1 Z50\nG00 X10 Y20', MILL).alarms, []));
test('fresa: G18 non ancora supportato', () => assertEqual(checkProgram('G18', MILL).alarms[0]?.code, 1013));
test('fresa: G98 e G81 insieme sono ammessi (gruppi diversi)', () => {
  assertEqual(checkProgram('G98 G81 X10 Y10 Z-5 R2 F100', MILL).alarms, []);
});

// Interprete
test('G90 assolute e G91 incrementali', () => {
  assertEqual(last(`${HEAD}G00 X10 Y20\nG91 X5 Y-5 Z-10`).state.pos, { x: 15, y: 15, z: 40 });
});
test('T prepara e M06 monta l\'utensile', () => {
  const steps = run('T2\nG00 X10\nM06').steps;
  assertEqual(steps[1].state.tool, null);
  assertEqual(steps[2].state.tool, 2);
});
test('G02 con I e J: cerchio completo', () => {
  const move = last(`${HEAD}G00 X25 Y0 Z1\nG01 Z-1 F100\nG02 X25 Y0 I-25 J0 F400`).moves[0];
  assert(near(Math.abs(move.sweep), 2 * Math.PI) && move.sweep < 0, `sweep ${move.sweep}`);
  assert(near(move.length, 2 * Math.PI * 25, 1e-6));
});
test('G03 con R: centro a sinistra', () => {
  const move = last(`${HEAD}G00 X10 Y0 Z1\nG01 Z0 F100\nG03 X0 Y10 R10 F400`).moves[0];
  assert(near(move.center.x, 0) && near(move.center.y, 0), JSON.stringify(move.center));
});
test('arco elicoidale: Z scende in modo lineare', () => {
  const move = last(`${HEAD}G00 X10 Y0 Z1\nG01 Z0 F100\nG03 X10 Y0 Z-2 I-10 J0 F400`).moves[0];
  assert(near(pointAt3(move, 0.5).z, -1), `z a metà ${pointAt3(move, 0.5).z}`);
});
test('G91 G28 Z0 porta Z al punto di riferimento', () => {
  const step = last(`${HEAD}G00 X10 Y10 Z5\nG91 G28 Z0`);
  assertEqual(step.state.pos, { x: 10, y: 10, z: MILL_PARAMS.home.z });
});
test('tempo di G01 a 600 mm/min', () => {
  const move = last(`${HEAD}G00 X0 Y0 Z5\nG01 X60 F600`).moves[0];
  assert(near(move.duration, 6), `durata ${move.duration}`);
});

// Cicli di foratura
test('G81 con G99: foro e ritorno al piano R', () => {
  const moves = last(`${HEAD}G00 X10 Y10\nG99 G81 X20 Y20 Z-10 R2 F100`).moves;
  assertEqual(moves.map((m) => m.type), ['rapid', 'rapid', 'line', 'rapid']);
  assertEqual(moves.at(-1).to, { x: 20, y: 20, z: 2 });
  assertEqual(moves[2].to.z, -10);
});
test('G81 con G98: ritorno al piano iniziale', () => {
  assertEqual(last(`${HEAD}G00 X10 Y10\nG98 G81 X20 Y20 Z-10 R2 F100`).moves.at(-1).to.z, 50);
});
test('il ciclo resta attivo: un blocco con X/Y fa un altro foro, G80 lo annulla', () => {
  const steps = run(`${HEAD}G00 X10 Y10\nG99 G81 X20 Y20 Z-10 R2 F100\nX40\nG80\nX60`).steps;
  assert(steps.at(-3).moves.some((m) => m.to.z === -10), 'secondo foro');
  assertEqual(steps.at(-1).moves.map((m) => m.type), ['rapid']);
});
test('G83 fa le beccate fino al fondo', () => {
  const moves = last(`${HEAD}G00 X10 Y10\nG99 G83 Z-12 R2 Q5 F100`).moves;
  const cuts = moves.filter((m) => m.type === 'line').map((m) => m.to.z);
  assertEqual(cuts, [-3, -8, -12]);
});
test('G82 fa la sosta sul fondo', () => {
  const moves = last(`${HEAD}G00 X10 Y10\nG99 G82 Z-5 R2 P500 F100`).moves;
  assert(moves.some((m) => m.type === 'dwell' && near(m.duration, 0.5)));
});

// Allarmi dell'interprete
test('2003 M06 senza T', () => assertEqual(alarmOf('M06'), 2003));
test('2004 utensile inesistente', () => assertEqual(alarmOf('T9 M06'), 2004));
test('2008 movimento Z senza G43 dopo M06', () => assertEqual(alarmOf('T1 M06\nG00 X10 Y10\nZ5'), 2008));
test('2008 anche dopo un secondo cambio utensile', () => {
  assertEqual(alarmOf(`${HEAD}G00 Z10\nT2 M06\nG00 Z5`), 2008);
});
test('senza utensile si può muovere Z senza G43', () => assertEqual(alarmOf('G00 Z100'), null));
test('2009 H diverso dall\'utensile montato', () => assertEqual(alarmOf('T1 M06\nG43 H2 Z50'), 2009));
test('2001 G01 senza avanzamento', () => assertEqual(alarmOf('T1 M06\nG43 H1 Z50\nS1000 M03\nG01 X10'), 2001));
test('2002 G01 a mandrino fermo', () => assertEqual(alarmOf('T1 M06\nG43 H1 Z50\nG01 X10 F100'), 2002));
test('2007 G83 senza Q', () => assertEqual(alarmOf(`${HEAD}G83 X10 Y10 Z-10 R2 F100`), 2007));
test('2007 G81 senza R', () => assertEqual(alarmOf(`${HEAD}G81 X10 Y10 Z-10 F100`), 2007));
test('3001 raggio troppo piccolo', () => assertEqual(alarmOf(`${HEAD}G00 X0 Y0 Z5\nG02 X40 Y0 R10 F300`), 3001));
test('3004 fuori corsa in Y', () => assertEqual(alarmOf('G00 Y500'), 3004));

// Grezzo
test('(GREZZO X100 Y80 Z30 CENTRO S2) imposta il grezzo', () => {
  assertEqual(millSetupFromProgram('(GREZZO X100 Y80 Z30 CENTRO S2)'), { length: 100, width: 80, height: 30, topAllowance: 2, zero: 'center' });
  assertEqual(millSetupFromProgram('(GREZZO X50 Y40 Z20)').zero, 'corner');
});
test('zero al centro: grezzo simmetrico', () => {
  const box = stockBox({ ...SETUP, zero: 'center' });
  assertEqual([box.xMin, box.xMax, box.yMin, box.yMax, box.zTop, box.zBottom], [-50, 50, -40, 40, 1, -29]);
});
test('forma del fondo: sferica e punta', () => {
  assert(near(bottomAt(MILL_TOOLS[4], 4), 4), 'fresa sferica al bordo');
  assert(near(bottomAt(MILL_TOOLS[4], 0), 0));
  assert(near(bottomAt(MILL_TOOLS[3], 4), 4 / Math.tan((59 * Math.PI) / 180)));
});

// Simulatore
test('la spianatura porta la faccia a Z0', () => {
  const { sim, alarm } = simulate(`${HEAD}G00 X-8 Y40\nZ0\nG01 X108 F600\nG00 Z50`);
  assertEqual(alarm, null);
  assert(near(sim.stock.heightAt(50, 40), 0, 1e-6), `altezza ${sim.stock.heightAt(50, 40)}`);
  assert(near(sim.stock.heightAt(50, 10), 1, 1e-6), 'fuori dalla passata resta il sovrametallo');
});
test('il foro della punta ha il fondo conico', () => {
  const { sim, alarm } = simulate('G21 G90 T3 M06\nG43 H3 Z50\nS1200 M03\nG00 X50 Y40\nG99 G81 Z-10 R2 F100\nG80');
  assertEqual(alarm, null);
  assert(near(sim.stock.heightAt(50, 40), -10, 0.1), `centro ${sim.stock.heightAt(50, 40)}`);
  assert(sim.stock.heightAt(52.5, 40) > -9, 'più in alto verso il bordo del foro');
});
test('4001 rapido dentro il materiale', () => {
  assertEqual(simulate(`${HEAD}G00 X50 Y40 Z5\nZ-3`).alarm?.code, 4001);
});
test('3005 passata più profonda del massimo', () => {
  const { alarm } = simulate(`${HEAD}G00 X-8 Y40 Z5\nZ-6\nG01 X50 F300`);
  assertEqual(alarm?.code, 3005);
});
test('4003 fresa che lavora più in profondità del tagliente', () => {
  // Foro profondo con la punta, poi la fresa D10 scende nel foro e si sposta: sopra il tagliente c'è materiale
  const text = `${HEAD}G00 X-8 Y40 Z5\nZ-25\nG01 X20 F200`;
  const { alarm } = simulate(text);
  assert(alarm && (alarm.code === 4003 || alarm.code === 3005), JSON.stringify(alarm));
});
test('4003 il gambo tocca: tagliente 22 mm, passata a Z-24 lungo il bordo', () => {
  // Scende fuori dal pezzo e sfiora il bordo con 0.5 mm di impegno: profondità piccola ma sopra il tagliente c'è materiale
  const { alarm } = simulate(`${HEAD}G00 X-6 Y40 Z5\nZ-24\nG01 X-4.5 F200\nY60`);
  assertEqual(alarm?.code, 4003);
});
test('3008 punta mossa di lato nel materiale', () => {
  const { alarm } = simulate('G21 G90 T3 M06\nG43 H3 Z50\nS1200 M03\nG00 X50 Y40 Z2\nG01 Z-5 F100\nX60');
  assertEqual(alarm?.code, 3008);
});
test('4004 utensile contro la ganascia della morsa', () => {
  const { alarm } = simulate(`${HEAD}G00 X50 Y-10 Z5\nZ-15`);
  assertEqual(alarm?.code, 4004);
});
test('passare sopra le ganasce a Z0 non urta', () => {
  assertEqual(simulate(`${HEAD}G00 X-8 Y2 Z0\nG01 X108 F600`).alarm, null);
});
