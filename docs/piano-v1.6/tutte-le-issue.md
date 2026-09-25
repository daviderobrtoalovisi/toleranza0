# Piano della versione 1.6

Elenco dei compiti del gruppo di lavoro per la versione 1.6. Ogni compito ha un file con la descrizione e una lista di passi da spuntare (`- [ ]` da fare, `- [x]` fatto).

Per aggiornare un compito si modifica il suo file; quando è finito si scrive **Stato:** chiusa. I compiti rimandati si spostano in una versione successiva. Niente nomi o dati degli studenti: il repository è pubblico.

| N. | Compito | Pacchetto | Ruoli |
|---|---|---|---|
| 1 | Decidere la licenza del progetto | wp0-coordinamento | amministrativa |
| 2 | Stabilire chi autorizza i rilasci | wp0-coordinamento | amministrativa |
| 3 | Calendario delle riunioni e piano della versione 1.6 | wp0-coordinamento | amministrativa |
| 4 | Modello per raccogliere le segnalazioni di docenti e studenti | wp0-coordinamento | amministrativa |
| 5 | Rilevare i dati del tornio del laboratorio | wp6-dati-macchine | meccanico |
| 6 | Rilevare i dati della fresa del laboratorio | wp6-dati-macchine | meccanico |
| 7 | Richiedere ai costruttori le schede tecniche mancanti | wp6-dati-macchine | amministrativa, meccanico |
| 8 | Tornio: ciclo di filettatura G76 | wp2-tornio | meccanico, informatico |
| 9 | Tornio: cicli semplici G90 e G94 | wp2-tornio | meccanico, informatico |
| 10 | Tornio: ciclo di sgrossatura frontale G72 | wp2-tornio | meccanico, informatico |
| 11 | Siemens: cicli di tasca della fresa | wp4-siemens, wp3-fresa | informatico, meccanico |
| 12 | Vista del tornio vuota durante l'esecuzione | wp5-grafica, wp8-qualita | sistemista, grafico |
| 13 | Leggibilità della simulazione su proiettore e tablet | wp5-grafica | grafico |
| 14 | Preparare i PC del gruppo di lavoro | wp8-qualita | sistemista |
| 15 | Verificare i PC del laboratorio | wp8-qualita | sistemista |
| 16 | Procedura di controllo prima del push e del rilascio | wp8-qualita | sistemista |
| 17 | Rileggere i testi degli allarmi | wp7-didattica | meccanico, amministrativa |
| 18 | Esercizi sui cicli G71/G70 e sulla compensazione del raggio | wp7-didattica | meccanico |

## Pacchetti di lavoro

| Pacchetto | Contenuto |
|---|---|
| `wp0-coordinamento` | Coordinamento, calendario, rilasci, licenza |
| `wp1-parser` | Lettura del testo e tabelle dei codici |
| `wp2-tornio` | Interprete, cicli e simulatore del tornio |
| `wp3-fresa` | Interprete, cicli e simulatore della fresa |
| `wp4-siemens` | Linguaggio Siemens SINUMERIK |
| `wp5-grafica` | Viste 2D/3D, interfaccia, stili |
| `wp6-dati-macchine` | Catalogo e dati reali del laboratorio |
| `wp7-didattica` | Esempi, esercizi, testi degli allarmi |
| `wp8-qualita` | Test, rilascio, PC e infrastruttura |

## Ruoli

- **informatico**: Tecnico informatico
- **meccanico**: Tecnico meccanico
- **sistemista**: Tecnico sistemista
- **grafico**: Tecnico grafico
- **amministrativa**: Assistente amministrativa

---

# 1. Decidere la licenza del progetto

- **Pacchetto di lavoro:** `wp0-coordinamento`
- **Ruoli:** amministrativa
- **Versione:** 1.6
- **Stato:** aperta

Il README dice "Da definire (proposta: MIT per il codice, CC BY-SA per il materiale didattico)".

- [ ] Raccogliere il parere del gruppo e della scuola
- [ ] Aggiungere il file `LICENSE` e aggiornare la sezione Licenza del README

---

# 2. Stabilire chi autorizza i rilasci

- **Pacchetto di lavoro:** `wp0-coordinamento`
- **Ruoli:** amministrativa
- **Versione:** 1.6
- **Stato:** aperta

`CLAUDE.md` dice che la versione cambia solo su richiesta di un docente. Il gruppo è formato da tecnici: va deciso chi autorizza una nuova versione e il tag `vX.Y.Z`.

Proposta: l'assistente amministrativa, sentiti tecnico meccanico e informatico.

