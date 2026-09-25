import { VERSION } from './version.js';
import { CONFIG } from './config.js';
import { createLatheAdapter } from './machines/lathe/adapter.js';
import { createMillAdapter } from './machines/mill/adapter.js';
import { modelsFor, findModel, modelSheet, ISO_SUPPORT } from './machines/catalog.js';
import { createEditor } from './ui/editor.js';
import { createAlarmPanel, escapeHtml } from './ui/alarm-panel.js';
import { createBlockPanel } from './ui/block-panel.js';
import { createSetupPanel } from './ui/setup-panel.js';
import { createToolPanel } from './ui/tool-panel.js';
import { createRunController, formatTime } from './ui/run-controller.js';
import { createHelpDialog } from './ui/help-dialog.js';
import { createMobileLayout } from './ui/mobile-layout.js';

// Collega interfaccia, interprete, simulatore e vista della macchina scelta (tornio o fresa).
// Tutto ciò che cambia tra le macchine sta negli adattatori (js/machines/*/adapter.js).

const MACHINES = { lathe: createLatheAdapter, mill: createMillAdapter };
const MACHINE_KEY = 'toleranza0.macchina';
const modelKey = (id) => `toleranza0.modello.${id}`;
const OFFSETS_KEY = 'toleranza0.correttori';
// Le chiavi senza macchina sono quelle delle versioni fino alla 0.4, che avevano solo il tornio
// Bozze separate per macchina e linguaggio (il Fanuc tiene le chiavi delle versioni precedenti)
const draftKey = (id, dialect = 'fanuc') => (dialect === 'siemens' ? `toleranza0.bozza.${id}.siemens` : `toleranza0.bozza.${id}`);
const dialectKey = (id) => `toleranza0.linguaggio.${id}`;
const setupKey = (id) => `toleranza0.grezzo.${id}`;
const LEGACY = { draft: 'toleranza0.bozza', setup: 'toleranza0.grezzo' };
const STATE_LABELS = {
  ready: 'Pronto',
  running: 'In esecuzione',
  paused: 'In pausa',
  alarm: 'Allarme',
  finished: 'Fine'
};

const $ = (selector) => document.querySelector(selector);
const canvases = { lathe: $('#sim-canvas-lathe'), mill: $('#sim-canvas-mill') };
const views = {};

let adapter = null;      // macchina attiva
let simulator = null;
let view = null;
let setup = null;
let offsets = null;
let program = null;      // programma interpretato: anteprima del percorso e tempo ciclo
let examples = [];
let collision = false;
let checkTimer = null;

$('#version').textContent = `v${VERSION}`;
for (const [id, enabled] of Object.entries(CONFIG.machines)) {
  const option = $(`#machine option[value="${id}"]`);
  if (option) option.disabled = !enabled;
}

// Ogni vista riceve la scena solo quando la sua macchina è attiva (le altre restano ferme, anche se ridimensionate)
const sceneFor = (id) => () => (adapter?.id === id && simulator
  ? { sim: simulator, program, collision, showPreview: $('#opt-preview').checked }
  : null);

const alarmPanel = createAlarmPanel($('#alarms'), {
  onSelectLine: (line) => editor.goToLine(line)
});
const blockPanel = createBlockPanel($('#block'));
const help = createHelpDialog($('#help'), { getAdapter: () => adapter });
createMobileLayout();
const setupPanel = createSetupPanel($('#setup-fields'), { onChange: applySetup });
const toolPanel = createToolPanel($('#tool-panel'), {
  onOffsetsChange(next) {
    offsets = next;
    saveText(OFFSETS_KEY, JSON.stringify(offsets));
    analyze(editor.getValue());
  }
});

const editor = createEditor($('#editor'), {
  onChange(text) {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => analyze(text), 250);
    if (adapter) saveText(draftKey(adapter.id, adapter.dialect), text);
  }
});

