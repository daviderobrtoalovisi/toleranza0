// Presentazione del progetto: schermata di apertura con scuola, autori e
// codice QR per aprire il simulatore sul proprio telefono, piu' il riquadro
// con il QR sempre visibile in basso a destra (utile quando si proietta).

// Da aggiornare quando cambiano gli autori del lavoro
const AUTHORS = [
  'Davide Roberto Alovisi',
  'Carmen Bonafede',
  'Vito Ginosa',
  'Antonio Vivenzio',
  'Giovanni Zingarello'
];

const SITE_URL = 'https://daviderobrtoalovisi.github.io/toleranza0/';
const SITE_LABEL = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
const SCHOOL = 'IIS Giulio Natta — Rivoli';

// L'utente puo' chiedere di non rivedere la schermata all'avvio
const SKIP_KEY = 'toleranza0.skipIntro';
const HIDE_BADGE_KEY = 'toleranza0.hideQr';

export function createProjectInfo(dialog, { version = '' } = {}) {
  if (!dialog) return null;

  dialog.innerHTML = `
    <div class="intro">
      <div class="intro-main">
        <p class="intro-school">
          <img class="intro-logo" src="assets/logo-natta.jpg" alt="Logo dell'IIS Giulio Natta">
          <span>${SCHOOL}</span>
        </p>
        <h2 class="intro-title">Toleranza<span class="intro-zero">0</span></h2>
        <p class="intro-claim">Simulatore CNC per tornio e fresa</p>
        <p class="intro-text">
          Scrivi un programma ISO e guardalo lavorare il pezzo: la riga in esecuzione
          resta evidenziata e gli allarmi spiegano in italiano che cosa non va.
          Nessuna macchina occupata, nessun pezzo sprecato.
        </p>
        <p class="intro-authors">A cura di ${formatAuthors(AUTHORS)}</p>
        <div class="intro-actions">
          <button type="button" id="intro-enter" class="intro-enter">Entra nel simulatore</button>
          <label class="intro-skip">
            <input type="checkbox" id="intro-skip"> non mostrare all'avvio
          </label>
        </div>
      </div>

      <aside class="intro-qr">
        <img src="assets/qr-sito.svg" alt="Codice QR che apre il simulatore">
        <p class="intro-qr-title">Inquadra e provalo tu</p>
        <p class="intro-qr-url">${SITE_LABEL}</p>
      </aside>

      <p class="intro-version">${version}</p>
    </div>
  `;

  const enter = dialog.querySelector('#intro-enter');
  const skip = dialog.querySelector('#intro-skip');

  enter.addEventListener('click', () => dialog.close());
  skip.addEventListener('change', () => remember(SKIP_KEY, skip.checked));

  // Un clic fuori dal riquadro chiude, come per la guida
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  skip.checked = recall(SKIP_KEY);

  return {
    open() {
      if (!dialog.open) dialog.showModal();
    },
    openAtStart() {
      if (!recall(SKIP_KEY)) this.open();
    }
  };
}

// Riquadro con il QR sempre in vista: chi guarda la proiezione lo inquadra
// e si apre il simulatore sul proprio telefono. Si puo' chiudere: in
// laboratorio copre un angolo del pannello degli allarmi.
export function createQrBadge(onOpen) {
  const badge = document.createElement('div');
  badge.className = 'qr-badge';
  badge.hidden = recall(HIDE_BADGE_KEY);
  badge.innerHTML = `
    <button type="button" class="qr-badge-open" title="Apri la presentazione del progetto">
      <img src="assets/qr-sito.svg" alt="Codice QR che apre il simulatore">
      <span>Provalo sul<br>tuo telefono</span>
    </button>
    <button type="button" class="qr-badge-close" aria-label="Nascondi il codice QR">&times;</button>
  `;

  badge.querySelector('.qr-badge-open').addEventListener('click', () => onOpen());
  badge.querySelector('.qr-badge-close').addEventListener('click', () => {
    badge.hidden = true;
    remember(HIDE_BADGE_KEY, true);
  });

  // Sta nell'intestazione: in proiezione e' in alto a destra e non copre i pannelli
  (document.querySelector('.app-header') || document.body).appendChild(badge);

  return {
    show() {
      badge.hidden = false;
      remember(HIDE_BADGE_KEY, false);
    }
  };
}

// "Tizio, Caio & Sempronio": l'ultimo nome unito con la e commerciale
function formatAuthors(names) {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

// localStorage puo' essere pieno o bloccato: il sito deve funzionare lo stesso
function remember(key, value) {
  try {
    if (value) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch (error) {
    /* pazienza: la scelta vale solo per questa visita */
  }
}

function recall(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch (error) {
    return false;
  }
}
