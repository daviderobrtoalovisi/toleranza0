import { test, assertEqual } from './runner.js';
import { VERSION } from '../js/version.js';

// Il foglio di stile è richiamato con ?v=<versione> per non farlo restare in cache
// dopo un rilascio. Il numero è scritto in index.html, quindi va tenuto allineato
// a js/version.js: se qualcuno cambia la versione e si dimentica del link, qui si vede.

export function registerVersionTests(indexHtml) {
  test('index.html: il foglio di stile porta il numero di versione', () => {
    const found = /href="css\/style\.css\?v=([^"]+)"/.exec(indexHtml);
    assertEqual(found ? found[1] : '(nessun ?v= nel link)', VERSION);
  });
}
