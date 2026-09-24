import { pointAt3 } from '../../interpreter/path-3d.js';
import { createAlarm } from '../../alarms/alarm.js';
import { createMillStock } from './stock.js';
import { bottomAt } from './tools.js';

// Simulatore della fresatrice: muove l'utensile lungo i movimenti dell'interprete, abbassa la mappa
// delle altezze dove taglia e controlla collisioni (materiale in rapido, gambo e portautensile, morsa),
// profondità di passata e punta mossa di lato. Nessun DOM: lo usano l'interfaccia e i test.
// Stessa interfaccia del simulatore del tornio: reset(setup), follow(move, t0, t1), pos, tool, trail.

const HOLDER_LENGTH = 50;

export function createMillSimulator({ params, tools }) {
  const sim = {
    setup: null,
    stock: null,
    vise: null,
    home: params.home,
    pos: { ...params.home },
    tool: null,
    trail: [],

    reset(setup) {
      sim.setup = setup;
      sim.stock = createMillStock(setup);
      sim.vise = viseBoxes(sim.stock, params.vise);
      sim.pos = { ...params.home };
      sim.tool = null;
      sim.trail = [];
    },

    get toolPos() {
      return sim.pos;
    },

    // Percorre il movimento da t0 a t1. Restituisce null oppure { code, params }.
    follow(move, t0, t1) {
      if (move.type === 'tool') {
        if (t1 >= 1) sim.tool = move.tool;
        return null;
      }
      if (move.type === 'dwell' || move.length === 0) return null;
      const cutting = move.type !== 'rapid';
      const trail = trailFor(move, t0);
      const step = Math.min(sim.stock.cx, sim.stock.cy);
      const steps = Math.max(1, Math.ceil((move.length * (t1 - t0)) / step));
      let prev = pointAt3(move, t0);
      for (let k = 1; k <= steps; k++) {
        const p = pointAt3(move, t0 + ((t1 - t0) * k) / steps);
        const lateral = Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-9;
        sim.pos = p;
        const result = sweep(p, cutting, lateral);
        const last = trail.points[trail.points.length - 1];
        if (result || k === steps || Math.hypot(p.x - last.x, p.y - last.y, p.z - last.z) > 0.5) trail.points.push(p);
        if (result) return result;
        prev = p;
      }
      return null;
    }
  };

  function trailFor(move, t0) {
    const last = sim.trail[sim.trail.length - 1];
    if (last && last.move === move) return last;
    const entry = { move, type: move.type === 'rapid' ? 'rapid' : 'feed', points: [pointAt3(move, t0)] };
    sim.trail.push(entry);
    return entry;
  }

  function sweep(p, cutting, lateral) {
    if (sim.tool === null) return null;
    const tool = tools[sim.tool];
    const R = tool.diameter / 2;
    if (hitsVise(p, tool)) return { code: 4004 };

    const s = sim.stock;
    if (p.z >= s.zTop) return null; // punta sopra il grezzo: nessun contatto possibile
    const i0 = Math.max(0, Math.floor((p.x - R - s.xMin) / s.cx));
    const i1 = Math.min(s.nx - 1, Math.floor((p.x + R - s.xMin) / s.cx));
    const j0 = Math.max(0, Math.floor((p.y - R - s.yMin) / s.cy));
    const j1 = Math.min(s.ny - 1, Math.floor((p.y + R - s.yMin) / s.cy));

    let depth = 0;
    let removed = false;
    for (let j = j0; j <= j1; j++) {
      const y = s.yMin + (j + 0.5) * s.cy;
      for (let i = i0; i <= i1; i++) {
        const x = s.xMin + (i + 0.5) * s.cx;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d > R) continue;
        const index = j * s.nx + i;
        const h = s.height[index];
        const bottom = p.z + bottomAt(tool, d);
        if (h <= bottom + 1e-9) continue;
        if (!cutting) return { code: 4001 };
        if (h > p.z + tool.fluteLength + 1e-9) return { code: 4003 }; // taglia con il gambo
        depth = Math.max(depth, h - bottom);
        s.height[index] = bottom;
        s.markChanged(index);
        removed = true;
      }
    }

    // Portautensile: più largo della fresa, conta solo se scende sotto la superficie del grezzo
    if (p.z + tool.stickout < s.zTop && touchesHolder(p, tool)) return { code: 4003 };
    if (cutting && lateral && removed && tool.type === 'drill') return { code: 3008 };
    if (cutting && depth > tool.maxDepth + 0.02) {
      return { code: 3005, params: { depth: depth.toFixed(1), max: tool.maxDepth, tool: String(sim.tool).padStart(2, '0') } };
    }
    return null;
  }

  function touchesHolder(p, tool) {
    const s = sim.stock;
    const R = tool.holderDiameter / 2;
    const zHolder = p.z + tool.stickout;
    const i0 = Math.max(0, Math.floor((p.x - R - s.xMin) / s.cx));
    const i1 = Math.min(s.nx - 1, Math.floor((p.x + R - s.xMin) / s.cx));
    const j0 = Math.max(0, Math.floor((p.y - R - s.yMin) / s.cy));
    const j1 = Math.min(s.ny - 1, Math.floor((p.y + R - s.yMin) / s.cy));
    for (let j = j0; j <= j1; j++) {
      const y = s.yMin + (j + 0.5) * s.cy;
      for (let i = i0; i <= i1; i++) {
        const x = s.xMin + (i + 0.5) * s.cx;
        if (Math.hypot(x - p.x, y - p.y) <= R && s.height[j * s.nx + i] > zHolder + 1e-9) return true;
      }
    }
    return false;
  }

  // Utensile (fresa + gambo) e portautensile come due cilindri verticali contro le scatole della morsa
  function hitsVise(p, tool) {
    const parts = [
      { r: tool.diameter / 2, z0: p.z, z1: p.z + tool.stickout },
      { r: tool.holderDiameter / 2, z0: p.z + tool.stickout, z1: p.z + tool.stickout + HOLDER_LENGTH }
    ];
    for (const box of sim.vise) {
      for (const part of parts) {
        if (part.z1 <= box.zMin || part.z0 >= box.zMax) continue;
        const dx = Math.max(box.xMin - p.x, 0, p.x - box.xMax);
        const dy = Math.max(box.yMin - p.y, 0, p.y - box.yMax);
        if (Math.hypot(dx, dy) < part.r - 1e-9) return true;
      }
    }
    return false;
  }

  return sim;
}

