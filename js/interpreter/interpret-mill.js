import { createAlarm } from '../alarms/alarm.js';
import { isExecutable } from '../parser/check-program.js';
import { pointAt3, length3 } from './path-3d.js';
import { INCH, positiveAngle, fmt } from './lathe-geometry.js';
import { compensateCutterRadius } from './cutter-compensation.js';

// Interprete della fresatrice 3 assi (Fanuc serie M): blocchi -> passi con movimenti, stato modale e tempi.
// Stessa struttura dell'interprete del tornio: passi { block, moves, alarm, stop, state, time },
// movimenti { type: 'rapid' | 'line' | 'arc' | 'dwell' | 'tool', from, to, length, duration } con
// posizioni { x, y, z } della punta dell'utensile. Funzione pura: non conosce grezzo né morsa.
//
// Regole didattiche (come in officina a scuola):
// - T prepara l'utensile, M06 lo monta; dopo M06 serve G43 H(numero utensile) prima di muovere Z.
// - Cicli di foratura G81/G82/G83 modali fino a G80 o a un G00–G03.
// - G41/G42 D(numero utensile): compensazione del raggio fresa nel piano G17, applicata alla fine
//   da cutter-compensation.js come sul tornio.

const AXES = ['X', 'Y', 'Z'];

// Piani degli archi: assi del piano, asse perpendicolare e lettere del centro
const PLANES = {
  17: { axes: ['x', 'y', 'z'], center: ['I', 'J'] },
  18: { axes: ['z', 'x', 'y'], center: ['K', 'I'] },
  19: { axes: ['y', 'z', 'x'], center: ['J', 'K'] }
};

export function interpretMill(blocks, { params, tools, blockDelete = false }) {
  const state = {
    pos: { ...params.home },
    motion: 0,
    absolute: true,
    units: 21,
    feed: null,
    S: 0,
    spindle: 'off',
    coolant: false,
    tool: null,
    nextTool: null,
    lengthComp: null,
    cycle: null,
    cycleReturn: 98,
    initialZ: null,
    plane: 17,
    comp: null
  };
  const steps = [];
  let time = 0;
  for (const block of blocks) {
    if (!isExecutable(block) || (blockDelete && block.blockDelete)) continue;
    if (block.alarm) {
      steps.push({ block, moves: [], alarm: block.alarm, stop: null, state: snapshot(state), time });
      break;
    }
    const { moves, alarm, stop } = interpretBlock(block, state, params, tools);
    for (const move of moves) time += move.duration;
    steps.push({ block, moves, alarm: alarm ?? null, stop: stop ?? null, state: snapshot(state), time });
    if (alarm || stop === 'end') break;
  }
  compensateCutterRadius(steps);
  time = 0;
  for (const step of steps) {
    for (const move of step.moves) time += move.duration;
    step.time = time;
  }
  return { steps, totalTime: time };
}

export function millSpindleRpm(state, params) {
  return state.spindle === 'off' ? 0 : Math.min(state.S, params.maxRpm);
}

function snapshot(state) {
  return { ...state, pos: { ...state.pos }, cycle: state.cycle && { ...state.cycle } };
}

