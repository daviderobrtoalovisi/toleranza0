import { test, assertEqual, assert } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { interpretLathe } from '../js/interpreter/interpret-lathe.js';
import { LATHE } from '../js/machines/lathe/codes.js';
import { LATHE_PARAMS, setupFromProgram } from '../js/machines/lathe/machine.js';
import { LATHE_TOOLS, toolOutline } from '../js/machines/lathe/tools.js';
import { createLatheSimulator, runAll } from '../js/machines/lathe/simulator.js';

const SETUP = { diameter: 50, length: 80, faceAllowance: 1 };
const HEADER = 'G21 G99\nT0101\nG97 S1000 M03\n';

function simulate(text, setup = SETUP) {
  const program = interpretLathe(checkProgram(text, LATHE).blocks, { params: LATHE_PARAMS, tools: LATHE_TOOLS });
  const sim = createLatheSimulator({ params: LATHE_PARAMS, tools: LATHE_TOOLS });
  sim.reset(setup);
  return { sim, alarm: runAll(program, sim) };
}
const near = (a, b, eps) => Math.abs(a - b) <= eps;

// Utensili
for (const [id, tool] of Object.entries(LATHE_TOOLS)) {
  test(`T${id}: il punto programmato è lo spigolo in basso a sinistra (o destro per il troncatore)`, () => {
    const o = toolOutline(tool);
    assert(near(o.minR, 0, 1e-3), `minR ${o.minR}`);
    if (tool.shape === 'groove') assert(near(o.maxZ, 0, 1e-9), `maxZ ${o.maxZ}`);
    else assert(near(o.minZ, 0, 1e-3), `minZ ${o.minZ}`);
  });
}

// Asportazione
test('la cilindratura porta il pezzo al diametro programmato', () => {
  const { sim, alarm } = simulate(`${HEADER}G00 X52 Z2\nX42\nG01 Z-40 F0.25\nX52\nG00 X100 Z100`);
  assertEqual(alarm, null);
  const c = sim.stock.c;
  assert(near(2 * sim.stock.radiusAt(-20), 42, 2 * c), `Ø a Z-20: ${2 * sim.stock.radiusAt(-20)}`);
  assert(near(2 * sim.stock.radiusAt(-60), 50, 2 * c), `Ø a Z-60: ${2 * sim.stock.radiusAt(-60)}`);
});
test('la sfacciatura toglie il sovrametallo fino a Z0', () => {
  const { sim, alarm } = simulate(`${HEADER}G00 X52 Z0\nG01 X-1.6 F0.15\nG00 Z5`);
  assertEqual(alarm, null);
  assertEqual(sim.stock.radiusAt(0.5), 0);
  assert(sim.stock.radiusAt(-0.5) > 24);
});
test('un movimento in aria non toglie materiale', () => {
  const { sim } = simulate(`${HEADER}G00 X60 Z5\nG01 Z2 F0.2`);
  assert(sim.stock.data.every((v, i) => v === 1 || sim.stock.zMin + ((i % sim.stock.nz) + 0.5) * sim.stock.c > sim.stock.zMax));
});

// Collisioni
test('4001 rapido dentro il materiale', () => {
  assertEqual(simulate(`${HEADER}G00 X40 Z2\nZ-10`).alarm?.code, 4001);
});
test('4001 rapido che sfiora il pezzo senza toccarlo: nessun allarme', () => {
  assertEqual(simulate(`${HEADER}G00 X50.2 Z2\nZ-30`).alarm, null);
});
test('4002 utensile contro il mandrino', () => {
  assertEqual(simulate(`${HEADER}G00 X70 Z2\nG01 Z-85 F0.3`).alarm?.code, 4002);
});
test('senza utensile il simulatore non controlla collisioni', () => {
  assertEqual(simulate('G00 X40 Z-10').alarm, null);
});

// Grezzo nel programma
test('(GREZZO D40 L60) imposta il grezzo', () => {
  assertEqual(setupFromProgram('%\n(GREZZO D40 L60)\n'), { diameter: 40, length: 60, faceAllowance: 1 });
  assertEqual(setupFromProgram('(grezzo d40 l60 s2)'), { diameter: 40, length: 60, faceAllowance: 2 });
  assertEqual(setupFromProgram('(GREZZO DIAMETRO 40)'), null);
});
