import { pointAt3, length3 } from './path-3d.js';
import { offsetChains } from './path-offset.js';

// Compensazione del raggio fresa G41/G42 (piano G17). Il programma descrive il profilo del pezzo;
// con G41 (fresa a sinistra del percorso, guardando dall'alto) o G42 (a destra) il centro della
// fresa viene spostato del raggio. La geometria è quella comune di path-offset.js, con u = X, v = Y.
// Z non cambia la geometria: ogni tratto compensato mantiene le quote Z del movimento di origine,
// e i movimenti solo in Z restano nel punto compensato già raggiunto.

const HOOKS = {
  isMotion(move) {
    return (move.type === 'rapid' || move.type === 'line' || move.type === 'arc') && move.length > 1e-9;
  },

  toElement(move) {
    const from = { u: move.from.x, v: move.from.y };
    const to = { u: move.to.x, v: move.to.y };
    if (move.type === 'arc') {
      return { kind: 'arc', from, to, center: { u: move.center.x, v: move.center.y }, radius: move.radius, a0: move.a0, sweep: move.sweep };
    }
    return { kind: 'line', from, to };
  },

  // Senza compensazione il centro della fresa è sulla quota programmata
  startCenter(move) {
    return { u: move.from.x, v: move.from.y };
  },

  endCenter(move) {
    return { u: move.to.x, v: move.to.y };
  },

  toMove(el, original) {
    const rate = original.duration > 0 && original.length > 0 ? original.length / original.duration : 0;
    const rapid = original.type === 'rapid' || original.rapidMotion;
    // Gli archi aggiunti agli spigoli stanno alla Z di arrivo del movimento precedente
    const z0 = el.corner ? original.to.z : original.from.z;
    const z1 = original.to.z;
    let move;
    if (el.kind === 'line') {
      const from = { x: el.from.u, y: el.from.v, z: z0 };
      const to = { x: el.to.u, y: el.to.v, z: z1 };
      const length = length3(from, to);
      if (length < 1e-9) return null;
      move = { type: rapid ? 'rapid' : 'line', from, to, length };
    } else {
      const flat = el.radius * Math.abs(el.sweep);
      if (flat < 1e-9) return null;
      move = {
        type: 'arc',
        axes: ['x', 'y', 'z'],
        center: { x: el.center.u, y: el.center.v },
        radius: el.radius,
        a0: el.a0,
        sweep: el.sweep,
        clockwise: el.sweep < 0,
        from: { x: 0, y: 0, z: z0 },
        to: { x: 0, y: 0, z: z1 },
        length: Math.hypot(flat, z1 - z0)
      };
      if (rapid) move.rapidMotion = true;
      move.from = pointAt3(move, 0);
      move.to = pointAt3(move, 1);
    }
    move.duration = rate > 0 ? move.length / rate : 0;
    move.compensated = true;
    return move;
  }
};

export function compensateCutterRadius(steps) {
  offsetChains(steps, HOOKS);
}
