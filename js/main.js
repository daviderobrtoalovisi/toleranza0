import { VERSION } from './version.js';
import { CONFIG } from './config.js';
import { LATHE } from './machines/lathe/codes.js';
import {
  LATHE_PARAMS, DEFAULT_SETUP, DEFAULT_OFFSETS, normalizeSetup, normalizeOffsets, setupFromProgram
} from './machines/lathe/machine.js';
import { LATHE_TOOLS } from './machines/lathe/tools.js';
import { createLatheSimulator } from './machines/lathe/simulator.js';
import { checkProgram } from './parser/check-program.js';
import { interpretLathe, spindleRpm } from './interpreter/interpret-lathe.js';
import { createLatheView } from './render/lathe-2d.js';
import { createEditor } from './ui/editor.js';
import { createAlarmPanel } from './ui/alarm-panel.js';
import { createBlockPanel } from './ui/block-panel.js';
import { createSetupPanel } from './ui/setup-panel.js';
import { createToolPanel } from './ui/tool-panel.js';
import { createRunController, formatTime } from './ui/run-controller.js';

const DRAFT_KEY = 'toleranza0.bozza';
const SETUP_KEY = 'toleranza0.grezzo';
const OFFSETS_KEY = 'toleranza0.correttori';
const STATE_LABELS = {
  ready: 'Pronto',
  running: 'In esecuzione',
  paused: 'In pausa',
  alarm: 'Allarme',
  finished: 'Fine'
};

const $ = (selector) => document.querySelector(selector);
const machine = LATHE;
const params = LATHE_PARAMS;
const tools = LATHE_TOOLS;

let program = null;      // programma interpretato: anteprima del percorso e tempo ciclo
let liveAlarms = [];
let collision = false;
let checkTimer = null;
let setup = normalizeSetup(loadJson(SETUP_KEY) ?? DEFAULT_SETUP);
let offsets = normalizeOffsets(loadJson(OFFSETS_KEY) ?? DEFAULT_OFFSETS);

$('#version').textContent = `v${VERSION}`;
if (!CONFIG.machines.mill) $('#machine option[value="mill"]').disabled = true;

const simulator = createLatheSimulator({ params, tools });
simulator.reset(setup);

const view = createLatheView($('#sim-canvas'), {
  tools,
  params,
  getScene: () => ({ sim: simulator, program, collision, showPreview: $('#opt-preview').checked })
});

const alarmPanel = createAlarmPanel($('#alarms'), {
  onSelectLine: (line) => editor.goToLine(line)
});
const blockPanel = createBlockPanel($('#block'));

const setupPanel = createSetupPanel({
  inputs: { diameter: $('#stock-d'), length: $('#stock-l'), faceAllowance: $('#stock-f') },
  onChange: applySetup
});
setupPanel.write(setup);

const toolPanel = createToolPanel($('#tool-panel'), {
  tools,
  offsets,
  onChange(next) {
    offsets = next;
    saveText(OFFSETS_KEY, JSON.stringify(offsets));
    analyze(editor.getValue());
  }
});

const editor = createEditor($('#editor'), {
  onChange(text) {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => analyze(text), 250);
    saveText(DRAFT_KEY, text);
  }
});

const controller = createRunController({
  simulator,
  getOptions: () => ({
    speedFactor: CONFIG.speedFactors[Number($('#speed').value)],
    optionalStop: $('#opt-optional-stop').checked
  }),
  onBlock(step) {
    editor.setCurrentLine(step.block.line, { alarm: Boolean(step.alarm) });
    blockPanel.show(step.block, machine);
    $('#status-line').textContent = `Riga ${step.block.line}`;
  },
  onFrame() {
    view.draw();
    updateDro();
  },
  onStateChange(state, info) {
    document.body.dataset.state = state;
    $('#status-state').textContent = STATE_LABELS[state];
    $('#status-message').textContent = info.alarm
      ? `ALL. ${info.alarm.code} riga ${info.alarm.line}: ${info.alarm.message}`
      : info.message ?? '';
    const idle = state === 'ready';
    editor.setReadOnly(!idle);
    setupPanel.setDisabled(!idle);
    toolPanel.setDisabled(!idle);
    collision = state === 'alarm' && info.alarm.category === 'collisione';
    if (state === 'alarm') {
      editor.setCurrentLine(info.alarm.line, { alarm: true });
      alarmPanel.show([], { active: info.alarm });
    }
    updateButtons(state);
  }
});

// Controllo del programma: sintassi + interprete (archi, F, S, T). Le collisioni si vedono solo eseguendo.
function analyze(text) {
  const syntax = checkProgram(text, machine);
  program = interpretLathe(syntax.blocks, { params, tools, offsets, blockDelete: $('#opt-block-delete').checked });
  const last = program.steps[program.steps.length - 1];
  const interpreterAlarm = last && last.alarm && !last.block.alarm ? last.alarm : null;
  liveAlarms = interpreterAlarm ? [...syntax.alarms, interpreterAlarm].sort((a, b) => a.line - b.line) : syntax.alarms;
  editor.setErrorLines(liveAlarms.map((a) => a.line));
  if (controller.state === 'ready') {
    alarmPanel.show(liveAlarms);
    view.refit();
    updateDro();
  }
}

function applySetup(next) {
  if (controller.state !== 'ready') return;
  setup = next;
  saveText(SETUP_KEY, JSON.stringify(setup));
  simulator.reset(setup);
  view.refit();
  updateDro();
}

