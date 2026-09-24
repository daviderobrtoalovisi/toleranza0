// Geometria dei movimenti della fresatrice: posizioni { x, y, z }.
// Gli archi stanno in un piano: move.axes = [primo, secondo, perpendicolare], per esempio
// ['x', 'y', 'z'] per G17 (predefinito), ['z', 'x', 'y'] per G18, ['y', 'z', 'x'] per G19.
// Il centro ha le quote dei due assi del piano; lungo l'asse perpendicolare l'arco può salire
// o scendere in modo lineare (elica).

const XY = ['x', 'y', 'z'];

export function pointAt3(move, t) {
  if (move.type === 'arc') {
    const [a, b, c] = move.axes ?? XY;
    const angle = move.a0 + move.sweep * t;
    const p = {};
    p[a] = move.center[a] + move.radius * Math.cos(angle);
    p[b] = move.center[b] + move.radius * Math.sin(angle);
    p[c] = move.from[c] + (move.to[c] - move.from[c]) * t;
    return p;
  }
  return {
    x: move.from.x + (move.to.x - move.from.x) * t,
    y: move.from.y + (move.to.y - move.from.y) * t,
    z: move.from.z + (move.to.z - move.from.z) * t
  };
}

export function length3(from, to) {
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}
