import { createAlarm } from '../alarms/alarm.js';

// Tasche Siemens della fresa, tradotte in movimenti Fanuc G0/G1/G2/G3 con la riga del ciclo.
//
//   POCKET3(RTP, RFP, SDIS, DP, LENG, WID, CRAD, PA, PO, STA, MID, FAL, FALD, FFP1, FFD, CDIR, VARI, MIDA, AP1, AP2, AD, RAD1, DP1)
//   POCKET4(RTP, RFP, SDIS, DP, PRAD, PA, PO, MID, FAL, FALD, FFP1, FFD, CDIR, VARI, MIDA, AP1, AD, RAD1, DP1)
//
// Il percorso è quello del centro della fresa (niente G41/G42): anelli concentrici dall'interno
// verso l'esterno, con passo laterale non più grande di MIDA (vuoto: 80% del diametro), a piani
// distanti al massimo MID. VARI: 1 sgrossatura (lascia FAL sui fianchi e FALD sul fondo),
// 2 finitura (fondo se FALD, poi fianchi a piani di MID); +10 = entrata a elica (RAD1, DP1)
// attorno al centro, altrimenti entrata verticale. CDIR: 0 concorde (in tasca = antiorario G3),
// 1 discorde, 2 = G2, 3 = G3. Ipotesi: tasca misurata dal centro PA, PO; SDIS vuoto = 0.

const PARAMS = {
  POCKET3: ['rtp', 'rfp', 'sdis', 'dp', 'leng', 'wid', 'crad', 'pa', 'po', 'sta', 'mid', 'fal', 'fald', 'ffp1', 'ffd', 'cdir', 'vari', 'mida', 'ap1', 'ap2', 'ad', 'rad1', 'dp1'],
  POCKET4: ['rtp', 'rfp', 'sdis', 'dp', 'prad', 'pa', 'po', 'mid', 'fal', 'fald', 'ffp1', 'ffd', 'cdir', 'vari', 'mida', 'ap1', 'ad', 'rad1', 'dp1']
};
const HOW = {
  POCKET3: 'Si scrive POCKET3(RTP, RFP, SDIS, DP, LENG, WID, CRAD, PA, PO, STA, MID, FAL, FALD, FFP1, FFD, CDIR, VARI, MIDA): piano di ritorno, faccia del pezzo, distanza di sicurezza, fondo, lunghezza, larghezza, raggio degli spigoli, centro X e Y, angolo, passata in Z, sovrametalli sui fianchi e sul fondo, avanzamenti nel piano e in Z, verso (0 concorde), tipo (1 sgrossatura, 2 finitura), passata laterale. Per esempio POCKET3(10, 0, 2, -4, 40, 30, 5, 50, 40, 0, 2, 0.3, 0.2, 400, 150, 0, 1, 6).',
  POCKET4: 'Si scrive POCKET4(RTP, RFP, SDIS, DP, PRAD, PA, PO, MID, FAL, FALD, FFP1, FFD, CDIR, VARI, MIDA): piano di ritorno, faccia del pezzo, distanza di sicurezza, fondo, raggio della tasca, centro X e Y, passata in Z, sovrametalli sui fianchi e sul fondo, avanzamenti nel piano e in Z, verso (0 concorde), tipo (1 sgrossatura, 2 finitura), passata laterale. Per esempio POCKET4(10, 0, 2, -4, 15, 50, 40, 2, 0.3, 0.2, 400, 150, 0, 1, 6).'
};

const word = (letter, value) => ({ letter, value, raw: String(value), col: null });
const r4 = (v) => Math.round(v * 10000) / 10000 + 0; // + 0 evita -0
const EPS = 1e-6;

