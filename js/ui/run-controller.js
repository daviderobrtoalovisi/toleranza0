import { isExecutable } from '../parser/check-program.js';

// Esecuzione del programma blocco per blocco (v0.1: senza movimenti, solo scorrimento ed evidenziazione).
// Stati: 'ready' | 'running' | 'paused' | 'alarm' | 'finished'

export function createRunController({ onBlock, onStateChange, getOptions }) {
  let blocks = [];
  let index = -1;
  let state = 'ready';
  let timer = null;

  function setState(next, info = {}) {
    state = next;
    onStateChange(state, info);
  }

  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function nextIndex(from) {
    const { blockDelete } = getOptions();
    for (let i = from + 1; i < blocks.length; i++) {
      const block = blocks[i];
      if (!isExecutable(block)) continue;
      if (blockDelete && block.blockDelete) continue;
      return i;
    }
    return -1;
  }

  // Esegue un blocco; restituisce false se l'esecuzione deve fermarsi
  function step() {
    const i = nextIndex(index);
    if (i === -1) {
      setState('finished', { message: 'Programma terminato senza M30. Aggiungi M30 alla fine.' });
      return false;
    }
    index = i;
    const block = blocks[index];
    onBlock(block);

    if (block.alarm) {
      setState('alarm', { alarm: block.alarm });
      return false;
    }
    const m = block.words.find((w) => w.letter === 'M')?.value;
    if (m === 30 || m === 2) {
      setState('finished', { message: 'Fine programma.' });
      return false;
    }
    if (m === 0) {
      setState('paused', { message: 'Arresto programmato M00: premi Avvia per continuare.' });
      return false;
    }
    if (m === 1 && getOptions().optionalStop) {
      setState('paused', { message: 'Arresto opzionale M01: premi Avvia per continuare.' });
      return false;
    }
    return true;
  }

  function loop() {
    if (state !== 'running') return;
    if (!step()) return;
    timer = setTimeout(loop, 1000 / getOptions().linesPerSecond);
  }

  return {
    load(newBlocks) {
      stopTimer();
      blocks = newBlocks;
      index = -1;
      setState('ready');
    },
    start() {
      if (state === 'alarm' || state === 'finished' || state === 'running') return;
      setState('running');
      loop();
    },
    pause() {
      if (state !== 'running') return;
      stopTimer();
      setState('paused', { message: 'In pausa.' });
    },
    singleStep() {
      if (state === 'alarm' || state === 'finished') return;
      stopTimer();
      setState('paused', { message: 'Blocco singolo: premi di nuovo per eseguire il blocco successivo.' });
      step();
    },
    reset() {
      stopTimer();
      index = -1;
      setState('ready');
    },
    get state() {
      return state;
    }
  };
}
