// Parametri della macchina simulata. Valori tipici di un tornio didattico: da adattare a quello del laboratorio.
export const LATHE_PARAMS = {
  home: { x: 250, z: 150 },   // punto di riferimento G28 e posizione iniziale (X in diametro)
  rapidRate: 8000,            // rapido G00 in mm/min (interpolato in linea retta)
  maxRpm: 4000,               // giri massimi del mandrino
  toolChangeTime: 2           // secondi per il cambio utensile
};

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

export function normalizeSetup(setup) {
  const result = {};
  for (const [key, { min, max }] of Object.entries(SETUP_LIMITS)) {
    const value = Number(setup[key]);
    result[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : DEFAULT_SETUP[key];
  }
  return result;
}