export function pocketBlocks(name, raw, block, state, words) {
  const nums = raw.slice(1, -1).split(',').map((s) => s.trim()).map((s) => (s === '' ? null : Number(s)));
  if (nums.some((a) => a !== null && !Number.isFinite(a))) return { alarm: createAlarm(1003, block.line, { letter: name, raw }) };
  const p = Object.fromEntries(PARAMS[name].map((key, i) => [key, nums[i] ?? null]));
  const rect = name === 'POCKET3';
  const missing = (what) => ({ alarm: createAlarm(2007, block.line, { cycle: name, missing: what, how: HOW[name] }) });
  const unsupported = (text) => ({ alarm: createAlarm(1013, block.line, { word: text }) });

  if (p.rtp === null || p.rfp === null) return missing('il piano di ritorno RTP o il piano di riferimento RFP');
  if (p.dp === null || p.dp >= p.rfp) return missing('il fondo DP, più in basso del piano di riferimento RFP');
  if (rect) {
    if (!p.leng || !p.wid) return missing('la lunghezza LENG e la larghezza WID');
    if (p.leng < 0 || p.wid < 0) return unsupported('POCKET3 con LENG o WID negativi (tasca misurata da uno spigolo): per ora si misura dal centro PA, PO');
    if ((p.crad ?? 0) < 0) return missing('un raggio degli spigoli CRAD positivo o zero');
  } else if (!p.prad || p.prad <= 0) return missing('il raggio della tasca PRAD');
  if (p.pa === null || p.po === null) return missing('il centro della tasca PA, PO');
  if (p.ffp1 === null || p.ffp1 <= 0) return missing("l'avanzamento nel piano FFP1");
  if (p.vari === null) return missing('il tipo di lavorazione VARI');
  const kind = p.vari % 10;
  const entry = Math.floor(p.vari / 10);
  if (!Number.isInteger(p.vari) || ![1, 2].includes(kind) || ![0, 1, 2].includes(entry)) {
    return missing('un tipo di lavorazione VARI: 1 sgrossatura, 2 finitura (11, 12 con entrata a elica)');
  }
  if (entry === 2) return unsupported(`${name} con entrata a pendolo (VARI=${p.vari}): usare l'entrata verticale (VARI=1 o 2) o a elica (11 o 12)`);
  if (p.ap1 || p.ap2 || p.ad) return unsupported(`${name} su una tasca già sgrossata (AP1, AP2, AD): lasciare vuoti questi parametri`);
  if (p.cdir !== null && ![0, 1, 2, 3].includes(p.cdir)) return missing('un verso di fresatura CDIR da 0 a 3');
  const fal = p.fal ?? 0;
  const fald = p.fald ?? 0;
  if (fal < 0 || fald < 0) return missing('sovrametalli FAL e FALD positivi o zero');
  if (fald >= p.rfp - p.dp) return missing('un sovrametallo sul fondo FALD minore della profondità della tasca');
  if (p.mid !== null && p.mid < 0) return missing('una passata in Z MID positiva (0 = tutta la profondità)');

  const toolId = String(state.tool ?? 0).padStart(2, '0');
  const tool = state.tools[state.tool];
  if (!tool || tool.type === 'drill') return { alarm: createAlarm(2012, block.line, { cycle: name, tool: toolId }) };
  const R = tool.diameter / 2;
  const tooSmall = () => ({ alarm: createAlarm(3010, block.line, { cycle: name, tool: toolId, d: tool.diameter }) });

  // Dimensioni del percorso del centro fresa con un sovrametallo sui fianchi
  const shape = (allow) => (rect
    ? { a: p.leng / 2 - allow - R, b: p.wid / 2 - allow - R, rc: Math.max((p.crad ?? 0) - allow - R, 0) }
    : { r: p.prad - allow - R });
  const rough = shape(fal);
  const finish = shape(0);
  if (Math.min(...Object.values(rough)) < -EPS) return tooSmall();
  for (const key of Object.keys(rough)) rough[key] = Math.max(rough[key], 0);
  const inner = rect ? Math.min(rough.a, rough.b) : rough.r;

  let helix = null;
  if (entry === 1) {
    if (!(p.rad1 > 0) || !(p.dp1 > 0)) return missing("il raggio RAD1 e la discesa per giro DP1 dell'elica");
    if (p.rad1 > inner + EPS) return tooSmall();
    if ((p.rfp + (p.sdis ?? 0) - p.dp) / (p.dp1 / 2) > 2000) return missing("una discesa per giro DP1 dell'elica più grande");
    helix = { r: p.rad1, pitch: p.dp1 };
  }

  const step = p.mida > 0 ? p.mida : 0.8 * tool.diameter;
  const ccw = p.cdir === null || p.cdir === 0 || p.cdir === 3;
  const sdis = p.sdis ?? 0;
  const zSafe = p.rfp + sdis;
  const ffd = p.ffd > 0 ? p.ffd : p.ffp1;
  const angle = rect ? ((p.sta ?? 0) * Math.PI) / 180 : 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const global = (u, v) => ({ x: p.pa + u * cos - v * sin, y: p.po + u * sin + v * cos });

  // Anelli concentrici dall'interno verso l'esterno
  const rings = [];
  const n = Math.ceil(inner / step - 1e-9);
  if (n > 400) return missing('una passata laterale MIDA più grande');
  for (let k = 0; k <= n; k++) {
    const d = n === 0 ? 0 : inner * (1 - k / n);
    rings.push(rect ? ring({ a: rough.a - d, b: rough.b - d, rc: Math.max(rough.rc - d, 0) }, ccw) : ring({ r: rough.r - d }, ccw));
  }
  const finishRing = ring(finish, ccw);

  // Generazione dei blocchi
  const out = [];
  let cur = null;
  const add = (...list) => out.push(out.length ? list : [...words, ...list]);
  const xy = (pt) => {
    const g = global(pt.u, pt.v);
    return [word('X', r4(g.x)), word('Y', r4(g.y))];
  };
  const rapidXY = (pt) => { add(word('G', 0), ...xy(pt)); cur = pt; };
  const feedXY = (pt) => {
    if (cur && Math.hypot(pt.u - cur.u, pt.v - cur.v) < EPS) return;
    add(word('G', 1), ...xy(pt), word('F', p.ffp1));
    cur = pt;
  };
  const arc = (pt, c, dirCcw, z, f) => {
    const du = c.u - cur.u;
    const dv = c.v - cur.v;
    const zw = z === undefined ? [] : [word('Z', r4(z))];
    add(word('G', dirCcw ? 3 : 2), ...xy(pt), ...zw, word('I', r4(du * cos - dv * sin)), word('J', r4(du * sin + dv * cos)), word('F', f));
    cur = pt;
  };
  const follow = (rg) => {
    for (const seg of rg.segs) {
      if (seg.type === 'line') feedXY(seg.to);
      else arc(seg.to, seg.c, seg.ccw, undefined, p.ffp1);
    }
  };
  const levels = (from, to) => {
    const depth = from - to;
    const count = p.mid > 0 ? Math.ceil(depth / p.mid - 1e-9) : 1;
    return Array.from({ length: count }, (_, k) => r4(from - (depth * (k + 1)) / count));
  };
  if (Math.ceil((p.rfp - p.dp) / (p.mid > 0 ? p.mid : Infinity)) * (n + 1) > 4000) return missing('una passata in Z MID più grande');

  // Discesa al piano z partendo da zFrom: verticale nel punto pt, oppure a elica attorno al centro
  const descend = (pt, zFrom, z) => {
    if (!helix) {
      rapidXY(pt);
      add(word('G', 0), word('Z', r4(zFrom)));
      add(word('G', 1), word('Z', r4(z)), word('F', ffd));
      return;
    }
    const start = { u: helix.r, v: 0 };
    const opposite = { u: -helix.r, v: 0 };
    const center = { u: 0, v: 0 };
    rapidXY(start);
    add(word('G', 0), word('Z', r4(zFrom)));
    let zNow = zFrom;
    while (zNow > z + EPS) {
      zNow = Math.max(z, zNow - helix.pitch / 2);
      arc(Math.abs(cur.u - start.u) < EPS ? opposite : start, center, ccw, zNow, ffd);
    }
    if (Math.abs(cur.u - start.u) > EPS) arc(start, center, ccw, z, ffd);
    feedXY(pt);
  };

  add(word('G', 17), ...(state.absolute ? [] : [word('G', 90)]));
  add(word('G', 0), word('Z', r4(p.rtp)));

  // Sgrossatura (VARI=1) oppure fondo della finitura (VARI=2 con FALD): tutti gli anelli a ogni piano
  const clear = (zLevels, zStart) => {
    let prev = null;
    for (const z of zLevels) {
      descend(rings[0].start, prev === null ? zStart : Math.min(prev + sdis, zSafe), z);
      rings.forEach((rg, k) => {
        if (k > 0) feedXY(rg.start);
        follow(rg);
      });
      add(word('G', 0), word('Z', r4(zSafe)));
      prev = z;
    }
  };

  if (kind === 1) {
    clear(levels(p.rfp, p.dp + fald), zSafe);
  } else {
    if (fald > 0) clear([p.dp], p.dp + fald + sdis);
    // Fianchi a piani di MID: si entra dall'anello esterno di sgrossatura, già vuoto
    let prev = null;
    const entryPoint = rings[rings.length - 1].start;
    for (const z of levels(p.rfp, p.dp)) {
      rapidXY(entryPoint);
      add(word('G', 0), word('Z', r4(prev === null ? zSafe : Math.min(prev + sdis, zSafe))));
      add(word('G', 1), word('Z', r4(z)), word('F', ffd));
      feedXY(finishRing.start);
      follow(finishRing);
      feedXY(entryPoint);
      add(word('G', 0), word('Z', r4(zSafe)));
      prev = z;
    }
  }
  add(word('G', 0), word('Z', r4(p.rtp)));
  if (!state.absolute) add(word('G', 91));
  return { blocks: out };
}

