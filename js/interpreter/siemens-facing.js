import { createAlarm } from '../alarms/alarm.js';

// Spianatura Siemens della fresa, tradotta in movimenti Fanuc G0/G1 con la riga del ciclo.
//
//   CYCLE71(RTP, RFP, SDIS, DP, PA, PO, LENG, WID, STA, MID, MIDA, FDP, FALD, FFP1, VARI, FDP1)
//
// Superficie rettangolare con uno spigolo in PA, PO: LENG lungo X e WID lungo Y (il segno dà il verso),
// ruotata di STA attorno allo spigolo. Passate rettilinee del centro fresa che iniziano e finiscono fuori
// dalla superficie (raggio fresa + FDP), distanti al massimo MIDA (vuoto: 80% del diametro), a piani
// distanti al massimo MID. Nella direzione di avanzamento la prima e l'ultima passata sporgono di FDP1
// oltre i bordi (vuoto: fresa a filo dei bordi).
// VARI: unità 1 sgrossatura (lascia FALD), 2 finitura (un piano a DP); decine 1 passate lungo X in un solo
// verso, 2 lungo Y in un solo verso, 3 lungo X a zig-zag, 4 lungo Y a zig-zag.
// Ipotesi: SDIS, FDP, FDP1 vuoti = 0; la discesa in Z avviene fuori dalla superficie con FFP1.

const HOW = 'Si scrive CYCLE71(RTP, RFP, SDIS, DP, PA, PO, LENG, WID, STA, MID, MIDA, FDP, FALD, FFP1, VARI, FDP1): piano di ritorno, faccia da spianare, distanza di sicurezza, quota finale, spigolo di partenza X e Y, lunghezza e larghezza, angolo, passata in Z, passata laterale, uscita oltre il bordo, sovrametallo sul fondo, avanzamento, tipo (31: sgrossatura a zig-zag lungo X; 32 finitura). Per esempio CYCLE71(10, 1, 2, 0, 0, 0, 100, 80, 0, 1, 8, 2, 0, 500, 31, 2).';
const PARAMS = ['rtp', 'rfp', 'sdis', 'dp', 'pa', 'po', 'leng', 'wid', 'sta', 'mid', 'mida', 'fdp', 'fald', 'ffp1', 'vari', 'fdp1'];

const word = (letter, value) => ({ letter, value, raw: String(value), col: null });
const r4 = (v) => Math.round(v * 10000) / 10000 + 0; // + 0 evita -0

