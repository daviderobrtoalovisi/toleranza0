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

// Lunghezza reale del tratto (in raggio, non in diametro)
export function segmentLength(from, to) {
  return Math.hypot(to.z - from.z, (to.x - from.x) / 2);
}
