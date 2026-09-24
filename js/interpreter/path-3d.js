// Geometria dei movimenti della fresatrice: posizioni { x, y, z }; archi nel piano XY
// con centro { x, y }, eventualmente elicoidali (Z varia in modo lineare lungo l'arco).

export function pointAt3(move, t) {
  if (move.type === 'arc') {
    const a = move.a0 + move.sweep * t;
    return {
      x: move.center.x + move.radius * Math.cos(a),
      y: move.center.y + move.radius * Math.sin(a),
      z: move.from.z + (move.to.z - move.from.z) * t
    };
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
