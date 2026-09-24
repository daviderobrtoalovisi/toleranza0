import { LATHE } from './codes.js';
import { LATHE_PARAMS, DEFAULT_SETUP, DEFAULT_OFFSETS, SETUP_LIMITS, normalizeSetup, normalizeOffsets, setupFromProgram } from './machine.js';
import { LATHE_TOOLS } from './tools.js';
import { createLatheSimulator } from './simulator.js';
import { interpretLathe, spindleRpm } from '../../interpreter/interpret-lathe.js';

// Tutto ciò che l'interfaccia deve sapere del tornio, con la stessa forma dell'adattatore della fresa.

const f = (value, digits) => Number(value).toFixed(digits);
const pad = (id) => String(id).padStart(2, '0');

export const latheAdapter = {
  id: 'lathe',
  codes: LATHE,
  params: LATHE_PARAMS,
  tools: LATHE_TOOLS,
  newProgram: '%\nO0001 (NUOVO PROGRAMMA)\n(GREZZO D50 L80)\n\nM30\n%\n',

  setupFields: [
    { key: 'diameter', label: 'Grezzo Ø', step: 1, ...SETUP_LIMITS.diameter },
    { key: 'length', label: 'Sporgenza', step: 1, ...SETUP_LIMITS.length },
    { key: 'faceAllowance', label: 'Sovrametallo faccia', step: 0.5, ...SETUP_LIMITS.faceAllowance }
  ],
  defaultSetup: DEFAULT_SETUP,
  normalizeSetup,
  setupFromProgram,
  offsets: { defaults: DEFAULT_OFFSETS, normalize: normalizeOffsets },

  interpret(blocks, { offsets, blockDelete }) {
    return interpretLathe(blocks, { params: LATHE_PARAMS, tools: LATHE_TOOLS, offsets, blockDelete });
  },
  createSimulator() {
    return createLatheSimulator({ params: LATHE_PARAMS, tools: LATHE_TOOLS });
  },
  async loadView(canvas, getScene) {
    const { createLatheView } = await import('../../render/lathe-2d.js');
    return createLatheView(canvas, { getScene, tools: LATHE_TOOLS, params: LATHE_PARAMS });
  },

  toolNote(tool) {
    return `passata max ${tool.maxDepth} mm`;
  },

  // Quote e dati mostrati sopra la simulazione
  dro(sim, state) {
    const rpm = state ? spindleRpm(state, sim.pos.x, LATHE_PARAMS) : 0;
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