const controller = createRunController({
  // Il simulatore cambia con la macchina: il controller passa sempre da qui
  simulator: { follow: (move, t0, t1) => simulator.follow(move, t0, t1) },
  getOptions: () => ({
    speedFactor: CONFIG.speedFactors[Number($('#speed').value)],
    optionalStop: $('#opt-optional-stop').checked
  }),
  onBlock(step) {
    editor.setCurrentLine(step.block.line, { alarm: Boolean(step.alarm) });
    blockPanel.show(step.block.original ?? step.block, adapter.codes); // in Siemens le parole scritte dallo studente
    $('#status-line').textContent = `Riga ${step.block.line}`;
  },
  onFrame() {
    view?.draw();
    updateDro();
  },
  onStateChange(state, rawInfo) {
    const info = { ...rawInfo, alarm: rawInfo.alarm && adapter.localizeAlarm(rawInfo.alarm) };
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

// Controllo del programma: sintassi + interprete. Collisioni e profondità di passata si vedono solo eseguendo.
function analyze(text) {
  if (!adapter) return;
  const syntax = adapter.check(text);
  program = adapter.interpret(syntax.blocks, { offsets, blockDelete: $('#opt-block-delete').checked });
  const last = program.steps[program.steps.length - 1];
  const interpreterAlarm = last && last.alarm && !last.block.alarm ? last.alarm : null;
  const alarms = interpreterAlarm ? [...syntax.alarms, interpreterAlarm].sort((a, b) => a.line - b.line) : syntax.alarms;
  editor.setErrorLines(alarms.map((a) => a.line));
  if (controller.state === 'ready') {
    alarmPanel.show(alarms);
    view?.refit();
    updateDro();
  }
}

function applySetup(next) {
  if (controller.state !== 'ready') return;
  setup = next;
  saveText(setupKey(adapter.id), JSON.stringify(setup));
  simulator.reset(setup);
  view?.refit();
  updateDro();
}

// Programma caricato da esempio o file: la riga (GREZZO ...) imposta il grezzo da sola
function loadProgram(text) {
  const fromProgram = adapter.setupFromProgram(text);
  if (fromProgram) {
    setupPanel.write(fromProgram);
    applySetup(fromProgram);
  }
  editor.setValue(text);
}

// Cambio macchina o modello: nuovo simulatore con i dati del modello, campi del grezzo, utensili.
// Cambiando tipo di macchina si passa anche a esempi e bozza di quella macchina; cambiando solo il
// modello il programma nell'editor resta com'è.
async function selectMachine(id, { initial = false, modelId = null, dialect = null } = {}) {
  const type = MACHINES[id] && CONFIG.machines[id] ? id : 'lathe';
  const model = findModel(type, modelId ?? loadText(modelKey(type)));
  const language = (dialect ?? loadText(dialectKey(type))) === 'siemens' ? 'siemens' : 'fanuc';
  if (adapter && adapter.id === type && adapter.model.id === model.id && adapter.dialect === language) return;
  if (!initial && controller.state !== 'ready') {
    $('#machine').value = adapter.id;
    $('#dialect').value = adapter.dialect;
    fillModels();
    return;
  }
  // Stesso tipo di macchina e stesso linguaggio: cambia solo il modello e il programma resta nell'editor
  const sameType = adapter?.id === type && adapter?.dialect === language;
  const next = MACHINES[type](model, language);
  const previous = { adapter, simulator, setup, offsets, program };
  if (adapter && !sameType) saveText(draftKey(adapter.id, adapter.dialect), editor.getValue());

  adapter = next;
  simulator = next.createSimulator();
  const saved = loadJson(setupKey(next.id)) ?? (next.id === 'lathe' ? loadJson(LEGACY.setup) : null);
  setup = next.normalizeSetup(sameType ? setup : saved ?? next.defaultSetup);
  simulator.reset(setup);
  offsets = next.offsets ? next.offsets.normalize(loadJson(OFFSETS_KEY) ?? next.offsets.defaults) : null;
  for (const [key, canvas] of Object.entries(canvases)) canvas.hidden = key !== next.id;

  try {
    views[next.id] ??= await next.loadView(canvases[next.id], sceneFor(next.id));
  } catch (error) {
    console.warn(error);
    ({ adapter, simulator, setup, offsets, program } = previous);
    for (const [key, canvas] of Object.entries(canvases)) canvas.hidden = key !== (adapter?.id ?? 'lathe');
    $('#machine').value = adapter?.id ?? 'lathe';
    fillModels();
    $('#status-message').textContent = 'Impossibile caricare la vista 3D della fresa: serve la connessione a Internet (Three.js).';
    if (!adapter) await selectMachine('lathe', { initial: true });
    return;
  }
  view = views[next.id];
  $('#machine').value = next.id;
  saveText(MACHINE_KEY, next.id);
  saveText(modelKey(next.id), model.id);
  saveText(dialectKey(next.id), next.dialect);
  $('#dialect').value = next.dialect;
  fillModels();
  showModelInfo();

  setupPanel.build(next.setupFields, next.normalizeSetup, setup);
  toolPanel.build(next, offsets);
  $('#tools-title').textContent = next.offsets ? 'Utensili e correttori' : 'Utensili';

  controller.reset();
  collision = false;
  blockPanel.show(null);
  editor.setCurrentLine(null);
  if (!sameType) {
    fillExamples();
    $('#file-name').value = 'programma';
    const draft = loadText(draftKey(next.id, next.dialect)) ?? (next.id === 'lathe' && next.dialect === 'fanuc' ? loadText(LEGACY.draft) : null);
    const first = examples.find((e) => e.machine === next.id && (e.dialect ?? 'fanuc') === next.dialect);
    if (draft && draft.trim()) editor.setValue(draft);
    else if (first) await loadExample(first.file);
    else editor.setValue(next.newProgram);
  }
  analyze(editor.getValue());
  view.fit();
}

// Menu dei modelli della macchina attiva, raggruppati per produttore
function fillModels() {
  const select = $('#model');
  const groups = new Map();
  for (const model of modelsFor(adapter?.id ?? 'lathe')) {
    const key = model.generic ? 'Didattica' : model.maker;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(model);
  }
  select.innerHTML = [...groups].map(([maker, list]) => `<optgroup label="${escapeHtml(maker)}">${
    list.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.generic ? m.model : `${m.maker} ${m.model}`)}</option>`).join('')
  }</optgroup>`).join('');
  if (adapter) select.value = adapter.model.id;
}

// Scheda della macchina scelta: dati dal catalogo, fonte e compatibilità con la programmazione ISO
function showModelInfo() {
  const model = adapter.model;
  const rows = modelSheet(model).map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`).join('');
  const iso = model.generic ? '' : `<p class="model-iso model-iso-${escapeHtml(model.iso)}">${escapeHtml(ISO_SUPPORT[model.iso] ?? '')}</p>`;
  const source = model.sourceUrl
    ? `<p class="muted">Dati indicativi dal catalogo del produttore (${escapeHtml(model.checked ?? '')}): verificare sulla macchina vera. <a href="${escapeHtml(model.sourceUrl)}" target="_blank" rel="noopener">Fonte</a></p>`
    : '';
  const note = model.note ? `<p class="muted">${escapeHtml(model.note)}</p>` : '';
  $('#model-title').textContent = model.generic ? 'Macchina' : `${model.maker} ${model.model}`;
  $('#model-info').innerHTML = `<table class="tool-table"><tbody>${rows}</tbody></table>${iso}${note}${source}`;
}

function updateButtons(state) {
  $('#btn-start').disabled = state === 'running' || state === 'alarm' || state === 'finished';
  $('#btn-pause').disabled = state !== 'running';
  $('#btn-step').disabled = state === 'running' || state === 'alarm' || state === 'finished';
  $('#btn-reset').disabled = state === 'ready';
  for (const id of ['#btn-new', '#btn-open', '#examples', '#opt-block-delete', '#machine', '#model', '#dialect']) $(id).disabled = state !== 'ready';
}

function updateDro() {
  if (!adapter || !simulator) return;
  const rows = adapter.dro(simulator, controller.currentStep?.state);
  rows.push(['Tempo', `${formatTime(controller.elapsed)} / ${program ? formatTime(program.totalTime) : '—'}`]);
  $('#dro').innerHTML = rows.map(([label, value]) => `<div><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join('');
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
  view?.draw();
});
$('#btn-fit').addEventListener('click', () => view?.fit());
$('#opt-preview').addEventListener('change', () => view?.draw());
$('#opt-block-delete').addEventListener('change', () => analyze(editor.getValue()));
$('#machine').addEventListener('change', (event) => selectMachine(event.target.value));
$('#model').addEventListener('change', (event) => selectMachine(adapter.id, { modelId: event.target.value }));
$('#dialect').addEventListener('change', (event) => selectMachine(adapter.id, { dialect: event.target.value }));
$('#btn-help').addEventListener('click', () => help.open());

// Scorciatoie da tastiera (elencate anche nella guida)
document.addEventListener('keydown', (event) => {
  if (help.isOpen) return; // Esc chiude la guida da solo
  const ctrl = event.ctrlKey || event.metaKey;
  if (event.key === 'F1') {
    event.preventDefault();
    help.open();
  } else if (ctrl && event.key === 'Enter') {
    event.preventDefault();
    if (!$('#btn-start').disabled) $('#btn-start').click();
  } else if (event.key === 'Escape' && controller.state === 'running') {
    event.preventDefault();
    controller.pause();
  } else if (ctrl && (event.key === 's' || event.key === 'S')) {
    event.preventDefault();
    $('#btn-save').click();
  }
});

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
  loadProgram(adapter.newProgram);
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

// Esempi (percorsi relativi: il sito è pubblicato in /toleranza0/), solo quelli della macchina attiva
async function loadExamples() {
  try {
    examples = await (await fetch('examples/index.json')).json();
  } catch {
    examples = [];
  }
}

function fillExamples() {
  const select = $('#examples');
  select.innerHTML = '<option value="">Esempi…</option>';
  for (const example of examples.filter((e) => (e.machine ?? 'lathe') === adapter.id && (e.dialect ?? 'fanuc') === adapter.dialect)) {
    const option = document.createElement('option');
    option.value = example.file;
    option.textContent = example.title;
    select.append(option);
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
  // Se nel frattempo si cambia macchina, l'esempio non va caricato (finirebbe nella bozza dell'altra macchina)
  const machine = adapter?.id;
  try {
    const response = await fetch(`examples/${file}`);
    if (!response.ok) throw new Error(response.statusText);
    const text = await response.text();
    if (adapter?.id !== machine) return;
    loadProgram(text);
    $('#file-name').value = file.replace(/\.[^.]+$/, '');
  } catch {
    $('#status-message').textContent = `Impossibile caricare l'esempio ${file}.`;
  }
}

// Bozze, grezzo e macchina nel browser sono solo una comodità: il sito funziona anche senza
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
  await loadExamples();
  await selectMachine(loadText(MACHINE_KEY) ?? 'lathe', { initial: true });
}

init();
