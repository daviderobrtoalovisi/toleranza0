import { pointAt } from '../../interpreter/path.js';
import { createAlarm } from '../../alarms/alarm.js';
import { createStock } from './stock.js';
import { toolOutline, crossings, containsPoint } from './tools.js';

// Simulatore del tornio: muove l'utensile lungo i movimenti dell'interprete,
// toglie il materiale con i movimenti di lavoro e controlla le collisioni.
// Funzione pura rispetto al DOM: la usano sia l'interfaccia sia i test.

export function createLatheSimulator({ params, tools }) {
  const outlines = {};
  const outlineOf = (id) => (outlines[id] ??= toolOutline(tools[id]));

  const sim = {
    setup: null,
    stock: null,
    chuck: null,
    pos: { ...params.home },
    tool: null,
    trail: [],

    reset(setup) {
      sim.setup = setup;
      sim.stock = createStock(setup);
      const R = setup.diameter / 2;
      const z0 = -setup.length;
      // Griffe e corpo del mandrino (quote in raggio)
      sim.chuck = { jawZ: z0, jawR: R + 12, bodyZ: z0 - 25, bodyR: R + 45 };
      sim.pos = { ...params.home };
      sim.tool = null;
      sim.trail = [];
    },

    // Percorre il movimento da t0 a t1 (frazioni 0..1). Restituisce il codice di allarme o null.
    follow(move, t0, t1) {
      if (move.type === 'tool') {
        if (t1 >= 1) sim.tool = move.tool;
        return null;
      }
      if (move.type === 'dwell' || move.length === 0) return null;
      const cutting = move.type !== 'rapid';
      const trail = trailFor(move, t0);
      const steps = Math.max(1, Math.ceil((move.length * (t1 - t0)) / sim.stock.c));
      for (let k = 1; k <= steps; k++) {
        const p = pointAt(move, t0 + ((t1 - t0) * k) / steps);
        sim.pos = p;
        const code = sweep(p, cutting);
        const last = trail.points[trail.points.length - 1];
        if (code || k === steps || Math.hypot(p.z - last.z, (p.x - last.x) / 2) > 0.3) trail.points.push(p);
        if (code) return code;
      }
      return null;
    }
  };

  function trailFor(move, t0) {
    const last = sim.trail[sim.trail.length - 1];
    if (last && last.move === move) return last;
    const entry = { move, type: move.type === 'rapid' ? 'rapid' : 'feed', points: [pointAt(move, t0)] };
    sim.trail.push(entry);
    return entry;
  }

  // Controlla l'utensile nella posizione p: mandrino, poi materiale (tolto se si sta tagliando)
  function sweep(p, cutting) {
    if (sim.tool === null) return null;
    const outline = outlineOf(sim.tool);
    const pz = p.z;
    const pr = p.x / 2;

    const { jawZ, jawR, bodyZ, bodyR } = sim.chuck;
    const inChuck = (z, r) => (z < jawZ && Math.abs(r) < jawR) || (z < bodyZ && Math.abs(r) < bodyR);
    for (const q of outline.points) if (inChuck(pz + q.z, pr + q.r)) return 4002;
    if (containsPoint(outline.points, jawZ - pz, jawR - pr) || containsPoint(outline.points, bodyZ - pz, bodyR - pr)) return 4002;

    const stock = sim.stock;
    const { c, nz, nr, zMin } = stock;
    if (pz + outline.maxZ < zMin || pz + outline.minZ > stock.zMax || pr + outline.minR >= stock.R) return null;
    const j0 = Math.max(0, Math.floor((pr + outline.minR) / c));
    const j1 = Math.min(nr - 1, Math.floor((pr + outline.maxR) / c));
    for (let j = j0; j <= j1; j++) {
      const xs = crossings(outline.points, (j + 0.5) * c - pr);
      for (let a = 0; a + 1 < xs.length; a += 2) {
        const i0 = Math.max(0, Math.ceil((pz + xs[a] - zMin) / c - 0.5));
        const i1 = Math.min(nz - 1, Math.floor((pz + xs[a + 1] - zMin) / c - 0.5));
        if (i0 > i1) continue;
        if (!cutting) {
          if (stock.any(j, i0, i1)) return 4001;
        } else {
          stock.remove(j, i0, i1);
        }
      }
    }
    return null;
  }

  return sim;
}

// Esegue tutto il programma senza animazione (usato dai test). Restituisce il primo allarme o null.
export function runAll(program, sim) {
  for (const step of program.steps) {
    if (step.alarm) return step.alarm;
    for (const move of step.moves) {
      const code = sim.follow(move, 0, 1);
      if (code) return createAlarm(code, step.block.line);
    }
  }
  return null;
}
