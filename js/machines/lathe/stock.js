// Grezzo del tornio come griglia di celle nel semipiano Z–r (il pezzo è a simmetria assiale).
// Cella (i, j): z da zMin + i·c a zMin + (i+1)·c, r da j·c a (j+1)·c. 1 = materiale.

const MAX_CELLS = 300000;

export function createStock({ diameter, length, faceAllowance }) {
  const R = diameter / 2;
  const zMin = -length;
  const zMax = faceAllowance;
  let c = Math.max(0.02, Math.sqrt((R * (zMax - zMin)) / MAX_CELLS));
  const nr = Math.max(1, Math.round(R / c));
  c = R / nr; // così il bordo esterno del grezzo cade esattamente su un bordo di cella
  const nz = Math.ceil((zMax - zMin) / c - 1e-9);
  const data = new Uint8Array(nz * nr).fill(1);
  for (let i = 0; i < nz; i++) {
    if (zMin + (i + 0.5) * c > zMax) for (let j = 0; j < nr; j++) data[j * nz + i] = 0;
  }

  const stock = {
    R, zMin, zMax, c, nz, nr, data,
    changed: [],      // celle tolte dall'ultimo disegno
    fullRedraw: true, // true quando il disegno va rifatto da capo

    any(j, i0, i1) {
      const offset = j * nz;
      for (let i = i0; i <= i1; i++) if (data[offset + i]) return true;
      return false;
    },

    // Toglie il materiale nelle celle da i0 a i1 della riga j.
    // Restituisce la prima e l'ultima cella tolta (-1 se non c'era materiale).
    remove(j, i0, i1) {
      const offset = j * nz;
      let first = -1;
      let last = -1;
      for (let i = i0; i <= i1; i++) {
        if (data[offset + i]) {
          data[offset + i] = 0;
          if (first < 0) first = i;
          last = i;
          if (!stock.fullRedraw) stock.changed.push(offset + i);
        }
      }
      if (stock.changed.length > 1e6) {
        stock.changed.length = 0;
        stock.fullRedraw = true;
      }
      return { first, last };
    },

    // Raggio esterno del materiale alla quota z (0 se non c'è materiale)
    radiusAt(z) {
      const i = Math.floor((z - zMin) / c);
      if (i < 0 || i >= nz) return 0;
      for (let j = nr - 1; j >= 0; j--) if (data[j * nz + i]) return (j + 1) * c;
      return 0;
    }
  };
  return stock;
}
