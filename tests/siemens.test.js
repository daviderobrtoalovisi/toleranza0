import { test, assert, assertEqual } from './runner.js';
import { parseSiemensLine } from '../js/parser/parse-siemens.js';
import { createLatheAdapter } from '../js/machines/lathe/adapter.js';
import { createMillAdapter } from '../js/machines/mill/adapter.js';
import { runExample } from './examples.test.js';
import { translateSiemens } from '../js/interpreter/siemens-to-fanuc.js';

// Linguaggio Siemens SINUMERIK: lettura, traduzione verso il Fanuc, allarmi e stesso pezzo finito

const lathe = createLatheAdapter(undefined, 'siemens');
const mill = createMillAdapter(undefined, 'siemens');
const syntaxOf = (adapter, text) => adapter.check(text).alarms[0]?.code ?? null;
const run = (adapter, text) => adapter.interpret(adapter.check(text).blocks, { offsets: adapter.offsets?.defaults ?? null });
const lastAlarm = (adapter, text) => run(adapter, text).steps.at(-1).alarm;
// Blocchi Fanuc prodotti dalla sola traduzione, come testo (per esempio "G99 G97"); i blocchi vuoti non compaiono
const fanucOf = (adapter, text) => translateSiemens(adapter.check(text).blocks, adapter.id, { tools: adapter.tools })
  .filter((b) => b.words.length || b.alarm)
  .map((b) => (b.alarm ? `allarme ${b.alarm.code}` : b.words.map((w) => w.letter + w.value).join(' ')));
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// Lettura
test('Siemens: lettere, nomi con = e IC()', () => {
  const words = parseSiemensLine('N10 G1 X=IC(5) Z-5 CR=2.5 F0.2', 1).words;
  assertEqual(words.map((w) => [w.letter, w.value, w.mode ?? null]),
    [['N', 10, null], ['G', 1, null], ['X', 5, 'IC'], ['Z', -5, null], ['CR', 2.5, null], ['F', 0.2, null]]);
});
test('Siemens: parole chiave, commenti e più M nello stesso blocco', () => {
  const block = parseSiemensLine('DIAMON M3 M8 ; avvio', 1);
  assertEqual(block.words.map((w) => w.letter), ['DIAMON', 'M', 'M']);
  assertEqual(block.comment, 'avvio');
  assertEqual(syntaxOf(lathe, 'DIAMON M3 M8 ; avvio'), null);
});
test('Siemens: X1=0 è un nome, X10 è una quota', () => {
  assertEqual(parseSiemensLine('G74 X1=0 Z1=0', 1).words.map((w) => w.letter), ['G', 'X1', 'Z1']);
  assertEqual(parseSiemensLine('X10', 1).words[0], { letter: 'X', value: 10, raw: '10', col: 1 });
});
test('Siemens: CR senza = manca il valore (1002)', () => assertEqual(syntaxOf(lathe, 'G2 X20 Z-5 CR5'), 1002));
test('Siemens: indirizzo ripetuto (1008)', () => assertEqual(syntaxOf(lathe, 'G1 X10 X20'), 1008));
test('Siemens: parentesi fuori posto (1001)', () => assertEqual(syntaxOf(lathe, '(COMMENTO FANUC)'), 1001));
test('Siemens: i cicli non ancora simulati danno 1013', () => {
  assertEqual(syntaxOf(mill, 'POCKET3(10,0,2,-5)'), 1013);
  assertEqual(syntaxOf(lathe, 'CYCLE97(1.5, , 0, -30, 20, 20, 3, 3, 0.9, 0.05, 30, 0, 8, 1, 3, 1)'), 1013);
});
test('Siemens: utensile con il nome dà 1013', () => assertEqual(syntaxOf(mill, 'T="FRESA10"'), 1013));
test('Siemens: G33 e G95 della fresa non ancora simulati', () => {
  assertEqual(syntaxOf(lathe, 'G33 Z-20 K1.5'), 1013);
  assertEqual(syntaxOf(mill, 'G95'), 1013);
});