export function facingBlocks(raw, block, state, words) {
  const nums = raw.slice(1, -1).split(',').map((s) => s.trim()).map((s) => (s === '' ? null : Number(s)));
  if (nums.some((a) => a !== null && !Number.isFinite(a))) return { alarm: createAlarm(1003, block.line, { letter: 'CYCLE71', raw }) };
  const p = Object.fromEntries(PARAMS.map((key, i) => [key, nums[i] ?? null]));
  const missing = (what) => ({ alarm: createAlarm(2007, block.line, { cycle: 'CYCLE71', missing: what, how: HOW }) });

  if (p.rtp === null || p.rfp === null) return missing('il piano di ritorno RTP o il piano di riferimento RFP');
  if (p.dp === null || p.dp >= p.rfp) return missing('la quota finale DP, più in basso della faccia RFP');
  if (p.pa === null || p.po === null) return missing('lo spigolo di partenza PA, PO');
  if (!p.leng || !p.wid) return missing('la lunghezza LENG e la larghezza WID della superficie');
  if (p.ffp1 === null || p.ffp1 <= 0) return missing("l'avanzamento FFP1");
  if (p.vari === null) return missing('il tipo di lavorazione VARI');
  const kind = p.vari % 10;
  const pattern = Math.floor(p.vari / 10);
  if (!Number.isInteger(p.vari) || ![1, 2].includes(kind) || ![1, 2, 3, 4].includes(pattern)) {
    return missing('un tipo di lavorazione VARI: unità 1 sgrossatura o 2 finitura, decine da 1 a 4 per la direzione delle passate (per esempio 31)');
  }
  const fald = p.fald ?? 0;
  if (fald < 0 || [p.sdis, p.fdp, p.fdp1, p.mid, p.mida].some((v) => v !== null && v < 0)) {
    return missing('valori positivi o zero per SDIS, MID, MIDA, FDP, FALD e FDP1');
  }
  if (fald >= p.rfp - p.dp) return missing('un sovrametallo FALD minore della profondità da spianare');

  const tool = state.tools[state.tool];
  if (!tool || tool.type === 'drill') {
    return { alarm: createAlarm(2012, block.line, { cycle: 'CYCLE71', tool: String(state.tool ?? 0).padStart(2, '0') }) };
  }
  const R = tool.diameter / 2;
  const step = p.mida > 0 ? p.mida : 0.8 * tool.diameter;
  const sdis = p.sdis ?? 0;
  const over = R + (p.fdp ?? 0);
  const edge = p.fdp1 ?? 0;

  // Coordinate locali: s lungo le passate, t nella direzione di avanzamento, a partire dallo spigolo PA, PO
  const alongX = pattern === 1 || pattern === 3;
  const zigzag = pattern >= 3;
  const lengS = alongX ? p.leng : p.wid;
  const lengT = alongX ? p.wid : p.leng;
  const angle = ((p.sta ?? 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const global = (s, t) => {
    const u = alongX ? s : t; // u lungo LENG, v lungo WID
    const v = alongX ? t : s;
    return { x: p.pa + u * cos - v * sin, y: p.po + u * sin + v * cos };
  };
  const signS = Math.sign(lengS);
  const signT = Math.sign(lengT);
  const sStart = -signS * over;
  const sEnd = lengS + signS * over;
  const tFirst = R - edge;
  const tLast = Math.abs(lengT) - R + edge;
  const count = tLast > tFirst ? Math.ceil((tLast - tFirst) / step - 1e-9) : 0;
  if (count > 4000) return missing('una passata laterale MIDA più grande');
  const passes = Array.from({ length: count + 1 }, (_, k) =>
    signT * (count === 0 ? Math.abs(lengT) / 2 : tFirst + ((tLast - tFirst) * k) / count));

  const depth = p.rfp - (p.dp + fald);
  const levelCount = p.mid > 0 ? Math.ceil(depth / p.mid - 1e-9) : 1;
  if (levelCount * passes.length > 4000) return missing('una passata in Z MID o una passata laterale MIDA più grande');
  const levels = kind === 2 ? [p.dp] : Array.from({ length: levelCount }, (_, k) => p.rfp - (depth * (k + 1)) / levelCount);

  const out = [];
  const add = (...list) => out.push(out.length ? list : [...words, ...list]);
  const xy = (s, t) => {
    const g = global(s, t);
    return [word('X', r4(g.x)), word('Y', r4(g.y))];
  };

  add(word('G', 17), ...(state.absolute ? [] : [word('G', 90)]));
  add(word('G', 0), word('Z', r4(p.rtp)));
  let prev = kind === 2 ? p.dp + fald : p.rfp;
  for (const z of levels) {
    // Il materiale più alto rimasto è al piano precedente: sopra di lui ci si sposta in rapido
    const clear = r4(prev + sdis);
    passes.forEach((t, k) => {
      const reverse = zigzag && k % 2 === 1;
      const [from, to] = reverse ? [sEnd, sStart] : [sStart, sEnd];
      if (k === 0 || !zigzag) {
        add(word('G', 0), ...xy(from, t));
        add(word('G', 0), word('Z', clear));
        add(word('G', 1), word('Z', r4(z)), word('F', p.ffp1));
      } else {
        add(word('G', 1), ...xy(from, t), word('F', p.ffp1)); // avanzamento fuori dalla superficie
      }
      add(word('G', 1), ...xy(to, t), word('F', p.ffp1));
      if (!zigzag) add(word('G', 0), word('Z', clear));
    });
    if (zigzag) add(word('G', 0), word('Z', clear));
    prev = z;
  }
  add(word('G', 0), word('Z', r4(p.rtp)));
  if (!state.absolute) add(word('G', 91));
  return { blocks: out };
}
