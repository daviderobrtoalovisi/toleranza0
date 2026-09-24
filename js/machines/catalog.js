import { MACHINE_DATA } from './catalog-data.js';
import { LATHE_PARAMS, SETUP_LIMITS } from './lathe/machine.js';
import { MILL_PARAMS, MILL_SETUP_LIMITS } from './mill/machine.js';

// Database delle macchine utensili: modelli reali dai cataloghi dei produttori (catalog-data.js)
// più una macchina "didattica generica" per tipo, con i valori predefiniti del simulatore.
// Da ogni modello si ricavano i parametri del simulatore: giri, rapido, fine corsa e grezzo massimo.
// Il linguaggio resta Fanuc ISO: il campo control dice se la macchina vera lo accetta.

export const GENERIC = {
  lathe: { id: 'generico-tornio', maker: 'Toleranza0', model: 'Tornio didattico generico', type: 'lathe', generic: true },
  mill: { id: 'generico-fresa', maker: 'Toleranza0', model: 'Fresa didattica generica', type: 'mill', generic: true }
};

// Modelli di un tipo ('lathe' | 'mill'): prima il generico, poi per produttore e modello
export function modelsFor(type) {
  const real = MACHINE_DATA.filter((m) => m.type === type)
    .sort((a, b) => a.maker.localeCompare(b.maker) || a.model.localeCompare(b.model, undefined, { numeric: true }));
  return [GENERIC[type], ...real];
}

export function findModel(type, id) {
  return modelsFor(type).find((m) => m.id === id) ?? GENERIC[type];
}

// Compatibilità del controllo con la programmazione ISO in stile Fanuc usata dal simulatore
export const ISO_SUPPORT = {
  yes: 'Programmazione ISO in stile Fanuc: uguale a quella del simulatore.',
  mode: 'Il controllo accetta anche la programmazione ISO (G-code), accanto al suo linguaggio: verificare le opzioni installate e le piccole differenze rispetto al Fanuc.',
  option: 'Si vende con controlli diversi: con Fanuc (o MAPPS su Fanuc) si programma in ISO come nel simulatore, con Siemens o Heidenhain no. Controllare quale controllo ha la macchina del laboratorio.',
  no: 'Il controllo usa un linguaggio diverso (per esempio Siemens o Heidenhain): il simulatore usa i dati di questa macchina, ma il programma va scritto in ISO Fanuc.'
};

const positive = (v) => (Number.isFinite(v) && v > 0 ? v : null);
const clone = (params) => JSON.parse(JSON.stringify(params));

// Tornio: X in diametro, zero pezzo sulla faccia del pezzo. Ipotesi:
// - fine corsa X = 2 × corsa X (la corsa X del tornio è radiale), altrimenti diametro tornibile + 60;
// - la corsa Z si divide in circa il 30% (al massimo 150 mm) davanti alla faccia e il resto verso il mandrino;
// - rapido = il più lento tra X e Z; grezzo massimo = diametro e lunghezza tornibili.
export function latheModelData(model) {
  if (!model || model.generic) return { params: LATHE_PARAMS, setupLimits: SETUP_LIMITS };
  const params = clone(LATHE_PARAMS);
  if (positive(model.maxSpindleRpm)) params.maxRpm = model.maxSpindleRpm;
  const rapids = [model.rapidXmMin, model.rapidZmMin].filter(positive);
  if (rapids.length) params.rapidRate = Math.min(...rapids) * 1000;

  const xMax = positive(model.travelXmm) ? 2 * model.travelXmm
    : positive(model.maxTurningDiameterMm) ? model.maxTurningDiameterMm + 60 : params.limits.x.max;
  params.limits.x.max = xMax;
  const zTravel = positive(model.travelZmm) ?? positive(model.maxTurningLengthMm);
  if (zTravel) {
    const front = Math.min(150, Math.max(40, zTravel * 0.3));
    params.limits.z = { min: -(zTravel - front), max: front };
  }
  params.home = { x: Math.min(params.home.x, xMax - 10), z: Math.min(params.home.z, params.limits.z.max - 5) };

  const setupLimits = clone(SETUP_LIMITS);
  const diameter = positive(model.maxTurningDiameterMm) ?? positive(model.swingOverBedMm);
  if (diameter) setupLimits.diameter.max = Math.min(setupLimits.diameter.max, diameter);
  if (positive(model.maxTurningLengthMm)) setupLimits.length.max = Math.min(setupLimits.length.max, model.maxTurningLengthMm);
  return { params, setupLimits };
}

