import { escapeHtml } from './alarm-panel.js';
import { pad } from '../parser/validate-block.js';

// Mostra il blocco in esecuzione parola per parola, con il significato di ciascun indirizzo.

export function createBlockPanel(root) {
  return {
    show(block, machine) {
      if (!block) {
        root.innerHTML = '<p class="muted">Premi Avvia o Blocco singolo per eseguire il programma.</p>';
        return;
      }
      const rows = block.words.map((word) => {
        const label = word.letter === 'G' || word.letter === 'M' ? `${word.letter}${pad(word.value)}` : labelOf(word);
        return `<li><span class="word">${escapeHtml(label)}</span><span class="word-desc">${escapeHtml(describe(word, machine))}</span></li>`;
      }).join('');
      const comment = block.comment ? `<p class="block-comment">(${escapeHtml(block.comment)})</p>` : '';
      root.innerHTML = `<p class="block-source">${escapeHtml(block.source.trim())}</p><ul class="word-list">${rows}</ul>${comment}`;
    }
  };
}

// Parola come l'ha scritta lo studente: X20, e in Siemens CR=5, X=IC(2), DIAMON, CYCLE81(...)
function labelOf(word) {
  if (word.mode) return `${word.letter}=${word.mode}(${word.raw})`;
  if (word.call || word.value === null) return `${word.letter}${word.raw}`;
  return word.letter.length > 1 ? `${word.letter}=${word.raw}` : `${word.letter}${word.raw}`;
}

function describe(word, machine) {
  if (word.letter === 'G') return machine.g[word.value]?.desc ?? 'Codice G sconosciuto';
  if (word.letter === 'M') return machine.m[word.value]?.desc ?? 'Codice M sconosciuto';
  return machine.addresses[word.letter] ?? 'Indirizzo sconosciuto';
}
