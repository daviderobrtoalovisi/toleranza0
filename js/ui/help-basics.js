// La guida "in parole semplici": per chi apre il simulatore senza sapere
// che cos'e' un programma CNC. Deve stare in una schermata sola e farsi
// leggere: poche righe, tre passi, quattro parole. Il resto e' nelle altre schede.

export function basics(adapter) {
  const mill = adapter.id === 'mill';
  const machine = mill
    ? 'La fresa tiene fermo il pezzo e ci scava dentro con un utensile che gira.'
    : 'Il tornio fa girare il pezzo e gli appoggia contro un utensile che taglia.';

  return `
    <p class="help-lead">
      Qui dentro c'è una macchina che lavora il metallo. Tu le dici che cosa fare,
      lei lo fa davanti ai tuoi occhi. <b>Sbagliare non costa nulla.</b>
    </p>

    <h3>Prova subito</h3>
    <ol class="help-cards">
      <li><b>Scegli un esempio</b> dal menu <i>Esempi…</i> in alto: il programma è già scritto.</li>
      <li><b>Premi Avvia</b> e guarda il pezzo prendere forma.</li>
      <li><b>Cambia un numero</b> e rilancia. È così che si capisce.</li>
    </ol>

    <h3>Che cosa guardi</h3>
    <ul class="help-notes">
      <li><b>Programma</b> — le istruzioni, una per riga. Quella in corso resta illuminata.</li>
      <li><b>Simulazione</b> — il pezzo mentre viene lavorato. ${machine}</li>
      <li><b>Blocco corrente</b> — la riga di adesso, spiegata parola per parola.</li>
      <li><b>Allarmi</b> — se qualcosa non va: che cosa, e in quale riga.</li>
    </ul>

    <h3>Due colori da riconoscere</h3>
    <p class="help-legend">
      <span class="help-chip help-chip-rapid">rosso tratteggiato</span> si sposta a vuoto
      <span class="help-chip help-chip-feed">azzurro pieno</span> sta tagliando
    </p>

    <h3>Quattro parole</h3>
    <dl class="help-glossary">
      <dt>Grezzo</dt><dd>Il metallo di partenza, prima della lavorazione.</dd>
      <dt>Utensile</dt><dd>La parte tagliente che porta via il materiale.</dd>
      <dt>Avanzamento</dt><dd>Quanto in fretta l'utensile avanza mentre taglia.</dd>
      <dt>Allarme</dt><dd>Non è un guasto: è la macchina che ti dice dove hai sbagliato.</dd>
    </dl>

    <p class="help-lead help-lead-end">
      Tutto qui. Quando queste parole ti saranno familiari, le altre schede
      qui sopra ti aspettano con il linguaggio vero.
    </p>`;
}
