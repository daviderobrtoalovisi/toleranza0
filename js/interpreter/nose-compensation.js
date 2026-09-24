import { pointAt, segmentLength } from './path.js';
import { offsetChains } from './path-offset.js';

// Compensazione del raggio di punta G41/G42 sul tornio (utensili con orientamento 3).
//
// Senza compensazione il punto programmato è la punta teorica: il centro del raggio di punta sta in
// punta + (rn, rn) e su coni e raggi resta materiale in più. Con G41/G42 il centro segue il profilo
// programmato spostato di rn dal lato dell'utensile (G41 a sinistra, G42 a destra rispetto al verso
// del movimento, con Z verso destra e X verso l'alto): ogni movimento viene sostituito da quello
// della punta teorica che fa passare il raggio di punta esattamente sul profilo.
// La geometria (spigoli, attivazione, annullamento) è in path-offset.js, comune con la fresa.
// Piano u–v del nucleo: u = Z, v = raggio (X / 2).

const HOOKS = {
  isMotion(move) {
    return (move.type === 'rapid' || move.type === 'line' || move.type === 'arc') && move.length > 1e-9;
  },

  toElement(move) {
    const from = { u: move.from.z, v: move.from.x / 2 };
    const to = { u: move.to.z, v: move.to.x / 2 };
    if (move.type === 'arc') {
      return { kind: 'arc', from, to, center: { u: move.center.z, v: move.center.r }, radius: move.radius, a0: move.a0, sweep: move.sweep };
    }
    return { kind: 'line', from, to };
  },

  startCenter(move, rn) {
    return { u: move.from.z + rn, v: move.from.x / 2 + rn };
  },

  endCenter(move, rn) {
    return { u: move.to.z + rn, v: move.to.x / 2 + rn };
  },

  // Dal centro del raggio di punta alla punta teorica: punta = centro - (rn, rn)
  toMove(el, original, rn) {
    const tip = (p) => ({ x: 2 * (p.v - rn), z: p.u - rn });
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
        center: { z: el.center.u - rn, r: el.center.v - rn },
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
};

export function compensateNoseRadius(steps) {
  offsetChains(steps, HOOKS);
}
