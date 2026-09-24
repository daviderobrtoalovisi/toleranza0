import { createAlarm } from '../alarms/alarm.js';
import { isExecutable } from '../parser/check-program.js';

// Traduce un programma Siemens SINUMERIK (già letto e controllato) nei blocchi Fanuc equivalenti,
// così interpreti, simulatori, allarmi e grafica restano gli stessi per i due linguaggi.
// Ogni blocco tradotto mantiene riga e testo del blocco Siemens (block.original), quindi
// evidenziazione, allarmi e pannello "Blocco corrente" si riferiscono sempre al programma dello studente.
// Una riga Siemens può diventare più blocchi Fanuc (per esempio LIMS=2000 -> G50 S2000 prima del blocco).
//
// Corrispondenze principali:
//   tornio: G95 -> G99, G94 -> G98, G96 -> G96 G99, LIMS=n -> G50 Sn, T1 D1 -> T0101,
//           X=IC(..)/G91 -> U, Z=IC(..)/G91 -> W, DIAMOF -> quote X raddoppiate, G74 X1=0 Z1=0 -> G28 U0 W0
//   fresa:  T1 M6 -> T1 M06 + G43 H1 (con D la lunghezza è già attiva), G41/G42 -> con D dell'utensile,
//           G74 Z1=0 -> G91 G28 Z0, CYCLE81/82/83 (anche con MCALL) -> G81/G82/G83 con G99
//   entrambi: CR= -> R, G4 F.. -> G04 X.. (secondi), G70/G71 -> G20/G21, G500 -> nessuna origine

export function translateSiemens(blocks, machine) {
  const state = { absolute: true, diameter: true, tool: null, nextTool: null, units: 21 };
  const out = [];
  for (const block of blocks) {
    if (!isExecutable(block) || block.alarm) {
      out.push(block);
      continue;
    }
    const result = machine === 'mill' ? millBlock(block, state) : latheBlock(block, state);
    if (result.alarm) {
      out.push({ ...block, alarm: result.alarm });
      continue;
    }
    for (const words of result.blocks) {
      out.push({ line: block.line, source: block.source, words, comment: block.comment, blockDelete: block.blockDelete, alarm: null, original: block });
    }
  }
  return out;
}

const word = (letter, value) => ({ letter, value, raw: String(value), col: null });

function common(block) {
  const gs = [];
  const ms = [];
  const w = {};
  for (const item of block.words) {
    if (item.letter === 'G') gs.push(item.value);
    else if (item.letter === 'M') ms.push(item.value);
    else w[item.letter] = item;
  }
  return { gs, ms, w, has: (g) => gs.includes(g) };
}

// Più funzioni M nello stesso blocco (ammesse in Siemens): una resta nel blocco, le altre diventano
// blocchi propri, prima del movimento quelle che il Fanuc esegue prima (M3, M4, M8), dopo le altre.
function splitM(ms, words, before, after) {
  const early = [3, 4, 8];
  ms.forEach((m, i) => {
    if (i === ms.length - 1) words.push(word('M', m));
    else (early.includes(m) ? before : after).push([word('M', m)]);
  });
}

function unsupported(block, text) {
  return { alarm: createAlarm(1013, block.line, { word: text }) };
}

// ---------- Tornio ----------

