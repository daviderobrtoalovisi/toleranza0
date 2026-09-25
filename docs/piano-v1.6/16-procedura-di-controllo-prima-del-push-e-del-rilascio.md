# 16. Procedura di controllo prima del push e del rilascio

- **Pacchetto di lavoro:** `wp8-qualita`
- **Ruoli:** sistemista
- **Versione:** 1.6
- **Stato:** aperta

Ogni push su `main` va online subito.

- [ ] Scrivere una lista di controllo breve: `git pull --rebase`, test in `/toleranza0/tests/` con titolo OK, `index.html` senza errori nella console, poi push
- [ ] Per i rilasci: versione in `js/version.js`, CHANGELOG, tag `vX.Y.Z`, verifica del sito pubblicato
- [ ] Prova del sito su Chrome, Edge e Firefox a ogni rilascio
