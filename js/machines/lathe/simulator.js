import { pointAt, directionAt } from '../../interpreter/path.js';
import { createAlarm } from '../../alarms/alarm.js';
import { createStock } from './stock.js';
import { toolOutline, toolHolder, crossings, containsPoint } from './tools.js';

// Simulatore del tornio: muove l'utensile lungo i movimenti dell'interprete,
// toglie il materiale con i movimenti di lavoro e controlla collisioni e profondità di passata.
// Funzione pura rispetto al DOM: la usano sia l'interfaccia sia i test.
//
// sim.pos è la quota programmata (quella mostrata dalle quote X/Z); l'utensile si trova in
// sim.pos + sim.offset, cioè con l'usura del correttore attivo.

const NO_OFFSET = { x: 0, z: 0 };

export function createLatheSimulator({ params, tools }) {
  const shapes = {};
  const shapeOf = (id) => (shapes[id] ??= { outline: toolOutline(tools[id]), holder: toolHolder(tools[id]) });

  const sim = {
    setup: null,
    stock: null,
    chuck: null,
    home: params.home,
    pos: { ...params.home },
    offset: NO_OFFSET,
    tool: null,
    trail: [],

    reset(setup) {
      sim.setup = setup;
      sim.stock = createStock(setup);
      const R = setup.diameter / 2;
      const z0 = -setup.length;
      // Griffe e corpo del mandrino (quote in raggio)
      const { jawHeight, jawLength, bodyHeight } = params.chuck;
      sim.chuck = { jawZ: z0, jawR: R + jawHeight, bodyZ: z0 - jawLength, bodyR: R + bodyHeight };
      sim.pos = { ...params.home };
      sim.offset = NO_OFFSET;
      sim.tool = null;
      sim.trail = [];
    },

    // Posizione reale dell'utensile (quota programmata + usura)
    get toolPos() {
      return { x: sim.pos.x + sim.offset.x, z: sim.pos.z + sim.offset.z };
    },

    // Percorre il movimento da t0 a t1 (frazioni 0..1).
    // Restituisce null oppure { code, params } per l'allarme.
    follow(move, t0, t1) {
      if (move.type === 'tool') {
        if (t1 >= 1) {
          sim.tool = move.tool;
          sim.offset = move.offset ?? NO_OFFSET;
        }
        return null;
      }
      sim.offset = move.offset ?? NO_OFFSET;
      if (move.type === 'dwell' || move.length === 0) return null;
      const cutting = move.type !== 'rapid' && !move.rapidMotion;
      const trail = trailFor(move, t0);
      const steps = Math.max(1, Math.ceil((move.length * (t1 - t0)) / sim.stock.c));
      for (let k = 1; k <= steps; k++) {
        const t = t0 + ((t1 - t0) * k) / steps;
        sim.pos = pointAt(move, t);
        const p = sim.toolPos;
        const result = sweep(p, cutting, directionAt(move, t));
        const last = trail.points[trail.points.length - 1];
        if (result || k === steps || Math.hypot(p.z - last.z, (p.x - last.x) / 2) > 0.3) trail.points.push(p);
        if (result) return result;
      }
      return null;
    }
  };

  function trailFor(move, t0) {
    const last = sim.trail[sim.trail.length - 1];
    if (last && last.move === move) return last;
    const start = pointAt(move, t0);
    const offset = move.offset ?? NO_OFFSET;
    const entry = {
      move,
      type: move.type === 'rapid' || move.rapidMotion ? 'rapid' : 'feed',
      points: [{ x: start.x + offset.x, z: start.z + offset.z }]
    };
    sim.trail.push(entry);
    return entry;
  }

  // Controlla l'utensile nella posizione reale p: mandrino, portautensile, poi inserto
  // (in rapido non deve toccare il materiale, in lavoro lo toglie e si misura la profondità di passata).
  function sweep(p, cutting, direction) {
    if (sim.tool === null) return null;
    const { outline, holder } = shapeOf(sim.tool);
    const pz = p.z;
    const pr = p.x / 2;

    if (hitsChuck(outline, pz, pr) || hitsChuck(holder, pz, pr)) return { code: 4002 };
    if (touchesMaterial(holder, pz, pr)) return { code: 4003 };

    const stock = sim.stock;
    const { c, zMin } = stock;
    const rows = rowsOf(outline, pz, pr);
    if (!rows) return null;
    const normal = { z: -direction.r, r: direction.z };
    let depth = 0;
    for (let j = rows.j0; j <= rows.j1; j++) {
      for (const [i0, i1] of spans(outline, pz, pr, j)) {
        if (!cutting) {
          if (stock.any(j, i0, i1)) return { code: 4001 };
          continue;
        }
        const { first, last } = stock.remove(j, i0, i1);
        if (first < 0) continue;
        const dr = (j + 0.5) * c - pr;
        for (const i of [first, last]) {
          const dz = zMin + (i + 0.5) * c - pz;
          depth = Math.max(depth, Math.abs(dz * normal.z + dr * normal.r));
        }
      }
    }
    const tool = tools[sim.tool];
    if (cutting && depth > tool.maxDepth + c + 0.05) {
      return { code: 3005, params: { depth: depth.toFixed(1), max: tool.maxDepth, tool: String(sim.tool).padStart(2, '0') } };
    }
    return null;
  }

  function hitsChuck(shape, pz, pr) {
    const { jawZ, jawR, bodyZ, bodyR } = sim.chuck;
    const inChuck = (z, r) => (z < jawZ && Math.abs(r) < jawR) || (z < bodyZ && Math.abs(r) < bodyR);
    for (const q of shape.points) if (inChuck(pz + q.z, pr + q.r)) return true;
    return containsPoint(shape.points, jawZ - pz, jawR - pr) || containsPoint(shape.points, bodyZ - pz, bodyR - pr);
  }

  function touchesMaterial(shape, pz, pr) {
    const rows = rowsOf(shape, pz, pr);
    if (!rows) return false;
    for (let j = rows.j0; j <= rows.j1; j++) {
      for (const [i0, i1] of spans(shape, pz, pr, j)) if (sim.stock.any(j, i0, i1)) return true;
    }
    return false;
  }

  // Righe del grezzo toccate dalla forma, o null se la forma è fuori dal grezzo
  function rowsOf(shape, pz, pr) {
    const { c, nr, zMin, zMax, R } = sim.stock;
    if (pz + shape.maxZ < zMin || pz + shape.minZ > zMax || pr + shape.minR >= R) return null;
    const j0 = Math.max(0, Math.floor((pr + shape.minR) / c));
    const j1 = Math.min(nr - 1, Math.floor((pr + shape.maxR) / c));
    return j0 <= j1 ? { j0, j1 } : null;
  }

  // Intervalli di celle [i0, i1] della riga j con il centro dentro la forma
  function spans(shape, pz, pr, j) {
    const { c, nz, zMin } = sim.stock;
    const xs = crossings(shape.points, (j + 0.5) * c - pr);
    const result = [];
    for (let a = 0; a + 1 < xs.length; a += 2) {
      const i0 = Math.max(0, Math.ceil((pz + xs[a] - zMin) / c - 0.5));
      const i1 = Math.min(nz - 1, Math.floor((pz + xs[a + 1] - zMin) / c - 0.5));
      if (i0 <= i1) result.push([i0, i1]);
    }
    return result;
  }

  return sim;
}

// Esegue tutto il programma senza animazione (usato dai test). Restituisce il primo allarme o null.
export function runAll(program, sim) {
  for (const step of program.steps) {
    if (step.alarm) return step.alarm;
    for (const move of step.moves) {
      const result = sim.follow(move, 0, 1);
      if (result) return createAlarm(result.code, step.block.line, result.params);
    }
  }
  return null;
}
