import { pointAt } from '../interpreter/path.js';
import { toolOutline, toolHolder } from '../machines/lathe/tools.js';

// Vista 2D del tornio: Z verso destra, X verso l'alto; sezione completa del pezzo (sopra e sotto l'asse).
// Solo disegno: legge lo stato del simulatore e il programma interpretato, non contiene logica CNC.
// Rotella = zoom, trascinamento = spostamento, doppio clic = adatta la vista.

const PAD = 24;

export function createLatheView(canvas, { getScene, tools, params }) {
  const ctx = canvas.getContext('2d');
  const shapes = {};
  const shapeOf = (id) => (shapes[id] ??= { outline: toolOutline(tools[id]), holder: toolHolder(tools[id]) });

  let view = { scale: 1, ox: 0, oy: 0 };
  let autoFit = true;
  let colors = readColors();
  let material = { stock: null, canvas: null, ctx: null, image: null };
  let cssWidth = 0;
  let cssHeight = 0;

  const toScreen = (z, r) => [view.ox + z * view.scale, view.oy - r * view.scale];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    if (autoFit) fit();
    draw();
  }

  function fit() {
    const scene = getScene();
    if (!scene) return;
    const b = sceneBounds(scene);
    const w = Math.max(1, cssWidth - 2 * PAD);
    const h = Math.max(1, cssHeight - 2 * PAD);
    const scale = Math.min(w / (b.maxZ - b.minZ), h / (b.maxR - b.minR));
    view = {
      scale,
      ox: PAD + (w - (b.maxZ - b.minZ) * scale) / 2 - b.minZ * scale,
      oy: PAD + (h - (b.maxR - b.minR) * scale) / 2 + b.maxR * scale
    };
  }

  // Pezzo, mandrino e punti del programma; il punto di riferimento (partenza e G28) resta fuori,
  // altrimenti il pezzo diventerebbe troppo piccolo: l'utensile entra in vista quando si avvicina.
  function sceneBounds({ sim, program }) {
    const R = sim.setup.diameter / 2;
    const b = { minZ: sim.chuck.bodyZ - 10, maxZ: Math.max(sim.stock.zMax, 0) + 15, minR: -(R + 12), maxR: R + 20 };
    const home = sim.home ?? params.home; // cambia con il modello di tornio scelto
    const include = (p) => {
      if (Math.abs(p.x - home.x) < 1e-6 || Math.abs(p.z - home.z) < 1e-6) return;
      b.minZ = Math.min(b.minZ, p.z - 5);
      b.maxZ = Math.max(b.maxZ, p.z + 15);
      b.maxR = Math.max(b.maxR, p.x / 2 + 15);
    };
    if (program) for (const step of program.steps) for (const move of step.moves) include(move.to);
    return b;
  }

  function draw() {
    const scene = getScene();
    if (!scene) return;
    const dpr = canvas.width / Math.max(1, cssWidth);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    if (!scene.sim.stock) return;
    drawGrid();
    drawChuck(scene.sim);
    drawMaterial(scene.sim.stock);
    drawAxis();
    if (scene.program && scene.showPreview) drawPreview(scene.program);
    drawTrail(scene.sim.trail);
    drawTool(scene.sim);
    if (scene.collision) drawCollision(scene.sim.toolPos);
  }

  function drawGrid() {
    const steps = [1, 2, 5, 10, 20, 50, 100];
    const step = steps.find((s) => s * view.scale >= 45) ?? 100;
    const z0 = Math.floor((0 - view.ox) / view.scale / step) * step;
    const z1 = (cssWidth - view.ox) / view.scale;
    const rTop = view.oy / view.scale;
    const rBottom = (view.oy - cssHeight) / view.scale;
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.text;
    ctx.font = '11px system-ui, sans-serif';
    ctx.beginPath();
    for (let z = z0; z <= z1; z += step) {
      const [x] = toScreen(z, 0);
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, cssHeight);
    }
    // Righe orizzontali ai diametri multipli del passo (X è in diametro)
    for (let d = Math.ceil((2 * rBottom) / step) * step; d <= 2 * rTop; d += step) {
      const [, y] = toScreen(0, d / 2);
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(cssWidth, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.textBaseline = 'bottom';
    for (let z = z0; z <= z1; z += step) {
      const [x] = toScreen(z, 0);
      ctx.fillText(`Z${z}`, x + 3, cssHeight - 3);
    }
    ctx.textBaseline = 'middle';
    for (let d = Math.max(step, Math.ceil((2 * rBottom) / step) * step); d <= 2 * rTop; d += step) {
      const [, y] = toScreen(0, d / 2);
      ctx.fillText(`X${d}`, 4, y - 7);
    }
  }

  function rect(z0, r0, z1, r1) {
    const [x0, y0] = toScreen(z0, r1);
    const [x1, y1] = toScreen(z1, r0);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }

  function drawChuck(sim) {
    const R = sim.setup.diameter / 2;
    const { jawZ, jawR, bodyZ, bodyR } = sim.chuck;
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.chuckEdge;
    ctx.fillStyle = colors.chuck;
    rect(bodyZ - 40, -bodyR, bodyZ, bodyR);
    ctx.fillStyle = colors.jaw;
    rect(bodyZ, R, jawZ, jawR);
    rect(bodyZ, -jawR, jawZ, -R);
    // Parte del grezzo stretta nelle griffe
    ctx.fillStyle = colors.materialHidden;
    rect(bodyZ, -R, jawZ, R);
  }

  function drawMaterial(stock) {
    if (material.stock !== stock || !material.canvas) buildMaterial(stock);
    else if (stock.fullRedraw) buildMaterial(stock);
    else if (stock.changed.length) {
      const data = material.image.data;
      for (const index of stock.changed) {
        const j = Math.floor(index / stock.nz);
        const i = index - j * stock.nz;
        data[((stock.nr - 1 - j) * stock.nz + i) * 4 + 3] = 0;
      }
      stock.changed.length = 0;
      material.ctx.putImageData(material.image, 0, 0);
    }
    const [x0, y0] = toScreen(stock.zMin, stock.R);
    const w = stock.nz * stock.c * view.scale;
    const h = stock.R * view.scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(material.canvas, x0, y0, w, h);
    // Metà inferiore: specchiata rispetto all'asse, un po' più scura (vista in sezione)
    ctx.save();
    ctx.translate(0, 2 * view.oy);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.72;
    ctx.drawImage(material.canvas, x0, y0, w, h);
    ctx.restore();
  }

  function buildMaterial(stock) {
    const off = material.stock === stock && material.canvas ? material.canvas : document.createElement('canvas');
    off.width = stock.nz;
    off.height = stock.nr;
    const offCtx = off.getContext('2d');
    const image = offCtx.createImageData(stock.nz, stock.nr);
    const [r, g, b] = colors.materialRgb;
    for (let j = 0; j < stock.nr; j++) {
      for (let i = 0; i < stock.nz; i++) {
        const p = ((stock.nr - 1 - j) * stock.nz + i) * 4;
        image.data[p] = r;
        image.data[p + 1] = g;
        image.data[p + 2] = b;
        image.data[p + 3] = stock.data[j * stock.nz + i] ? 255 : 0;
      }
    }
    offCtx.putImageData(image, 0, 0);
    stock.changed.length = 0;
    stock.fullRedraw = false;
    material = { stock, canvas: off, ctx: offCtx, image };
  }

  function drawAxis() {
    const [, y] = toScreen(0, 0);
    ctx.save();
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([14, 4, 2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cssWidth, y);
    ctx.stroke();
    ctx.restore();
    // Origine pezzo (Z0 X0)
    const [ox, oy] = toScreen(0, 0);
    ctx.strokeStyle = colors.origin;
    ctx.fillStyle = colors.origin;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, 6, -Math.PI / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, 6, Math.PI / 2, Math.PI);
    ctx.closePath();
    ctx.fill();
  }

  function pathOf(move, t0 = 0, t1 = 1) {
    const n = move.type === 'arc' ? Math.max(8, Math.ceil(Math.abs(move.sweep) * 24)) : 1;
    const points = [];
    for (let k = 0; k <= n; k++) points.push(pointAt(move, t0 + ((t1 - t0) * k) / n));
    return points;
  }

  function strokePath(points) {
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = toScreen(p.z, p.x / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function drawPreview(program) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    for (const step of program.steps) {
      for (const move of step.moves) {
        if (move.length === 0) continue;
        const rapid = move.type === 'rapid' || move.rapidMotion;
        ctx.strokeStyle = rapid ? colors.rapid : colors.feed;
        ctx.setLineDash(rapid ? [4, 4] : [2, 3]);
        strokePath(pathOf(move));
      }
    }
    ctx.restore();
  }

  function drawTrail(trail) {
    ctx.save();
    for (const entry of trail) {
      ctx.strokeStyle = entry.type === 'rapid' ? colors.rapid : colors.feed;
      ctx.lineWidth = entry.type === 'rapid' ? 1.2 : 2;
      ctx.setLineDash(entry.type === 'rapid' ? [6, 4] : []);
      strokePath(entry.points);
    }
    ctx.restore();
  }

  function fillPolygon(points, pz, pr) {
    ctx.beginPath();
    points.forEach((q, i) => {
      const [x, y] = toScreen(pz + q.z, pr + q.r);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawTool(sim) {
    const pos = sim.toolPos;
    const pz = pos.z;
    const pr = pos.x / 2;
    ctx.lineWidth = 1;
    if (sim.tool === null) {
      // Torretta senza utensile: solo il riferimento
      const [x, y] = toScreen(pz, pr);
      ctx.strokeStyle = colors.holderEdge;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
      return;
    }
    const shape = shapeOf(sim.tool);
    ctx.fillStyle = colors.holder;
    ctx.strokeStyle = colors.holderEdge;
    fillPolygon(shape.holder.points, pz, pr);
    ctx.fillStyle = colors.tool;
    ctx.strokeStyle = colors.toolEdge;
    fillPolygon(shape.outline.points, pz, pr);
    // Punto programmato
    const [x, y] = toScreen(pz, pr);
    ctx.fillStyle = colors.toolEdge;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawCollision(pos) {
    const [x, y] = toScreen(pos.z, pos.x / 2);
    ctx.save();
    ctx.strokeStyle = colors.collision;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  // Zoom e spostamento
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const factor = Math.pow(1.0015, -event.deltaY);
    const scale = Math.min(400, Math.max(0.2, view.scale * factor));
    const k = scale / view.scale;
    view = { scale, ox: mx - (mx - view.ox) * k, oy: my - (my - view.oy) * k };
    autoFit = false;
    draw();
  }, { passive: false });

  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, ox: view.ox, oy: view.oy };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    view = { ...view, ox: drag.ox + event.clientX - drag.x, oy: drag.oy + event.clientY - drag.y };
    autoFit = false;
    draw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('dblclick', () => {
    autoFit = true;
    fit();
    draw();
  });

  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', () => {
    colors = readColors();
    material.stock = null;
    draw();
  });

  new ResizeObserver(resize).observe(canvas);

  return {
    draw,
    fit() {
      autoFit = true;
      fit();
      draw();
    },
    // Da chiamare quando cambia il grezzo o il programma: riadatta la vista se l'utente non l'ha spostata
    refit() {
      if (autoFit) fit();
      draw();
    }
  };
}

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const v = (name) => style.getPropertyValue(name).trim();
  const material = v('--sim-material');
  return {
    bg: v('--sim-bg'),
    grid: v('--sim-grid'),
    text: v('--sim-text'),
    axis: v('--sim-axis'),
    origin: v('--sim-origin'),
    chuck: v('--sim-chuck'),
    chuckEdge: v('--sim-chuck-edge'),
    jaw: v('--sim-jaw'),
    materialHidden: v('--sim-material-hidden'),
    materialRgb: hexToRgb(material),
    tool: v('--sim-tool'),
    toolEdge: v('--sim-tool-edge'),
    holder: v('--sim-holder'),
    holderEdge: v('--sim-holder-edge'),
    rapid: v('--sim-rapid'),
    feed: v('--sim-feed'),
    collision: v('--sim-collision')
  };
}

function hexToRgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
