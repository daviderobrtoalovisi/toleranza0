import { ALARMS } from '../alarms/catalog.js';
import { escapeHtml } from './alarm-panel.js';

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

export function createHelpDialog(dialog, { getAdapter }) {
  let tab = 'uso';

  dialog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (button) {
      tab = button.dataset.tab;
      render();
    }
    if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
  });

  function render() {
    const adapter = getAdapter();
    const tabs = [['uso', 'Come si usa'], ['codici', 'Codici'], ['allarmi', 'Allarmi']];
    dialog.innerHTML = `
      <div class="help">
        <header class="help-head">
          <h2>Guida</h2>
          <nav class="help-tabs" role="tablist">
            ${tabs.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`).join('')}
          </nav>
          <button type="button" class="help-close" data-close aria-label="Chiudi">✕</button>
        </header>
        <div class="help-body">${tab === 'codici' ? codes(adapter) : tab === 'allarmi' ? alarms() : usage(adapter)}</div>
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

function usage(adapter) {
  const machine = adapter.id === 'mill'
    ? `<li><b>Fresa:</b> Z0 è la faccia superiore finita. Si monta l'utensile con <code>T1 M06</code> e poi, prima di muovere Z, si richiama la sua lunghezza con <code>G43 H1</code>.</li>
       <li>Vista 3D: trascina con il tasto sinistro per ruotare, con il destro per spostare, rotella per lo zoom.</li>`
    : `<li><b>Tornio:</b> X è in diametro, Z0 è la faccia finita del pezzo. L'utensile si chiama con <code>T0101</code> (utensile 01, correttore 01).</li>
       <li>Vista: rotella per lo zoom, trascina per spostare.</li>`;
  return `
    <ol class="help-steps">
      <li>Scrivi il programma o scegli un esempio. Gli errori di scrittura compaiono subito in rosso.</li>
      <li>Imposta il grezzo sopra la simulazione, oppure scrivi nel programma la riga <code>${adapter.id === 'mill' ? '(GREZZO X100 Y80 Z30)' : '(GREZZO D50 L80)'}</code>.</li>
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
