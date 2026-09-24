import { stockBox } from './machine.js';

// Grezzo della fresa come mappa delle altezze: per ogni cella del piano XY l'altezza Z della superficie.
// Basta per la fresatura a 3 assi (l'utensile lavora sempre dall'alto, niente sottosquadri).
// Cella (i, j): x da xMin + i·c a xMin + (i+1)·c, y da yMin + j·c a yMin + (j+1)·c; indice j·nx + i.

const MAX_CELLS = 150000;

export function createMillStock(setup) {
  const box = stockBox(setup);
  const L = box.xMax - box.xMin;
  const W = box.yMax - box.yMin;
  const c = Math.max(0.1, Math.sqrt((L * W) / MAX_CELLS));
  const nx = Math.max(1, Math.round(L / c));
  const ny = Math.max(1, Math.round(W / c));
  const cx = L / nx;
  const cy = W / ny;
  const height = new Float32Array(nx * ny).fill(box.zTop);

  const stock = {
    ...box,
    c: Math.max(cx, cy),
    cx,
    cy,
    nx,
    ny,
    height,
    changed: [],       // celle cambiate dall'ultimo disegno
    fullRedraw: true,

    // Altezza della superficie nel punto (x, y); null fuori dal grezzo
    heightAt(x, y) {
      const i = Math.floor((x - box.xMin) / cx);
      const j = Math.floor((y - box.yMin) / cy);
      if (i < 0 || j < 0 || i >= nx || j >= ny) return null;
      return height[j * nx + i];
    },

    markChanged(index) {
      if (stock.fullRedraw) return;
      stock.changed.push(index);
      if (stock.changed.length > 1e6) {
        stock.changed.length = 0;
        stock.fullRedraw = true;
      }
    }
  };
  return stock;
}
