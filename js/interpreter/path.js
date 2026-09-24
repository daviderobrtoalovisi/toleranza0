// Geometria dei movimenti, comune a tutte le macchine.
// Tornio: le posizioni sono { x, z } con x in diametro; il centro degli archi è { z, r } con r in raggio.

export function pointAt(move, t) {
  if (move.type === 'arc') {
    const a = move.a0 + move.sweep * t;
    return {
      x: 2 * (move.center.r + move.radius * Math.sin(a)),
      z: move.center.z + move.radius * Math.cos(a)
    };
  }
  return {
    x: move.from.x + (move.to.x - move.from.x) * t,
    z: move.from.z + (move.to.z - move.from.z) * t
  };
}

// Direzione del movimento nel punto t, come versore { z, r } (r = raggio)
export function directionAt(move, t) {
  let dz;
  let dr;
  if (move.type === 'arc') {
    const a = move.a0 + move.sweep * t;
    const sign = Math.sign(move.sweep);
    dz = -Math.sin(a) * sign;
    dr = Math.cos(a) * sign;
  } else {
    dz = move.to.z - move.from.z;
    dr = (move.to.x - move.from.x) / 2;
  }
  const length = Math.hypot(dz, dr) || 1;
  return { z: dz / length, r: dr / length };
}

// Lunghezza reale del tratto (in raggio, non in diametro)
export function segmentLength(from, to) {
  return Math.hypot(to.z - from.z, (to.x - from.x) / 2);
}