// Anello del centro fresa: rettangolo con spigoli raccordati { a, b, rc } oppure cerchio { r }.
// Parte e finisce in (a, 0) o (r, 0); antiorario se ccw, altrimenti percorso al contrario.
function ring(dims, ccw) {
  const segs = [];
  let start;
  if ('r' in dims) {
    const { r } = dims;
    start = { u: r, v: 0 };
    if (r > EPS) {
      segs.push({ type: 'arc', to: { u: -r, v: 0 }, c: { u: 0, v: 0 }, ccw: true });
      segs.push({ type: 'arc', to: { u: r, v: 0 }, c: { u: 0, v: 0 }, ccw: true });
    }
  } else {
    const { a, b } = dims;
    const rc = Math.min(dims.rc, a, b);
    start = { u: a, v: 0 };
    const corners = [
      [{ u: a, v: b - rc }, { u: a - rc, v: b }, { u: a - rc, v: b - rc }],
      [{ u: -a + rc, v: b }, { u: -a, v: b - rc }, { u: -a + rc, v: b - rc }],
      [{ u: -a, v: -b + rc }, { u: -a + rc, v: -b }, { u: -a + rc, v: -b + rc }],
      [{ u: a - rc, v: -b }, { u: a, v: -b + rc }, { u: a - rc, v: -b + rc }]
    ];
    let last = start;
    const line = (to) => {
      if (Math.hypot(to.u - last.u, to.v - last.v) > EPS) segs.push({ type: 'line', to });
      last = to;
    };
    for (const [lineEnd, arcEnd, c] of corners) {
      line(lineEnd);
      if (rc > EPS) {
        segs.push({ type: 'arc', to: arcEnd, c, ccw: true });
        last = arcEnd;
      }
    }
    line(start);
  }
  if (ccw) return { start, segs };
  // Verso orario: stessi tratti al contrario
  const points = [start, ...segs.map((s) => s.to)];
  const reversed = segs.map((s, i) => ({ ...s, to: points[i], ccw: !s.ccw })).reverse();
  return { start, segs: reversed };
}