function interpretBlock(block, state, params, tools) {
  const fail = (code, p) => ({ moves: [], alarm: createAlarm(code, block.line, p) });
  const w = {};
  const gs = [];
  let m = null;
  for (const word of block.words) {
    if (word.letter === 'G') gs.push(word.value);
    else if (word.letter === 'M') m = word.value;
    else w[word.letter] = word.value;
  }
  const has = (g) => gs.includes(g);
  const cycleCode = gs.find((g) => g >= 81 && g <= 83);

  for (const g of gs) {
    if (g === 90) state.absolute = true;
    else if (g === 91) state.absolute = false;
    else if (g === 20 || g === 21) state.units = g;
    else if (g === 98 || g === 99) state.cycleReturn = g;
    else if (g === 49) state.lengthComp = null;
    else if (g === 80) state.cycle = null;
    else if (g === 17 || g === 18 || g === 19) state.plane = g;
    else if (g === 40) state.comp = null;
    else if (g <= 3) {
      state.motion = g;
      state.cycle = null; // G00–G03 annullano il ciclo di foratura
    }
  }
  const k = state.units === 20 ? INCH : 1;
  const hasAxis = AXES.some((l) => l in w);

  if ('F' in w) state.feed = w.F * k;
  if ('S' in w) state.S = w.S;

  const moves = [];
  const from = () => ({ ...state.pos });

  // T prepara, M06 monta
  if ('T' in w) {
    if (w.T !== 0 && !tools[w.T]) return fail(2004, { tool: pad(w.T) });
    state.nextTool = w.T || null;
  }
  if (m === 6) {
    if (state.nextTool === null) return fail(2003);
    if (state.nextTool !== state.tool) {
      moves.push({ type: 'tool', tool: state.nextTool, from: from(), to: from(), length: 0, duration: params.toolChangeTime });
      state.tool = state.nextTool;
    }
    state.lengthComp = null; // la lunghezza del nuovo utensile va richiamata con G43
  }
  if (has(43)) {
    if (state.tool === null) return fail(2003);
    if (!('H' in w) || w.H !== state.tool) return fail(2009, { h: 'H' in w ? w.H : '', tool: state.tool });
    state.lengthComp = { h: w.H };
  }
  if (has(41) || has(42)) {
    if (state.tool === null) return fail(2003);
    if (!('D' in w) || w.D !== state.tool) return fail(2010, { d: 'D' in w ? w.D : '', tool: state.tool });
    if (state.plane !== 17) return fail(1013, { word: 'G41/G42 fuori dal piano G17' });
    state.comp = has(41) ? 'left' : 'right';
  }
  if (m === 3) state.spindle = 'cw';
  if (m === 4) state.spindle = 'ccw';
  if (m === 8) state.coolant = true;

  const checkCutting = () => {
    if (state.tool === null) return fail(2003);
    if (!state.feed) return fail(2001);
    if (millSpindleRpm(state, params) <= 0) return fail(2002);
    return null;
  };
  const checkZ = (fromZ, toZ) =>
    state.tool !== null && !state.lengthComp && Math.abs(toZ - fromZ) > 1e-9 ? fail(2008) : null;

  const isCycle = cycleCode !== undefined || (state.cycle && ('X' in w || 'Y' in w));
  if (isCycle && state.comp) return fail(1013, { word: 'ciclo di foratura con G41/G42 attiva' });
  if (isCycle) {
    // Ciclo di foratura: definizione (G81/G82/G83) e/o foro nella posizione X/Y del blocco
    const result = drillCycle(block, w, k, cycleCode, state, params, fail, checkCutting, checkZ);
    if (result.alarm) return result;
    moves.push(...result.moves);
  } else if (has(4)) {
    const seconds = 'P' in w ? w.P / 1000 : 'X' in w ? w.X : 0;
    moves.push({ type: 'dwell', from: from(), to: from(), length: 0, duration: Math.max(0, seconds) });
  } else if (has(28)) {
    if (hasAxis) {
      const middle = target(state.pos, w, k, state.absolute);
      const outside = outOfLimits([middle], params);
      if (outside) return fail(3004, outside);
      const home = { ...middle };
      for (const axis of ['x', 'y', 'z']) if (axis.toUpperCase() in w) home[axis] = params.home[axis];
      moves.push(rapid(state.pos, middle, params), rapid(middle, home, params));
      state.pos = home;
    }
  } else if (hasAxis) {
    const to = target(state.pos, w, k, state.absolute);
    const outside = outOfLimits([to], params);
    if (outside) return fail(3004, outside);
    const zProblem = checkZ(state.pos.z, to.z);
    if (zProblem) return zProblem;
    if (state.motion === 0) {
      moves.push(rapid(state.pos, to, params));
    } else {
      const problem = checkCutting();
      if (problem) return problem;
      let move;
      if (state.motion === 1) {
        move = { type: 'line', from: from(), to, length: length3(state.pos, to) };
      } else {
        const arc = arcInPlane(state.pos, to, w, k, state.motion === 2, PLANES[state.plane]);
        if (arc.alarm) return fail(arc.alarm, arc.params);
        move = arc.move;
        const points = Array.from({ length: 33 }, (_, i) => pointAt3(move, i / 32));
        const arcOutside = outOfLimits(points, params);
        if (arcOutside) return fail(3004, arcOutside);
      }
      move.duration = (move.length / state.feed) * 60;
      moves.push(move);
    }
    state.pos = to;
  }

  // Dati per la compensazione del raggio fresa (non per i cicli e i ritorni G28)
  const radius = state.tool !== null ? tools[state.tool].diameter / 2 : 0;
  const compensable = !isCycle && !has(28);
  for (const move of moves) {
    if (move.type === 'rapid' || move.type === 'line' || move.type === 'arc') {
      move.comp = compensable ? state.comp : null;
      move.rn = radius;
    }
  }

  if (m === 5) state.spindle = 'off';
  if (m === 9) state.coolant = false;
  if (m === 30 || m === 2) {
    state.spindle = 'off';
    state.coolant = false;
    return { moves, stop: 'end' };
  }
  if (m === 0) return { moves, stop: 'program' };
  if (m === 1) return { moves, stop: 'optional' };
  return { moves };
}

