// Interruttori per le funzioni non ancora pronte: su main il sito deve funzionare sempre,
// quindi una funzione a metà resta a false finché non è completa.
export const CONFIG = {
  machines: {
    lathe: true,
    mill: true
  },
  // Fattori di velocità della simulazione (×1 = tempo reale della macchina)
  speedFactors: [1, 2, 5, 10, 20, 50, 100, 200, 500],
  defaultSpeedIndex: 3
};
