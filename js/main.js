import { VERSION } from './version.js';
import { CONFIG } from './config.js';
import { LATHE } from './machines/lathe/codes.js';
import { checkProgram } from './parser/check-program.js';
import { createEditor } from './ui/editor.js';
import { createAlarmPanel } from './ui/alarm-panel.js';
import { createBlockPanel } from './ui/block-panel.js';
import { createRunController } from './ui/run-controller.js';

const DRAFT_KEY = 'toleranza0.bozza';
const STATE_LABELS = {
  ready: 'Pronto',
  running: 'In esecuzione',
  paused: 'In pausa',
  alarm: 'Allarme',
  finished: 'Fine'
};

const $ = (selector) => document.querySelector(selector);
const machine = LATHE;
let syntax = { blocks: [], alarms: [] };
let checkTimer = null;

$('#version').textContent = `v${VERSION}`;
if (!CONFIG.machines.mill) $('#machine option[value="mill"]').disabled = true;

const alarmPanel = createAlarmPanel($('#alarms'), {
  onSelectLine: (line) => editor.goToLine(line)
});
const blockPanel = createBlockPanel($('#block'));

const editor = createEditor($('#editor'), {
  onChange(text) {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => runSyntaxCheck(text), 250);
    saveDraft(text);
  }
});

const controller = createRunController({
  getOptions: () => ({
    linesPerSecond: CONFIG.baseSpeed * Number($('#speed').value) / 100,
    blockDelete: $('#opt-block-delete').checked,
    optionalStop: $('#opt-optional-stop').checked
  }),
  onBlock(block) {
    editor.setCurrentLine(block.line, { alarm: Boolean(block.alarm) });
    blockPanel.show(block, machine);
    $('#status-line').textContent = `Riga ${block.line}`;
  },
  onStateChange(state, info) {
    document.body.dataset.state = state;
    $('#status-state').textContent = STATE_LABELS[state];
    $('#status-message').textContent = info.alarm
      ? `ALL. ${info.alarm.code} riga ${info.alarm.line}: ${info.alarm.message}`
      : info.message ?? '';
    editor.setReadOnly(state !== 'ready');
    if (state === 'alarm') alarmPanel.show([], { active: info.alarm });
    updateButtons(state);
  }
});

function runSyntaxCheck(text) {
  syntax = checkProgram(text, machine);
  editor.setErrorLines(syntax.alarms.map((a) => a.line));
  if (controller.state === 'ready') alarmPanel.show(syntax.alarms);
}

function updateButtons(state) {
  $('#btn-start').disabled = state === 'running' || state === 'alarm' || state === 'finished';
  $('#btn-pause').disabled = state !== 'running';
  $('#btn-step').disabled = state === 'alarm' || state === 'finished';
  $('#btn-reset').disabled = state === 'ready';
  for (const id of ['#btn-new', '#btn-open', '#examples']) $(id).disabled = state !== 'ready';
}

function prepareRun() {
  if (controller.state !== 'ready') return;
  clearTimeout(checkTimer);
  runSyntaxCheck(editor.getValue());
  controller.load(syntax.blocks);
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
  editor.setCurrentLine(null);
  blockPanel.show(null);
  $('#status-line').textContent = '';
  runSyntaxCheck(editor.getValue());
});

$('#speed').addEventListener('input', () => {
  $('#speed-value').textContent = `${$('#speed').value}%`;
});

// File: nuovo, apri, salva
$('#btn-new').addEventListener('click', () => {
  if (editor.getValue().trim() && !confirm('Cancellare il programma attuale?')) return;
  editor.setValue('%\nO0001 (NUOVO PROGRAMMA)\n\nM30\n%\n');
});
$('#btn-open').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  editor.setValue(await file.text());
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
    editor.setValue(await response.text());
    $('#file-name').value = file.replace(/\.[^.]+$/, '');
  } catch {
    $('#status-message').textContent = `Impossibile caricare l'esempio ${file}.`;
  }
}

// La bozza nel browser è solo una comodità: il sito funziona anche se non è disponibile
function saveDraft(text) {
  try { localStorage.setItem(DRAFT_KEY, text); } catch { /* ignorato */ }
}
function loadDraft() {
  try { return localStorage.getItem(DRAFT_KEY); } catch { return null; }
}

async function init() {
  const examples = await loadExamples();
  const draft = loadDraft();
  if (draft && draft.trim()) editor.setValue(draft);
  else if (examples.length) await loadExample(examples[0].file);
  else editor.setValue('');
  blockPanel.show(null);
  controller.reset();
}

init();