// G81 foratura, G82 con sosta P sul fondo, G83 a beccate di profondità Q.
// In G90: R e Z assolute. In G91: R dal piano iniziale, Z dal piano R.
function drillCycle(block, w, k, code, state, params, fail, checkCutting, checkZ) {
  const how = 'Il ciclo si scrive per esempio G81 X.. Y.. Z(fondo del foro) R(piano di avvicinamento) F..; con G83 serve anche Q (profondità di ogni beccata), con G82 P (sosta in ms).';
  if (code !== undefined) {
    if (!state.cycle) state.initialZ = state.pos.z;
    const previous = state.cycle ?? {};
    const base = state.absolute ? 0 : state.initialZ;
    const r = 'R' in w ? base + w.R * k : previous.r;
    const z = 'Z' in w ? (state.absolute ? w.Z * k : (r ?? 0) + w.Z * k) : previous.z;
    state.cycle = { type: code, r, z, q: 'Q' in w ? w.Q * k : previous.q, p: 'P' in w ? w.P : previous.p ?? 0 };
  } else if ('Z' in w || 'R' in w || 'Q' in w) {
    // Nuovi parametri in un blocco successivo del ciclo
    const c = state.cycle;
    if ('R' in w) c.r = (state.absolute ? 0 : state.initialZ) + w.R * k;
    if ('Z' in w) c.z = state.absolute ? w.Z * k : c.r + w.Z * k;
    if ('Q' in w) c.q = w.Q * k;
  }
  const c = state.cycle;
  const name = `G${c.type}`;
  if (c.z === undefined) return fail(2007, { cycle: name, missing: 'la quota del fondo Z', how });
  if (c.r === undefined) return fail(2007, { cycle: name, missing: 'il piano di avvicinamento R', how });
  if (c.type === 83 && !(c.q > 0)) return fail(2007, { cycle: name, missing: 'la profondità di beccata Q', how });
  const problem = checkCutting();
  if (problem) return problem;

  // Posizione del foro
  const hole = target(state.pos, { X: w.X, Y: w.Y }, k, state.absolute);
  const returnZ = state.cycleReturn === 98 ? Math.max(state.initialZ, c.r) : c.r;
  const outside = outOfLimits([{ ...hole, z: c.z }, { ...hole, z: returnZ }], params);
  if (outside) return fail(3004, outside);

  const moves = [];
  let pos = { ...state.pos };
  const zProblem = checkZ(pos.z, c.r) ?? checkZ(c.r, c.z);
  if (zProblem) return zProblem;
  const go = (type, to) => {
    if (length3(pos, to) < 1e-9) return;
    const length = length3(pos, to);
    const duration = type === 'rapid' ? (length / params.rapidRate) * 60 : (length / state.feed) * 60;
    moves.push({ type, from: { ...pos }, to: { ...to }, length, duration });
    pos = { ...to };
  };
  const at = (z) => ({ x: hole.x, y: hole.y, z });

  go('rapid', { x: hole.x, y: hole.y, z: pos.z });
  go('rapid', at(c.r));
  if (c.type === 83) {
    const clearance = 0.5;
    let depth = c.r;
    while (depth > c.z + 1e-9) {
      const next = Math.max(c.z, depth - c.q);
      if (depth < c.r - 1e-9) go('rapid', at(depth + clearance));
      go('line', at(next));
      depth = next;
      if (depth > c.z + 1e-9) go('rapid', at(c.r));
    }
  } else {
    go('line', at(c.z));
    if (c.type === 82 && c.p > 0) {
      moves.push({ type: 'dwell', from: { ...pos }, to: { ...pos }, length: 0, duration: c.p / 1000 });
    }
  }
  go('rapid', at(returnZ));
  state.pos = pos;
  return { moves };
}