// Traduzione del tornio
test('tornio Siemens: G95/G94/G96 diventano G99/G98 e G96 G99', () => {
  assertEqual(fanucOf(lathe, 'G95\nG94\nG96 S180'), ['G99 G97', 'G98 G97', 'G96 G99 S180']);
});
test('tornio Siemens: LIMS diventa un G50 prima del blocco', () => {
  assertEqual(fanucOf(lathe, 'T1 D1\nG96 S180 LIMS=2000 M3'), ['T101', 'G50 S2000', 'G96 G99 S180 M3']);
});
test('tornio Siemens: T3 D1 usa il correttore dell\'utensile 3', () => {
  assertEqual(fanucOf(lathe, 'T3 D1\nT3 D0\nT2'), ['T303', 'T300', 'T202']);
});
test('tornio Siemens: D2 non ancora supportato', () => assertEqual(lastAlarm(lathe, 'T1 D2')?.code, 1013));
test('tornio Siemens: X=IC() e G91 diventano U e W', () => {
  assertEqual(fanucOf(lathe, 'G0 X=IC(2) Z-5\nG91 X-1 Z=AC(3)'), ['G0 U2 Z-5', 'U-1 Z3']);
});
test('tornio Siemens: DIAMOF raddoppia X', () => assertEqual(fanucOf(lathe, 'DIAMOF\nG0 X10'), ['G0 X20']));
test('tornio Siemens: CR diventa R, G4 F è la sosta in secondi, G70 i pollici', () => {
  assertEqual(fanucOf(lathe, 'G2 X20 Z-5 CR=5\nG4 F2\nG70'), ['G2 X20 Z-5 R5', 'G4 X2', 'G20']);
});
test('tornio Siemens: G74 torna al punto di riferimento', () => {
  const step = run(lathe, 'G0 X50 Z2\nG74 X1=0 Z1=0').steps.at(-1);
  assertEqual(step.state.pos, lathe.params.home);
});

// Traduzione della fresa
test('fresa Siemens: dopo T1 M6 la lunghezza è già attiva (niente 2008)', () => {
  assertEqual(lastAlarm(mill, 'T1 M6\nG0 X10 Y10\nZ5'), null);
});
test('fresa Siemens: con D0 muovere Z dà 2008 con il testo Siemens', () => {
  const alarm = lastAlarm(mill, 'T1 M6\nD0\nG0 Z5');
  assertEqual(alarm?.code, 2008);
  assert(alarm.hint.includes('D1'), alarm.hint);
});
test('fresa Siemens: G41 usa il correttore dell\'utensile montato', () => {
  const words = fanucOf(mill, 'T2 M6\nS3000 M3\nG0 X-10 Y10 Z5\nG1 Z-1 F100\nG41 X0 Y10');
  assert(words.at(-1).startsWith('G41 D2'), words.at(-1));
});
test('fresa Siemens: X=IC() in G90 non ancora supportato', () => {
  assertEqual(lastAlarm(mill, 'T1 M6\nG0 X=IC(5)')?.code, 1013);
});
test('fresa Siemens: G74 Z1=0 poi si torna in quote assolute', () => {
  const steps = run(mill, 'T1 M6\nG0 X10 Y10 Z20\nG74 Z1=0\nG0 X30').steps;
  assertEqual(steps.at(-1).state.pos, { x: 30, y: 10, z: mill.params.home.z });
  assertEqual(steps.at(-1).state.absolute, true);
});

