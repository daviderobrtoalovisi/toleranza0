import { test, assertEqual } from './runner.js';
import { checkProgram } from '../js/parser/check-program.js';
import { LATHE } from '../js/machines/lathe/codes.js';

// I programmi di esempio vengono caricati prima dei test (vedi tests/index.html)
export function registerExampleTests(examples) {
  for (const { file, text } of examples) {
    const { alarms } = checkProgram(text, LATHE);
    if (file.startsWith('esercizio-trova-errori')) {
      test(`${file}: contiene esattamente 10 errori`, () => {
        assertEqual(alarms.map((a) => a.code), [1010, 1008, 1002, 1012, 1009, 1005, 1002, 1007, 1003, 1006]);
      });
    } else {
      test(`${file}: nessun errore di sintassi`, () => {
        assertEqual(alarms.map((a) => `${a.code} riga ${a.line}`), []);
      });
    }
  }
}