function latheBlock(block, state) {
  const { gs, ms, w, has } = common(block);
  const pre = [];
  const post = [];
  const words = [];
  if (w.N) words.push(word('N', w.N.value));

  for (const g of gs) {
    if (g === 90) state.absolute = true;
    else if (g === 91) state.absolute = false;
    else if (g === 70 || g === 700) words.push(word('G', 20));
    else if (g === 71 || g === 710) words.push(word('G', 21));
    else if (g === 94) words.push(word('G', 98), word('G', 97));
    else if (g === 95) words.push(word('G', 99), word('G', 97));
    else if (g === 96) words.push(word('G', 96), word('G', 99));
    else if (g === 97) words.push(word('G', 97), word('G', 99));
    else if (g === 500) continue;
    else if (g === 74) words.push(word('G', 28));
    else words.push(word('G', g)); // G0–G4, G17–G19, G40–G42, G54–G57 hanno lo stesso numero
  }
  if (w.DIAMON) state.diameter = true;
  if (w.DIAMOF) state.diameter = false;

  if (w.LIMS) pre.push([word('G', 50), word('S', w.LIMS.value)]);

  // Utensile e correttore: in Siemens D è il tagliente dell'utensile (D1 = primo, D0 annulla),
  // quindi T3 D1 -> T0303 (correttore dell'utensile 3) e T3 D0 -> T0300
  if (w.T || w.D) {
    const tool = w.T ? w.T.value : state.tool;
    if (tool === null) return unsupported(block, 'D senza un utensile T');
    const edge = w.D ? w.D.value : 1;
    if (edge > 1) return unsupported(block, `D${edge} (tagliente ${edge} dell'utensile)`);
    words.push(word('T', tool * 100 + (edge === 0 ? 0 : tool)));
    state.tool = tool;
  }

  if (has(4)) {
    if (w.S) return unsupported(block, 'G4 S (sosta in giri del mandrino)');
    words.push(word('X', w.F ? w.F.value : 0));
  } else if (has(74)) {
    if (w.X1) words.push(word('U', 0));
    if (w.Z1) words.push(word('W', 0));
  } else {
    const scale = state.diameter ? 1 : 2;
    for (const [axis, inc] of [['X', 'U'], ['Z', 'W']]) {
      const item = w[axis];
      if (!item) continue;
      const k = axis === 'X' ? scale : 1;
      const incremental = item.mode === 'IC' || (!state.absolute && item.mode !== 'AC');
      words.push(word(incremental ? inc : axis, item.value * k));
    }
    if (w.I) words.push(word('I', w.I.value));
    if (w.K) words.push(word('K', w.K.value));
    if (w.CR) words.push(word('R', w.CR.value));
    if (w.F) words.push(word('F', w.F.value));
  }
  if (w.S) words.push(word('S', w.S.value));
  splitM(ms, words, pre, post);
  return { blocks: [...pre, words, ...post] };
}

// ---------- Fresa ----------

function millBlock(block, state) {
  const { gs, ms, w, has } = common(block);
  const blocks = [];
  const words = [];
  const after = [];
  if (w.N) words.push(word('N', w.N.value));

  // Cicli di foratura: da soli forano nella posizione attuale; con MCALL diventano modali
  const cycleName = CYCLES.find((name) => w[name]);
  if (cycleName || w.MCALL) {
    const extra = block.words.find((item) => !['N', 'MCALL', ...CYCLES].includes(item.letter));
    if (extra) return unsupported(block, `${extra.letter} nello stesso blocco del ciclo: scrivere il ciclo in un blocco a parte`);
  }
  if (cycleName) {
    const cycle = drillCycle(cycleName, w[cycleName].raw, block);
    if (cycle.alarm) return cycle;
    if (w.MCALL) {
      state.mcall = cycle;
      return { blocks: words.length ? [words] : [] };
    }
    return { blocks: [...(words.length ? [words] : []), ...drillBlocks(cycle, [])] };
  }
  if (w.MCALL) {
    state.mcall = null; // MCALL da solo annulla il richiamo modale
    return { blocks: words.length ? [words] : [] };
  }

  for (const g of gs) {
    if (g === 90) {
      state.absolute = true;
      words.push(word('G', 90));
    } else if (g === 91) {
      state.absolute = false;
      words.push(word('G', 91));
    } else if (g === 70 || g === 700) words.push(word('G', 20));
    else if (g === 71 || g === 710) words.push(word('G', 21));
    else if (g === 500) continue;
    else if (g === 74) continue; // tradotto sotto
    else if (g === 41 || g === 42) {
      if (state.tool === null) return unsupported(block, `G${g} senza un utensile montato`);
      words.push(word('G', g), word('D', state.tool));
    } else words.push(word('G', g));
  }

  for (const axis of ['X', 'Y', 'Z']) {
    if (w[axis]?.mode && (w[axis].mode === 'IC') === state.absolute) {
      return unsupported(block, `${axis}=${w[axis].mode}(...) sulla fresa: usare G90 o G91 per tutto il blocco`);
    }
  }

  // T prepara, M6 monta; con il correttore D la lunghezza è attiva subito (come G43 H del Fanuc)
  if (w.T) {
    words.push(word('T', w.T.value));
    state.nextTool = w.T.value;
  }
  const change = ms.includes(6);
  if (change) state.tool = state.nextTool;
  if (w.D && state.tool === null && !change) return unsupported(block, 'D senza un utensile montato');

  if (has(4)) {
    if (w.S) return unsupported(block, 'G4 S (sosta in giri del mandrino)');
    words.push(word('X', w.F ? w.F.value : 0));
  } else if (has(74)) {
    // Ritorno al punto di riferimento: come G91 G28 del Fanuc, poi si torna in assolute se serve
    const axes = ['X', 'Y', 'Z'].filter((a) => w[`${a}1`]).map((a) => word(a, 0));
    blocks.push([...words, word('G', 91), word('G', 28), ...axes]);
    if (state.absolute) blocks.push([word('G', 90)]);
    words.length = 0;
  } else if (state.mcall && (w.X || w.Y)) {
    // Posizionamento con un ciclo richiamato da MCALL: foro nella nuova posizione
    if (w.Z) return unsupported(block, 'Z nel blocco di posizionamento con MCALL attivo');
    if (w.F) words.push(word('F', w.F.value));
    const xy = ['X', 'Y'].filter((a) => w[a]).map((a) => word(a, w[a].value));
    after.unshift(...drillBlocks(state.mcall, xy));
  } else {
    for (const axis of ['X', 'Y', 'Z', 'I', 'J', 'K']) if (w[axis]) words.push(word(axis, w[axis].value));
    if (w.CR) words.push(word('R', w.CR.value));
    if (w.F) words.push(word('F', w.F.value));
  }
  if (w.S) words.push(word('S', w.S.value));
  const before = [];
  splitM(ms, words, before, after);
  blocks.unshift(...before);

  const lengthOffset = w.D ? w.D.value : change ? 1 : null;
  if (lengthOffset !== null && state.tool !== null) {
    after.push(lengthOffset === 0 ? [word('G', 49)] : [word('G', 43), word('H', state.tool)]);
  }
  if (words.length) blocks.push(words);
  return { blocks: [...blocks, ...after] };
}

