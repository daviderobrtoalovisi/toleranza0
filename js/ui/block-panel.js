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
        const label = word.letter === 'G' || word.letter === 'M' ? `${word.letter}${pad(word.value)}` : `${word.letter}${word.raw}`;
        return `<li><span class="word">${escapeHtml(label)}</span><span class="word-desc">${escapeHtml(describe(word, machine))}</span></li>`;
      }).join('');
      const comment = block.comment ? `<p class="block-comment">(${escapeHtml(block.comment)})</p>` : '';
      root.innerHTML = `<p class="block-source">${escapeHtml(block.source.trim())}</p><ul class="word-list">${rows}</ul>${comment}`;
    }
  };
}

function describe(word, machine) {
  if (word.letter === 'G') return machine.g[word.value]?.desc ?? 'Codice G sconosciuto';
  if (word.letter === 'M') return machine.m[word.value]?.desc ?? 'Codice M sconosciuto';
  return machine.addresses[word.letter] ?? 'Indirizzo sconosciuto';
}