// Allarmi con i testi Siemens
// Cicli di foratura della fresa
test('fresa Siemens: CYCLE81 da solo fora nella posizione attuale', () => {
  assertEqual(fanucOf(mill, 'CYCLE81(10, 0, 2, -15)'), ['G99 G81 Z-15 R2', 'G80', 'G0 Z10']);
});
test('fresa Siemens: DPR è la profondità dal piano di riferimento', () => {
  assertEqual(fanucOf(mill, 'CYCLE81(10, 5, 1, , 8)'), ['G99 G81 Z-3 R6', 'G80', 'G0 Z10']);
});
test('fresa Siemens: CYCLE82 sosta in secondi, CYCLE83 prima beccata', () => {
  assertEqual(fanucOf(mill, 'CYCLE82(10, 0, 2, -8, , 0.5)')[0], 'G99 G82 Z-8 R2 P500');
  assertEqual(fanucOf(mill, 'CYCLE83(10, 0, 2, -25, , -3)')[0], 'G99 G83 Z-25 R2 Q5');
  assertEqual(fanucOf(mill, 'CYCLE83(10, 0, 2, -25, , , 3)')[0], 'G99 G83 Z-25 R2 Q5');
});
test('fresa Siemens: MCALL fora in ogni posizione finché non si annulla', () => {
  assertEqual(fanucOf(mill, 'N10 MCALL CYCLE81(10, 0, 2, -5)\nX10 Y10\nX20\nMCALL\nX30'),
    ['N10', 'G99 G81 X10 Y10 Z-5 R2', 'G80', 'G0 Z10', 'G99 G81 X20 Z-5 R2', 'G80', 'G0 Z10', 'X30']);
});
test('fresa Siemens: ciclo incompleto dà 2007 con la sintassi Siemens', () => {
  const alarm = lastAlarm(mill, 'T3 M6\nS1000 M3\nG0 X10 Y10 Z10 F100\nCYCLE81(10, 0, 2)');
  assertEqual(alarm?.code, 2007);
  assert(alarm.hint.includes('CYCLE81(RTP'), alarm.hint);
  assertEqual(fanucOf(mill, 'CYCLE83(10, 0, 2, -25)'), ['allarme 2007']);
});
test('fresa Siemens: parametro del ciclo non numerico (1003) e ciclo con altre parole (1013)', () => {
  assertEqual(fanucOf(mill, 'CYCLE81(10, A, 2, -5)'), ['allarme 1003']);
  assertEqual(fanucOf(mill, 'G0 X10 CYCLE81(10, 0, 2, -5)'), ['allarme 1013']);
  assertEqual(fanucOf(mill, 'MCALL CYCLE81(10, 0, 2, -5)\nX10 Z5'), ['allarme 1013']);
});

// Ciclo di sgrossatura del tornio CYCLE95
const TORNIO = 'T1 D1\nG96 S180 LIMS=2000 M3\nG0 X42 Z2\n';
const PROFILO = '\nM30\nINIZIO: G1 X18 Z0\nX30 Z-10\nFINE: X41';
test('tornio Siemens: etichette a inizio blocco', () => {
  const block = parseSiemensLine('N10 INIZIO: G1 X18 Z0', 1);
  assertEqual([block.label, block.words.map((w) => w.letter)], ['INIZIO', ['N', 'G', 'X', 'Z']]);
  assertEqual(parseSiemensLine('FINE:', 2).label, 'FINE');
});
test('tornio Siemens: CYCLE95 VARI=9 diventa G71 e G70 con il profilo dopo M30', () => {
  const fanuc = fanucOf(lathe, 'CYCLE95("INIZIO:FINE", 2, 0.2, 0.3, , 0.25, , 0.1, 9)' + PROFILO);
  assertEqual(fanuc, ['G71 U2 R1', 'G71 P900000 Q900001 U0.6 W0.2 F0.25', 'G70 P900000 Q900001 F0.1', 'M30',
    'N900000', 'G0 X18', 'G1 Z0', 'X30 Z-10', 'X41', 'N900001']);
});
test('tornio Siemens: CYCLE95 VARI=1 sgrossa e prosegue con il blocco successivo', () => {
  const program = run(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, 0.2, 0.3, , 0.25, , 0.1, 1, , , 0.5)\nG0 X100 Z100' + PROFILO);
  const steps = program.steps.filter((s) => s.moves.length);
  assertEqual(steps.at(-1).alarm, null);
  assertEqual(steps.map((s) => s.block.line).slice(-2), [4, 5]);
  assert(steps.at(-2).moves.length > 5, 'la sgrossatura non ha fatto passate');
});
test('tornio Siemens: CYCLE95 VARI=5 finisce lungo il profilo evidenziando le sue righe', () => {
  const program = run(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", , , , , , , 0.1, 5)' + PROFILO);
  const lines = program.steps.filter((s) => s.moves.length).map((s) => s.block.line);
  assert([6, 7, 8].every((l) => lines.includes(l)), lines.join(','));
  assertEqual(program.steps.at(-1).alarm, null);
});
test('tornio Siemens: CYCLE95 incompleto (2007) e con parametri sbagliati', () => {
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, 0.2, 0.3, , 0.25)' + PROFILO)?.code, 2007);
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", , , , , 0.25, , 0.1, 9)' + PROFILO)?.code, 2007);
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, , , , 0.25, , , 9)' + PROFILO)?.code, 2007);
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, , , , 0.25, , 0.1, 3)' + PROFILO)?.code, 1013);
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, , , 0.2, 0.25, , 0.1, 9)' + PROFILO)?.code, 1013);
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95("KONTUR1", 2, , , , 0.25, , 0.1, 9)' + PROFILO)?.code, 1013);
  assertEqual(lastAlarm(lathe, TORNIO + 'CYCLE95(INIZIO, 2)' + PROFILO)?.code, 1003);
});
test('tornio Siemens: etichetta mancante (3006) e profilo prima di M30 (3007) con testi Siemens', () => {
  const missing = lathe.localizeAlarm(lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:ALTRA", 2, , , , 0.25, , 0.1, 9)' + PROFILO));
  assertEqual(missing?.code, 3006);
  assert(missing.message.includes('ALTRA'), missing.message);
  const before = lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, , , , 0.25, , 0.1, 9)\nINIZIO: G1 X18 Z0\nFINE: X41\nM30');
  assertEqual([before?.code, before?.line], [3007, 4]);
});
test('tornio Siemens: profilo con una gola (3007 sulla riga del profilo)', () => {
  const alarm = lastAlarm(lathe, TORNIO + 'CYCLE95("INIZIO:FINE", 2, , , , 0.25, , 0.1, 1)\nM30\nINIZIO: G1 X18 Z0\nX30 Z-10\nX25\nFINE: X41');
  assertEqual([alarm?.code, alarm?.line], [3007, 8]);
});

