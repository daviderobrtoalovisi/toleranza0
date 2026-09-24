import { createAlarm } from '../alarms/alarm.js';

// Esecuzione animata del programma interpretato: avanza nel tempo simulato
// (tempo reale × fattore di velocità) e fa percorrere i movimenti al simulatore.
// Stati: 'ready' | 'running' | 'paused' | 'alarm' | 'finished'

const MIN_BLOCK_SECONDS = 0.12; // tempo reale minimo per ogni blocco, per vedere l'evidenziazione

export function createRunController({ simulator, getOptions, onBlock, onFrame, onStateChange }) {
  let program = null;
  let stepIndex = -1;
  let current = null;
  let moveIndex = 0;
  let moveT = 0;
  let hold = 0;
  let elapsed = 0;
  let singleBlock = false;
  let state = 'ready';
  let frameId = null;
  let lastTime = null;

  function setState(next, info = {}) {
    state = next;
    if (next !== 'running') {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    onStateChange(state, info);
    onFrame();
  }

  function raise(alarm) {
    setState('alarm', { alarm });
  }

  function startNextStep() {
    stepIndex++;
    if (stepIndex >= program.steps.length) {
      current = null;
      setState('finished', { message: 'Programma terminato senza M30. Aggiungi M30 alla fine.' });
      return false;
    }
    current = program.steps[stepIndex];
    moveIndex = 0;
    moveT = 0;
    hold = MIN_BLOCK_SECONDS;
    onBlock(current);
    if (current.alarm && current.moves.length === 0) {
      raise(current.alarm);
      return false;
    }
    return true;
  }

  function finishStep() {
    const step = current;
    current = null;
    if (step.stop === 'end') {
      setState('finished', { message: `Fine programma. Tempo ciclo ${formatTime(elapsed)}.` });
    } else if (step.alarm) {
      raise(step.alarm);
    } else if (step.stop === 'program') {
      setState('paused', { message: 'Arresto programmato M00: premi Avvia per continuare.' });
    } else if (step.stop === 'optional' && getOptions().optionalStop) {
      setState('paused', { message: 'Arresto opzionale M01: premi Avvia per continuare.' });
    } else if (singleBlock) {
      setState('paused', { message: 'Blocco singolo: premi di nuovo per eseguire il blocco successivo.' });
    }
  }

  // Avanza di dt secondi reali
  function advance(dt) {
    const speed = getOptions().speedFactor;
    let real = dt;
    while (state === 'running') {
      if (!current && !startNextStep()) return;
      while (moveIndex < current.moves.length) {
        const move = current.moves[moveIndex];
        if (move.duration <= 0) {
          const code = simulator.follow(move, moveT, 1);
          if (code) return raise(createAlarm(code, current.block.line));
          moveIndex++;
          moveT = 0;
          continue;
        }
        const budget = real * speed;
        if (budget <= 0) return;
        const needed = (1 - moveT) * move.duration;
        const used = Math.min(needed, budget);
        const t1 = used >= needed ? 1 : moveT + used / move.duration;
        const code = simulator.follow(move, moveT, t1);
        elapsed += used;
        real -= used / speed;
        hold -= used / speed;
        if (code) return raise(createAlarm(code, current.block.line));
        moveT = t1;
        if (t1 < 1) return;
        moveIndex++;
        moveT = 0;
      }
      if (hold > 0) {
        const wait = Math.min(hold, real);
        hold -= wait;
        real -= wait;
        if (hold > 1e-9) return;
      }
      finishStep();
    }
  }

  function frame(time) {
    if (state !== 'running') return;
    const dt = lastTime === null ? 0 : Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;
    advance(dt);
    onFrame();
    if (state === 'running') frameId = requestAnimationFrame(frame);
  }

  function run(single) {
    if (!program || state === 'alarm' || state === 'finished' || state === 'running') return;
    singleBlock = single;
    lastTime = null;
    setState('running', { message: single ? 'Blocco singolo.' : '' });
    frameId = requestAnimationFrame(frame);
  }

  return {
    load(newProgram) {
      program = newProgram;
      stepIndex = -1;
      current = null;
      elapsed = 0;
      setState('ready');
    },
    start: () => run(false),
    singleStep: () => run(true),
    pause() {
      if (state === 'running') setState('paused', { message: 'In pausa.' });
    },
    reset() {
      stepIndex = -1;
      current = null;
      elapsed = 0;
      program = null;
      setState('ready');
    },
    get state() {
      return state;
    },
    get currentStep() {
      return current ?? (stepIndex >= 0 && program ? program.steps[stepIndex] : null);
    },
    get elapsed() {
      return elapsed;
    }
  };
}

export function formatTime(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
