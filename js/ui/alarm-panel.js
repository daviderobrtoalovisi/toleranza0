// Pannello allarmi: elenco degli errori di sintassi e allarme attivo durante l'esecuzione.

export function createAlarmPanel(root, { onSelectLine }) {
  root.addEventListener('click', (event) => {
    const item = event.target.closest('[data-line]');
    if (item) onSelectLine(Number(item.dataset.line));
  });

  return {
    show(alarms, { active = null } = {}) {
      if (!alarms.length && !active) {
        root.innerHTML = '<p class="alarm-ok">Nessun errore di sintassi.</p>';
        return;
      }
      const items = (active ? [active] : alarms).map((alarm) => `
        <li>
          <button type="button" class="alarm-item${active ? ' is-active' : ''}" data-line="${alarm.line}">
            <span class="alarm-code">ALL. ${alarm.code}</span>
            <span class="alarm-line">riga ${alarm.line}</span>
            <span class="alarm-message">${escapeHtml(alarm.message)}</span>
            <span class="alarm-hint">${escapeHtml(alarm.hint)}</span>
          </button>
        </li>`).join('');
      const title = active
        ? 'Allarme: esecuzione fermata'
        : `${alarms.length} ${alarms.length === 1 ? 'errore' : 'errori'} di sintassi`;
      root.innerHTML = `<p class="alarm-title">${title}</p><ul class="alarm-list">${items}</ul>`;
    }
  };
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
