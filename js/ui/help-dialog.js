import { ALARMS } from '../alarms/catalog.js';
import { escapeHtml } from './alarm-panel.js';
import { basics } from './help-basics.js';

// Guida per gli studenti, dentro la pagina. Codici e allarmi vengono dalle tabelle della macchina
// attiva e dal catalogo: la guida è sempre allineata al simulatore, senza testi da aggiornare a mano.

const CATEGORY = {
  sintassi: 'Sintassi (come è scritto il programma)',
  parametri: 'Parametri mancanti',
  geometria: 'Geometria e limiti',
  collisione: 'Collisioni'
};

export const SHORTCUTS = [
  ['Ctrl + Invio', 'Avvia o continua l\'esecuzione'],
  ['Esc', 'Pausa'],
  ['Ctrl + S', 'Salva il programma sul computer'],
  ['F1', 'Apre questa guida']
];

const TAB_KEY = 'toleranza0.helpTab';

export function createHelpDialog(dialog, { getAdapter }) {
  let tab = recallTab();

  dialog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (button) {
      tab = button.dataset.tab;
      rememberTab(tab);
      render();
    }
    if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
  });

  function render() {
    const adapter = getAdapter();
    const tabs = [
      ['semplice', 'In parole semplici'],
      ['uso', 'Come si usa'],
      ['codici', 'Codici'],
      ['allarmi', 'Allarmi']
    ];
    dialog.innerHTML = `
      <div class="help">
        <header class="help-head">
          <h2>Guida</h2>
          <nav class="help-tabs" role="tablist">
            ${tabs.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`).join('')}
          </nav>
          <button type="button" class="help-close" data-close aria-label="Chiudi">✕</button>
        </header>
        <div class="help-body">${body(tab, adapter)}</div>
      </div>`;
  }

  return {
    open(initialTab) {
      if (initialTab) tab = initialTab;
      render();
      if (!dialog.open) dialog.showModal();
    },
    get isOpen() {
      return dialog.open;
    }
  };
}

function body(tab, adapter) {
  if (tab === 'codici') return codes(adapter);
  if (tab === 'allarmi') return alarms();
  if (tab === 'uso') return usage(adapter);
  return basics(adapter);
}

// La scheda aperta l'ultima volta: chi programma ritrova i codici,
// chi sta imparando ritrova la spiegazione semplice
function rememberTab(value) {
  try {
    localStorage.setItem(TAB_KEY, value);
  } catch (error) {
    /* pazienza: vale solo per questa visita */
  }
}

function recallTab() {
  try {
    return localStorage.getItem(TAB_KEY) || 'semplice';
  } catch (error) {
    return 'semplice';
  }
}

// Consigli per macchina e linguaggio
const MACHINE_NOTES = {
  'mill-fanuc': 'Z0 è la faccia superiore finita. Si monta l\'utensile con <code>T1 M06</code> e poi, prima di muovere Z, si richiama la sua lunghezza con <code>G43 H1</code>.',
  'mill-siemens': 'Z0 è la faccia superiore finita. Si monta l\'utensile con <code>T1 M6</code>: con il correttore <code>D1</code> (predefinito) lunghezza e raggio sono già attivi. Commenti dopo <code>;</code>, raggio degli archi con <code>CR=</code>, ritorno al riferimento con <code>G74 Z1=0</code>.',
  'lathe-fanuc': 'X è in diametro, Z0 è la faccia finita del pezzo. L\'utensile si chiama con <code>T0101</code> (utensile 01, correttore 01).',
  'lathe-siemens': 'X è in diametro (<code>DIAMON</code>), Z0 è la faccia finita del pezzo. L\'utensile si chiama con <code>T1 D1</code>; avanzamento al giro con <code>G95</code>, velocità di taglio costante con <code>G96 S180 LIMS=2000</code>, quote incrementali con <code>X=IC(2)</code>, raggio degli archi con <code>CR=</code>, commenti dopo <code>;</code>.'
};

function usage(adapter) {
  const siemens = adapter.dialect === 'siemens';
  const stock = adapter.id === 'mill' ? '(GREZZO X100 Y80 Z30)' : '(GREZZO D50 L80)';
  const machine = `<li><b>${adapter.id === 'mill' ? 'Fresa' : 'Tornio'}${siemens ? ' in Siemens SINUMERIK' : ''}:</b> ${MACHINE_NOTES[`${adapter.id}-${adapter.dialect}`]}</li>
    ${siemens ? '<li>Il programma Siemens viene tradotto nei movimenti equivalenti: sulla fresa si possono usare i cicli di foratura <code>CYCLE81</code>, <code>CYCLE82</code> e <code>CYCLE83</code>, anche con <code>MCALL</code>, sul tornio la sgrossatura <code>CYCLE95</code> con il profilo scritto dopo <code>M30</code> tra due etichette e le gole <code>CYCLE93</code> con il troncatore; sulla fresa anche le tasche <code>POCKET3</code> e <code>POCKET4</code> e la spianatura <code>CYCLE71</code>; gli altri cicli e i sottoprogrammi non sono ancora simulati.</li>' : ''}
    <li>${adapter.id === 'mill' ? 'Vista 3D: trascina con il tasto sinistro per ruotare, con il destro per spostare, rotella per lo zoom.' : 'Vista: rotella per lo zoom, trascina per spostare.'}</li>`;
  return `
    <ol class="help-steps">
      <li>Scrivi il programma o scegli un esempio. Gli errori di scrittura compaiono subito in rosso.</li>
      <li>Imposta il grezzo sopra la simulazione, oppure scrivi nel programma la riga <code>${siemens ? `; ${stock}` : stock}</code>.</li>
      <li>Premi <b>Avvia</b>, oppure <b>Blocco singolo</b> per andare una riga alla volta.</li>
      <li>Se compare un allarme leggi il messaggio e il suggerimento, correggi la riga evidenziata e premi <b>Reset</b>.</li>
    </ol>
    <ul class="help-notes">
      ${machine}
      <li>Tratteggio rosso: rapido G00. Linea blu: lavorazione. Doppio clic sulla vista: la adatta al pezzo.</li>
      <li>I programmi restano sul tuo computer: usa <b>Salva</b> per scaricarli e <b>Apri</b> per ricaricarli.</li>
    </ul>
    <h3>Scorciatoie da tastiera</h3>
    <table class="help-table"><tbody>
      ${SHORTCUTS.map(([keys, what]) => `<tr><th scope="row"><kbd>${keys}</kbd></th><td>${what}</td></tr>`).join('')}
    </tbody></table>`;
}

function codes(adapter) {
  const { codes } = adapter;
  const rows = (table, letter) => Object.entries(table)
    .map(([value, def]) => `<tr${def.status === 'planned' ? ' class="is-planned"' : ''}>
      <th scope="row"><code>${letter}${String(value).padStart(2, '0')}</code></th>
      <td>${escapeHtml(def.desc)}${def.status === 'planned' ? ' <span class="muted">(non ancora nel simulatore)</span>' : ''}</td></tr>`)
    .join('');
  const addresses = Object.entries(codes.addresses)
    .map(([letter, desc]) => `<tr><th scope="row"><code>${letter}</code></th><td>${escapeHtml(desc)}</td></tr>`)
    .join('');
  return `
    <p class="muted">${escapeHtml(codes.name)}</p>
    <div class="help-columns">
      <section><h3>Codici G</h3><table class="help-table"><tbody>${rows(codes.g, 'G')}</tbody></table></section>
      <section><h3>Codici M</h3><table class="help-table"><tbody>${rows(codes.m, 'M')}</tbody></table>
        <h3>Lettere</h3><table class="help-table"><tbody>${addresses}</tbody></table></section>
    </div>`;
}

function alarms() {
  const groups = {};
  for (const [code, alarm] of Object.entries(ALARMS)) (groups[alarm.category] ??= []).push([code, alarm]);
  // I {segnaposto} dei messaggi diventano "…": il valore vero compare nell'allarme durante l'esecuzione
  const clean = (text) => escapeHtml(text.replace(/\{\w+\}/g, '…'));
  return Object.entries(groups).map(([category, list]) => `
    <h3>${CATEGORY[category] ?? category}</h3>
    <table class="help-table help-alarms"><tbody>
      ${list.map(([code, alarm]) => `<tr><th scope="row"><code>${code}</code></th>
        <td><b>${clean(alarm.message)}</b><br><span class="muted">${clean(alarm.hint)}</span></td></tr>`).join('')}
    </tbody></table>`).join('');
}
