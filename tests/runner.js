// Mini runner di test nel browser, senza dipendenze.
// Risultato anche in window.testResults, utile per controlli automatici.

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assertEqual(actual, expected, label = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ': ' : ''}atteso ${e}, ottenuto ${a}`);
}

export function assert(condition, message = 'condizione falsa') {
  if (!condition) throw new Error(message);
}

export function run(root) {
  let passed = 0;
  const failed = [];
  const rows = [];
  for (const { name, fn } of tests) {
    try {
      fn();
      passed++;
      rows.push(`<li class="ok">✔ ${name}</li>`);
    } catch (error) {
      failed.push({ name, error: error.message });
      rows.push(`<li class="fail">✘ ${name}<br><code>${error.message}</code></li>`);
    }
  }
  const summary = failed.length ? `${failed.length} test falliti su ${tests.length}` : `Tutti i ${tests.length} test superati`;
  root.innerHTML = `<h1 class="${failed.length ? 'fail' : 'ok'}">${summary}</h1><ul>${rows.join('')}</ul>`;
  document.title = `${failed.length ? 'FALLITI' : 'OK'} — Test Toleranza0`;
  window.testResults = { passed, failed, total: tests.length };
}
