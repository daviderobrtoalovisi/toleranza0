import { MILL } from './codes.js';
import { MILL_PARAMS, DEFAULT_MILL_SETUP, MILL_SETUP_LIMITS, normalizeMillSetup, millSetupFromProgram } from './machine.js';
import { MILL_TOOLS } from './tools.js';
import { createMillSimulator } from './simulator.js';
import { interpretMill, millSpindleRpm } from '../../interpreter/interpret-mill.js';

// Tutto ciò che l'interfaccia deve sapere della fresatrice, con la stessa forma dell'adattatore del tornio.
// La vista 3D (Three.js da CDN) si carica solo quando si sceglie la fresa: se la rete manca, il tornio funziona lo stesso.

const f = (value, digits) => Number(value).toFixed(digits);
const pad = (id) => String(id).padStart(2, '0');

export const millAdapter = {
  id: 'mill',
  codes: MILL,
  params: MILL_PARAMS,
  tools: MILL_TOOLS,
  newProgram: '%\nO1000 (NUOVO PROGRAMMA)\n(GREZZO X100 Y80 Z30)\nG21 G17 G40 G49 G80 G90 G94\nT1 M06\nG43 H1 Z50\n\nM30\n%\n',

  setupFields: [
    { key: 'length', label: 'Grezzo X', step: 1, ...MILL_SETUP_LIMITS.length },
    { key: 'width', label: 'Y', step: 1, ...MILL_SETUP_LIMITS.width },
    { key: 'height', label: 'Z', step: 1, ...MILL_SETUP_LIMITS.height },
    { key: 'topAllowance', label: 'Sovrametallo sopra', step: 0.5, ...MILL_SETUP_LIMITS.topAllowance },
    { key: 'zero', label: 'Zero X0 Y0', options: [['corner', 'angolo'], ['center', 'centro']] }
  ],
  defaultSetup: DEFAULT_MILL_SETUP,
  normalizeSetup: normalizeMillSetup,
  setupFromProgram: millSetupFromProgram,
  offsets: null,

  interpret(blocks, { blockDelete }) {
    return interpretMill(blocks, { params: MILL_PARAMS, tools: MILL_TOOLS, blockDelete });
  },
  createSimulator() {
    return createMillSimulator({ params: MILL_PARAMS, tools: MILL_TOOLS });
  },
  async loadView(canvas, getScene) {
    const { createMillView } = await import('../../render/mill-3d.js');
    return createMillView(canvas, { getScene, tools: MILL_TOOLS });
  },

  toolNote(tool) {
    return Number.isFinite(tool.maxDepth) ? `passata max ${tool.maxDepth} mm, tagliente ${tool.fluteLength} mm` : `solo foratura, tagliente ${tool.fluteLength} mm`;
  },

  dro(sim, state) {
    const rpm = state ? millSpindleRpm(state, MILL_PARAMS) : 0;
    return [
      ['X', f(sim.pos.x, 3)],
      ['Y', f(sim.pos.y, 3)],
      ['Z', f(sim.pos.z, 3)],
      ['T', sim.tool ? `T${pad(sim.tool)}` : '—'],
      ['S', rpm ? `${Math.round(rpm)} giri/min` : 'fermo'],
      ['F', state?.feed ? `${f(state.feed, 0)} mm/min` : '—']
    ];
  }
};
