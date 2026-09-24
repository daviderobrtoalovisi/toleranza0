import { OFFSET_LIMIT } from '../machines/lathe/machine.js';
import { escapeHtml } from './alarm-panel.js';

// Tabella degli utensili della macchina. Se la macchina ha i correttori (tornio), mostra anche
// l'usura modificabile (registro uguale al numero dell'utensile).

export function createToolPanel(root, { onOffsetsChange }) {
  let normalize = null;

  root.addEventListener('change', (event) => {
    if (!event.target.matches('input[data-offset]') || !normalize) return;
    const values = read();
    write(values);
    onOffsetsChange(values);
  });

  const inputs = () => [...root.querySelectorAll('input[data-offset]')];

  function read() {
    const values = {};
    for (const input of inputs()) {
      values[input.dataset.offset] ??= {};
      values[input.dataset.offset][input.dataset.axis] = input.value;
    }
    return normalize(values);
  }

  function write(values) {
    for (const input of inputs()) input.value = values[input.dataset.offset][input.dataset.axis].toFixed(2);
  }

  return {
    // offsets: null se la macchina non ha correttori modificabili
    build(adapter, offsets) {
      normalize = adapter.offsets?.normalize ?? null;
      const pad = (id) => String(id).padStart(2, '0');
      const withOffsets = Boolean(normalize && offsets);
      const offsetCells = (id, axis) => `<td><input type="number" step="0.01" min="${-OFFSET_LIMIT}" max="${OFFSET_LIMIT}"
        data-offset="${id}" data-axis="${axis}" aria-label="Usura ${axis.toUpperCase()} correttore ${pad(id)}"></td>`;
      const rows = Object.entries(adapter.tools).map(([id, tool]) => `
        <tr>
          <th scope="row"><span class="tool-id">T${pad(id)}</span></th>
          <td>${escapeHtml(tool.name)}<br><span class="muted">${escapeHtml(adapter.toolNote(tool))}</span></td>
          ${withOffsets ? offsetCells(id, 'x') + offsetCells(id, 'z') : ''}
        </tr>`).join('');
      const head = withOffsets ? '<th>Usura X</th><th>Usura Z</th>' : '';
      const note = withOffsets
        ? 'Usura in mm, X in diametro. Pezzo Ø42,10 invece di 42,00: usura X −0.1. Correttore: ultime due cifre di T (T0101).'
        : 'Utensile: T1 M06. Correzione di lunghezza: G43 H1 prima di muovere Z.';
      root.innerHTML = `
        <table class="tool-table">
          <thead><tr><th>T</th><th>Utensile</th>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="muted tool-note">${note}</p>`;
      if (withOffsets) write(offsets);
    },
    setDisabled(disabled) {
      for (const input of inputs()) input.disabled = disabled;
    }
  };
}
