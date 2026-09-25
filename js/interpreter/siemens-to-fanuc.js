import { createAlarm } from '../alarms/alarm.js';
import { isExecutable } from '../parser/check-program.js';
import { pocketBlocks } from './siemens-pockets.js';

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

export function translateSiemens(blocks, machine, { tools = {} } = {}) {
  const state = { absolute: true, diameter: true, tool: null, nextTool: null, units: 21, tools };
  state.contours = machine === 'lathe' ? findContours(blocks) : new Map();
  const starts = new Map([...state.contours.values()].filter((c) => !c.alarm).map((c) => [c.from, c]));
  const out = [];
  let contour = null; // profilo di CYCLE95 in traduzione: i suoi blocchi Fanuc si raccolgono a parte
  blocks.forEach((block, index) => {
    if (!contour && starts.has(index)) {
      contour = { ...starts.get(index), out: [] };
    }
    const target = contour ? contour.out : out;
    if (!isExecutable(block) || block.alarm) {
      target.push(block);
    } else {
      const result = machine === 'mill' ? millBlock(block, state) : latheBlock(block, state);
      if (result.alarm) {
        target.push({ ...block, alarm: result.alarm });
      } else {
        for (const item of result.blocks) {
          const words = Array.isArray(item) ? item : item.words;
          target.push({ line: block.line, source: block.source, words, comment: block.comment, blockDelete: block.blockDelete, alarm: null, original: block, ...(item.profileElsewhere ? { profileElsewhere: true } : {}) });
        }
      }
    }
    if (contour && index === contour.to) {
      out.push(...contourBlocks(contour, blocks));
      contour = null;
    }
  });
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

  const cycle = ['CYCLE95', 'CYCLE93'].find((name) => w[name]);
  if (cycle) {
    const extra = block.words.find((item) => item.letter !== 'N' && item.letter !== cycle);
    if (extra) return unsupported(block, `${extra.letter} nello stesso blocco del ciclo: scrivere il ciclo in un blocco a parte`);
    return (cycle === 'CYCLE95' ? cycle95 : cycle93)(block, w[cycle].raw, state, words);
  }

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

  // Tasche: movimenti G0/G1/G2/G3 calcolati dal ciclo (js/interpreter/siemens-pockets.js)
  const pocket = ['POCKET3', 'POCKET4'].find((name) => w[name]);
  if (pocket) {
    const extra = block.words.find((item) => item.letter !== 'N' && item.letter !== pocket);
    if (extra) return unsupported(block, `${extra.letter} nello stesso blocco del ciclo: scrivere il ciclo in un blocco a parte`);
    if (state.comp) return unsupported(block, `${pocket} con la compensazione G41/G42 attiva: scrivere G40 prima del ciclo`);
    return pocketBlocks(pocket, w[pocket].raw, block, state, words);
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
      state.comp = true;
      words.push(word('G', g), word('D', state.tool));
    } else {
      if (g === 40) state.comp = false;
      words.push(word('G', g));
    }
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

// ---------- Ciclo di sgrossatura del tornio CYCLE95 ----------
//
// CYCLE95("INIZIO:FINE", MID, FALZ, FALX, FAL, FF1, FF2, FF3, VARI, DT, DAM, _VRT)
// Il profilo sta dopo la fine del programma, tra le etichette INIZIO: e FINE:.
// Si traduce nei cicli Fanuc: VARI=1 -> G71 (sgrossatura), 5 -> G70 (finitura), 9 -> G71 + G70.
// Il profilo tradotto riceve due numeri N propri (P e Q) e il suo primo punto si divide in
// "G0 X" + "Z", come vuole il primo blocco del profilo di G71.
// Ipotesi: FALX in raggio; MID in raggio; _VRT vuoto = 1 mm; FF2, DT e DAM non simulati.

const CONTOUR_N = 900000;
const CYCLE95_HOW = 'Si scrive CYCLE95("INIZIO:FINE", MID, FALZ, FALX, FAL, FF1, FF2, FF3, VARI): etichette del profilo, profondità di passata, sovrametalli in Z e in X, avanzamenti di sgrossatura, di affondamento e di finitura, tipo di lavorazione (1 sgrossatura, 5 finitura, 9 completa). Per esempio CYCLE95("INIZIO:FINE", 2, 0.2, 0.3, , 0.25, 0.1, 0.1, 9).';

// Profili richiamati dai CYCLE95 del programma: chiave "INIZIO:FINE" -> { from, to, p, q } oppure { alarm }
function findContours(blocks) {
  const labels = new Map();
  blocks.forEach((b, i) => {
    if (b.label && !labels.has(b.label)) labels.set(b.label, i);
  });
  const end = blocks.findIndex((b) => b.words.some((w) => w.letter === 'M' && (w.value === 30 || w.value === 2)));
  const contours = new Map();
  for (const block of blocks) {
    const call = block.words.find((w) => w.letter === 'CYCLE95');
    const key = call && contourKey(call.raw);
    if (!key || contours.has(key)) continue;
    const [start, stop] = key.split(':');
    const from = labels.get(start);
    const to = labels.get(stop);
    const fail = (code, params) => contours.set(key, { alarm: { code, params } });
    if (from === undefined) fail(3006, { n: start });
    else if (to === undefined) fail(3006, { n: stop });
    else if (from > to) fail(3007, { reason: `l'etichetta ${start}: deve venire prima di ${stop}:` });
    else if (end < 0 || from < end) fail(3007, { reason: 'il profilo va scritto dopo la fine del programma (M30)' });
    else if ([...contours.values()].some((c) => !c.alarm && from <= c.to && to >= c.from)) {
      fail(3007, { reason: 'due CYCLE95 usano profili che si sovrappongono' });
    } else {
      const k = contours.size;
      contours.set(key, { from, to, p: CONTOUR_N + 2 * k, q: CONTOUR_N + 2 * k + 1 });
    }
  }
  return contours;
}

function contourKey(raw) {
  const name = raw.slice(1, -1).split(',')[0].trim();
  const m = /^"\s*([a-z_][a-z0-9_]+)\s*:\s*([a-z_][a-z0-9_]+)\s*"$/i.exec(name);
  return m ? `${m[1].toUpperCase()}:${m[2].toUpperCase()}` : null;
}

// Blocchi Fanuc del profilo: N(P) vuoto, profilo con il primo punto diviso, N(Q) vuoto
function contourBlocks(contour, blocks) {
  const first = blocks[contour.from];
  const last = blocks[contour.to];
  const marker = (block, n) => ({ line: block.line, source: block.source, words: [word('N', n)], comment: '', blockDelete: false, alarm: null, original: block });
  const list = [...contour.out];
  const i = list.findIndex((b) => !b.alarm && b.words.some((w) => 'XUZW'.includes(w.letter)));
  if (i >= 0) {
    const b = list[i];
    const xs = b.words.filter((w) => w.letter === 'X' || w.letter === 'U');
    const rest = b.words.filter((w) => w.letter !== 'X' && w.letter !== 'U' && w.letter !== 'N');
    const motion = rest.find((w) => w.letter === 'G' && w.value <= 3);
    const hasZ = rest.some((w) => w.letter === 'Z' || w.letter === 'W');
    if (xs.length && hasZ && (!motion || motion.value <= 1)) {
      const n = b.words.filter((w) => w.letter === 'N');
      const a = { ...b, words: [...n, word('G', 0), ...xs] };
      const z = { ...b, words: motion ? rest : [word('G', 1), ...rest] };
      list.splice(i, 1, a, z);
    }
  }
  return [marker(first, contour.p), ...list, marker(last, contour.q)];
}

function cycle95(block, raw, state, words) {
  const parts = raw.slice(1, -1).split(',').map((s) => s.trim());
  const key = contourKey(raw);
  if (!key) {
    if (/^".*"$/.test(parts[0])) {
      return unsupported(block, 'CYCLE95 con il profilo in un sottoprogramma: scrivere il profilo dopo M30 tra due etichette, per esempio CYCLE95("INIZIO:FINE", ...)');
    }
    return { alarm: createAlarm(1003, block.line, { letter: 'CYCLE95', raw }) };
  }
  const nums = parts.slice(1).map((s) => (s === '' ? null : Number(s)));
  if (nums.some((a) => a !== null && !Number.isFinite(a))) return { alarm: createAlarm(1003, block.line, { letter: 'CYCLE95', raw }) };
  const [mid = null, falz = null, falx = null, fal = null, ff1 = null, , ff3 = null, vari = null, , , vrt = null] = nums;
  const missing = (what) => ({ alarm: createAlarm(2007, block.line, { cycle: 'CYCLE95', missing: what, how: CYCLE95_HOW }) });

  const contour = state.contours.get(key);
  if (contour.alarm) return { alarm: createAlarm(contour.alarm.code, block.line, contour.alarm.params) };
  if (vari === null) return missing('il tipo di lavorazione VARI');
  if (!Number.isInteger(vari) || vari < 1 || vari > 12) return missing('un tipo di lavorazione VARI da 1 a 12');
  if ((vari - 1) % 4 !== 0) {
    return unsupported(block, `CYCLE95 con VARI=${vari} (lavorazione trasversale o interna): per ora solo quella longitudinale esterna, VARI=1, 5 o 9`);
  }
  if (fal) return unsupported(block, 'FAL (sovrametallo lungo il profilo) di CYCLE95: usare FALX e FALZ');
  const rough = vari !== 5;
  const finish = vari !== 1;

  const blocks = [];
  if (rough) {
    if (mid === null || mid <= 0) return missing('la profondità di passata MID (maggiore di zero)');
    if (ff1 === null) return missing("l'avanzamento di sgrossatura FF1");
    blocks.push([...words, word('G', 71), word('U', mid), word('R', vrt || 1)]);
    blocks.push({
      words: [word('G', 71), word('P', contour.p), word('Q', contour.q), word('U', 2 * (falx ?? 0)), word('W', falz ?? 0), word('F', ff1)],
      profileElsewhere: true
    });
  }
  if (finish) {
    if (ff3 === null) return missing("l'avanzamento di finitura FF3");
    blocks.push([...(rough ? [] : words), word('G', 70), word('P', contour.p), word('Q', contour.q), word('F', ff3)]);
  }
  return { blocks };
}

// ---------- Ciclo di gola del tornio CYCLE93 ----------
//
// CYCLE93(SPD, SPL, WIDG, DIAG, STA1, ANG1, ANG2, RCO1, RCI1, RCO2, RCI2, FAL1, FAL2, IDEP, DTB, VARI, _VRT)
// Gola rettangolare esterna longitudinale (VARI=1 o 11: SPL è il fianco sinistro; 5 o 15: il fianco destro).
// Si traduce in movimenti G0/G1/G4 con la riga del ciclo: affondamenti a beccate di IDEP affiancati
// (passo non più largo del troncatore), sosta DTB sul fondo, poi finitura dei fianchi e del fondo
// se ci sono sovrametalli. Il troncatore ha il riferimento sullo spigolo destro (larghezza da tools.js).
// Ipotesi: DIAG, IDEP, FAL1 e FAL2 in raggio; distacco e scarico delle beccate = _VRT (vuoto: 1 mm).

const CYCLE93_HOW = 'Si scrive CYCLE93(SPD, SPL, WIDG, DIAG, STA1, ANG1, ANG2, RCO1, RCI1, RCO2, RCI2, FAL1, FAL2, IDEP, DTB, VARI): diametro e quota Z di partenza, larghezza e profondità della gola, angoli e raccordi (0 per una gola rettangolare), sovrametalli sul fondo e sui fianchi, profondità di ogni affondamento, sosta sul fondo, tipo (5: gola esterna con SPL sul fianco destro). Per esempio CYCLE93(40, -12, 6, 4, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.2, 2, 0.5, 5).';

function cycle93(block, raw, state, words) {
  const nums = raw.slice(1, -1).split(',').map((s) => s.trim()).map((s) => (s === '' ? null : Number(s)));
  if (nums.some((a) => a !== null && !Number.isFinite(a))) return { alarm: createAlarm(1003, block.line, { letter: 'CYCLE93', raw }) };
  const [spd = null, spl = null, widg = null, diag = null, sta1, ang1, ang2, rco1, rci1, rco2, rci2, fal1, fal2, idep = null, dtb, vari = null, vrt] = nums;
  const missing = (what) => ({ alarm: createAlarm(2007, block.line, { cycle: 'CYCLE93', missing: what, how: CYCLE93_HOW }) });

  if (spd === null || spl === null) return missing('il punto di partenza SPD (diametro) o SPL (quota Z)');
  if (!widg || widg <= 0) return missing('la larghezza della gola WIDG (maggiore di zero)');
  if (!diag || diag <= 0) return missing('la profondità della gola DIAG (maggiore di zero)');
  if (vari === null) return missing('il tipo di lavorazione VARI');
  if (![1, 5, 11, 15].includes(vari)) {
    if ([2, 3, 4, 6, 7, 8, 12, 13, 14, 16, 17, 18].includes(vari)) {
      return unsupported(block, `CYCLE93 con VARI=${vari} (gola frontale o interna): per ora solo la gola esterna longitudinale, VARI=1 o 5`);
    }
    return missing('un tipo di lavorazione VARI da 1 a 8 (o da 11 a 18)');
  }
  if ([sta1, ang1, ang2, rco1, rci1, rco2, rci2].some((v) => v)) {
    return unsupported(block, 'CYCLE93 con angoli o raccordi (STA1, ANG1, ANG2, RCO1, RCI1, RCO2, RCI2): per ora solo gole rettangolari, con questi parametri a 0');
  }
  const tool = state.tools[state.tool];
  if (!tool || tool.shape !== 'groove') {
    return { alarm: createAlarm(2011, block.line, { cycle: 'CYCLE93', tool: String(state.tool ?? 0).padStart(2, '0') }) };
  }

  const r = (v) => Math.round(v * 10000) / 10000;
  const k = state.diameter ? 1 : 2;
  const top = spd * k;                        // diametro esterno della gola
  const bottom = top - 2 * diag;              // diametro del fondo
  const allowBottom = fal1 ?? 0;
  const allowSide = fal2 ?? 0;
  const lift = vrt || 1;
  const safe = r(top + 2 * lift);             // diametro di avvicinamento e di uscita
  const [zL, zR] = vari % 10 === 1 ? [spl, spl + widg] : [spl - widg, spl];
  const w = tool.width;
  const first = zR - allowSide;               // spigolo destro nella prima passata
  const last = zL + allowSide + w;            // spigolo destro nell'ultima
  if (first - last < -1e-9) return { alarm: createAlarm(3009, block.line, { width: r(widg - 2 * allowSide), tool: w }) };

  if (allowBottom < 0 || allowSide < 0) return missing('sovrametalli FAL1 e FAL2 positivi o zero');
  if (allowBottom >= diag) return missing('un sovrametallo sul fondo FAL1 minore della profondità DIAG');

  const out = [];
  const add = (...list) => out.push(out.length ? list : [...words, ...list]);
  const n = Math.ceil((first - last) / w - 1e-9);
  const roughBottom = bottom + 2 * allowBottom;
  const step = idep && idep > 0 ? 2 * idep : Infinity;
  // Limite di sicurezza: una IDEP minuscola produrrebbe milioni di beccate
  if ((n + 1) * Math.max(1, Math.ceil((top - roughBottom) / step)) > 2000) return missing('una profondità di affondamento IDEP più grande (troppe beccate)');
  for (let i = 0; i <= n; i++) {
    const z = r(n === 0 ? first : first - ((first - last) * i) / n);
    add(word('G', 0), word('Z', z));
    add(word('G', 0), word('X', safe));
    // Affondamento a beccate: dopo ogni tratto si risale di _VRT per rompere il truciolo
    for (let x = top - step; ; x -= step) {
      const level = r(Math.max(x, roughBottom));
      add(word('G', 1), word('X', level));
      if (level <= roughBottom + 1e-9) break;
      add(word('G', 0), word('X', r(level + 2 * lift)));
    }
    if (dtb) add(word('G', 4), word('X', dtb));
    add(word('G', 0), word('X', safe));
  }
  if (allowBottom > 0 || allowSide > 0) {
    // Finitura: fianco destro, fianco sinistro, poi il fondo da sinistra a destra
    add(word('G', 0), word('Z', r(zR)));
    add(word('G', 1), word('X', r(bottom)));
    add(word('G', 0), word('X', safe));
    add(word('G', 0), word('Z', r(zL + w)));
    add(word('G', 1), word('X', r(bottom)));
    add(word('G', 1), word('Z', r(zR)));
    if (dtb) add(word('G', 4), word('X', dtb));
    add(word('G', 0), word('X', safe));
  }
  return { blocks: out };
}
