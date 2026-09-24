import { createAlarm } from '../alarms/alarm.js';
import { isExecutable } from '../parser/check-program.js';
import { pointAt, segmentLength } from './path.js';

// Interprete del tornio (Fanuc sistema A): blocchi -> passi con movimenti, stato modale e tempi.
// Funzione pura: non tocca il DOM e non conosce il grezzo (le collisioni le controlla il simulatore).
//
// Passo: { block, moves, alarm, stop, state, time }
// Movimento: { type: 'rapid' | 'line' | 'arc' | 'dwell' | 'tool', from, to, length, duration, ... }

const INCH = 25.4;
const AXES = ['X', 'Z', 'U', 'W'];

// offsets: tabella dei correttori { 1: { x, z }, ... }; se manca, correttori tutti a zero e nessun controllo
export function interpretLathe(blocks, { params, tools, offsets = null, blockDelete = false }) {
  const state = {
    offsetId: 0,
    pos: { ...params.home },
    motion: 0,
    units: 21,
    feedMode: 99,
    speedMode: 97,
    feed: null,
    S: 0,
    maxRpm: null,
    spindle: 'off',
    coolant: false,
    tool: null
  };
  const steps = [];
  let time = 0;

  for (const block of blocks) {
    if (!isExecutable(block) || (blockDelete && block.blockDelete)) continue;
    if (block.alarm) {
      steps.push({ block, moves: [], alarm: block.alarm, stop: null, state: snapshot(state), time });
      break;
    }
    const { moves, alarm, stop } = interpretBlock(block, state, params, tools, offsets);
    for (const move of moves) time += move.duration;
    steps.push({ block, moves, alarm: alarm ?? null, stop: stop ?? null, state: snapshot(state), time });
    if (alarm || stop === 'end') break;
  }
  return { steps, totalTime: time };
}

export function spindleRpm(state, x, params) {
  if (state.spindle === 'off') return 0;
  const limit = Math.min(state.maxRpm ?? Infinity, params.maxRpm);
  if (state.speedMode === 96) {
    const d = Math.abs(x);
    return d < 1e-6 ? limit : Math.min(limit, (1000 * state.S) / (Math.PI * d));
  }
  return Math.min(limit, state.S);
}

function snapshot(state) {
  return { ...state, pos: { ...state.pos } };
}

