import { segmentLength } from './path.js';

// Geometria dei blocchi del tornio: quote di arrivo, rapidi, archi. Posizioni { x (diametro), z }.

export const INCH = 25.4;
const FULL = 2 * Math.PI;

export function positiveAngle(a) {
  return ((a % FULL) + FULL) % FULL;
}

// Quota di arrivo da X/Z assolute o U/W incrementali; k converte i pollici
export function target(pos, w, k) {
  return {
    x: 'X' in w ? w.X * k : 'U' in w ? pos.x + w.U * k : pos.x,
    z: 'Z' in w ? w.Z * k : 'W' in w ? pos.z + w.W * k : pos.z
  };
}

export function rapidMove(from, to, params) {
  const length = segmentLength(from, to);
  return { type: 'rapid', from: { ...from }, to: { ...to }, length, duration: (length / params.rapidRate) * 60 };
}

export function lineMove(from, to) {
  return { type: 'line', from: { ...from }, to: { ...to }, length: segmentLength(from, to) };
}

// Arco nel piano Z–r. G02 = orario con Z verso destra e X verso l'alto (come nei disegni a scuola).
// Restituisce { move } oppure { alarm, params }.
export function arcMove(fromPos, to, w, k, clockwise) {
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
  let sweep = clockwise ? -positiveAngle(a0 - a1) : positiveAngle(a1 - a0);
  if (Math.abs(sweep) < 1e-9 && !('R' in w)) sweep = clockwise ? -FULL : FULL; // cerchio completo con I/K
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

export function fmt(value) {
  return Number(value.toFixed(3)).toString();
}
