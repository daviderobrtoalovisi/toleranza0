import { pointAt, segmentLength } from './path.js';
import { positiveAngle } from './lathe-geometry.js';

// Compensazione del raggio di punta G41/G42 (utensili con orientamento 3).
//
// Senza compensazione il punto programmato è la punta teorica: il centro del raggio di punta sta in
// punta + (rn, rn) e su coni e raggi resta materiale in più. Con G41/G42 il centro segue il profilo
// programmato spostato di rn dal lato dell'utensile (G41 a sinistra, G42 a destra rispetto al verso
// del movimento, con Z verso destra e X verso l'alto): ogni movimento viene sostituito da quello
// della punta teorica che fa passare il raggio di punta esattamente sul profilo.
//
// - Attivazione (primo blocco con G41/G42): dal centro non compensato al punto spostato di rn
//   perpendicolare all'inizio del blocco successivo.
// - Spigoli esterni: il centro gira attorno allo spigolo con un arco di raggio rn.
// - Spigoli interni: i due tratti spostati si accorciano fino al loro punto d'incontro.
// - Annullamento (primo movimento senza compensazione, di solito G40): dal punto spostato al centro
//   non compensato della quota di arrivo.
//
// Lavora sui passi già interpretati e sostituisce i movimenti; i movimenti da compensare hanno
// move.comp = 'left' | 'right' e move.rn = raggio di punta.

export function compensateNoseRadius(steps) {
  const replacements = new Map();
  let chain = [];
  for (const step of steps) {
    for (const move of step.moves) {
      if (!isMotion(move)) continue;
      if (move.comp && move.rn > 0) {
        chain.push(move);
      } else if (chain.length) {
        compensateChain(chain, move, replacements);
        chain = [];
      }
    }
  }
  if (chain.length) compensateChain(chain, null, replacements);
  if (!replacements.size) return;
  for (const step of steps) step.moves = step.moves.flatMap((m) => replacements.get(m) ?? [m]);
}

function isMotion(move) {
  return (move.type === 'rapid' || move.type === 'line' || move.type === 'arc') && move.length > 1e-9;
}

function compensateChain(chain, cancel, out) {
  const rn = chain[0].rn;
  const elements = chain.map(toElement);
  const sides = chain.map((m) => (m.comp === 'left' ? 1 : -1));
  const shifted = elements.map((el, i) => (i === 0 ? null : offsetElement(el, rn, sides[i])));

  // Spigoli tra i tratti compensati
  const corners = [];
  for (let i = 1; i + 1 < elements.length; i++) {
    corners[i] = joinCorner(shifted[i], shifted[i + 1], elements[i], sides[i], rn);
  }

  // Attivazione: dal centro non compensato all'inizio del tratto successivo spostato
  const startCenter = add(elements[0].from, { z: rn, r: rn });
  const startEnd = shifted[1]
    ? startOf(shifted[1])
    : add(elements[0].to, scale(normalAt(elements[0], 1, sides[0]), rn));
  const pieces = [[{ kind: 'line', from: startCenter, to: startEnd }]];
  for (let i = 1; i < elements.length; i++) {
    pieces[i] = [shifted[i]];
    if (corners[i]) pieces[i].push(corners[i]);
  }
  chain.forEach((move, i) => out.set(move, pieces[i].map((el) => toMove(el, move, rn)).filter(Boolean)));

  if (cancel) {
    const last = elements.length > 1 ? endOf(shifted[shifted.length - 1]) : startEnd;
    const end = { z: cancel.to.z + rn, r: cancel.to.x / 2 + rn };
    const move = toMove({ kind: 'line', from: last, to: end }, cancel, rn);
    out.set(cancel, move ? [move] : []);
  }
}

// ---------- Elementi geometrici nel piano Z–r (centro del raggio di punta) ----------

function toElement(move) {
  const from = { z: move.from.z, r: move.from.x / 2 };
  const to = { z: move.to.z, r: move.to.x / 2 };
  if (move.type === 'arc') {
    return { kind: 'arc', from, to, center: { ...move.center }, radius: move.radius, a0: move.a0, sweep: move.sweep };
  }
  return { kind: 'line', from, to };
}

