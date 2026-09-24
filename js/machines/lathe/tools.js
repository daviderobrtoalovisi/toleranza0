// Utensili in torretta e loro forma nel piano Z–X (r = raggio).
// Punto programmato: punta teorica con orientamento 3 (utensile esterno che lavora verso il mandrino):
// il raggio di punta è tangente alle rette r = 0 e z = 0, quindi senza G41/G42 cilindri e facce
// vengono esatti mentre coni e raggi hanno il piccolo errore reale dovuto al raggio di punta.
// maxDepth: profondità massima di passata in mm, misurata perpendicolarmente al movimento (allarme 3005).

export const LATHE_TOOLS = {
  1: {
    name: 'Sgrossatore esterno 80° (CNMG) r0.8',
    shape: 'rhombic',
    tipAngle: 80,
    approach: 95,
    noseRadius: 0.8,
    size: 12,
    maxDepth: 4
  },
  2: {
    name: 'Troncatore larghezza 3 mm (riferimento: spigolo destro)',
    shape: 'groove',
    width: 3,
    depth: 18,
    maxDepth: 3
  },
  3: {
    name: 'Finitore esterno 35° (VBMT) r0.4',
    shape: 'rhombic',
    tipAngle: 35,
    approach: 93,
    noseRadius: 0.4,
    size: 11,
    maxDepth: 2
  }
};

// Contorno dell'inserto come poligono { z, r } relativo al punto programmato
export function toolOutline(tool) {
  const points = tool.shape === 'groove' ? grooveOutline(tool) : rhombicOutline(rhombicGeometry(tool));
  return withBounds(points);
}

// Portautensile: appoggiato sul retro dell'inserto, non tocca la zona che taglia.
// Serve per il disegno e per la collisione 4003.
export function toolHolder(tool) {
  if (tool.shape === 'groove') {
    const { width, depth } = tool;
    return withBounds([
      { z: -width, r: depth }, { z: 16, r: depth }, { z: 16, r: depth + 40 }, { z: -width, r: depth + 40 }
    ]);
  }
  const { back, sideEnd, mainEnd, size } = rhombicGeometry(tool);
  const top = size * 4.5;
  const right = sideEnd.z + size * 0.6;
  return withBounds([
    mainEnd, back, sideEnd,
    { z: right, r: sideEnd.r }, { z: right, r: top }, { z: mainEnd.z, r: top }
  ]);
}

function rhombicGeometry({ tipAngle, approach, noseRadius: rn, size }) {
  const deg = Math.PI / 180;
  const alpha = tipAngle * deg;
  const secondary = (180 - approach - tipAngle) * deg; // tagliente secondario, quasi parallelo a Z
  const main = secondary + alpha;                       // tagliente principale, quasi parallelo a X
  const dir = (a) => ({ z: Math.cos(a), r: Math.sin(a) });
  const move = (p, v, k) => ({ z: p.z + v.z * k, r: p.r + v.r * k });

  const center = { z: rn, r: rn };
  const tip = move(center, dir(secondary + alpha / 2), -rn / Math.sin(alpha / 2)); // spigolo vivo teorico
  const es = dir(secondary);
  const em = dir(main);
  const sideEnd = move(tip, es, size);
  const mainEnd = move(tip, em, size);
  return {
    rn, size, center, tip, es, em, secondary, main, alpha,
    sideEnd,
    mainEnd,
    back: move(sideEnd, em, size),
    tangent: rn / Math.tan(alpha / 2)
  };
}

function rhombicOutline(g) {
  const move = (p, v, k) => ({ z: p.z + v.z * k, r: p.r + v.r * k });
  const points = [move(g.tip, g.es, g.tangent), g.sideEnd, g.back, g.mainEnd, move(g.tip, g.em, g.tangent)];
  // Raggio di punta, dal tagliente principale a quello secondario
  const a0 = g.main + Math.PI / 2;
  const a1 = g.secondary - Math.PI / 2 + 2 * Math.PI;
  const segments = 16;
  for (let k = 1; k < segments; k++) {
    const a = a0 + ((a1 - a0) * k) / segments;
    points.push({ z: g.center.z + g.rn * Math.cos(a), r: g.center.r + g.rn * Math.sin(a) });
  }
  return points;
}

function grooveOutline({ width, depth }) {
  return [{ z: 0, r: 0 }, { z: 0, r: depth }, { z: -width, r: depth }, { z: -width, r: 0 }];
}

function withBounds(points) {
  return {
    points,
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
    minR: Math.min(...points.map((p) => p.r)),
    maxR: Math.max(...points.map((p) => p.r))
  };
}

// Ascisse z dove la retta orizzontale r = y taglia il poligono, in ordine crescente
export function crossings(points, y) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if ((a.r <= y && b.r > y) || (b.r <= y && a.r > y)) {
      result.push(a.z + ((y - a.r) * (b.z - a.z)) / (b.r - a.r));
    }
  }
  return result.sort((p, q) => p - q);
}

export function containsPoint(points, z, r) {
  const xs = crossings(points, r);
  let inside = false;
  for (const x of xs) if (x < z) inside = !inside;
  return inside;
}
