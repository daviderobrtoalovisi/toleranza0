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