- [ ] Decisione del gruppo
- [ ] Aggiornare la sezione Versioni di `CLAUDE.md` (serve l'accordo di tutti)

---

# 3. Calendario delle riunioni e piano della versione 1.6

- **Pacchetto di lavoro:** `wp0-coordinamento`
- **Ruoli:** amministrativa
- **Versione:** 1.6
- **Stato:** aperta

- [ ] Fissare riunioni periodiche e tenere i verbali (senza dati personali: il repository è pubblico)
- [ ] Scegliere con il gruppo le funzioni della 1.6 tra le issue aperte
- [x] Creare la milestone `v1.6` su GitHub

---

# 4. Modello per raccogliere le segnalazioni di docenti e studenti

- **Pacchetto di lavoro:** `wp0-coordinamento`
- **Ruoli:** amministrativa
- **Versione:** 1.6
- **Stato:** aperta

- [ ] Preparare un modello di issue per i bug (versione mostrata nella pagina, browser, programma usato, cosa si vedeva)
- [ ] Spiegare ai docenti come segnalare un problema
- [ ] Controllare che nelle segnalazioni non finiscano nomi o dati degli studenti

---

# 5. Rilevare i dati del tornio del laboratorio

- **Pacchetto di lavoro:** `wp6-dati-macchine`
- **Ruoli:** meccanico
- **Versione:** 1.6
- **Stato:** aperta

Obiettivo della tabella di marcia: dati reali al posto dei valori tipici in `js/machines/lathe/machine.js` e `tools.js`.

- [ ] Corse X/Z, giri massimi, rapido, mandrino (diametro, lunghezza)
- [ ] Utensili in torretta: forma, raggio di punta, passata massima, portautensile
- [ ] Inserire i dati seguendo `docs/configurare-le-macchine.md`; un valore non noto resta `null`, mai inventato
- [ ] Controllare che i test restino verdi

---

# 6. Rilevare i dati della fresa del laboratorio

- **Pacchetto di lavoro:** `wp6-dati-macchine`
- **Ruoli:** meccanico
- **Versione:** 1.6
- **Stato:** aperta

Come per il tornio, in `js/machines/mill/machine.js` e `tools.js`.

- [ ] Corse X/Y/Z, giri, rapido, morsa (misure e posizione)
- [ ] Utensili: diametro, lunghezza, forma del fondo, gambo e portautensile
- [ ] Un valore non noto resta `null`
- [ ] Test verdi

---

# 7. Richiedere ai costruttori le schede tecniche mancanti

- **Pacchetto di lavoro:** `wp6-dati-macchine`
- **Ruoli:** amministrativa, meccanico
- **Versione:** 1.6
- **Stato:** aperta

Nel catalogo `js/machines/catalog-data.js` alcuni valori sono `null` perché non sono nelle fonti ufficiali.

- [ ] Il meccanico elenca i modelli e i dati mancanti
- [ ] L'amministrativa scrive ai costruttori o ai rivenditori e archivia le risposte
- [ ] Il meccanico inserisce i dati con la fonte (`sourceUrl`)

---

# 8. Tornio: ciclo di filettatura G76

- **Pacchetto di lavoro:** `wp2-tornio`
- **Ruoli:** meccanico, informatico
- **Versione:** 1.6
- **Stato:** aperta

Oggi G76 è tra i codici previsti ma non simulati (allarme 1013).

- [ ] Meccanico: specifica (formato Fanuc sistema A a due righe, significato dei parametri, un programma di prova con pezzo e tempo attesi)
- [ ] Informatico: realizzazione in `cycles-lathe.js`, tabella codici, test e caso di robustezza
- [ ] Nuovi allarmi in fondo al loro intervallo e in `docs/allarmi.md`
- [ ] Meccanico: collaudo, esempio ed esercizio

---

# 9. Tornio: cicli semplici G90 e G94

- **Pacchetto di lavoro:** `wp2-tornio`
- **Ruoli:** meccanico, informatico
- **Versione:** 1.6
- **Stato:** aperta

Sul tornio G90 (cilindratura) e G94 (sfacciatura) sono cicli, non assoluto/avanzamento.

- [ ] Meccanico: specifica e programma di prova
- [ ] Informatico: realizzazione, tabella codici, test
- [ ] Aggiornare `docs/codici-supportati.md`
- [ ] Meccanico: collaudo ed esempio

---

# 10. Tornio: ciclo di sgrossatura frontale G72

- **Pacchetto di lavoro:** `wp2-tornio`
- **Ruoli:** meccanico, informatico
- **Versione:** 1.6
- **Stato:** aperta

Come G71, ma con passate parallele a X. Si può riusare la geometria del profilo di `cycles-lathe.js`.

- [ ] Meccanico: specifica e programma di prova
- [ ] Informatico: realizzazione e test
- [ ] Meccanico: collaudo ed esempio

---

# 11. Siemens: cicli di tasca della fresa

- **Pacchetto di lavoro:** `wp4-siemens`, `wp3-fresa`
- **Ruoli:** informatico, meccanico
- **Versione:** 1.6
- **Stato:** aperta

Tabella di marcia: "Siemens: tasche della fresa".

- [ ] Meccanico: scegliere i cicli usati a scuola (tasca rettangolare e circolare) e scrivere la specifica
- [ ] Informatico: se manca l'equivalente Fanuc, prima la funzione nella fresa (WP3), poi la traduzione in `siemens-to-fanuc.js`, senza duplicare la logica della macchina
- [ ] Test di equivalenza con un programma Fanuc
- [ ] Aggiornare `docs/siemens.md`

---

# 12. Vista del tornio vuota durante l'esecuzione

- **Pacchetto di lavoro:** `wp5-grafica`, `wp8-qualita`
- **Ruoli:** sistemista, grafico
- **Tipo:** bug
- **Versione:** 1.6
- **Stato:** aperta

Segnalazione (versione 0.2.0): il programma di esempio scorre correttamente ma la simulazione grafica non mostra nulla. Non riprodotto in locale né online.

Ipotesi: il browser teneva file di una versione precedente (nella 0.1 il pannello era solo un segnaposto).

- [ ] Sistemista: riprovare con la versione 1.5.0 sui PC dove era successo, dopo Ctrl+F5; annotare browser, versione mostrata ed errori nella console
- [ ] Se si ripete, grafico e informatico cercano la causa in `js/render/lathe-2d.js`
- [ ] Se era la cache, chiudere la issue e ricordare Ctrl+F5 nelle istruzioni per gli studenti

---

# 13. Leggibilità della simulazione su proiettore e tablet

- **Pacchetto di lavoro:** `wp5-grafica`
- **Ruoli:** grafico
- **Versione:** 1.6
- **Stato:** aperta

- [ ] Provare la pagina al proiettore dell'aula e su un tablet
- [ ] Contrasto dei colori `--sim-*`, dimensione di quote e testi, spessore dei percorsi
- [ ] Pannelli e pulsanti usabili con il tocco e su schermi stretti

---

# 14. Preparare i PC del gruppo di lavoro

- **Pacchetto di lavoro:** `wp8-qualita`
- **Ruoli:** sistemista
- **Versione:** 1.6
- **Stato:** aperta

- [ ] Git, Python 3 (su alcuni PC funziona solo `py`, non `python`), GitHub CLI, Claude Code
- [ ] `git config --global pull.rebase true` e `rebase.autoStash true`
- [ ] Controllare che `python tools/serve.py` apra sito e test
- [ ] Accesso al repository per tutti i componenti

---

# 15. Verificare i PC del laboratorio

- **Pacchetto di lavoro:** `wp8-qualita`
- **Ruoli:** sistemista
- **Versione:** 1.6
- **Stato:** aperta

- [ ] Browser aggiornati (Chrome, Edge o Firefox)
- [ ] Accesso a `cdn.jsdelivr.net`: senza, la fresa 3D non si apre (il tornio funziona lo stesso)
- [ ] Il sito si apre su `https://daviderobrtoalovisi.github.io/toleranza0/` e mostra la versione corretta

---

# 16. Procedura di controllo prima del push e del rilascio

- **Pacchetto di lavoro:** `wp8-qualita`
- **Ruoli:** sistemista
- **Versione:** 1.6
- **Stato:** aperta

Ogni push su `main` va online subito.

- [ ] Scrivere una lista di controllo breve: `git pull --rebase`, test in `/toleranza0/tests/` con titolo OK, `index.html` senza errori nella console, poi push
- [ ] Per i rilasci: versione in `js/version.js`, CHANGELOG, tag `vX.Y.Z`, verifica del sito pubblicato
- [ ] Prova del sito su Chrome, Edge e Firefox a ogni rilascio

---

# 17. Rileggere i testi degli allarmi

- **Pacchetto di lavoro:** `wp7-didattica`
- **Ruoli:** meccanico, amministrativa
- **Versione:** 1.6
- **Stato:** aperta

Gli allarmi devono dire cosa è successo, su quale riga e come correggere, con parole comprensibili per chi impara.

- [ ] Meccanico: controllare la correttezza tecnica di `message` e `hint` in `js/alarms/catalog.js`
- [ ] Amministrativa: rilettura dell'italiano
- [ ] Non cambiare i codici degli allarmi

---

# 18. Esercizi sui cicli G71/G70 e sulla compensazione del raggio

- **Pacchetto di lavoro:** `wp7-didattica`
- **Ruoli:** meccanico
- **Versione:** 1.6
- **Stato:** aperta

Oggi non ci sono esercizi "trova l'errore" su questi argomenti.

- [ ] Scrivere gli esercizi in `examples/esercizio-*.nc`
- [ ] Allarme atteso (codice e riga) in `tests/examples.test.js`
- [ ] Descrizione e soluzione in `docs/esercitazioni.md`
