import { escapeHtml } from './alarm-panel.js';

// Campi del grezzo, costruiti dall'elenco dell'adattatore della macchina:
// { key, label, min, max, step } per i numeri, { key, label, options: [[valore, testo]] } per le scelte.

export function createSetupPanel(root, { onChange }) {
  let fields = [];
  let normalize = (s) => s;

  root.addEventListener('change', () => {
    const setup = read();
    write(setup);
    onChange(setup);
  });

  function read() {
    const values = {};
    for (const field of fields) values[field.key] = root.querySelector(`[data-key="${field.key}"]`).value;
    return normalize(values);
  }

  function write(setup) {
    for (const field of fields) root.querySelector(`[data-key="${field.key}"]`).value = String(setup[field.key]);
  }

  return {
    build(newFields, newNormalize, setup) {
      fields = newFields;
      normalize = newNormalize;
      root.innerHTML = fields.map((field) => {
        const control = field.options
          ? `<select data-key="${field.key}">${field.options.map(([v, t]) => `<option value="${v}">${escapeHtml(t)}</option>`).join('')}</select>`
          : `<input type="number" data-key="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}">`;
        return `<label>${escapeHtml(field.label)} ${control}</label>`;
      }).join('') + '<span class="unit">mm</span>';
      write(setup);
    },
    read,
    write,
    setDisabled(disabled) {
      for (const control of root.querySelectorAll('input, select')) control.disabled = disabled;
    }
  };
}
