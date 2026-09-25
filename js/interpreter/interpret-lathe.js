import { createAlarm } from '../alarms/alarm.js';
import { isExecutable } from '../parser/check-program.js';
import { pointAt } from './path.js';
import { INCH, target, rapidMove, lineMove, arcMove, fmt } from './lathe-geometry.js';
import { profileRange, profileElements, g71Path } from './cycles-lathe.js';
import { compensateNoseRadius } from './nose-compensation.js';

// Interprete del tornio (Fanuc sistema A): blocchi -> passi con movimenti, stato modale e tempi.
// Funzione pura: non tocca il DOM e non conosce il grezzo (le collisioni le controlla il simulatore).
//
// Passo: { block, moves, alarm, stop, state, time }
// Movimento: { type: 'rapid' | 'line' | 'arc' | 'dwell' | 'tool', from, to, length, duration, ... }
//
// Il programma si esegue in ordine, con due salti:
// - dopo G71 si riparte dal blocco che segue Q (il profilo non viene eseguito);
// - G70 esegue i blocchi del profilo da P a Q, poi torna al punto di partenza e prosegue dopo G70.

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
    tool: null,
    comp: null,
    g71: null
  };
  const ctx = { blocks, params, tools, offsets };
  const steps = [];
  const skip = (block) => !isExecutable(block) || (blockDelete && block.blockDelete);
  const push = (block, result) => {
    steps.push({ block, moves: result.moves ?? [], alarm: result.alarm ?? null, stop: result.stop ?? null, state: snapshot(state) });
  };

  let i = 0;
  run: while (i < blocks.length) {
    const block = blocks[i];
    if (skip(block)) {
      i++;
      continue;
    }
    if (block.alarm) {
      push(block, { alarm: block.alarm });
      break;
    }
    const result = interpretBlock(block, state, ctx);
    push(block, result);
    if (result.alarm || result.stop === 'end') break;

    if (result.g70) {
      const { from, to, start } = result.g70;
      for (let j = from; j <= to; j++) {
        const profileBlock = blocks[j];
        if (skip(profileBlock)) continue;
        if (profileBlock.alarm) {
          push(profileBlock, { alarm: profileBlock.alarm });
          break run;
        }
        const r = interpretBlock(profileBlock, state, ctx, { inCycle: true });
        push(profileBlock, { moves: r.moves, alarm: r.alarm });
        if (r.alarm) break run;
      }
      // Fine di G70: ritorno in rapido al punto di partenza del ciclo
      const back = [rapidMove(state.pos, start, ctx.params)];
      decorate(back, state, ctx);
      state.pos = { ...start };
      push(block, { moves: back });
    }
    i = result.jumpTo ?? i + 1;
  }

  compensateNoseRadius(steps);
  let time = 0;
  for (const step of steps) {
    for (const move of step.moves) time += move.duration;
    step.time = time;
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

function interpretBlock(block, state, ctx, { inCycle = false } = {}) {
  const { params, tools, offsets } = ctx;
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
  const isCycle = has(70) || has(71);

  if (!isCycle && 'X' in w && 'U' in w) return fail(1014, { a: 'X', b: 'U' });
  if (!isCycle && 'Z' in w && 'W' in w) return fail(1014, { a: 'Z', b: 'W' });

  for (const g of gs) {
    if (g === 20 || g === 21) state.units = g;
    else if (g === 96 || g === 97) state.speedMode = g;
    else if (g === 98 || g === 99) state.feedMode = g;
    else if (g === 40) state.comp = null;
    else if (g === 41) state.comp = 'left';
    else if (g === 42) state.comp = 'right';
    else if (g <= 3) state.motion = g;
  }
  const k = state.units === 20 ? INCH : 1;
  const hasAxis = !isCycle && AXES.some((l) => l in w);

  if (has(50) && hasAxis) return fail(1013, { word: 'G50 con X/Z (impostazione origine)' });

  // Prima del movimento: F, S, utensile, mandrino e refrigerante
  if ('F' in w && !(has(71) && !('P' in w))) state.feed = w.F * k;
  if ('S' in w) {
    if (has(50)) state.maxRpm = w.S;
    else state.S = w.S;
  }

  const moves = [];
  const from = () => ({ ...state.pos });
  let jumpTo;
  let g70;
  let cycleMoves = false;

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

  const checkCutting = () => {
    if (state.tool === null) return fail(2003);
    if (!state.feed) return fail(2001);
    if (spindleRpm(state, state.pos.x, params) <= 0) return fail(2002);
    return null;
  };

  // Movimento
  if (has(71) && !inCycle) {
    const result = cycleG71(block, w, k, state, ctx, checkCutting);
    if (result.alarm) return result;
    moves.push(...result.moves);
    jumpTo = result.jumpTo;
    cycleMoves = true;
  } else if (has(70) && !inCycle) {
    if (!('P' in w) || !('Q' in w)) {
      return fail(2007, {
        cycle: 'G70',
        missing: 'P' in w ? 'Q (ultimo blocco del profilo)' : 'P (primo blocco del profilo)',
        how: 'La finitura si scrive G70 P(numero N del primo blocco del profilo) Q(numero N dell\'ultimo).'
      });
    }
    const range = profileRange(ctx.blocks, w.P, w.Q);
    if (range.alarm) return fail(range.alarm, range.params);
    g70 = { ...range, start: from() };
  } else if (has(4)) {
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
      moves.push(rapidMove(state.pos, middle, params), rapidMove(middle, home, params));
      state.pos = home;
    }
  } else if (hasAxis) {
    const to = target(state.pos, w, k);
    const outside = outOfLimits([to], params);
    if (outside) return fail(3004, outside);
    if (state.motion === 0) {
      moves.push(rapidMove(state.pos, to, params));
    } else {
      const problem = checkCutting();
      if (problem) return problem;
      let move;
      if (state.motion === 1) {
        if ('R' in w) return fail(1013, { word: 'R in G01 (raccordo automatico)' });
        move = lineMove(state.pos, to);
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

  decorate(moves, state, ctx, { noComp: cycleMoves });

  // Dopo il movimento
  const result = { moves, jumpTo, g70 };
  if (m === 5) state.spindle = 'off';
  if (m === 9) state.coolant = false;
  if (inCycle) return result;
  if (m === 30 || m === 2) {
    state.spindle = 'off';
    state.coolant = false;
    result.stop = 'end';
  } else if (m === 0) {
    result.stop = 'program';
  } else if (m === 1) {
    result.stop = 'optional';
  }
  return result;
}

// G71: primo blocco con profondità e scarico, secondo con profilo, sovrametalli e avanzamento
function cycleG71(block, w, k, state, ctx, checkCutting) {
  const fail = (code, p) => ({ alarm: createAlarm(code, block.line, p) });
  const how = 'Il ciclo G71 si scrive in due blocchi: G71 U(profondità di passata) R(scarico), poi G71 P(primo blocco del profilo) Q(ultimo blocco) U(sovrametallo in X) W(sovrametallo in Z) F(avanzamento).';
  if (!('P' in w)) {
    if (!('U' in w)) return fail(2007, { cycle: 'G71', missing: 'la profondità di passata U', how });
    if (w.U <= 0) return fail(2007, { cycle: 'G71', missing: 'una profondità di passata U maggiore di zero', how });
    state.g71 = { depth: w.U * k, retract: ('R' in w ? w.R : 0.5) * k };
    return { moves: [] };
  }
  if (!state.g71) return fail(2007, { cycle: 'G71', missing: 'il primo blocco G71 U.. R..', how });
  if (!('Q' in w)) return fail(2007, { cycle: 'G71', missing: 'Q (ultimo blocco del profilo)', how });
  const problem = checkCutting();
  if (problem) return problem;

  const range = profileRange(ctx.blocks, w.P, w.Q);
  if (range.alarm) return fail(range.alarm, range.params);
  const profile = profileElements(ctx.blocks, range, state.pos, state);
  if (profile.existing) return { alarm: profile.existing };
  if (profile.alarm) return { alarm: createAlarm(profile.alarm, profile.line ?? block.line, profile.params) };

  const path = g71Path(state.pos, profile.elements, {
    depth: state.g71.depth,
    retract: state.g71.retract,
    allowX: (w.U ?? 0) * k,
    allowZ: (w.W ?? 0) * k
  });
  const moves = path.map(({ kind, move }) => {
    if (kind === 'rapid') return rapidMove(move.from, move.to, ctx.params);
    return { ...move, duration: feedDuration(move, state, ctx.params) };
  });
  const points = moves.flatMap((mv) => (mv.type === 'arc' ? [0, 0.5, 1].map((t) => pointAt(mv, t)) : [mv.to]));
  const outside = outOfLimits(points, ctx.params);
  if (outside) return fail(3004, outside);
  // Profilo scritto altrove (CYCLE95 Siemens, profilo dopo M30): si prosegue con il blocco successivo
  return { moves, jumpTo: block.profileElsewhere ? undefined : range.to + 1 };
}

// Usura del correttore attivo e dati per la compensazione del raggio di punta
function decorate(moves, state, ctx, { noComp = false } = {}) {
  const offset = ctx.offsets?.[state.offsetId] ?? { x: 0, z: 0 };
  const rn = ctx.tools[state.tool]?.noseRadius ?? 0;
  for (const move of moves) {
    move.offset = { x: offset.x, z: offset.z };
    if (move.type === 'rapid' || move.type === 'line' || move.type === 'arc') {
      move.comp = noComp ? null : state.comp;
      move.rn = rn;
    }
  }
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
