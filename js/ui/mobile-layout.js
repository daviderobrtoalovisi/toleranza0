// Adatta l'interfaccia agli schermi piccoli: un pannello alla volta, scelto
// con le schede sopra la pagina, e i comandi di esecuzione in una barra in
// basso, sempre raggiungibili col pollice. Sugli schermi larghi non cambia nulla.

const PHONE = '(max-width: 700px)';

const TABS = [
  { id: 'editor', label: 'Programma' },
  { id: 'sim', label: 'Simulazione' },
  { id: 'block', label: 'Blocco' },
  { id: 'alarms', label: 'Allarmi' }
];

// Comandi che sul telefono si spostano nella barra in basso
const RUN_BUTTONS = ['#btn-start', '#btn-pause', '#btn-step', '#btn-reset'];

export function createMobileLayout() {
  const layout = document.querySelector('.layout');
  const statusBar = document.querySelector('.status-bar');
  if (!layout || !statusBar) return null;

  const tabs = [];
  const tabBar = document.createElement('nav');
  tabBar.className = 'tab-bar';
  tabBar.setAttribute('role', 'tablist');
  tabBar.setAttribute('aria-label', 'Sezioni');

  for (const tab of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    button.dataset.tab = tab.id;
    button.textContent = tab.label;
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => showTab(tab.id));
    tabBar.appendChild(button);
    tabs.push(button);
  }

  layout.before(tabBar);

  const runBar = document.createElement('div');
  runBar.className = 'run-bar';
  statusBar.before(runBar);

  // Posizione originale dei pulsanti, per rimetterli nella barra comandi
  // quando si torna su uno schermo largo
  const homes = RUN_BUTTONS
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)
    .map((element) => ({ element, parent: element.parentNode, next: element.nextSibling }));

  const phone = window.matchMedia(PHONE);
  phone.addEventListener('change', applyLayout);
  applyLayout();

  showTab('editor');

  // Se scatta un allarme mentre si guarda un'altra scheda, la scheda Allarmi
  // si segnala da sola: il pannello puo' essere fuori vista.
  const alarmTab = tabs.find((button) => button.dataset.tab === 'alarms');
  const stateWatcher = new MutationObserver(() => {
    const inAlarm = document.body.dataset.state === 'alarm';
    alarmTab.classList.toggle('has-alarm', inAlarm);
  });
  stateWatcher.observe(document.body, { attributes: true, attributeFilter: ['data-state'] });

  function applyLayout() {
    for (const home of homes) {
      if (phone.matches) runBar.appendChild(home.element);
      else home.parent.insertBefore(home.element, home.next);
    }
  }

  function showTab(id) {
    document.body.dataset.tab = id;
    for (const button of tabs) {
      const selected = button.dataset.tab === id;
      button.setAttribute('aria-selected', String(selected));
      if (selected && id === 'alarms') button.classList.remove('has-alarm');
    }
    // I canvas si ridimensionano da soli: osservano il proprio contenitore
  }

  return { showTab };
}
