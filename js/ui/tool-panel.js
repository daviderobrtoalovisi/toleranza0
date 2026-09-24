import { normalizeOffsets, OFFSET_LIMIT } from '../machines/lathe/machine.js';
import { escapeHtml } from './alarm-panel.js';

// Tabella utensili in torretta con l'usura dei correttori (registro uguale al numero dell'utensile).

export function createToolPanel(root, { tools, offsets, onChange }) {
  const pad = (id) => String(id).padStart(2, '0');
  const rows = Object.entries(tools).map(([id, tool]) => `
    <tr>
      <th scope="row"><span class="tool-id">T${pad(id)}</span></th>
      <td>${escapeHtml(tool.name)}<br><span class="muted">passata max ${tool.maxDepth} mm</span></td>
      <td><input type="number" step="0.01" min="${-OFFSET_LIMIT}" max="${OFFSET_LIMIT}" data-offset="${id}" data-axis="x"
        aria-label="Usura X correttore ${pad(id)}"></td>
      <td><input type="number" step="0.01" min="${-OFFSET_LIMIT}" max="${OFFSET_LIMIT}" data-offset="${id}" data-axis="z"
        aria-label="Usura Z correttore ${pad(id)}"></td>
    </tr>`).join('');

  root.innerHTML = `
    <table class="tool-table">
      <thead><tr><th>T</th><th>Utensile</th><th>Usura X</th><th>Usura Z</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted tool-note">Usura in mm, X in diametro. Pezzo Ø42,10 invece di 42,00: usura X −0.1. Correttore: ultime due cifre di T (T0101).</p>`;

  const inputs = [...root.querySelectorAll('input[data-offset]')];

  function read() {
    const values = {};
    for (const input of inputs) {
      values[input.dataset.offset] ??= {};
      values[input.dataset.offset][input.dataset.axis] = input.value;
    }
    return normalizeOffsets(values);
  }

  function write(values) {
    for (const input of inputs) input.value = values[input.dataset.offset][input.dataset.axis].toFixed(2);
  }

  for (const input of inputs) {
    input.addEventListener('change', () => {
      const values = read();
      write(values);
      onChange(values);
    });
  }
  write(offsets);

  return {
    setDisabled(disabled) {
      for (const input of inputs) input.disabled = disabled;
    }
  };
}
