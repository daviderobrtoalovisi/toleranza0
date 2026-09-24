import { test, assert, assertEqual } from './runner.js';
import { MACHINE_DATA } from '../js/machines/catalog-data.js';
import { modelsFor, findModel, latheModelData, millModelData, modelSheet, GENERIC } from '../js/machines/catalog.js';
import { createLatheAdapter } from '../js/machines/lathe/adapter.js';
import { createMillAdapter } from '../js/machines/mill/adapter.js';
import { checkProgram } from '../js/parser/check-program.js';

// Database delle macchine: dati coerenti, fonti presenti e parametri del simulatore validi per ogni modello

const LATHE_FIELDS = ['maxTurningDiameterMm', 'maxTurningLengthMm', 'swingOverBedMm', 'barCapacityMm', 'chuckSizeMm',
  'travelXmm', 'travelZmm', 'maxSpindleRpm', 'spindlePowerKw', 'rapidXmMin', 'rapidZmMin', 'toolStations'];
const MILL_FIELDS = ['travelXmm', 'travelYmm', 'travelZmm', 'tableLengthMm', 'tableWidthMm', 'maxSpindleRpm',
  'spindlePowerKw', 'rapidXYZmMin', 'toolMagazine'];

test('database: identificativi unici e tipi validi', () => {
  const ids = MACHINE_DATA.map((m) => m.id);
  assertEqual(new Set(ids).size, ids.length, 'id duplicati');
  for (const m of MACHINE_DATA) {
    assert(/^[a-z0-9-]+$/.test(m.id), `id non valido: ${m.id}`);
    assert(m.type === 'lathe' || m.type === 'mill', `${m.id}: tipo ${m.type}`);
    assert(m.maker && m.model, `${m.id}: produttore o modello mancante`);
  }
});

test('database: ogni macchina ha fonte ufficiale, controllo e compatibilità ISO', () => {
  for (const m of MACHINE_DATA) {
    assert(/^https:\/\//.test(m.sourceUrl ?? ''), `${m.id}: fonte mancante`);
    assert(m.control, `${m.id}: controllo mancante`);
    assert(['yes', 'mode', 'option', 'no'].includes(m.iso), `${m.id}: iso = ${m.iso}`);
    assert(/^\d{4}-\d{2}$/.test(m.checked ?? ''), `${m.id}: data di controllo mancante`);
  }
});

test('database: i valori numerici sono positivi oppure null', () => {
  for (const m of MACHINE_DATA) {
    for (const field of m.type === 'lathe' ? LATHE_FIELDS : MILL_FIELDS) {
      const v = m[field];
      assert(v === null || (Number.isFinite(v) && v > 0), `${m.id}.${field} = ${v}`);
    }
  }
});

test('database: i torni DMG MORI ci sono', () => {
  assert(MACHINE_DATA.filter((m) => m.maker === 'DMG MORI' && m.type === 'lathe').length >= 3, 'servono almeno tre torni DMG MORI');
});

test('il primo modello di ogni tipo è la macchina didattica generica', () => {
  assertEqual(modelsFor('lathe')[0], GENERIC.lathe);
  assertEqual(modelsFor('mill')[0], GENERIC.mill);
  assertEqual(findModel('lathe', 'non-esiste'), GENERIC.lathe);
});

for (const model of [GENERIC.lathe, GENERIC.mill, ...MACHINE_DATA]) {
  test(`${model.maker} ${model.model}: parametri del simulatore validi`, () => {
    const { params, setupLimits } = model.type === 'lathe' ? latheModelData(model) : millModelData(model);
    for (const [axis, { min, max }] of Object.entries(params.limits)) {
      assert(min < max, `fine corsa ${axis}: ${min} .. ${max}`);
      assert(params.home[axis] >= min && params.home[axis] <= max, `riferimento ${axis}=${params.home[axis]} fuori da ${min}..${max}`);
    }
    assert(params.maxRpm > 0 && params.rapidRate > 0, 'giri e rapido');
    for (const [key, { min, max }] of Object.entries(setupLimits)) assert(min <= max, `grezzo ${key}: ${min} .. ${max}`);
    assert(modelSheet(model).length > 0, 'scheda vuota');

    // L'adattatore del modello interpreta un programma semplice senza errori JavaScript
    const adapter = model.type === 'lathe' ? createLatheAdapter(model) : createMillAdapter(model);
    const text = model.type === 'lathe'
      ? 'G21 G99\nG50 S1000\nT0101\nG96 S100 M03\nG00 X20 Z2\nG01 Z-5 F0.1\nM30'
      : 'T1 M06\nG43 H1 Z30\nS1000 M03\nG00 X10 Y10\nG01 Z-1 F100\nM30';
    const program = adapter.interpret(checkProgram(text, adapter.codes).blocks, { offsets: adapter.offsets?.defaults ?? null });
    assert(program.steps.length > 0, 'programma non interpretato');
    const sim = adapter.createSimulator();
    sim.reset(adapter.defaultSetup);
  });
}
