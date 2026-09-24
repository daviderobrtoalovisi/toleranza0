import { normalizeSetup } from '../machines/lathe/machine.js';

// Campi del grezzo: Ø, sporgenza dal mandrino, sovrametallo sulla faccia.

export function createSetupPanel({ inputs, onChange }) {
  const fields = Object.entries(inputs);

  for (const [, input] of fields) {
    input.addEventListener('change', () => {
      const setup = read();
      write(setup);
      onChange(setup);
    });
  }

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
