import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pointAt3 } from '../interpreter/path-3d.js';

// Vista 3D della fresatrice (Three.js): grezzo come superficie a mappa di altezze, morsa, utensile,
// percorsi e assi dello zero pezzo. Solo disegno, nessuna logica CNC; colori dalle variabili CSS --sim-*.
// Mouse: sinistro = ruota, destro = sposta, rotella = zoom; doppio clic = adatta la vista.

const HOLDER_LENGTH = 50;

export function createMillView(canvas, { getScene, tools }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.addEventListener('change', render);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-150, -250, 400);
  scene.add(sun);

  const fixed = new THREE.Group();   // morsa, piano, assi: cambiano solo con il grezzo
  const pathGroup = new THREE.Group();
  const previewGroup = new THREE.Group();
  scene.add(fixed, pathGroup, previewGroup);

  let colors = readColors();
  let stockView = null;
  let fittedStock = null;
  let previewOf = null;
  let trailCount = -1;
  const toolModels = {};
  let toolShown = null;
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 12),
    new THREE.MeshBasicMaterial({ color: colors.collision, transparent: true, opacity: 0.7 })
  );
  marker.visible = false;
  scene.add(marker);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    renderer.setClearColor(colors.bg);
    renderer.render(scene, camera);
  }

  function draw() {
    const current = getScene();
    if (!current?.sim.stock) return;
    const { sim, program, collision, showPreview } = current;
    if (!stockView || stockView.stock !== sim.stock) buildScene(sim);
    updateStock(sim.stock);
    updateTool(sim);
    updateTrail(sim.trail);
    if (program !== previewOf) buildPreview(program);
    previewGroup.visible = Boolean(showPreview);
    marker.visible = Boolean(collision);
    if (collision) marker.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
    render();
  }

  // ---------- Grezzo ----------

  function buildScene(sim) {
    const stock = sim.stock;
    if (stockView) {
      scene.remove(stockView.mesh);
      stockView.mesh.geometry.dispose();
    }
    const { nx, ny, cx, cy, xMin, xMax, yMin, yMax, zBottom, height } = stock;
    const vx = nx + 2;
    const vy = ny + 2;
    const positions = new Float32Array(vx * vy * 3);
    const vertexColors = new Float32Array(vx * vy * 3);
    const xAt = (i) => (i === 0 ? xMin : i === vx - 1 ? xMax : xMin + (i - 0.5) * cx);
    const yAt = (j) => (j === 0 ? yMin : j === vy - 1 ? yMax : yMin + (j - 0.5) * cy);
    for (let j = 0; j < vy; j++) {
      for (let i = 0; i < vx; i++) {
        const v = j * vx + i;
        const border = i === 0 || j === 0 || i === vx - 1 || j === vy - 1;
        positions[v * 3] = xAt(i);
        positions[v * 3 + 1] = yAt(j);
        const h = border ? zBottom : height[(j - 1) * nx + (i - 1)];
        positions[v * 3 + 2] = h;
        const color = border ? colors.side : h < stock.zTop - 1e-6 ? colors.machined : colors.material;
        color.toArray(vertexColors, v * 3);
      }
    }
    const index = new Uint32Array((vx - 1) * (vy - 1) * 6);
    let k = 0;
    for (let j = 0; j < vy - 1; j++) {
      for (let i = 0; i < vx - 1; i++) {
        const a = j * vx + i;
        const b = a + 1;
        const c = a + vx;
        const d = c + 1;
        index.set([a, b, d, a, d, c], k);
        k += 6;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, metalness: 0.35, roughness: 0.55, side: THREE.DoubleSide
    }));
    mesh.frustumCulled = false;
    scene.add(mesh);
    stock.changed.length = 0;
    stock.fullRedraw = false;
    stockView = { stock, mesh, positions, vertexColors, vx };

    buildFixed(sim);
    if (fittedStock !== stock) {
      fittedStock = stock;
      fit();
    }
  }

  function updateStock(stock) {
    if (!stockView.stock || (!stock.changed.length && !stock.fullRedraw)) return;
    const { positions, vertexColors, vx, mesh } = stockView;
    const write = (index) => {
      const i = index % stock.nx;
      const j = Math.floor(index / stock.nx);
      const v = (j + 1) * vx + (i + 1);
      positions[v * 3 + 2] = stock.height[index];
      colors.machined.toArray(vertexColors, v * 3);
    };
    if (stock.fullRedraw) {
      for (let index = 0; index < stock.height.length; index++) {
        if (stock.height[index] < stock.zTop - 1e-6) write(index);
      }
      stock.fullRedraw = false;
    } else {
      for (const index of stock.changed) write(index);
    }
    stock.changed.length = 0;
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
  }

  // ---------- Morsa, piano, assi ----------

  function buildFixed(sim) {
    for (const child of [...fixed.children]) fixed.remove(child);
    const viseMaterial = new THREE.MeshStandardMaterial({ color: colors.vise, metalness: 0.5, roughness: 0.5 });
    for (const box of sim.vise) {
      const geometry = new THREE.BoxGeometry(box.xMax - box.xMin, box.yMax - box.yMin, box.zMax - box.zMin);
      const mesh = new THREE.Mesh(geometry, viseMaterial);
      mesh.position.set((box.xMin + box.xMax) / 2, (box.yMin + box.yMax) / 2, (box.zMin + box.zMax) / 2);
      fixed.add(mesh);
    }
    const base = sim.vise.find((b) => b.name === 'base');
    const grid = new THREE.GridHelper(400, 40, colors.axis, colors.grid);
    grid.rotation.x = Math.PI / 2;
    grid.position.set((base.xMin + base.xMax) / 2, (base.yMin + base.yMax) / 2, base.zMin);
    fixed.add(grid);
    const axes = new THREE.AxesHelper(25);
    axes.position.set(0, 0, 0.05);
    fixed.add(axes);
  }

  // ---------- Utensile ----------

  function toolModel(id) {
    if (toolModels[id]) return toolModels[id];
    const tool = tools[id];
    const R = tool.diameter / 2;
    const group = new THREE.Group();
    const cutter = new THREE.MeshStandardMaterial({ color: colors.tool, metalness: 0.7, roughness: 0.3 });
    const holderMat = new THREE.MeshStandardMaterial({ color: colors.holder, metalness: 0.6, roughness: 0.4 });
    const cylinder = (r, z0, z1, material) => {
      const geometry = new THREE.CylinderGeometry(r, r, z1 - z0, 32);
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, 0, (z0 + z1) / 2);
      group.add(new THREE.Mesh(geometry, material));
    };
    let fluteStart = 0;
    if (tool.type === 'ball') {
      const sphere = new THREE.SphereGeometry(R, 24, 16);
      sphere.translate(0, 0, R);
      group.add(new THREE.Mesh(sphere, cutter));
      fluteStart = R;
    } else if (tool.type === 'drill') {
      const h = R / Math.tan((59 * Math.PI) / 180);
      const cone = new THREE.ConeGeometry(R, h, 32);
      cone.rotateX(-Math.PI / 2);
      cone.translate(0, 0, h / 2);
      group.add(new THREE.Mesh(cone, cutter));
      fluteStart = h;
    }
    cylinder(R, fluteStart, tool.fluteLength, cutter);
    cylinder(R * 0.9, tool.fluteLength, tool.stickout, holderMat);
    cylinder(tool.holderDiameter / 2, tool.stickout, tool.stickout + HOLDER_LENGTH, holderMat);
    toolModels[id] = group;
    return group;
  }

  function updateTool(sim) {
    const model = sim.tool === null ? null : toolModel(sim.tool);
    if (model !== toolShown) {
      if (toolShown) scene.remove(toolShown);
      if (model) scene.add(model);
      toolShown = model;
    }
    if (model) model.position.set(sim.pos.x, sim.pos.y, sim.pos.z);
  }

  // ---------- Percorsi ----------

  function segments(points, out) {
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i];
      const b = points[i + 1];
      // Un punto senza quote valide (programma strano, dati incompleti) renderebbe
      // NaN tutta la geometria della linea: quel tratto si salta.
      if (!finite3(a) || !finite3(b)) continue;
      out.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  function finite3(p) {
    return Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
  }

  function lines(data, color, opacity) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  }

  function clear(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.geometry.dispose();
    }
  }

  function updateTrail(trail) {
    const count = trail.reduce((n, entry) => n + entry.points.length, 0);
    if (count === trailCount) return;
    trailCount = count;
    clear(pathGroup);
    const rapid = [];
    const feed = [];
    for (const entry of trail) segments(entry.points, entry.type === 'rapid' ? rapid : feed);
    if (rapid.length) pathGroup.add(lines(rapid, colors.rapid, 0.8));
    if (feed.length) pathGroup.add(lines(feed, colors.feed, 1));
  }

  function buildPreview(program) {
    previewOf = program;
    clear(previewGroup);
    if (!program) return;
    const rapid = [];
    const feed = [];
    for (const step of program.steps) {
      for (const move of step.moves) {
        if (!move.length) continue;
        const n = move.type === 'arc' ? Math.max(8, Math.ceil(Math.abs(move.sweep) * 16)) : 1;
        const points = Array.from({ length: n + 1 }, (_, i) => pointAt3(move, i / n));
        segments(points, move.type === 'rapid' ? rapid : feed);
      }
    }
    if (rapid.length) previewGroup.add(lines(rapid, colors.rapid, 0.35));
    if (feed.length) previewGroup.add(lines(feed, colors.feed, 0.35));
  }

  // ---------- Vista ----------

  function fit() {
    const stock = getScene()?.sim.stock;
    if (!stock) return;
    const center = new THREE.Vector3((stock.xMin + stock.xMax) / 2, (stock.yMin + stock.yMax) / 2, stock.zBottom / 2);
    const size = Math.max(stock.xMax - stock.xMin, stock.yMax - stock.yMin, stock.zTop - stock.zBottom);
    controls.target.copy(center);
    camera.position.set(center.x - size * 0.9, center.y - size * 1.6, center.z + size * 1.3);
    camera.lookAt(center);
    controls.update();
    render();
  }

  canvas.addEventListener('dblclick', fit);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
    stockView = null;
    for (const id of Object.keys(toolModels)) delete toolModels[id];
    toolShown && scene.remove(toolShown);
    toolShown = null;
    previewOf = undefined;
    trailCount = -1;
    draw();
  });
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    draw,
    fit,
    refit() {
      draw();
    }
  };
}

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const v = (name) => new THREE.Color(style.getPropertyValue(name).trim());
  const material = v('--sim-material');
  return {
    bg: v('--sim-bg'),
    grid: v('--sim-grid'),
    axis: v('--sim-axis'),
    material,
    machined: material.clone().lerp(new THREE.Color(0xdde6f0), 0.55),
    side: material.clone().multiplyScalar(0.8),
    vise: v('--sim-chuck'),
    tool: v('--sim-tool'),
    holder: v('--sim-holder'),
    rapid: v('--sim-rapid'),
    feed: v('--sim-feed'),
    collision: v('--sim-collision')
  };
}