// Morsa: due ganasce sui lati Y del grezzo, che ne lasciano sporgere la parte alta, e la base sotto
export function viseBoxes(stock, { maxProtrusion, jawThickness, margin, baseHeight }) {
  const height = stock.zTop - stock.zBottom;
  const protrusion = Math.min(maxProtrusion, height * 0.4);
  const jawTop = stock.zTop - protrusion;
  const x0 = stock.xMin - margin;
  const x1 = stock.xMax + margin;
  const z0 = stock.zBottom - baseHeight;
  return [
    { name: 'ganascia', xMin: x0, xMax: x1, yMin: stock.yMin - jawThickness, yMax: stock.yMin, zMin: z0, zMax: jawTop },
    { name: 'ganascia', xMin: x0, xMax: x1, yMin: stock.yMax, yMax: stock.yMax + jawThickness, zMin: z0, zMax: jawTop },
    { name: 'base', xMin: x0, xMax: x1, yMin: stock.yMin - jawThickness, yMax: stock.yMax + jawThickness, zMin: z0, zMax: stock.zBottom }
  ];
}

// Esegue tutto il programma senza animazione (test). Restituisce il primo allarme o null.
export function runAllMill(program, sim) {
  for (const step of program.steps) {
    if (step.alarm) return step.alarm;
    for (const move of step.moves) {
      const result = sim.follow(move, 0, 1);
      if (result) return createAlarm(result.code, step.block.line, result.params);
    }
  }
  return null;
}
