import { positiveAngle } from './lathe-geometry.js';

// Nucleo comune della compensazione del raggio (G41/G42), per il tornio e per la fresa.
// Lavora nel piano del percorso con coordinate generiche { u, v } (tornio: u = Z, v = raggio;
// fresa: u = X, v = Y). Ogni macchina fornisce gli "agganci" per passare dai suoi movimenti agli
// elementi geometrici e ritorno:
//
//   hooks.isMotion(move)        movimento da considerare (rapido, lineare, arco con lunghezza)
//   hooks.toElement(move)       { kind: 'line', from, to } oppure { kind: 'arc', center, radius, a0, sweep }
//   hooks.startCenter(move, r)  centro dell'utensile non compensato all'inizio del movimento
//   hooks.endCenter(move, r)    centro dell'utensile non compensato alla fine del movimento
//   hooks.toMove(el, move, r)   movimento della macchina che fa percorrere el al centro dell'utensile
//
// Regole (come Fanuc, tipo A):
// - Attivazione (primo movimento compensato): dal centro non compensato al punto spostato di r
//   perpendicolare all'inizio del movimento successivo.
// - Spigoli esterni: il centro gira attorno allo spigolo con un arco di raggio r.
// - Spigoli interni: i due tratti spostati si accorciano fino al loro punto d'incontro.
// - Annullamento (primo movimento non compensato, di solito G40): dal punto spostato al centro
//   non compensato della quota di arrivo.
// - Movimenti solo in profondità (per esempio Z sulla fresa) non spostano il centro nel piano.
//
// I movimenti da compensare hanno move.comp = 'left' | 'right' e move.rn = raggio da compensare.

export function offsetChains(steps, hooks) {
  const replacements = new Map();
  let chain = [];
  for (const step of steps) {
    for (const move of step.moves) {
      if (!hooks.isMotion(move)) continue;
      if (move.comp && move.rn > 0) {
        chain.push(move);
      } else if (chain.length) {
        compensateChain(chain, move, hooks, replacements);
        chain = [];
      }
    }
  }
  if (chain.length) compensateChain(chain, null, hooks, replacements);
  if (!replacements.size) return;
  for (const step of steps) step.moves = step.moves.flatMap((m) => replacements.get(m) ?? [m]);
}

function compensateChain(chain, cancel, hooks, out) {
  const rn = chain[0].rn;
  const all = chain.map((move) => ({ move, el: hooks.toElement(move) }));
  const vertical = (item) => item.el.kind === 'line' && dist(item.el.from, item.el.to) < 1e-9;
  const first = all.findIndex((item) => !vertical(item));
  if (first < 0) return; // nessun movimento nel piano: niente da compensare
  const planar = all.slice(first).filter((item) => !vertical(item));
  const elements = planar.map((item) => item.el);
  const sides = planar.map((item) => (item.move.comp === 'left' ? 1 : -1));
  const shifted = elements.map((el, i) => (i === 0 ? null : offsetElement(el, rn, sides[i])));

  // Spigoli tra i tratti compensati
  const corners = [];
  for (let i = 1; i + 1 < elements.length; i++) {
    corners[i] = joinCorner(shifted[i], shifted[i + 1], elements[i], sides[i], rn);
  }

  // Attivazione: dal centro non compensato all'inizio del tratto successivo spostato
  const startCenter = hooks.startCenter(planar[0].move, rn);
  const startEnd = shifted[1]
    ? startOf(shifted[1])
    : add(elements[0].to, scale(normalAt(elements[0], 1, sides[0]), rn));
  const pieces = new Map([[planar[0].move, [{ kind: 'line', from: startCenter, to: startEnd }]]]);
  for (let i = 1; i < elements.length; i++) {
    const list = [shifted[i]];
    if (corners[i]) list.push({ ...corners[i], corner: true });
    pieces.set(planar[i].move, list);
  }

  // Uscita in ordine: i movimenti solo in profondità restano nel punto compensato raggiunto
  let point = null;
  for (const item of all.slice(first)) {
    const list = pieces.get(item.move);
    if (list) {
      out.set(item.move, list.map((el) => hooks.toMove(el, item.move, rn)).filter(Boolean));
      point = endOf(list[list.length - 1]);
    } else {
      const move = hooks.toMove({ kind: 'line', from: point, to: point, vertical: true }, item.move, rn);
      out.set(item.move, move ? [move] : []);
    }
  }

  if (cancel) {
    const move = hooks.toMove({ kind: 'line', from: point, to: hooks.endCenter(cancel, rn) }, cancel, rn);
    out.set(cancel, move ? [move] : []);
  }
}

// ---------- Geometria nel piano u–v ----------

export function startOf(el) {
  return el.kind === 'arc' ? arcPoint(el, el.a0) : el.from;
}

export function endOf(el) {
  return el.kind === 'arc' ? arcPoint(el, el.a0 + el.sweep) : el.to;
}

function arcPoint(el, a) {
  return { u: el.center.u + el.radius * Math.cos(a), v: el.center.v + el.radius * Math.sin(a) };
}

function dist(p, q) {
  return Math.hypot(p.u - q.u, p.v - q.v);
}

function directionAt(el, t) {
  if (el.kind === 'arc') {
    const a = el.a0 + el.sweep * t;
    const s = Math.sign(el.sweep);
    return { u: -Math.sin(a) * s, v: Math.cos(a) * s };
  }
  const d = { u: el.to.u - el.from.u, v: el.to.v - el.from.v };
  const l = Math.hypot(d.u, d.v) || 1;
  return { u: d.u / l, v: d.v / l };
}

