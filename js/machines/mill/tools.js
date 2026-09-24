// Utensili della fresatrice. Il punto programmato (con G43) è la punta dell'utensile sull'asse.
// fluteLength: lunghezza tagliente; stickout: sporgenza dal portautensile; maxDepth: profondità
// massima di passata in mm (materiale tolto in una volta sopra la punta, allarme 3005).

export const MILL_TOOLS = {
  1: { name: 'Fresa a candela Ø10', type: 'flat', diameter: 10, fluteLength: 22, stickout: 40, holderDiameter: 32, maxDepth: 5 },
  2: { name: 'Fresa a candela Ø6', type: 'flat', diameter: 6, fluteLength: 13, stickout: 30, holderDiameter: 25, maxDepth: 3 },
  3: { name: 'Punta elicoidale Ø8 (118°)', type: 'drill', diameter: 8, fluteLength: 40, stickout: 60, holderDiameter: 32, maxDepth: Infinity },
  4: { name: 'Fresa sferica Ø8', type: 'ball', diameter: 8, fluteLength: 16, stickout: 35, holderDiameter: 25, maxDepth: 2 }
};

const DRILL_HALF_ANGLE = (59 * Math.PI) / 180;

// Altezza del fondo dell'utensile sopra la punta, a distanza d dall'asse (d <= raggio)
export function bottomAt(tool, d) {
  const R = tool.diameter / 2;
  if (tool.type === 'ball') return R - Math.sqrt(Math.max(0, R * R - d * d));
  if (tool.type === 'drill') return d / Math.tan(DRILL_HALF_ANGLE);
  return 0;
}