// Programma caricato da esempio o file: se contiene (GREZZO D.. L..) il grezzo si imposta da solo
function loadProgram(text) {
  const fromProgram = setupFromProgram(text);
  if (fromProgram) {
    setupPanel.write(fromProgram);
    applySetup(fromProgram);
  }
  editor.setValue(text);
}

function updateButtons(state) {
  $('#btn-start').disabled = state === 'running' || state === 'alarm' || state === 'finished';
  $('#btn-pause').disabled = state !== 'running';
  $('#btn-step').disabled = state === 'running' || state === 'alarm' || state === 'finished';
  $('#btn-reset').disabled = state === 'ready';
  for (const id of ['#btn-new', '#btn-open', '#examples', '#opt-block-delete']) $(id).disabled = state !== 'ready';
}

function updateDro() {
  const step = controller.currentStep;
  const s = step?.state;
  const pos = simulator.pos;
  const rpm = s ? spindleRpm(s, pos.x, params) : 0;
  const feed = s?.feed ? `${fmt(s.feed, s.feedMode === 99 ? 3 : 0)} ${s.feedMode === 99 ? 'mm/giro' : 'mm/min'}` : '—';
  const tool = simulator.tool ? `T${String(simulator.tool).padStart(2, '0')}` : '—';
  const total = program ? formatTime(program.totalTime) : '—';
  $('#dro').innerHTML = `
    <div><span>X</span><b>${fmt(pos.x, 3)}</b></div>
    <div><span>Z</span><b>${fmt(pos.z, 3)}</b></div>
    <div><span>T</span><b>${tool}</b></div>
    <div><span>S</span><b>${rpm ? `${Math.round(rpm)} giri/min` : 'fermo'}</b></div>
    <div><span>F</span><b>${feed}</b></div>
    <div><span>Tempo</span><b>${formatTime(controller.elapsed)} / ${total}</b></div>`;
}

function fmt(value, digits) {
  return Number(value).toFixed(digits);
}

function prepareRun() {
  if (controller.state !== 'ready') return;
  clearTimeout(checkTimer);
  analyze(editor.getValue());
  simulator.reset(setup);
  collision = false;
  controller.load(program);
}

$('#btn-start').addEventListener('click', () => {
  prepareRun();
  controller.start();
});
$('#btn-step').addEventListener('click', () => {
  prepareRun();
  controller.singleStep();
});
$('#btn-pause').addEventListener('click', () => controller.pause());
$('#btn-reset').addEventListener('click', () => {
  controller.reset();
  simulator.reset(setup);
  collision = false;
  editor.setCurrentLine(null);
  blockPanel.show(null);
  $('#status-line').textContent = '';
  analyze(editor.getValue());
  view.draw();
});
$('#btn-fit').addEventListener('click', () => view.fit());
$('#opt-preview').addEventListener('change', () => view.draw());
$('#opt-block-delete').addEventListener('change', () => analyze(editor.getValue()));

function showSpeed() {
  $('#speed-value').textContent = `×${CONFIG.speedFactors[Number($('#speed').value)]}`;
}
$('#speed').max = String(CONFIG.speedFactors.length - 1);
$('#speed').value = String(CONFIG.defaultSpeedIndex);
$('#speed').addEventListener('input', showSpeed);
showSpeed();

// File: nuovo, apri, salva
$('#btn-new').addEventListener('click', () => {
  if (editor.getValue().trim() && !confirm('Cancellare il programma attuale?')) return;
  editor.setValue('%\nO0001 (NUOVO PROGRAMMA)\n(GREZZO D50 L80)\n\nM30\n%\n');
});
$('#btn-open').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  loadProgram(await file.text());
  $('#file-name').value = file.name.replace(/\.[^.]+$/, '');
  event.target.value = '';
});
$('#btn-save').addEventListener('click', () => {
  const name = ($('#file-name').value.trim() || 'programma').replace(/[^\w\-]+/g, '_');
  const blob = new Blob([editor.getValue()], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.nc`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// Esempi (percorsi relativi: il sito è pubblicato in /toleranza0/)
async function loadExamples() {
  try {
    const list = await (await fetch('examples/index.json')).json();
    const select = $('#examples');
    for (const example of list) {
      const option = document.createElement('option');
      option.value = example.file;
      option.textContent = example.title;
      select.append(option);
    }
    return list;
  } catch {
    return [];
  }
}

$('#examples').addEventListener('change', async (event) => {
  const file = event.target.value;
  event.target.value = '';
  if (!file) return;
  if (editor.getValue().trim() && !confirm('Sostituire il programma attuale con l\'esempio?')) return;
  await loadExample(file);
});

async function loadExample(file) {
  try {
    const response = await fetch(`examples/${file}`);
    if (!response.ok) throw new Error(response.statusText);
    loadProgram(await response.text());
    $('#file-name').value = file.replace(/\.[^.]+$/, '');
  } catch {
    $('#status-message').textContent = `Impossibile caricare l'esempio ${file}.`;
  }
}

// Bozza e grezzo nel browser sono solo una comodità: il sito funziona anche se non sono disponibili
function saveText(key, text) {
  try { localStorage.setItem(key, text); } catch { /* ignorato */ }
}
function loadText(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function loadJson(key) {
  try { return JSON.parse(loadText(key)); } catch { return null; }
}

async function init() {
  const examples = await loadExamples();
  const draft = loadText(DRAFT_KEY);
  if (draft && draft.trim()) editor.setValue(draft);
  else if (examples.length) await loadExample(examples[0].file);
  else editor.setValue('');
  blockPanel.show(null);
  controller.reset();
}

init();
