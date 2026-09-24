// Editor di testo con numeri di riga, riga in esecuzione evidenziata e righe con errore segnate.
// È una textarea normale con due livelli sincronizzati: la colonna dei numeri e lo strato delle evidenziazioni.

export function createEditor(root, { onChange }) {
  root.innerHTML = `
    <div class="editor-gutter" aria-hidden="true"><div class="editor-gutter-inner"></div></div>
    <div class="editor-code">
      <div class="editor-highlights" aria-hidden="true"></div>
      <textarea class="editor-textarea" wrap="off" spellcheck="false" autocapitalize="characters"
        aria-label="Programma CNC"></textarea>
    </div>`;

  const textarea = root.querySelector('.editor-textarea');
  const gutter = root.querySelector('.editor-gutter-inner');
  const highlights = root.querySelector('.editor-highlights');

  let errorLines = new Set();
  let currentLine = null;
  let currentIsAlarm = false;

  const lineHeight = () => parseFloat(getComputedStyle(textarea).lineHeight);
  const paddingTop = () => parseFloat(getComputedStyle(textarea).paddingTop);

  function lineCount() {
    return textarea.value.split('\n').length;
  }

  function render() {
    const count = lineCount();
    let html = '';
    for (let n = 1; n <= count; n++) {
      const classes = ['gutter-line'];
      if (errorLines.has(n)) classes.push('has-error');
      if (n === currentLine) classes.push('is-current');
      html += `<div class="${classes.join(' ')}">${n}</div>`;
    }
    gutter.innerHTML = html;

    let hl = '';
    const lh = lineHeight();
    const top = paddingTop();
    for (const n of errorLines) {
      if (n !== currentLine) hl += `<div class="hl hl-error" style="top:${top + (n - 1) * lh}px;height:${lh}px"></div>`;
    }
    if (currentLine !== null) {
      const cls = currentIsAlarm ? 'hl hl-alarm' : 'hl hl-current';
      hl += `<div class="${cls}" style="top:${top + (currentLine - 1) * lh}px;height:${lh}px"></div>`;
    }
    highlights.innerHTML = hl;
    syncScroll();
  }

  function syncScroll() {
    gutter.style.transform = `translateY(${-textarea.scrollTop}px)`;
    highlights.style.transform = `translateY(${-textarea.scrollTop}px)`;
  }

  function scrollToLine(n) {
    const lh = lineHeight();
    const y = paddingTop() + (n - 1) * lh;
    const view = textarea.clientHeight;
    if (y < textarea.scrollTop + lh || y > textarea.scrollTop + view - 2 * lh) {
      textarea.scrollTop = Math.max(0, y - view / 3);
    }
    syncScroll();
  }

  textarea.addEventListener('input', () => {
    render();
    onChange(textarea.value);
  });
  textarea.addEventListener('scroll', syncScroll);

  // Tab inserisce due spazi invece di spostare il focus
  textarea.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.shiftKey || textarea.readOnly) return;
    event.preventDefault();
    textarea.setRangeText('  ', textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input'));
  });

  return {
    getValue: () => textarea.value,
    setValue(text) {
      textarea.value = text;
      textarea.scrollTop = 0;
      render();
      onChange(text);
    },
    setErrorLines(lines) {
      errorLines = new Set(lines);
      render();
    },
    setCurrentLine(n, { alarm = false } = {}) {
      currentLine = n;
      currentIsAlarm = alarm;
      render();
      if (n !== null) scrollToLine(n);
    },
    goToLine(n) {
      const lines = textarea.value.split('\n');
      const start = lines.slice(0, n - 1).reduce((sum, l) => sum + l.length + 1, 0);
      textarea.focus();
      textarea.setSelectionRange(start, start + (lines[n - 1] ?? '').length);
      scrollToLine(n);
    },
    setReadOnly(value) {
      textarea.readOnly = value;
      root.classList.toggle('is-readonly', value);
    }
  };
}
