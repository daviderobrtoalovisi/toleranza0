import { isExecutable } from '../parser/check-program.js';
import { pointAt } from './path.js';
import { INCH, target, lineMove, arcMove } from './lathe-geometry.js';

// Cicli del tornio Fanuc: G71 sgrossatura longitudinale (tipo I) e G70 finitura.
//
//   G71 U(profondità di passata, in raggio) R(scarico a 45°)
//   G71 P(primo blocco profilo) Q(ultimo blocco) U(sovrametallo X, diametro) W(sovrametallo Z) F..
//   N(P) G00 X..      <- il primo blocco del profilo muove solo X
//   ...               <- profilo: X sempre crescente, Z sempre decrescente (niente gole)
//   N(Q) ...
//   G70 P.. Q..       <- finitura lungo lo stesso profilo, con F e S scritti nel profilo

// Indici dei blocchi con numero N = P e N = Q; { alarm, params } se mancano
export function profileRange(blocks, P, Q) {
  const find = (n) => blocks.findIndex((b) => b.words[0]?.letter === 'N' && b.words[0].value === n);
  const from = find(P);
  const to = find(Q);
  if (from < 0) return { alarm: 3006, params: { n: P } };
  if (to < 0) return { alarm: 3006, params: { n: Q } };
  if (from > to) return { alarm: 3007, params: { reason: 'P deve indicare un blocco che viene prima di Q' } };
  return { from, to };
}

// Geometria del profilo (senza F, S e controlli): elementi line/arc a partire dalla posizione start.
// Restituisce { elements } oppure { alarm, params, line }.
export function profileElements(blocks, range, start, state) {
  let pos = { ...start };
  let motion = state.motion;
  let units = state.units;
  const elements = [];
  for (let i = range.from; i <= range.to; i++) {
    const block = blocks[i];
    if (!isExecutable(block)) continue;
    if (block.alarm) return { alarm: block.alarm.code, params: {}, line: block.line, existing: block.alarm };
    const w = {};
    for (const word of block.words) {
      if (word.letter === 'G') {
        if (word.value <= 3) motion = word.value;
        if (word.value === 20 || word.value === 21) units = word.value;
      } else {
        w[word.letter] = word.value;
      }
    }
    if (!['X', 'Z', 'U', 'W'].some((l) => l in w)) continue;
    const k = units === 20 ? INCH : 1;
    const to = target(pos, w, k);
    if (motion <= 1) {
      elements.push({ ...lineMove(pos, to), line: block.line });
    } else {
      const arc = arcMove(pos, to, w, k, motion === 2);
      if (arc.alarm) return { alarm: arc.alarm, params: arc.params, line: block.line };
      elements.push({ ...arc.move, line: block.line });
    }
    pos = to;
  }
  return checkTypeOne(elements);
}

// G71 tipo I: primo tratto solo in X, poi X mai decrescente e Z mai crescente
function checkTypeOne(elements) {
  const fail = (reason, line) => ({ alarm: 3007, params: { reason }, line });
  if (elements.length < 2) return fail('servono almeno due blocchi con movimento', elements[0]?.line);
  const first = elements[0];
  if (Math.abs(first.to.z - first.from.z) > 1e-6) return fail('il primo blocco deve muovere solo X', first.line);
  for (const el of elements.slice(1)) {
    const n = el.type === 'arc' ? 32 : 1;
    let prev = pointAt(el, 0);
    for (let s = 1; s <= n; s++) {
      const p = pointAt(el, s / n);
      if (p.x < prev.x - 1e-4) return fail('le quote X devono crescere sempre (niente gole)', el.line);
      if (p.z > prev.z + 1e-4) return fail('le quote Z devono diminuire sempre', el.line);
      prev = p;
    }
  }
  return { elements };
}

// Percorso di sgrossatura G71: passate in Z a profondità costante, scarico a 45°,
// passata finale lungo il profilo spostato del sovrametallo, ritorno al punto di partenza.
// Restituisce una lista di { kind: 'rapid' | 'feed', move } con move senza durata.
export function g71Path(start, elements, { depth, retract, allowX, allowZ }) {
  const shift = (p) => ({ x: p.x + allowX, z: p.z + allowZ });
  const contour = elements.slice(1).map((el) => shiftElement(el, allowX, allowZ, shift));
  const poly = [];
  for (const el of contour) {
    const n = el.type === 'arc' ? Math.max(8, Math.ceil(el.length / 0.1)) : 1;
    for (let s = poly.length ? 1 : 0; s <= n; s++) poly.push(pointAt(el, s / n));
  }
  const xFinal = contour[0].from.x;

  const levels = [];
  if (start.x > xFinal + 1e-6) {
    for (let x = start.x - 2 * depth; x > xFinal + 1e-6; x -= 2 * depth) levels.push(x);
    levels.push(xFinal);
  }

  const path = [];
  let pos = { ...start };
  const go = (kind, to) => {
    if (Math.hypot(to.x - pos.x, to.z - pos.z) < 1e-9) return;
    path.push({ kind, move: lineMove(pos, to) });
    pos = { ...to };
  };

  for (const x of levels) {
    const z = crossing(poly, x);
    if (z >= start.z - 1e-6) continue;
    go('rapid', { x, z: start.z });
    go('feed', { x, z });
    const out = { x: x + 2 * retract, z: z + retract };
    go('feed', out);
    go('rapid', { x: out.x, z: start.z });
  }

  // Passata lungo il profilo con il sovrametallo
  go('rapid', { x: Math.max(pos.x, contour[0].from.x), z: contour[0].from.z });
  go('rapid', contour[0].from);
  for (const el of contour) {
    path.push({ kind: 'feed', move: el });
    pos = { ...el.to };
  }
  const high = Math.max(start.x, pos.x);
  go('rapid', { x: high, z: pos.z });
  go('rapid', { x: high, z: start.z });
  go('rapid', start);
  return path;
}

// Quota Z dove il profilo raggiunge il diametro x (il profilo sale sempre in X)
function crossing(poly, x) {
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    if (a.x <= x && b.x > x) return a.z + ((x - a.x) * (b.z - a.z)) / (b.x - a.x);
  }
  return poly[poly.length - 1].z;
}

function shiftElement(el, allowX, allowZ, shift) {
  const moved = { ...el, from: shift(el.from), to: shift(el.to) };
  if (el.type === 'arc') moved.center = { z: el.center.z + allowZ, r: el.center.r + allowX / 2 };
  return moved;
}