// Ciclo di gola del tornio CYCLE93
const GOLA = 'T2 D1\n';
const GOLA_RUN = '; (GREZZO D40 L60)\nT2 D1\nG97 S600 M3\nG0 X42 Z-12\nF0.05\n';
test('tornio Siemens: CYCLE93 fa due passate affiancate con il troncatore da 3 mm', () => {
  const pass = (z) => ['G0 Z' + z, 'G0 X42', 'G1 X32', 'G4 X0.5', 'G0 X42'];
  assertEqual(fanucOf(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, , 0.5, 5)'), ['T202', ...pass(-12), ...pass(-15)]);
  assertEqual(fanucOf(lathe, GOLA + 'CYCLE93(40, -18, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, , 0.5, 1)'), ['T202', ...pass(-12), ...pass(-15)]);
});
test('tornio Siemens: CYCLE93 a beccate di IDEP e con i sovrametalli di finitura', () => {
  const fanuc = fanucOf(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.2, 2, , 5)');
  assertEqual(fanuc.slice(1, 6), ['G0 Z-12.2', 'G0 X42', 'G1 X36', 'G0 X38', 'G1 X32.4']);
  assertEqual(fanuc.slice(-7), ['G0 Z-12', 'G1 X32', 'G0 X42', 'G0 Z-15', 'G1 X32', 'G1 Z-12', 'G0 X42']);
  const program = runExample({ text: GOLA_RUN + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.2, 2, 0.5, 5)', machine: 'lathe', dialect: 'siemens' });
  assertEqual(program.alarm, null);
});
test('tornio Siemens: CYCLE93 senza troncatore (2011) e gola troppo stretta (3009)', () => {
  const noGroove = lastAlarm(lathe, 'T1 D1\n' + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, , , 5)');
  assertEqual([noGroove?.code, noGroove?.line], [2011, 2]);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, , , 5)')?.code, 3009);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1.6, , , 5)')?.code, 3009);
});
test('tornio Siemens: CYCLE93 incompleto (2007) o non ancora simulato (1013)', () => {
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 6)')?.code, 2007);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0)')?.code, 2007);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, , , 9)')?.code, 2007);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, , , 3)')?.code, 1013);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, -12, 6, 4, 0, 10, 0, 0, 0, 0, 0, 0, 0, , , 5)')?.code, 1013);
  assertEqual(lastAlarm(lathe, GOLA + 'CYCLE93(40, A, 6, 4)')?.code, 1003);
});