function startOf(el) {
  return el.kind === 'arc' ? arcPoint(el, el.a0) : el.from;
}

function endOf(el) {
  return el.kind === 'arc' ? arcPoint(el, el.a0 + el.sweep) : el.to;
}

function arcPoint(el, a) {
  return { z: el.center.z + el.radius * Math.cos(a), r: el.center.r + el.radius * Math.sin(a) };
}

function directionAt(el, t) {
  if (el.kind === 'arc') {
    const a = el.a0 + el.sweep * t;
    const s = Math.sign(el.sweep);
    return { z: -Math.sin(a) * s, r: Math.cos(a) * s };
  }
  const d = { z: el.to.z - el.from.z, r: el.to.r - el.from.r };
  const l = Math.hypot(d.z, d.r) || 1;
  return { z: d.z / l, r: d.r / l };
}

// Normale dal lato dell'utensile: side = 1 sinistra (G41), -1 destra (G42)
function normalAt(el, t, side) {
  const d = directionAt(el, t);
  return { z: -d.r * side, r: d.z * side };
}

function offsetElement(el, rn, side) {
  if (el.kind === 'line') {
    const n = normalAt(el, 0, side);
    return { kind: 'line', from: add(el.from, scale(n, rn)), to: add(el.to, scale(n, rn)) };
  }
  // Arco antiorario: la sinistra è verso il centro
  const radius = el.radius - side * Math.sign(el.sweep) * rn;
  if (radius < 1e-6) {
    // Raggio del profilo più piccolo del raggio di punta: resta solo il punto d'incontro
    const p = add(arcPoint(el, el.a0), scale(normalAt(el, 0, side), rn));
    return { kind: 'line', from: p, to: p };
  }
  return { ...el, radius };
}

function joinCorner(a, b, elA, side, rn) {
  const p = endOf(elA);
  const endA = endOf(a);
  const startB = startOf(b);
  if (Math.hypot(endA.z - startB.z, endA.r - startB.r) < 1e-7) return null; // tratti tangenti
  const dA = directionAt(a, 1);
  const dB = directionAt(b, 0);
  const cross = dA.z * dB.r - dA.r * dB.z;
  if (side * cross > 1e-9) {
    // Spigolo interno: si accorciano i due tratti fino al punto d'incontro
    const hit = intersect(a, b, p, rn);
    if (hit && trimEnd(a, hit) && trimStart(b, hit)) return null;
    return { kind: 'line', from: endOf(a), to: startOf(b) };
  }
  // Spigolo esterno: arco di raggio rn attorno allo spigolo del profilo
  const a0 = Math.atan2(endA.r - p.r, endA.z - p.z);
  const a1 = Math.atan2(startB.r - p.r, startB.z - p.z);
  const turn = cross !== 0 ? Math.sign(cross) : -side;
  const sweep = turn > 0 ? positiveAngle(a1 - a0) : -positiveAngle(a0 - a1);
  return { kind: 'arc', center: { ...p }, radius: rn, a0, sweep };
}

// Punto d'incontro più vicino a near tra due elementi (rette e cerchi completi)
function intersect(a, b, near, rn) {
  let points;
  if (a.kind === 'line' && b.kind === 'line') points = lineLine(a, b);
  else if (a.kind === 'line') points = lineCircle(a, b);
  else if (b.kind === 'line') points = lineCircle(b, a);
  else points = circleCircle(a, b);
  let best = null;
  for (const q of points) {
    const d = Math.hypot(q.z - near.z, q.r - near.r);
    if (d < 4 * rn + 1e-6 && (!best || d < best.d)) best = { d, q };
  }
  return best?.q ?? null;
}

function lineLine(a, b) {
  const d1 = { z: a.to.z - a.from.z, r: a.to.r - a.from.r };
  const d2 = { z: b.to.z - b.from.z, r: b.to.r - b.from.r };
  const den = d1.z * d2.r - d1.r * d2.z;
  if (Math.abs(den) < 1e-12) return [];
  const t = ((b.from.z - a.from.z) * d2.r - (b.from.r - a.from.r) * d2.z) / den;
  return [{ z: a.from.z + d1.z * t, r: a.from.r + d1.r * t }];
}