// Normale dal lato dell'utensile: side = 1 sinistra (G41), -1 destra (G42)
function normalAt(el, t, side) {
  const d = directionAt(el, t);
  return { u: -d.v * side, v: d.u * side };
}

function offsetElement(el, rn, side) {
  if (el.kind === 'line') {
    const n = normalAt(el, 0, side);
    return { kind: 'line', from: add(el.from, scale(n, rn)), to: add(el.to, scale(n, rn)) };
  }
  // Arco antiorario: la sinistra è verso il centro
  const radius = el.radius - side * Math.sign(el.sweep) * rn;
  if (radius < 1e-6) {
    // Raggio del profilo più piccolo del raggio da compensare: resta solo il punto d'incontro
    const p = add(arcPoint(el, el.a0), scale(normalAt(el, 0, side), rn));
    return { kind: 'line', from: p, to: p };
  }
  return { kind: 'arc', center: { ...el.center }, radius, a0: el.a0, sweep: el.sweep };
}

function joinCorner(a, b, elA, side, rn) {
  const p = endOf(elA);
  const endA = endOf(a);
  const startB = startOf(b);
  if (dist(endA, startB) < 1e-7) return null; // tratti tangenti
  const dA = directionAt(a, 1);
  const dB = directionAt(b, 0);
  const cross = dA.u * dB.v - dA.v * dB.u;
  if (side * cross > 1e-9) {
    // Spigolo interno: si accorciano i due tratti fino al punto d'incontro
    const hit = intersect(a, b, p, rn);
    if (hit && trimEnd(a, hit) && trimStart(b, hit)) return null;
    return { kind: 'line', from: endOf(a), to: startOf(b) };
  }
  // Spigolo esterno: arco di raggio rn attorno allo spigolo del profilo
  const a0 = Math.atan2(endA.v - p.v, endA.u - p.u);
  const a1 = Math.atan2(startB.v - p.v, startB.u - p.u);
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
    const d = dist(q, near);
    if (d < 4 * rn + 1e-6 && (!best || d < best.d)) best = { d, q };
  }
  return best?.q ?? null;
}

function lineLine(a, b) {
  const d1 = { u: a.to.u - a.from.u, v: a.to.v - a.from.v };
  const d2 = { u: b.to.u - b.from.u, v: b.to.v - b.from.v };
  const den = d1.u * d2.v - d1.v * d2.u;
  if (Math.abs(den) < 1e-12) return [];
  const t = ((b.from.u - a.from.u) * d2.v - (b.from.v - a.from.v) * d2.u) / den;
  return [{ u: a.from.u + d1.u * t, v: a.from.v + d1.v * t }];
}

function lineCircle(line, circle) {
  const d = { u: line.to.u - line.from.u, v: line.to.v - line.from.v };
  const f = { u: line.from.u - circle.center.u, v: line.from.v - circle.center.v };
  const A = d.u * d.u + d.v * d.v;
  if (A < 1e-12) return [];
  const B = 2 * (f.u * d.u + f.v * d.v);
  const C = f.u * f.u + f.v * f.v - circle.radius * circle.radius;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [(-B - s) / (2 * A), (-B + s) / (2 * A)].map((t) => ({ u: line.from.u + d.u * t, v: line.from.v + d.v * t }));
}

function circleCircle(a, b) {
  const du = b.center.u - a.center.u;
  const dv = b.center.v - a.center.v;
  const d = Math.hypot(du, dv);
  if (d < 1e-12 || d > a.radius + b.radius || d < Math.abs(a.radius - b.radius)) return [];
  const l = (a.radius * a.radius - b.radius * b.radius + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.radius * a.radius - l * l));
  const m = { u: a.center.u + (l * du) / d, v: a.center.v + (l * dv) / d };
  return [
    { u: m.u - (h * dv) / d, v: m.v + (h * du) / d },
    { u: m.u + (h * dv) / d, v: m.v - (h * du) / d }
  ];
}

// Accorcia la fine di un elemento fino a q; false se q non sta sull'elemento
function trimEnd(el, q) {
  if (el.kind === 'line') {
    const d = { u: el.to.u - el.from.u, v: el.to.v - el.from.v };
    if ((q.u - el.from.u) * d.u + (q.v - el.from.v) * d.v < -1e-9) return false;
    el.to = q;
    return true;
  }
  const s = Math.sign(el.sweep);
  const aq = Math.atan2(q.v - el.center.v, q.u - el.center.u);
  const sweep = s > 0 ? positiveAngle(aq - el.a0) : -positiveAngle(el.a0 - aq);
  if (Math.abs(sweep) > Math.abs(el.sweep) + 1e-6) return false;
  el.sweep = sweep;
  return true;
}

function trimStart(el, q) {
  if (el.kind === 'line') {
    const d = { u: el.to.u - el.from.u, v: el.to.v - el.from.v };
    if ((el.to.u - q.u) * d.u + (el.to.v - q.v) * d.v < -1e-9) return false;
    el.from = q;
    return true;
  }
  const s = Math.sign(el.sweep);
  const a1 = el.a0 + el.sweep;
  const aq = Math.atan2(q.v - el.center.v, q.u - el.center.u);
  const sweep = s > 0 ? positiveAngle(a1 - aq) : -positiveAngle(aq - a1);
  if (Math.abs(sweep) > Math.abs(el.sweep) + 1e-6) return false;
  el.a0 = aq;
  el.sweep = sweep;
  return true;
}

function add(p, q) {
  return { u: p.u + q.u, v: p.v + q.v };
}

function scale(p, k) {
  return { u: p.u * k, v: p.v * k };
}
