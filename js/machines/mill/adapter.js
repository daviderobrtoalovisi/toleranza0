import { MILL } from './codes.js';
import { MILL_SIEMENS } from './codes-siemens.js';
import { DEFAULT_MILL_SETUP, normalizeMillSetup, millSetupFromProgram } from './machine.js';
import { GENERIC, millModelData } from '../catalog.js';
import { MILL_TOOLS } from './tools.js';
import { createMillSimulator } from './simulator.js';
import { checkProgram } from '../../parser/check-program.js';
import { interpretMill, millSpindleRpm } from '../../interpreter/interpret-mill.js';
import { translateSiemens } from '../../interpreter/siemens-to-fanuc.js';
import { siemensAlarm } from '../../alarms/siemens-hints.js';

// Tutto ciò che l'interfaccia deve sapere della fresatrice, con la stessa forma dell'adattatore del tornio.
// La vista 3D (Three.js da CDN) si carica solo quando si sceglie la fresa: se la rete manca, il tornio funziona lo stesso.
// createMillAdapter(modello, linguaggio) usa i dati del modello scelto nel database (giri, rapido, corse,
// grezzo massimo) e il linguaggio 'fanuc' oppure 'siemens' (tradotto in Fanuc prima dell'interprete).

const f = (value, digits) => Number(value).toFixed(digits);
const pad = (id) => String(id).padStart(2, '0');

const NEW_PROGRAM = {
  fanuc: '%\nO1000 (NUOVO PROGRAMMA)\n(GREZZO X100 Y80 Z30)\nG21 G17 G40 G49 G80 G90 G94\nT1 M06\nG43 H1 Z50\n\nM30\n%\n',
  siemens: '; NUOVO PROGRAMMA\n; (GREZZO X100 Y80 Z30)\nG17 G40 G90 G94 G71\nT1 M6\nD1\nG0 Z50\n\nM30\n'
};

export function createMillAdapter(model = GENERIC.mill, dialect = 'fanuc') {
  const { params, setupLimits } = millModelData(model);
  const normalize = (setup) => normalizeMillSetup(setup, setupLimits);
  const siemens = dialect === 'siemens';
  const localize = (alarm) => (siemens && alarm ? siemensAlarm(alarm) : alarm);
  const codes = siemens ? MILL_SIEMENS : MILL;
  return {
    id: 'mill',
    model,
    dialect: siemens ? 'siemens' : 'fanuc',
    codes,
    params,
    tools: MILL_TOOLS,
    newProgram: NEW_PROGRAM[siemens ? 'siemens' : 'fanuc'],
    localizeAlarm: localize,

    setupFields: [
      { key: 'length', label: 'Grezzo X', step: 1, ...setupLimits.length },
      { key: 'width', label: 'Y', step: 1, ...setupLimits.width },
      { key: 'height', label: 'Z', step: 1, ...setupLimits.height },
      { key: 'topAllowance', label: 'Sovrametallo sopra', step: 0.5, ...setupLimits.topAllowance },
      { key: 'zero', label: 'Zero X0 Y0', options: [['corner', 'angolo'], ['center', 'centro']] }
    ],
    defaultSetup: normalize(DEFAULT_MILL_SETUP),
    normalizeSetup: normalize,
    setupFromProgram(text) {
      const setup = millSetupFromProgram(text);
      return setup && normalize(setup);
    },
    offsets: null,

    // Sintassi del programma, con i testi degli allarmi del linguaggio scelto
    check(text) {
      const result = checkProgram(text, codes);
      return { blocks: result.blocks, alarms: result.alarms.map(localize) };
    },
    interpret(blocks, { blockDelete }) {
      const input = siemens ? translateSiemens(blocks, 'mill') : blocks;
      const program = interpretMill(input, { params, tools: MILL_TOOLS, blockDelete });
      for (const step of program.steps) step.alarm = localize(step.alarm);
      return program;
    },
    createSimulator() {
      return createMillSimulator({ params, tools: MILL_TOOLS });
    },
    async loadView(canvas, getScene) {
      const { createMillView } = await import('../../render/mill-3d.js');
      return createMillView(canvas, { getScene, tools: MILL_TOOLS });
    },

    toolNote(tool) {
      return Number.isFinite(tool.maxDepth) ? `passata max ${tool.maxDepth} mm, tagliente ${tool.fluteLength} mm` : `solo foratura, tagliente ${tool.fluteLength} mm`;
    },

    dro(sim, state) {
      const rpm = state ? millSpindleRpm(state, params) : 0;
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
}

export const millAdapter = createMillAdapter();