function interpretBlock(block, state, params, tools, offsets) {
  const fail = (code, p) => ({ moves: [], alarm: createAlarm(code, block.line, p) });
  const w = {};
  const gs = [];
  let m = null;
  for (const word of block.words) {
    if (word.letter === 'G') gs.push(word.value);
    else if (word.letter === 'M') m = word.value;
    else w[word.letter] = word.value;
  }

  if ('X' in w && 'U' in w) return fail(1014, { a: 'X', b: 'U' });
  if ('Z' in w && 'W' in w) return fail(1014, { a: 'Z', b: 'W' });

  for (const g of gs) {
    if (g === 20 || g === 21) state.units = g;
    else if (g === 96 || g === 97) state.speedMode = g;
    else if (g === 98 || g === 99) state.feedMode = g;
    else if (g <= 3) state.motion = g;
  }
  const k = state.units === 20 ? INCH : 1;
  const has = (g) => gs.includes(g);
  const hasAxis = AXES.some((l) => l in w);

  if (has(50) && hasAxis) return fail(1013, { word: 'G50 con X/Z (impostazione origine)' });

  // Prima del movimento: F, S, utensile, mandrino e refrigerante
  if ('F' in w) state.feed = w.F * k;
  if ('S' in w) {
    if (has(50)) state.maxRpm = w.S;
    else state.S = w.S;
  }

  const moves = [];
  const from = () => ({ ...state.pos });

  // Txxyy: xx utensile, yy correttore (T1 o T01 scritti a due cifre valgono come utensile e correttore uguali)
  if ('T' in w) {
    const id = w.T >= 100 ? Math.floor(w.T / 100) : w.T;
    const offsetId = w.T >= 100 ? w.T % 100 : w.T;
    if (id !== 0 && !tools[id]) return fail(2004, { tool: pad(id) });
    if (offsetId !== 0 && offsets && !offsets[offsetId]) {
      return fail(2006, { offset: pad(offsetId), available: Object.keys(offsets).map(pad).join(', ') });
    }
    if (id !== 0 && id !== state.tool) {
      moves.push({ type: 'tool', tool: id, from: from(), to: from(), length: 0, duration: params.toolChangeTime });
      state.tool = id;
    }
    state.offsetId = offsetId;
  }
  if (m === 3) state.spindle = 'cw';
  if (m === 4) state.spindle = 'ccw';
  if (m === 8) state.coolant = true;
  if (state.speedMode === 96 && state.spindle !== 'off' && state.maxRpm === null) return fail(2005);

  // Movimento
  if (has(4)) {
    const seconds = 'P' in w ? w.P / 1000 : 'X' in w ? w.X : 'U' in w ? w.U : 0;
    moves.push({ type: 'dwell', from: from(), to: from(), length: 0, duration: Math.max(0, seconds) });
  } else if (has(28)) {
    if (hasAxis) {
      const middle = target(state.pos, w, k);
      const outside = outOfLimits([middle], params);
      if (outside) return fail(3004, outside);
      const home = {
        x: 'X' in w || 'U' in w ? params.home.x : middle.x,
        z: 'Z' in w || 'W' in w ? params.home.z : middle.z
      };
      moves.push(rapid(state.pos, middle, params), rapid(middle, home, params));
      state.pos = home;
    }
  } else if (hasAxis) {
    const to = target(state.pos, w, k);
    const outside = outOfLimits([to], params);
    if (outside) return fail(3004, outside);
    if (state.motion === 0) {
      moves.push(rapid(state.pos, to, params));
    } else {
      if (state.tool === null) return fail(2003);
      if (!state.feed) return fail(2001);
      if (spindleRpm(state, state.pos.x, params) <= 0) return fail(2002);
      let move;
      if (state.motion === 1) {
        if ('R' in w) return fail(1013, { word: 'R in G01 (raccordo automatico)' });
        move = { type: 'line', from: from(), to, length: segmentLength(state.pos, to) };
      } else {
        const arc = arcMove(state.pos, to, w, k, state.motion === 2);
        if (arc.alarm) return fail(arc.alarm, arc.params);
        move = arc.move;
        const points = Array.from({ length: 33 }, (_, i) => pointAt(move, i / 32));
        const arcOutside = outOfLimits(points, params);
        if (arcOutside) return fail(3004, arcOutside);
      }
      move.duration = feedDuration(move, state, params);
      moves.push(move);
    }
    state.pos = to;
  }

  // Ogni movimento porta l'usura del correttore attivo: il simulatore la aggiunge alla quota programmata
  const offset = offsets?.[state.offsetId] ?? { x: 0, z: 0 };
  for (const move of moves) move.offset = { x: offset.x, z: offset.z };

  // Dopo il movimento
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

// Primo punto oltre il fine corsa, con i dati per l'allarme 3004; null se sono tutti dentro
function outOfLimits(points, params) {
  const { x, z } = params.limits;
  for (const p of points) {
    if (p.x < x.min - 1e-6 || p.x > x.max + 1e-6) return { axis: 'X', value: fmt(p.x), min: x.min, max: x.max };
    if (p.z < z.min - 1e-6 || p.z > z.max + 1e-6) return { axis: 'Z', value: fmt(p.z), min: z.min, max: z.max };
  }
  return null;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function target(pos, w, k) {
  return {
    x: 'X' in w ? w.X * k : 'U' in w ? pos.x + w.U * k : pos.x,
    z: 'Z' in w ? w.Z * k : 'W' in w ? pos.z + w.W * k : pos.z
  };
}

function rapid(from, to, params) {
  const length = segmentLength(from, to);
  return { type: 'rapid', from: { ...from }, to: { ...to }, length, duration: (length / params.rapidRate) * 60 };
}

// Arco nel piano Z–r. G02 = orario con Z verso destra e X verso l'alto (come nei disegni a scuola).
function arcMove(fromPos, to, w, k, clockwise) {
  const s = { z: fromPos.z, r: fromPos.x / 2 };
  const e = { z: to.z, r: to.x / 2 };
  let center;
  let radius;
  if ('R' in w) {
    const R = w.R * k;
    const dz = e.z - s.z;
    const dr = e.r - s.r;
    const chord = Math.hypot(dz, dr);
    if (chord < 1e-9 || Math.abs(R) < chord / 2 - 1e-6) {
      return { alarm: 3001, params: { r: fmt(R), chord: fmt(chord), min: fmt(chord / 2) } };
    }
    const h = Math.sqrt(Math.max(0, R * R - (chord * chord) / 4));
    // Centro a sinistra della corda per gli archi antiorari minori di 180°, a destra per gli orari; R negativo inverte
    let side = clockwise ? -1 : 1;
    if (R < 0) side = -side;
    center = { z: (s.z + e.z) / 2 + (side * h * -dr) / chord, r: (s.r + e.r) / 2 + (side * h * dz) / chord };
    radius = Math.abs(R);
  } else if ('I' in w || 'K' in w) {
    center = { z: s.z + (w.K ?? 0) * k, r: s.r + (w.I ?? 0) * k };
    const r1 = Math.hypot(s.z - center.z, s.r - center.r);
    const r2 = Math.hypot(e.z - center.z, e.r - center.r);
    if (Math.abs(r1 - r2) > 0.02) return { alarm: 3002, params: { r1: fmt(r1), r2: fmt(r2) } };
    radius = r1;
  } else {
    return { alarm: 3003 };
  }

  const a0 = Math.atan2(s.r - center.r, s.z - center.z);
  const a1 = Math.atan2(e.r - center.r, e.z - center.z);
  const full = 2 * Math.PI;
  const positive = (a) => ((a % full) + full) % full;
  let sweep = clockwise ? -positive(a0 - a1) : positive(a1 - a0);
  if (Math.abs(sweep) < 1e-9 && !('R' in w)) sweep = clockwise ? -full : full; // cerchio completo con I/K
  return {
    move: {
      type: 'arc',
      from: { ...fromPos },
      to: { ...to },
      center,
      radius,
      a0,
      sweep,
      clockwise,
      length: radius * Math.abs(sweep)
    }
  };
}

// Tempo di un movimento di lavoro in secondi; con G96 i giri cambiano con il diametro
function feedDuration(move, state, params) {
  if (state.feedMode === 98) return (move.length / state.feed) * 60;
  const parts = 16;
  let seconds = 0;
  for (let i = 0; i < parts; i++) {
    const p = pointAt(move, (i + 0.5) / parts);
    const mmPerMin = state.feed * spindleRpm(state, p.x, params);
    seconds += ((move.length / parts) / mmPerMin) * 60;
  }
  return seconds;
}

function fmt(value) {
  return Number(value.toFixed(3)).toString();
}
