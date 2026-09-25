// Presentazione del progetto: schermata di apertura con scuola, autori e
// codice QR per aprire il simulatore sul proprio telefono, piu' il riquadro
// con il QR sempre visibile in basso a destra (utile quando si proietta).

// Da aggiornare quando cambiano gli autori del lavoro:
// per ogni ruolo, le persone che lo ricoprono
const CREDITS = [
  { role: 'Mechanical Technicians', names: ['Davide Roberto Alovisi', 'Vito Ginosa'] },
  { role: 'Administrative Assistant', names: ['Carmen Bonafede'] },
  { role: 'IT Technician', names: ['Antonio Vivenzio'] },
  { role: 'Systems Administrator & Graphic Designer', names: ['Giovanni Zingarello'] }
];

const SITE_URL = 'https://daviderobrtoalovisi.github.io/toleranza0/';
const SITE_LABEL = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
const SCHOOL = 'IIS Giulio Natta';

// L'utente puo' chiedere di non rivedere la schermata all'avvio
const SKIP_KEY = 'toleranza0.skipIntro';
const HIDE_BADGE_KEY = 'toleranza0.hideQr';

export function createProjectInfo(dialog, { version = '' } = {}) {
  if (!dialog) return null;

  dialog.innerHTML = `
    <div class="intro">
      <div class="intro-main">
        <p class="intro-school">
          <img class="intro-logo" src="assets/logo-natta.png" alt="Logo dell'IIS Giulio Natta">
          <span>${SCHOOL}</span>
        </p>
        <h2 class="intro-title" aria-label="Toleranza0">TOL<span class="mark-exp">2</span>ERANZA<span class="mark-zero">0</span></h2>
        <p class="intro-claim">Simulatore CNC per tornio e fresa</p>
        <p class="intro-text">
          Dai un ordine alla macchina e guardala eseguire: il pezzo di metallo nasce
          sotto i tuoi occhi, passata dopo passata.
        </p>
        <p class="intro-text">
          Se qualcosa non torna, te lo dice in parole chiare.
          Sbagliare qui è gratis — <b class="intro-try">prova</b>.
        </p>
        <p class="intro-credits-title">Created by</p>
        <ul class="intro-credits">${creditsList(CREDITS)}</ul>
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

// Una riga per ruolo, con i nomi delle persone in evidenza
function creditsList(credits) {
  return credits
    .map(({ role, names }) => {
      const people = names.map((name) => `<b>${name}</b>`).join(' and ');
      return `<li><span class="intro-role">${role}</span> ${people}</li>`;
    })
    .join('');
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
