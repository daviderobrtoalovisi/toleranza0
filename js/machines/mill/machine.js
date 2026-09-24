// Parametri della fresatrice simulata. Valori tipici di una fresa didattica: da adattare a quella del laboratorio.
export const MILL_PARAMS = {
  home: { x: 0, y: 0, z: 150 },   // punto di riferimento G28 e posizione iniziale (quote pezzo)
  rapidRate: 10000,               // rapido G00 in mm/min (interpolato in linea retta)
  maxRpm: 8000,                   // giri massimi del mandrino
  toolChangeTime: 5,              // secondi per il cambio utensile M06
  // Fine corsa (quote pezzo): oltre questi valori allarme 3004
  limits: { x: { min: -250, max: 250 }, y: { min: -200, max: 200 }, z: { min: -100, max: 200 } },
  // Morsa (mm): il grezzo sporge sopra le ganasce al massimo maxProtrusion (e mai più del 40% della sua altezza);
  // ganasce spesse jawThickness in Y e più lunghe del grezzo di margin per lato; base alta baseHeight
  vise: { maxProtrusion: 10, jawThickness: 20, margin: 15, baseHeight: 30 }
};

// Grezzo: parallelepipedo in morsa. Z0 = faccia superiore finita; il grezzo sporge sopra di topAllowance.
// zero 'corner': X0 Y0 sull'angolo davanti a sinistra; 'center': X0 Y0 al centro.
export const DEFAULT_MILL_SETUP = { length: 100, width: 80, height: 30, topAllowance: 1, zero: 'corner' };

export const MILL_SETUP_LIMITS = {
  length: { min: 10, max: 300 },
  width: { min: 10, max: 200 },
  height: { min: 5, max: 100 },
  topAllowance: { min: 0, max: 10 }
};

// limits: limiti del grezzo del modello di fresa scelto (predefiniti: MILL_SETUP_LIMITS)
export function normalizeMillSetup(setup, limits = MILL_SETUP_LIMITS) {
  const result = {};
  for (const [key, { min, max }] of Object.entries(limits)) {
    const value = Number(setup?.[key]);
    result[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : DEFAULT_MILL_SETUP[key];
  }
  result.zero = setup?.zero === 'center' ? 'center' : 'corner';
  return result;
}

// Riga di commento nel programma: (GREZZO X100 Y80 Z30), con S1 per il sovrametallo e CENTRO per lo zero al centro
const DIRECTIVE = /\(\s*GREZZO\s+X\s*(\d+(?:\.\d+)?)\s+Y\s*(\d+(?:\.\d+)?)\s+Z\s*(\d+(?:\.\d+)?)([^)]*)\)/i;

export function millSetupFromProgram(text) {
  const match = DIRECTIVE.exec(text);
  if (!match) return null;
  const rest = match[4];
  const allowance = /\bS\s*(\d+(?:\.\d+)?)/i.exec(rest);
  return normalizeMillSetup({
    length: Number(match[1]),
    width: Number(match[2]),
    height: Number(match[3]),
    topAllowance: allowance ? Number(allowance[1]) : DEFAULT_MILL_SETUP.topAllowance,
    zero: /\bCENTRO\b/i.test(rest) ? 'center' : 'corner'
  });
}

// Ingombro del grezzo in quote pezzo
export function stockBox(setup) {
  const { length, width, height, topAllowance, zero } = setup;
  const x0 = zero === 'center' ? -length / 2 : 0;
  const y0 = zero === 'center' ? -width / 2 : 0;
  return { xMin: x0, xMax: x0 + length, yMin: y0, yMax: y0 + width, zTop: topAllowance, zBottom: topAllowance - height };
}
