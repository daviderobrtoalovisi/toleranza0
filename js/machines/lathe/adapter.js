import { LATHE } from './codes.js';
import { LATHE_SIEMENS } from './codes-siemens.js';
import { DEFAULT_SETUP, DEFAULT_OFFSETS, normalizeSetup, normalizeOffsets, setupFromProgram } from './machine.js';
import { GENERIC, latheModelData } from '../catalog.js';
import { LATHE_TOOLS } from './tools.js';
import { createLatheSimulator } from './simulator.js';
import { checkProgram } from '../../parser/check-program.js';
import { interpretLathe, spindleRpm } from '../../interpreter/interpret-lathe.js';
import { translateSiemens } from '../../interpreter/siemens-to-fanuc.js';
import { siemensAlarm } from '../../alarms/siemens-hints.js';

// Tutto ciò che l'interfaccia deve sapere del tornio, con la stessa forma dell'adattatore della fresa.
// createLatheAdapter(modello, linguaggio) usa i dati del modello scelto nel database (giri, rapido, corse,
// grezzo massimo) e il linguaggio 'fanuc' oppure 'siemens' (tradotto in Fanuc prima dell'interprete).

const f = (value, digits) => Number(value).toFixed(digits);
const pad = (id) => String(id).padStart(2, '0');

const NEW_PROGRAM = {
  fanuc: '%\nO0001 (NUOVO PROGRAMMA)\n(GREZZO D50 L80)\n\nM30\n%\n',
  siemens: '; NUOVO PROGRAMMA\n; (GREZZO D50 L80)\nG18 G90 G95 DIAMON\nT1 D1\nG96 S180 LIMS=2000 M3\n\nM30\n'
};

export function createLatheAdapter(model = GENERIC.lathe, dialect = 'fanuc') {
  const { params, setupLimits } = latheModelData(model);
  const normalize = (setup) => normalizeSetup(setup, setupLimits);
  const siemens = dialect === 'siemens';
  const localize = (alarm) => (siemens && alarm ? siemensAlarm(alarm) : alarm);
  const codes = siemens ? LATHE_SIEMENS : LATHE;
  return {
    id: 'lathe',
    model,
    dialect: siemens ? 'siemens' : 'fanuc',
    codes,
    params,
    tools: LATHE_TOOLS,
    newProgram: NEW_PROGRAM[siemens ? 'siemens' : 'fanuc'],
    localizeAlarm: localize,

    setupFields: [
      { key: 'diameter', label: 'Grezzo Ø', step: 1, ...setupLimits.diameter },
      { key: 'length', label: 'Sporgenza', step: 1, ...setupLimits.length },
      { key: 'faceAllowance', label: 'Sovrametallo faccia', step: 0.5, ...setupLimits.faceAllowance }
    ],
    defaultSetup: normalize(DEFAULT_SETUP),
    normalizeSetup: normalize,
    setupFromProgram(text) {
      const setup = setupFromProgram(text);
      return setup && normalize(setup);
    },
    offsets: { defaults: DEFAULT_OFFSETS, normalize: normalizeOffsets },

    // Sintassi del programma, con i testi degli allarmi del linguaggio scelto
    check(text) {
      const result = checkProgram(text, codes);
      return { blocks: result.blocks, alarms: result.alarms.map(localize) };
    },
    interpret(blocks, { offsets, blockDelete }) {
      const input = siemens ? translateSiemens(blocks, 'lathe', { tools: LATHE_TOOLS }) : blocks;
      const program = interpretLathe(input, { params, tools: LATHE_TOOLS, offsets, blockDelete });
      for (const step of program.steps) step.alarm = localize(step.alarm);
      return program;
    },
    createSimulator() {
      return createLatheSimulator({ params, tools: LATHE_TOOLS });
    },
    async loadView(canvas, getScene) {
      const { createLatheView } = await import('../../render/lathe-2d.js');
      return createLatheView(canvas, { getScene, tools: LATHE_TOOLS, params });
    },

    toolNote(tool) {
      return `passata max ${tool.maxDepth} mm`;
    },

    // Quote e dati mostrati sopra la simulazione
    dro(sim, state) {
      const rpm = state ? spindleRpm(state, sim.pos.x, params) : 0;
      const feed = state?.feed ? `${f(state.feed, state.feedMode === 99 ? 3 : 0)} ${state.feedMode === 99 ? 'mm/giro' : 'mm/min'}` : '—';
      return [
        ['X', f(sim.pos.x, 3)],
        ['Z', f(sim.pos.z, 3)],
        ['T', sim.tool ? `T${pad(sim.tool)}` : '—'],
        ['S', rpm ? `${Math.round(rpm)} giri/min` : 'fermo'],
        ['F', feed]
      ];
    }
  };
}

export const latheAdapter = createLatheAdapter();
