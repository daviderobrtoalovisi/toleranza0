import { test, assertEqual, assert } from './runner.js';
import { parseLine } from '../js/parser/parse-program.js';
import { checkProgram } from '../js/parser/check-program.js';
import { LATHE } from '../js/machines/lathe/codes.js';
import { ALARMS } from '../js/alarms/catalog.js';

const alarmOf = (source) => checkProgram(source, LATHE).alarms[0]?.code ?? null;
const words = (source) => parseLine(source, 1).words.map((w) => [w.letter, w.value]);

// Lettura corretta
test('legge un blocco completo', () => {
  assertEqual(words('N10 G01 X20.5 Z-10 F0.2'), [['N', 10], ['G', 1], ['X', 20.5], ['Z', -10], ['F', 0.2]]);
});
test('accetta indirizzi attaccati senza spazi', () => {
  assertEqual(words('G1X20Z-5'), [['G', 1], ['X', 20], ['Z', -5]]);
});
test('accetta lettere minuscole', () => {
  assertEqual(words('g0 x10'), [['G', 0], ['X', 10]]);
});
test('accetta numeri con punto finale o iniziale', () => {
  assertEqual(words('X10. Z-.5'), [['X', 10], ['Z', -0.5]]);
});
test('separa i commenti tra parentesi', () => {
  const block = parseLine('G00 X10 (AVVICINAMENTO) Z2', 1);
  assertEqual(block.comment, 'AVVICINAMENTO');
  assertEqual(block.words.length, 3);
});
test('dopo ; il resto della riga è commento', () => {
  const block = parseLine('G00 X10; nota', 1);
  assertEqual(block.words.length, 2);
  assertEqual(block.comment, 'nota');
});
test('riconosce il salto blocco /', () => {
  assert(parseLine('/N10 G00 X10', 1).blockDelete);
});
test('la riga % non produce parole né allarmi', () => {
  const block = parseLine('%', 1);
  assertEqual(block.words.length, 0);
  assertEqual(block.alarm, null);
});
test('più codici G di gruppi diversi nello stesso blocco', () => {
  assertEqual(alarmOf('G21 G40 G99'), null);
});
test('gli esempi del tornio non hanno errori', () => {
  const program = '%\nO0001\nN10 G21 G40 G99\nN20 G50 S2000\nN30 T0101\nN40 G96 S180 M03\nN50 G00 X52 Z2 M08\nN60 G02 X30 Z-20 R5\nN70 M30\n%';
  assertEqual(checkProgram(program, LATHE).alarms.length, 0);
});

// Allarmi di sintassi
test('1001 carattere non valido', () => assertEqual(alarmOf('G00 X10 #'), 1001));
test('1002 indirizzo senza valore', () => assertEqual(alarmOf('G01 Z-30 F'), 1002));
test('1003 numero con due punti', () => assertEqual(alarmOf('Z-1.2.5'), 1003));
test('1003 segno in mezzo al numero', () => assertEqual(alarmOf('X1-2'), 1003));
test('1004 lettera non usata sul tornio', () => assertEqual(alarmOf('G00 Y10'), 1004));
test('1005 codice G sconosciuto', () => assertEqual(alarmOf('G13 X40'), 1005));
test('1006 codice M sconosciuto', () => assertEqual(alarmOf('M33'), 1006));
test('1007 commento non chiuso', () => assertEqual(alarmOf('G01 Z-20 (FINE'), 1007));
test('1008 indirizzo ripetuto', () => assertEqual(alarmOf('G01 X46 X44'), 1008));
test('1009 due G dello stesso gruppo', () => assertEqual(alarmOf('G00 G01 Z2'), 1009));
test('1010 decimale in M', () => assertEqual(alarmOf('M3.5'), 1010));
test('1011 avanzamento negativo', () => assertEqual(alarmOf('G01 X10 F-0.2'), 1011));
test('1012 N non all\'inizio', () => assertEqual(alarmOf('X50 N85'), 1012));
test('1013 ciclo non ancora supportato', () => assertEqual(alarmOf('G72 W2 R1'), 1013));

test('l\'allarme riporta la riga giusta', () => {
  const { alarms } = checkProgram('G00 X10\n\nG13', LATHE);
  assertEqual(alarms.map((a) => [a.code, a.line]), [[1005, 3]]);
});
test('un solo allarme per riga', () => {
  assertEqual(checkProgram('G13 M33 #', LATHE).alarms.length, 1);
});
test('ogni allarme del catalogo ha messaggio e suggerimento', () => {
  for (const [code, alarm] of Object.entries(ALARMS)) {
    assert(alarm.message && alarm.hint && alarm.category, `allarme ${code} incompleto`);
  }
});