function target(pos, w, k, absolute) {
  const axis = (letter, current) => {
    if (!(letter in w) || w[letter] === undefined) return current;
    return absolute ? w[letter] * k : current + w[letter] * k;
  };
  return { x: axis('X', pos.x), y: axis('Y', pos.y), z: axis('Z', pos.z) };
}

function rapid(from, to, params) {
  const length = length3(from, to);
  return { type: 'rapid', from: { ...from }, to: { ...to }, length, duration: (length / params.rapidRate) * 60 };
}

// Arco nel piano scelto (G17 XY, G18 ZX, G19 YZ), guardando dal lato positivo dell'asse
// perpendicolare: G02 orario, G03 antiorario. Lungo l'asse perpendicolare l'arco può essere un'elica.
function arcInPlane(s, e, w, k, clockwise, plane) {
  const [A, B, C] = plane.axes;
  const [ci, cj] = plane.center;
  let center;
  let radius;
  if ('R' in w) {
    const R = w.R * k;
    const da = e[A] - s[A];
    const db = e[B] - s[B];
    const chord = Math.hypot(da, db);
    if (chord < 1e-9 || Math.abs(R) < chord / 2 - 1e-6) {
      return { alarm: 3001, params: { r: fmt(R), chord: fmt(chord), min: fmt(chord / 2) } };
    }
    const h = Math.sqrt(Math.max(0, R * R - (chord * chord) / 4));
    let side = clockwise ? -1 : 1;
    if (R < 0) side = -side;
    center = { [A]: (s[A] + e[A]) / 2 + (side * h * -db) / chord, [B]: (s[B] + e[B]) / 2 + (side * h * da) / chord };
    radius = Math.abs(R);
  } else if (ci in w || cj in w) {
    center = { [A]: s[A] + (w[ci] ?? 0) * k, [B]: s[B] + (w[cj] ?? 0) * k };
    const r1 = Math.hypot(s[A] - center[A], s[B] - center[B]);
    const r2 = Math.hypot(e[A] - center[A], e[B] - center[B]);
    if (Math.abs(r1 - r2) > 0.02) return { alarm: 3002, params: { r1: fmt(r1), r2: fmt(r2) } };
    radius = r1;
  } else {
    return { alarm: 3003 };
  }
  const a0 = Math.atan2(s[B] - center[B], s[A] - center[A]);
  const a1 = Math.atan2(e[B] - center[B], e[A] - center[A]);
  let sweep = clockwise ? -positiveAngle(a0 - a1) : positiveAngle(a1 - a0);
  if (Math.abs(sweep) < 1e-9 && !('R' in w)) sweep = clockwise ? -2 * Math.PI : 2 * Math.PI; // cerchio completo
  const flat = radius * Math.abs(sweep);
  return {
    move: {
      type: 'arc',
      axes: plane.axes,
      from: { ...s },
      to: { ...e },
      center,
      radius,
      a0,
      sweep,
      clockwise,
      length: Math.hypot(flat, e[C] - s[C])
    }
  };
}

function outOfLimits(points, params) {
  for (const p of points) {
    for (const axis of ['x', 'y', 'z']) {
      const { min, max } = params.limits[axis];
      if (p[axis] < min - 1e-6 || p[axis] > max + 1e-6) {
        return { axis: axis.toUpperCase(), value: fmt(p[axis]), min, max };
      }
    }
  }
  return null;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