// ---------- Cicli di foratura della fresa ----------

const CYCLES = ['CYCLE81', 'CYCLE82', 'CYCLE83'];
const FANUC_CYCLE = { CYCLE81: 81, CYCLE82: 82, CYCLE83: 83 };
const HOW = {
  CYCLE81: 'Si scrive CYCLE81(RTP, RFP, SDIS, DP, DPR): piano di ritorno, piano di riferimento (la faccia del pezzo), distanza di sicurezza, fondo assoluto oppure profondità dal piano di riferimento. Per esempio CYCLE81(10, 0, 2, -15).',
  CYCLE82: 'Si scrive CYCLE82(RTP, RFP, SDIS, DP, DPR, DTB), con DTB = sosta sul fondo in secondi. Per esempio CYCLE82(10, 0, 2, -8, , 0.5).',
  CYCLE83: 'Si scrive CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, FDPR, …), con FDEP = fondo della prima foratura oppure FDPR = sua profondità. Per esempio CYCLE83(10, 0, 2, -25, , -5).'
};

// Parametri del ciclo Siemens -> piano di ritorno, piano R, fondo Z, beccata Q, sosta P (ms).
// Ipotesi: G83 con scarico completo a ogni beccata (VARI=1); riduzione DAM e soste di CYCLE83 ignorate.
function drillCycle(name, raw, block) {
  const args = raw.slice(1, -1).split(',').map((s) => s.trim()).map((s) => (s === '' ? null : Number(s)));
  if (args.some((a) => a !== null && !Number.isFinite(a))) {
    return { alarm: createAlarm(1003, block.line, { letter: name, raw }) };
  }
  const [rtp = null, rfp = null, sdis = null, dp = null, dpr = null, a5 = null, a6 = null] = args;
  const missing = (what) => ({ alarm: createAlarm(2007, block.line, { cycle: name, missing: what, how: HOW[name] }) });
  if (rtp === null || rfp === null) return missing('il piano di ritorno RTP o il piano di riferimento RFP');
  const z = dp ?? (dpr !== null ? rfp - dpr : null);
  if (z === null) return missing('il fondo DP o la profondità DPR');
  const cycle = { name, rtp, r: rfp + (sdis ?? 0), z };
  if (name === 'CYCLE82') cycle.p = Math.round((a5 ?? 0) * 1000);
  if (name === 'CYCLE83') {
    const first = a5 ?? (a6 !== null ? rfp - a6 : null);
    if (first === null || first >= cycle.r) return missing('la prima profondità FDEP o FDPR');
    cycle.q = cycle.r - first;
  }
  return cycle;
}

// Foro Fanuc equivalente: G99 G8x (ritorno al piano R), G80 e risalita al piano di ritorno RTP
function drillBlocks(cycle, xy) {
  const drill = [word('G', 99), word('G', FANUC_CYCLE[cycle.name]), ...xy, word('Z', cycle.z), word('R', cycle.r)];
  if (cycle.q) drill.push(word('Q', cycle.q));
  if (cycle.p) drill.push(word('P', cycle.p));
  return [drill, [word('G', 80)], [word('G', 0), word('Z', cycle.rtp)]];
}