test('allarme 2005 in Siemens: si parla di LIMS', () => {
  const alarm = lastAlarm(lathe, 'T1 D1\nG96 S180 M3');
  assertEqual(alarm?.code, 2005);
  assert(alarm.message.includes('LIMS') && alarm.hint.includes('LIMS=2000'), alarm.message);
});
test('allarme 3001 in Siemens: il raggio si chiama CR', () => {
  const alarm = lastAlarm(lathe, 'T1 D1\nG96 S100 LIMS=1000 M3\nG0 X20 Z0\nG2 X40 Z-10 CR=5 F0.1');
  assertEqual(alarm?.code, 3001);
  assert(alarm.message.includes('CR=5'), alarm.message);
});

// Stesso pezzo con i due linguaggi
async function example(file) {
  return (await fetch(`../examples/${file}`)).text();
}
const fanucLathe = await example('tornio-01-cilindratura.nc');
const siemensLathe = await example('tornio-siemens-01-cilindratura.nc');
const fanucMill = await example('fresa-04-contorno-g41.nc');
const siemensMill = await example('fresa-siemens-04-contorno-g41.nc');
const fanucDrill = await example('fresa-03-foratura.nc');
const fanucCycles = await example('tornio-04-cicli-g71-g70.nc');
const siemensCycles = await example('tornio-siemens-03-cycle95.nc');
const fanucGroove = await example('tornio-03-gola.nc');
const siemensGroove = await example('tornio-siemens-04-cycle93.nc');
const siemensDrill = await example('fresa-siemens-03-foratura.nc');

test('tornio: Siemens e Fanuc producono lo stesso pezzo e lo stesso tempo ciclo', () => {
  const a = runExample({ text: fanucLathe, machine: 'lathe' });
  const b = runExample({ text: siemensLathe, machine: 'lathe', dialect: 'siemens' });
  assertEqual([a.alarm, b.alarm], [null, null]);
  assert(a.sim.stock.data.every((v, i) => v === b.sim.stock.data[i]), 'grezzo diverso');
  assert(near(a.program.totalTime, b.program.totalTime, 0.01), `${a.program.totalTime} contro ${b.program.totalTime}`);
});
test('fresa: Siemens e Fanuc producono lo stesso contorno', () => {
  const a = runExample({ text: fanucMill, machine: 'mill' });
  const b = runExample({ text: siemensMill, machine: 'mill', dialect: 'siemens' });
  assertEqual([a.alarm, b.alarm], [null, null]);
  let different = 0;
  a.sim.stock.height.forEach((h, i) => { if (Math.abs(h - b.sim.stock.height[i]) > 1e-6) different++; });
  assertEqual(different, 0);
});
test('fresa: Siemens e Fanuc producono gli stessi fori', () => {
  const a = runExample({ text: fanucDrill, machine: 'mill' });
  const b = runExample({ text: siemensDrill, machine: 'mill', dialect: 'siemens' });
  assertEqual([a.alarm, b.alarm], [null, null]);
  let different = 0;
  a.sim.stock.height.forEach((h, i) => { if (Math.abs(h - b.sim.stock.height[i]) > 1e-6) different++; });
  assertEqual(different, 0);
});
test('tornio: CYCLE95 e G71/G70 producono lo stesso pezzo e lo stesso tempo ciclo', () => {
  const a = runExample({ text: fanucCycles, machine: 'lathe' });
  const b = runExample({ text: siemensCycles, machine: 'lathe', dialect: 'siemens' });
  assertEqual([a.alarm, b.alarm], [null, null]);
  assert(a.sim.stock.data.every((v, i) => v === b.sim.stock.data[i]), 'grezzo diverso');
  assert(near(a.program.totalTime, b.program.totalTime, 0.01), `${a.program.totalTime} contro ${b.program.totalTime}`);
});
test('tornio: CYCLE93 e la gola Fanuc producono lo stesso pezzo e lo stesso tempo ciclo', () => {
  const a = runExample({ text: fanucGroove, machine: 'lathe' });
  const b = runExample({ text: siemensGroove, machine: 'lathe', dialect: 'siemens' });
  assertEqual([a.alarm, b.alarm], [null, null]);
  assert(a.sim.stock.data.every((v, i) => v === b.sim.stock.data[i]), 'grezzo diverso');
  assert(near(a.program.totalTime, b.program.totalTime, 0.01), `${a.program.totalTime} contro ${b.program.totalTime}`);
});
