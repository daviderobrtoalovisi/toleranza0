import { LATHE } from './codes.js';
import { DEFAULT_SETUP, DEFAULT_OFFSETS, normalizeSetup, normalizeOffsets, setupFromProgram } from './machine.js';
import { GENERIC, latheModelData } from '../catalog.js';
import { LATHE_TOOLS } from './tools.js';
import { createLatheSimulator } from './simulator.js';
import { interpretLathe, spindleRpm } from '../../interpreter/interpret-lathe.js';

// Tutto ciò che l'interfaccia deve sapere del tornio, con la stessa forma dell'adattatore della fresa.
// createLatheAdapter(modello) usa i dati del modello scelto nel database (giri, rapido, corse, grezzo massimo).

const f = (value, digits) => Number(value).toFixed(digits);
const pad = (id) => String(id).padStart(2, '0');

export function createLatheAdapter(model = GENERIC.lathe) {
  const { params, setupLimits } = latheModelData(model);
  const normalize = (setup) => normalizeSetup(setup, setupLimits);
  return {
    id: 'lathe',
    model,
    codes: LATHE,
    params,
    tools: LATHE_TOOLS,
    newProgram: '%\nO0001 (NUOVO PROGRAMMA)\n(GREZZO D50 L80)\n\nM30\n%\n',

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

    interpret(blocks, { offsets, blockDelete }) {
      return interpretLathe(blocks, { params, tools: LATHE_TOOLS, offsets, blockDelete });
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