// Fresa: zero pezzo a metà delle corse X e Y. Ipotesi:
// - fine corsa X e Y = ± metà corsa;
// - la corsa Z si divide in circa il 60% (al massimo 200 mm) sopra il pezzo e il resto sotto;
// - grezzo massimo = tavola (al massimo 300 × 200) e un terzo della corsa Z in altezza.
export function millModelData(model) {
  if (!model || model.generic) return { params: MILL_PARAMS, setupLimits: MILL_SETUP_LIMITS };
  const params = clone(MILL_PARAMS);
  if (positive(model.maxSpindleRpm)) params.maxRpm = model.maxSpindleRpm;
  if (positive(model.rapidXYZmMin)) params.rapidRate = model.rapidXYZmMin * 1000;
  if (positive(model.travelXmm)) params.limits.x = { min: -model.travelXmm / 2, max: model.travelXmm / 2 };
  if (positive(model.travelYmm)) params.limits.y = { min: -model.travelYmm / 2, max: model.travelYmm / 2 };
  if (positive(model.travelZmm)) {
    const above = Math.min(200, model.travelZmm * 0.6);
    params.limits.z = { min: -(model.travelZmm - above), max: above };
  }
  params.home = { x: 0, y: 0, z: Math.min(params.home.z, params.limits.z.max - 10) };

  const setupLimits = clone(MILL_SETUP_LIMITS);
  const length = positive(model.tableLengthMm) ?? positive(model.travelXmm);
  const width = positive(model.tableWidthMm) ?? positive(model.travelYmm);
  if (length) setupLimits.length.max = Math.min(setupLimits.length.max, length);
  if (width) setupLimits.width.max = Math.min(setupLimits.width.max, width);
  if (positive(model.travelZmm)) setupLimits.height.max = Math.min(setupLimits.height.max, Math.round(model.travelZmm / 3));
  return { params, setupLimits };
}

// Righe della scheda macchina mostrata nell'interfaccia: [etichetta, valore]
export function modelSheet(model) {
  if (model.generic) return [['Tipo', 'Valori tipici di una macchina didattica, non di un modello reale']];
  const mm = (v) => (positive(v) ? `${v} mm` : null);
  const rows = model.type === 'lathe'
    ? [
        ['Diametro tornibile', mm(model.maxTurningDiameterMm)],
        ['Lunghezza tornibile', mm(model.maxTurningLengthMm)],
        ['Passaggio barra', mm(model.barCapacityMm)],
        ['Mandrino', mm(model.chuckSizeMm)],
        ['Corse X / Z', positive(model.travelXmm) || positive(model.travelZmm) ? `${model.travelXmm ?? '—'} / ${model.travelZmm ?? '—'} mm` : null],
        ['Giri massimi', positive(model.maxSpindleRpm) ? `${model.maxSpindleRpm} giri/min` : null],
        ['Rapido X / Z', positive(model.rapidXmMin) || positive(model.rapidZmMin) ? `${model.rapidXmMin ?? '—'} / ${model.rapidZmMin ?? '—'} m/min` : null],
        ['Stazioni utensile', model.toolStations ?? null]
      ]
    : [
        ['Corse X / Y / Z', [model.travelXmm, model.travelYmm, model.travelZmm].some(positive) ? `${model.travelXmm ?? '—'} / ${model.travelYmm ?? '—'} / ${model.travelZmm ?? '—'} mm` : null],
        ['Tavola', positive(model.tableLengthMm) ? `${model.tableLengthMm} × ${model.tableWidthMm ?? '—'} mm` : null],
        ['Giri massimi', positive(model.maxSpindleRpm) ? `${model.maxSpindleRpm} giri/min` : null],
        ['Rapido', positive(model.rapidXYZmMin) ? `${model.rapidXYZmMin} m/min` : null],
        ['Magazzino utensili', model.toolMagazine ?? null]
      ];
  return [['Controllo', model.control ?? '—'], ...rows.filter(([, v]) => v !== null && v !== undefined)];
}