function lineCircle(line, circle) {
  const d = { z: line.to.z - line.from.z, r: line.to.r - line.from.r };
  const f = { z: line.from.z - circle.center.z, r: line.from.r - circle.center.r };
  const A = d.z * d.z + d.r * d.r;
  if (A < 1e-12) return [];
  const B = 2 * (f.z * d.z + f.r * d.r);
  const C = f.z * f.z + f.r * f.r - circle.radius * circle.radius;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [(-B - s) / (2 * A), (-B + s) / (2 * A)].map((t) => ({ z: line.from.z + d.z * t, r: line.from.r + d.r * t }));
}

function circleCircle(a, b) {
  const dz = b.center.z - a.center.z;
  const dr = b.center.r - a.center.r;
  const d = Math.hypot(dz, dr);
  if (d < 1e-12 || d > a.radius + b.radius || d < Math.abs(a.radius - b.radius)) return [];
  const l = (a.radius * a.radius - b.radius * b.radius + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.radius * a.radius - l * l));
  const m = { z: a.center.z + (l * dz) / d, r: a.center.r + (l * dr) / d };
  return [
    { z: m.z - (h * dr) / d, r: m.r + (h * dz) / d },
    { z: m.z + (h * dr) / d, r: m.r - (h * dz) / d }
  ];
}

// Accorcia la fine di un elemento fino a q; false se q non sta sull'elemento
function trimEnd(el, q) {
  if (el.kind === 'line') {
    const d = { z: el.to.z - el.from.z, r: el.to.r - el.from.r };
    if ((q.z - el.from.z) * d.z + (q.r - el.from.r) * d.r < -1e-9) return false;
    el.to = q;
    return true;
  }
  const s = Math.sign(el.sweep);
  const aq = Math.atan2(q.r - el.center.r, q.z - el.center.z);
  const sweep = s > 0 ? positiveAngle(aq - el.a0) : -positiveAngle(el.a0 - aq);
  if (Math.abs(sweep) > Math.abs(el.sweep) + 1e-6) return false;
  el.sweep = sweep;
  return true;
}

function trimStart(el, q) {
  if (el.kind === 'line') {
    const d = { z: el.to.z - el.from.z, r: el.to.r - el.from.r };
    if ((el.to.z - q.z) * d.z + (el.to.r - q.r) * d.r < -1e-9) return false;
    el.from = q;
    return true;
  }
  const s = Math.sign(el.sweep);
  const a1 = el.a0 + el.sweep;
  const aq = Math.atan2(q.r - el.center.r, q.z - el.center.z);
  const sweep = s > 0 ? positiveAngle(a1 - aq) : -positiveAngle(aq - a1);
  if (Math.abs(sweep) > Math.abs(el.sweep) + 1e-6) return false;
  el.a0 = aq;
  el.sweep = sweep;
  return true;
}

// ---------- Ritorno ai movimenti della punta teorica ----------

function toMove(el, original, rn) {
  const tip = (p) => ({ x: 2 * (p.r - rn), z: p.z - rn });
  const rate = original.duration > 0 && original.length > 0 ? original.length / original.duration : 0;
  const rapid = original.type === 'rapid' || original.rapidMotion;
  let move;
  if (el.kind === 'line') {
    const from = tip(el.from);
    const to = tip(el.to);
    const length = segmentLength(from, to);
    if (length < 1e-9) return null;
    move = { type: rapid ? 'rapid' : 'line', from, to, length };
  } else {
    const length = el.radius * Math.abs(el.sweep);
    if (length < 1e-9) return null;
    move = {
      type: 'arc',
      center: { z: el.center.z - rn, r: el.center.r - rn },
      radius: el.radius,
      a0: el.a0,
      sweep: el.sweep,
      clockwise: el.sweep < 0,
      length
    };
    if (rapid) move.rapidMotion = true;
    move.from = pointAt(move, 0);
    move.to = pointAt(move, 1);
  }
  move.duration = rate > 0 ? move.length / rate : 0;
  move.offset = original.offset;
  move.compensated = true;
  return move;
}

function add(p, q) {
  return { z: p.z + q.z, r: p.r + q.r };
}

function scale(p, k) {
  return { z: p.z * k, r: p.r * k };
}
