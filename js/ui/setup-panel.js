import { normalizeSetup } from '../machines/lathe/machine.js';
import { escapeHtml } from './alarm-panel.js';

// Campi del grezzo (Ø, sporgenza, sovrametallo) ed elenco degli utensili in torretta.

export function createSetupPanel({ inputs, toolList, tools, onChange }) {
  const fields = Object.entries(inputs);

  for (const [, input] of fields) {
    input.addEventListener('change', () => {
      const setup = read();
      write(setup);
      onChange(setup);
    });
  }

  toolList.innerHTML = Object.entries(tools)
    .map(([id, tool]) => `<li><span class="tool-id">T${String(id).padStart(2, '0')}</span> ${escapeHtml(tool.name)}</li>`)
    .join('');

  function read() {
    const values = {};
    for (const [key, input] of fields) values[key] = input.value;
    return normalizeSetup(values);
  }

  function write(setup) {
    for (const [key, input] of fields) input.value = String(setup[key]);
  }

  return {
    read,
    write,
    setDisabled(disabled) {
      for (const [, input] of fields) input.disabled = disabled;
    }
  };
}
