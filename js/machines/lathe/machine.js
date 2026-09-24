// Parametri della macchina simulata. Valori tipici di un tornio didattico: da adattare a quello del laboratorio.
export const LATHE_PARAMS = {
  home: { x: 250, z: 150 },   // punto di riferimento G28 e posizione iniziale (X in diametro)
  rapidRate: 8000,            // rapido G00 in mm/min (interpolato in linea retta)
  maxRpm: 4000,               // giri massimi del mandrino
  toolChangeTime: 2,          // secondi per il cambio utensile
  // Fine corsa (quote pezzo, X in diametro): oltre questi valori allarme 3004
  limits: { x: { min: -10, max: 300 }, z: { min: -300, max: 200 } },
  // Mandrino (mm): griffe alte jawHeight sopra il grezzo e lunghe jawLength, corpo alto bodyHeight sopra il grezzo
  chuck: { jawHeight: 12, jawLength: 25, bodyHeight: 45 }
};

// Correttori utensile: usura in X (diametro) e Z, in mm. Registro 01, 02, 03 (uno per utensile).
// Posizione reale = quota programmata + usura: se il pezzo esce Ø42,10 invece di 42,00 si mette X -0.1.
export const DEFAULT_OFFSETS = {
  1: { x: 0, z: 0 },
  2: { x: 0, z: 0 },
  3: { x: 0, z: 0 }
};

export const OFFSET_LIMIT = 2; // usura massima inseribile, in mm

export function normalizeOffsets(offsets) {
  const result = {};
  for (const id of Object.keys(DEFAULT_OFFSETS)) {
    const source = offsets?.[id] ?? {};
    result[id] = {};
    for (const axis of ['x', 'z']) {
      const value = Number(source[axis]);
      result[id][axis] = Number.isFinite(value) ? Math.min(OFFSET_LIMIT, Math.max(-OFFSET_LIMIT, value)) : 0;
    }
  }
  return result;
}

// Grezzo predefinito: Ø, sporgenza dal mandrino e sovrametallo sulla faccia (Z0 = faccia finita)
export const DEFAULT_SETUP = { diameter: 50, length: 80, faceAllowance: 1 };

export const SETUP_LIMITS = {
  diameter: { min: 5, max: 200 },
  length: { min: 5, max: 300 },
  faceAllowance: { min: 0, max: 10 }
};

// Riga di commento nel programma per impostare il grezzo, per esempio (GREZZO D50 L80)
// oppure (GREZZO D50 L80 S1) con il sovrametallo sulla faccia.
const DIRECTIVE = /\(\s*GREZZO\s+D\s*(\d+(?:\.\d+)?)\s+L\s*(\d+(?:\.\d+)?)(?:\s+S\s*(\d+(?:\.\d+)?))?[^)]*\)/i;

export function setupFromProgram(text) {
  const match = DIRECTIVE.exec(text);
  if (!match) return null;
  const setup = {
    diameter: Number(match[1]),
    length: Number(match[2]),
    faceAllowance: match[3] !== undefined ? Number(match[3]) : DEFAULT_SETUP.faceAllowance
  };
  return normalizeSetup(setup);
}

// limits: limiti del grezzo del modello di tornio scelto (predefiniti: SETUP_LIMITS)
export function normalizeSetup(setup, limits = SETUP_LIMITS) {
  const result = {};
  for (const [key, { min, max }] of Object.entries(limits)) {
    const value = Number(setup[key]);
    result[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : DEFAULT_SETUP[key];
  }
  return result;
}
