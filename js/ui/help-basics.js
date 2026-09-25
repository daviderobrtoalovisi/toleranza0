// La guida "in parole semplici": per chi apre il simulatore senza sapere
// che cos'e' un programma CNC (studenti al primo giorno, genitori, colleghi
// di altre materie). Niente sigle senza spiegazione, niente elenchi di codici:
// quelli stanno nelle altre schede della guida.

export function basics(adapter) {
  const mill = adapter.id === 'mill';
  const machine = mill ? 'la fresa' : 'il tornio';
  const whatItDoes = mill
    ? 'La fresa tiene fermo il pezzo e gira un utensile tagliente che scende dall\'alto e scava: serve per fare piani, cave, tasche e fori.'
    : 'Il tornio fa girare il pezzo su se stesso e gli appoggia contro un utensile tagliente: serve per fare pezzi tondi, come alberi, perni e boccole.';

  return `
    <p class="help-lead">
      Questo sito fa finta di essere una macchina utensile: tu scrivi le istruzioni,
      lui ti mostra il pezzo che verrebbe fuori. Sbagliare qui non costa nulla —
      nessuna macchina occupata, nessun pezzo buttato, nessun pericolo.
    </p>

    <h3>Di che cosa stiamo parlando</h3>
    <p>
      In officina le macchine non si guidano a mano: si scrive loro un elenco di istruzioni,
      una per riga, e la macchina le esegue nell'ordine. Quell'elenco è il <b>programma</b>,
      ed è quello che vedi scritto nel riquadro a sinistra. Ogni riga dice una cosa sola:
      «vai in questo punto», «gira il mandrino a questa velocità», «taglia fino a qui».
    </p>
    <p>In questo momento è attiv${mill ? 'a' : 'o'} <b>${machine}</b>. ${whatItDoes}</p>

    <h3>Che cosa vedi sullo schermo</h3>
    <ul class="help-notes">
      <li><b>Programma</b> — le istruzioni, numerate riga per riga. Durante l'esecuzione la riga in corso resta illuminata.</li>
      <li><b>Simulazione</b> — il disegno del pezzo mentre viene lavorato. La parte grigia è il metallo, quella che sparisce è il materiale asportato.</li>
      <li><b>Blocco corrente</b> — la riga che la macchina sta eseguendo, spiegata parola per parola.</li>
      <li><b>Allarmi</b> — se qualcosa non va, qui compare che cosa e in quale riga.</li>
    </ul>

    <h3>Provalo in quattro mosse</h3>
    <ol class="help-steps">
      <li>Apri il menu <b>Esempi…</b> in alto e scegline uno: il programma compare già scritto.</li>
      <li>Premi <b>Avvia</b> e guarda il disegno: l'utensile si muove e il pezzo prende forma.</li>
      <li>Se vuoi capire con calma, premi <b>Blocco singolo</b>: esegue una riga alla volta, e puoi leggere che cosa fa.</li>
      <li>Cambia un numero nel programma e riprova. È così che si impara: qui rompere non si può.</li>
    </ol>

    <h3>I colori del disegno</h3>
    <p>
      Il <b class="help-rapid">tratteggio rosso</b> è uno spostamento veloce a vuoto, quando l'utensile
      non sta tagliando. La <b class="help-feed">linea azzurra</b> è la lavorazione vera, quando taglia il metallo.
      Distinguerli è il primo passo per capire un programma.
    </p>

    <h3>Sei parole che sentirai sempre</h3>
    <dl class="help-glossary">
      <dt>Grezzo</dt><dd>Il pezzo di metallo di partenza, prima che venga lavorato.</dd>
      <dt>Utensile</dt><dd>La parte tagliente che asporta il materiale. Ogni lavorazione ha il suo.</dd>
      <dt>Mandrino</dt><dd>La parte che gira: ${mill ? 'sulla fresa fa girare l\'utensile' : 'sul tornio fa girare il pezzo'}.</dd>
      <dt>Avanzamento</dt><dd>La velocità con cui l'utensile avanza mentre taglia. Troppo veloce e si rovina tutto.</dd>
      <dt>Blocco</dt><dd>Una riga del programma. «Blocco singolo» vuol dire appunto «una riga alla volta».</dd>
      <dt>Allarme</dt><dd>La macchina si ferma e dice che cosa non torna. Non è un guasto: è un avviso, e indica sempre la riga.</dd>
    </dl>

    <h3>Se compare un allarme</h3>
    <p>
      Non è un problema tuo: succede a tutti, ed è il modo in cui la macchina ti insegna.
      Leggi il messaggio nel riquadro <b>Allarmi</b>, guarda la riga indicata, correggila e premi
      <b>Reset</b> per ripartire da capo. Nella scheda <b>Allarmi</b> di questa guida trovi
      l'elenco completo con il significato di ognuno.
    </p>

    <p class="help-lead">
      Quando queste cose ti saranno familiari, passa alle altre schede qui sopra:
      lì c'è il linguaggio vero, con tutti i codici che la macchina capisce.
    </p>`;
}
