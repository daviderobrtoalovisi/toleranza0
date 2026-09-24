// Dati tecnici delle macchine utensili reali, dai cataloghi e dalle pagine ufficiali dei produttori.
// Valori indicativi della configurazione base: verificare sempre sulla scheda della macchina vera.
// null = dato non trovato nelle fonti ufficiali (meglio vuoto che inventato).
//
// iso: 'yes' programmazione ISO in stile Fanuc; 'mode' il controllo accetta anche l'ISO (dialetto con differenze);
//      'option' si vende con controlli diversi (Fanuc oppure Siemens/Heidenhain); 'no' linguaggio diverso.
// checked: mese del controllo delle fonti. Unità: mm, giri/min, kW, rapidi in m/min.
// Alcune fonti sono cataloghi ufficiali del produttore ospitati da siti di terzi: è scritto nella nota.

export const MACHINE_DATA = [
  // ---------- DMG MORI ----------
  {
    id: 'dmg-mori-clx-350', maker: 'DMG MORI', model: 'CLX 350', type: 'lathe',
    control: 'CELOS con SIEMENS SINUMERIK ONE oppure FANUC', iso: 'option',
    maxTurningDiameterMm: 320, maxTurningLengthMm: 530, swingOverBedMm: 580, barCapacityMm: 65, chuckSizeMm: 210,
    travelXmm: 242.5, travelZmm: 540, maxSpindleRpm: 5000, spindlePowerKw: 16.5, rapidXmMin: null, rapidZmMin: null, toolStations: 12,
    sourceUrl: 'https://en.dmgmori.com/products/machines/turning/universal-turning/clx/clx-350', checked: '2026-09',
    note: 'Diametro sopra il bancale, mandrino e torretta (12 posti VDI 30) dal catalogo ufficiale della serie CLX (2019), ospitato da un rivenditore. Barra: 51 mm di serie e 65 mm come opzione secondo una notizia DMG MORI. Rapido non pubblicato.'
  },
  {
    id: 'dmg-mori-clx-450', maker: 'DMG MORI', model: 'CLX 450', type: 'lathe',
    control: 'CELOS con SIEMENS SINUMERIK ONE oppure FANUC', iso: 'option',
    maxTurningDiameterMm: 400, maxTurningLengthMm: 800, swingOverBedMm: 700, barCapacityMm: 80, chuckSizeMm: 250,
    travelXmm: 276, travelZmm: 830, maxSpindleRpm: 4000, spindlePowerKw: 25.5, rapidXmMin: null, rapidZmMin: null, toolStations: 12,
    sourceUrl: 'https://us.dmgmori.com/products/machines/turning/universal-turning/clx/clx-450', checked: '2026-09',
    note: 'Diametro sopra il bancale, mandrino e torretta (12 posti VDI 40) dal catalogo ufficiale della serie CLX (2019), ospitato da un rivenditore. Rapido non pubblicato.'
  },
  {
    id: 'dmg-mori-clx-550', maker: 'DMG MORI', model: 'CLX 550', type: 'lathe',
    control: 'SIEMENS 840D solutionline oppure FANUC serie i', iso: 'option',
    maxTurningDiameterMm: 480, maxTurningLengthMm: 1225, swingOverBedMm: 700, barCapacityMm: 80, chuckSizeMm: null,
    travelXmm: null, travelZmm: 1240, maxSpindleRpm: 3250, spindlePowerKw: 33, rapidXmMin: null, rapidZmMin: null, toolStations: 12,
    sourceUrl: 'https://www.bagaj.mn/wp-content/uploads/2017/12/Katalog_CLX_serie.pdf', checked: '2026-09',
    note: 'Probabilmente fuori catalogo: non compare più su dmgmori.com. Dati dal catalogo ufficiale della serie CLX (2019), ospitato da un rivenditore. Mandrino da 210 a 315 mm secondo la versione; corsa X e rapido non indicati chiaramente.'
  },
  {
    id: 'dmg-mori-nlx-2500-700', maker: 'DMG MORI', model: 'NLX 2500 | 700', type: 'lathe',
    control: 'MAPPS su FANUC o MITSUBISHI, oppure SIEMENS SINUMERIK 840D sl, con CELOS', iso: 'option',
    maxTurningDiameterMm: 460, maxTurningLengthMm: 705, swingOverBedMm: null, barCapacityMm: 90, chuckSizeMm: null,
    travelXmm: 260, travelZmm: 795, maxSpindleRpm: 3500, spindlePowerKw: 18.5, rapidXmMin: 30, rapidZmMin: 30, toolStations: 10,
    sourceUrl: 'https://en.dmgmori.com/products/machines/turning/universal-turning/nlx/nlx-2500', checked: '2026-09',
    note: 'Giri, potenza, rapido e posti torretta (10 o 12) dal comunicato ufficiale del lancio (2010), versione solo tornitura. Esistono anche la versione 1250 (lunghezza 1255 mm) e la 2nd Generation (2024).'
  },
  {
    id: 'dmg-mori-ctx-450', maker: 'DMG MORI', model: 'CTX 450', type: 'lathe',
    control: 'SIEMENS oppure FANUC, con CELOS', iso: 'option',
    maxTurningDiameterMm: 480, maxTurningLengthMm: 800, swingOverBedMm: null, barCapacityMm: 80, chuckSizeMm: null,
    travelXmm: 310, travelZmm: 825, maxSpindleRpm: 4000, spindlePowerKw: 25, rapidXmMin: null, rapidZmMin: null, toolStations: null,
    sourceUrl: 'https://us.dmgmori.com/products/machines/turning/universal-turning/ctx/ctx-450', checked: '2026-09',
    note: 'Serie CTX presentata nel 2023, che ha preso il posto della CTX beta. Barra 80 mm di serie (102 mm come opzione). Posti torretta, mandrino e rapido non pubblicati per la versione standard.'
  },
  {
    id: 'dmg-mori-ecoturn-450', maker: 'DMG MORI', model: 'ecoTurn 450', type: 'lathe',
    control: 'SIEMENS 840D solutionline, HEIDENHAIN CNC PILOT 640 oppure MAPPS IV', iso: 'option',
    maxTurningDiameterMm: 400, maxTurningLengthMm: null, swingOverBedMm: 650, barCapacityMm: 65, chuckSizeMm: 250,
    travelXmm: 267.5, travelZmm: 600, maxSpindleRpm: 4000, spindlePowerKw: 17.5, rapidXmMin: 30, rapidZmMin: 30, toolStations: 12,
    sourceUrl: 'https://www.m3.tuc.gr/EQUIPMENT/CTX310/DMG%20ecoTurn.pdf', checked: '2026-09',
    note: 'Serie ECOLINE, probabilmente fuori catalogo ma molto diffusa anche nelle scuole. Catalogo ufficiale DMG MORI ospitato dal sito di una università. Mandrino da 250 mm come opzione. Lunghezza tornibile non indicata (corsa Z 600 mm).'
  },
  {
    id: 'dmg-mori-cmx-600-v', maker: 'DMG MORI', model: 'CMX 600 V', type: 'mill',
    control: 'SIEMENS, HEIDENHAIN TNC 620 oppure MAPPS su FANUC', iso: 'option',
    travelXmm: 600, travelYmm: 560, travelZmm: 510, tableLengthMm: 900, tableWidthMm: 560,
    maxSpindleRpm: 12000, spindlePowerKw: 13, rapidXYZmMin: 30, toolMagazine: 30,
    sourceUrl: 'https://en.dmgmori.com/products/machines/milling/vertical-milling/cmx-v/cmx-600-v', checked: '2026-09',
    note: 'Tavola, giri, potenza, rapido e magazzino dal catalogo ufficiale della serie CMX V, ospitato da un sito di terzi.'
  },
  {
    id: 'dmg-mori-dmu-50', maker: 'DMG MORI', model: 'DMU 50 3rd Generation', type: 'mill',
    control: 'SIEMENS, HEIDENHAIN oppure MAPPS su FANUC', iso: 'option',
    travelXmm: 650, travelYmm: 520, travelZmm: 475, tableLengthMm: null, tableWidthMm: null,
    maxSpindleRpm: 15000, spindlePowerKw: 21, rapidXYZmMin: 42, toolMagazine: 30,
    sourceUrl: 'https://us.dmgmori.com/products/machines/milling/5-axis-milling/dmu/dmu-50', checked: '2026-09',
    note: 'Centro di lavoro a 5 assi con tavola rotobasculante: nel simulatore si usa come fresa a 3 assi. Tavola rotonda Ø630 mm. Potenza e rapido dal comunicato del lancio (2017).'
  },

  // ---------- Mazak ----------
  {
    id: 'mazak-quick-turn-200-l', maker: 'Mazak', model: 'QUICK TURN 200 L (500U)', type: 'lathe',
    control: 'MAZATROL SmoothC (conversazionale ed EIA/ISO)', iso: 'mode',
    maxTurningDiameterMm: 350, maxTurningLengthMm: 541, swingOverBedMm: 660, barCapacityMm: 65, chuckSizeMm: 203,
    travelXmm: 195, travelZmm: 560, maxSpindleRpm: 5000, spindlePowerKw: 15, rapidXmMin: 30, rapidZmMin: 33, toolStations: 12,
    sourceUrl: 'https://www.mazak.com/eu-en/detail/china/turning/cl-qt200el-all0/', checked: '2026-09',
    note: 'Versione base senza utensili motorizzati, bancale corto (la 1000U ha lunghezza tornibile 1063 mm). Mandrino da 8 pollici.'
  },
  {
    id: 'mazak-quick-turn-250-l', maker: 'Mazak', model: 'QUICK TURN 250 L (500U)', type: 'lathe',
    control: 'MAZATROL SmoothC (conversazionale ed EIA/ISO)', iso: 'mode',
    maxTurningDiameterMm: 380, maxTurningLengthMm: 511, swingOverBedMm: 660, barCapacityMm: 80, chuckSizeMm: 254,
    travelXmm: 210, travelZmm: 560, maxSpindleRpm: 4000, spindlePowerKw: 18.5, rapidXmMin: 30, rapidZmMin: 33, toolStations: 12,
    sourceUrl: 'https://www.mazak.com/eu-en/detail/china/turning/cl-qt250el-all0/', checked: '2026-09',
    note: 'Versione base, bancale corto (la 1000U ha lunghezza tornibile 1033 mm). Mandrino da 10 pollici.'
  },
  {
    id: 'mazak-quick-turn-100my', maker: 'Mazak', model: 'QUICK TURN 100MY (300U)', type: 'lathe',
    control: 'MAZATROL SmoothG (conversazionale ed EIA/ISO)', iso: 'mode',
    maxTurningDiameterMm: 280, maxTurningLengthMm: 340, swingOverBedMm: null, barCapacityMm: null, chuckSizeMm: 152,
    travelXmm: 187, travelZmm: 440, maxSpindleRpm: 6000, spindlePowerKw: 15, rapidXmMin: 33, rapidZmMin: 33, toolStations: 12,
    sourceUrl: 'https://www.mazak.com/eu-en/detail/japan/turning/qt10myem/', checked: '2026-09',
    note: 'Il QUICK TURN più piccolo, a catalogo solo con utensili motorizzati e asse Y: nel simulatore si usa come tornio a 2 assi. Mandrino da 6 pollici.'
  },
  {
    id: 'mazak-vce-500', maker: 'Mazak', model: 'VCE-500', type: 'mill',
    control: 'MAZATROL SmoothEz (conversazionale ed EIA/G-code di serie)', iso: 'mode',
    travelXmm: 800, travelYmm: 500, travelZmm: 550, tableLengthMm: 1050, tableWidthMm: 500,
    maxSpindleRpm: 12000, spindlePowerKw: 18.5, rapidXYZmMin: 36, toolMagazine: 24,
    sourceUrl: 'https://www.mazak.com/eu-en/detail/uk/vertical/uk-vce500/', checked: '2026-09',
    note: 'Scelto al posto dei VCN-530C e VCN-430A, non più a catalogo. Attacco CAT 40.'
  },

  // ---------- Okuma ----------
  {
    id: 'okuma-genos-l250ii-e', maker: 'Okuma', model: 'GENOS L250II-e', type: 'lathe',
    control: 'OSP-P300LA', iso: 'mode',
    maxTurningDiameterMm: 220, maxTurningLengthMm: 290, swingOverBedMm: 450, barCapacityMm: null, chuckSizeMm: null,
    travelXmm: 160, travelZmm: 330, maxSpindleRpm: 4500, spindlePowerKw: 11, rapidXmMin: 25, rapidZmMin: 30, toolStations: 12,
    sourceUrl: 'https://www.okuma.eu/products/by-process/turning/genos-l-series/genos-l250ii-e/', checked: '2026-09',
    note: 'Configurazione europea con torretta a 12 posti e mandrino fino a 4500 giri/min; bancale corto (lunghezza 500 mm come opzione). Corse e rapidi dal catalogo GENOS LII (2020). Il G-code Okuma non è identico al Fanuc (cicli e alcuni codici diversi).'
  },
  {
    id: 'okuma-genos-m560-v-e', maker: 'Okuma', model: 'GENOS M560-V-e', type: 'mill',
    control: 'OSP-P300MA', iso: 'mode',
    travelXmm: 1050, travelYmm: 560, travelZmm: 460, tableLengthMm: 1300, tableWidthMm: 560,
    maxSpindleRpm: 12000, spindlePowerKw: 22, rapidXYZmMin: 32, toolMagazine: 32,
    sourceUrl: 'https://www.okuma.eu/products/by-process/milling/genos-m-series/genos-m560-v-e/', checked: '2026-09',
    note: 'Rapido X/Y 40 m/min e Z 32 m/min (catalogo GENOS M 2020): nel simulatore si usa il più lento. Il G-code Okuma non è identico al Fanuc.'
  },

  // ---------- DN Solutions (ex Doosan) ----------
  {
    id: 'dn-solutions-lynx-2100a', maker: 'DN Solutions', model: 'Lynx 2100A', type: 'lathe',
    control: 'DN Solutions Fanuc i Plus (Siemens S828D come opzione)', iso: 'yes',
    maxTurningDiameterMm: 350, maxTurningLengthMm: 330, swingOverBedMm: 600, barCapacityMm: 51, chuckSizeMm: 152,
    travelXmm: 205, travelZmm: 340, maxSpindleRpm: 6000, spindlePowerKw: 15, rapidXmMin: 30, rapidZmMin: 36, toolStations: 12,
    sourceUrl: 'https://www.dn-solutions.com/us/product/turning-center/2-axis-horizontal/lynx-2100-a.do', checked: '2026-09',
    note: 'Versione base con mandrino da 6 pollici e bancale corto (la 2100LA ha lunghezza 550 mm). Controllo, diametro sopra il bancale e barra dal catalogo ufficiale Lynx 2100, ospitato da un rivenditore.'
  },
  {
    id: 'dn-solutions-puma-2100', maker: 'DN Solutions', model: 'PUMA 2100', type: 'lathe',
    control: 'DN Solutions Fanuc i (FANUC 31i e Siemens S828D come opzione)', iso: 'yes',
    maxTurningDiameterMm: 481, maxTurningLengthMm: 545, swingOverBedMm: 780, barCapacityMm: 65, chuckSizeMm: 203,
    travelXmm: 260, travelZmm: 590, maxSpindleRpm: 4500, spindlePowerKw: 25, rapidXmMin: 30, rapidZmMin: 30, toolStations: 12,
    sourceUrl: 'https://www.dn-solutions.com/eu/product/turning-center/2-axis-horizontal/puma-2100.do', checked: '2026-09',
    note: 'Versione base, bancale corto (la 2100L ha lunghezza 785 mm). Mandrino da 8 pollici. Diametro sopra il bancale, barra e controllo da un catalogo Doosan precedente, ospitato da un sito di terzi.'
  },
  {
    id: 'dn-solutions-dnm-4500', maker: 'DN Solutions', model: 'DNM 4500', type: 'mill',
    control: 'DN Solutions Fanuc i Plus (Siemens, Heidenhain, Mitsubishi come alternative)', iso: 'yes',
    travelXmm: 800, travelYmm: 450, travelZmm: 510, tableLengthMm: 1000, tableWidthMm: 450,
    maxSpindleRpm: 8000, spindlePowerKw: 18.5, rapidXYZmMin: 30, toolMagazine: 30,
    sourceUrl: 'https://www.dn-solutions.com/us/product/machining-center/vertical/dnm-4500.do', checked: '2026-09',
    note: 'Rapido X/Y 36 m/min e Z 30 m/min: nel simulatore si usa il più lento. Versione base da 8000 giri/min. Magazzino e controllo dal catalogo DNM, ospitato da un sito di terzi.'
  },

  // ---------- EMCO ----------
  {
    id: 'emco-concept-turn-105', maker: 'EMCO', model: 'Concept TURN 105', type: 'lathe',
    control: 'EMCO WinNC con controllo intercambiabile (Fanuc 31i, Sinumerik Operate, Fagor 8055)', iso: 'option',
    maxTurningDiameterMm: 75, maxTurningLengthMm: 121, swingOverBedMm: 180, barCapacityMm: 18, chuckSizeMm: null,
    travelXmm: 55, travelZmm: 172, maxSpindleRpm: 4000, spindlePowerKw: 1.9, rapidXmMin: 5, rapidZmMin: 5, toolStations: 8,
    sourceUrl: 'https://www.emco-world.com/en/products/industrial-training/machines/turning/concept-turn/concept-turn-105.html', checked: '2026-09',
    note: 'Tornio didattico da banco. Lunghezza massima con la contropunta. Con WinNC per Fanuc 31i si programma in ISO come nel simulatore.'
  },
  {
    id: 'emco-concept-turn-260', maker: 'EMCO', model: 'Concept TURN 260', type: 'lathe',
    control: 'EMCO WinNC con controllo intercambiabile (Fanuc 31i, Sinumerik Operate, Fagor 8055)', iso: 'option',
    maxTurningDiameterMm: 85, maxTurningLengthMm: 255, swingOverBedMm: 250, barCapacityMm: 25.4, chuckSizeMm: null,
    travelXmm: 100, travelZmm: 300, maxSpindleRpm: 6300, spindlePowerKw: 5.5, rapidXmMin: 15, rapidZmMin: 24, toolStations: 12,
    sourceUrl: 'https://www.emco-world.com/en/products/industrial-training/machines/turning/concept-turn/concept-turn-260.html', checked: '2026-09',
    note: 'Sviluppo della Concept TURN 250 (fuori produzione, non inclusa perché senza dati ufficiali). Torretta 12 posti VDI 16.'
  },
  {
    id: 'emco-emcoturn-e25', maker: 'EMCO', model: 'EMCOTURN E25', type: 'lathe',
    control: 'Siemens Sinumerik 828D con ShopTurn oppure Fanuc 0i-TF', iso: 'option',
    maxTurningDiameterMm: 85, maxTurningLengthMm: 255, swingOverBedMm: 250, barCapacityMm: 25.5, chuckSizeMm: null,
    travelXmm: 100, travelZmm: 300, maxSpindleRpm: 6300, spindlePowerKw: 5.5, rapidXmMin: 15, rapidZmMin: 24, toolStations: 12,
    sourceUrl: 'https://www.emco-world.com/en/products/turning/emcoturn/emcoturn-e25.html', checked: '2026-09',
    note: 'Tornio industriale piccolo. Lunghezza tornibile dal catalogo ufficiale EN9063 (2022). Torretta 12 posti VDI 16.'
  },
  {
    id: 'emco-maxxturn-25', maker: 'EMCO', model: 'Maxxturn 25', type: 'lathe',
    control: 'Fanuc 31i-B oppure Siemens Sinumerik 828D con ShopTurn', iso: 'option',
    maxTurningDiameterMm: 114, maxTurningLengthMm: null, swingOverBedMm: 325, barCapacityMm: 25.4, chuckSizeMm: null,
    travelXmm: 100, travelZmm: 320, maxSpindleRpm: 8000, spindlePowerKw: 6.5, rapidXmMin: 20, rapidZmMin: 30, toolStations: 12,
    sourceUrl: 'https://www.emco-world.com/en/products/turning/maxxturn/maxxturn-25.html', checked: '2026-09',
    note: 'Ha anche asse Y e contromandrino: nel simulatore si usa come tornio a 2 assi. Lunghezza tornibile non pubblicata.'
  },
  {
    id: 'emco-concept-mill-105', maker: 'EMCO', model: 'Concept MILL 105', type: 'mill',
    control: 'EMCO WinNC con controllo intercambiabile (Fanuc 31i, Sinumerik Operate, Heidenhain)', iso: 'option',
    travelXmm: 200, travelYmm: 150, travelZmm: 250, tableLengthMm: 420, tableWidthMm: 125,
    maxSpindleRpm: 5000, spindlePowerKw: 1.1, rapidXYZmMin: 5, toolMagazine: 10,
    sourceUrl: 'https://www.emco-world.com/en/products/industrial-training/machines/milling/concept-mill/concept-mill-105.html', checked: '2026-09',
    note: 'Fresa didattica da banco: corse piccole, gli esempi pensati per un grezzo di 100 mm possono andare fuori corsa.'
  },
  {
    id: 'emco-concept-mill-250', maker: 'EMCO', model: 'Concept MILL 250', type: 'mill',
    control: 'EMCO WinNC con controllo intercambiabile (GE Fanuc Series 0 e 21, Sinumerik, Heidenhain, Fagor)', iso: 'option',
    travelXmm: 350, travelYmm: 250, travelZmm: 300, tableLengthMm: 520, tableWidthMm: 300,
    maxSpindleRpm: 10000, spindlePowerKw: 7, rapidXYZmMin: 15, toolMagazine: 20,
    sourceUrl: 'https://www.emco-world.com/fileadmin/user_upload/milling_machine_Concept_mill_250_EN.pdf', checked: '2026-09',
    note: 'Fuori produzione ma molto diffusa nelle scuole. Dati dal catalogo ufficiale EN4536 (2014).'
  },
  {
    id: 'emco-concept-mill-260', maker: 'EMCO', model: 'Concept MILL 260', type: 'mill',
    control: 'EMCO WinNC con controllo intercambiabile (Fanuc 31i, Sinumerik Operate, Fagor, Heidenhain)', iso: 'option',
    travelXmm: 350, travelYmm: 250, travelZmm: 300, tableLengthMm: 520, tableWidthMm: 300,
    maxSpindleRpm: 10000, spindlePowerKw: 7, rapidXYZmMin: 24, toolMagazine: 20,
    sourceUrl: 'https://www.emco-world.com/en/products/industrial-training/machines/milling/concept-mill/concept-mill-260.html', checked: '2026-09',
    note: 'Sviluppo della Concept MILL 250. Potenza dalla pagina della serie Concept MILL.'
  },

  // ---------- Haas ----------
  {
    id: 'haas-st-10', maker: 'Haas', model: 'ST-10', type: 'lathe',
    control: 'Haas NGC', iso: 'yes',
    maxTurningDiameterMm: 305, maxTurningLengthMm: 406, swingOverBedMm: 419, barCapacityMm: 44, chuckSizeMm: 165,
    travelXmm: 200, travelZmm: 406, maxSpindleRpm: 6000, spindlePowerKw: 11.2, rapidXmMin: 30.5, rapidZmMin: 30.5, toolStations: 12,
    sourceUrl: 'https://www.haascnc.com/machines/lathes/st/models/standard/st-10.html', checked: '2026-09',
    note: 'Diametro tornibile con torretta BOT standard a 12 posti. Diametro sopra il bancale = diametro massimo del pezzo (Max Part Swing).'
  },
  {
    id: 'haas-st-20', maker: 'Haas', model: 'ST-20', type: 'lathe',
    control: 'Haas NGC', iso: 'yes',
    maxTurningDiameterMm: 330, maxTurningLengthMm: 572, swingOverBedMm: 533, barCapacityMm: 64, chuckSizeMm: 210,
    travelXmm: 213, travelZmm: 572, maxSpindleRpm: 4000, spindlePowerKw: 14.9, rapidXmMin: 24, rapidZmMin: 24, toolStations: 12,
    sourceUrl: 'https://www.haascnc.com/machines/lathes/st/models/standard/st-20.html', checked: '2026-09',
    note: 'Configurazione base con mandrino da 210 mm (8,3 pollici); esiste anche con mandrino da 10 pollici.'
  },
  {
    id: 'haas-st-30', maker: 'Haas', model: 'ST-30', type: 'lathe',
    control: 'Haas NGC', iso: 'yes',
    maxTurningDiameterMm: 381, maxTurningLengthMm: 826, swingOverBedMm: 533, barCapacityMm: 76, chuckSizeMm: 254,
    travelXmm: 239, travelZmm: 826, maxSpindleRpm: 3400, spindlePowerKw: 22.4, rapidXmMin: 24, rapidZmMin: 24, toolStations: 12,
    sourceUrl: 'https://www.haascnc.com/machines/lathes/st/models/standard/st-30.html', checked: '2026-09',
    note: 'Configurazione base con mandrino da 254 mm (10 pollici); esiste anche con mandrino da 12 pollici.'
  },
  {
    id: 'haas-tl-1', maker: 'Haas', model: 'TL-1', type: 'lathe',
    control: 'Haas NGC', iso: 'yes',
    maxTurningDiameterMm: 406, maxTurningLengthMm: 762, swingOverBedMm: 508, barCapacityMm: null, chuckSizeMm: null,
    travelXmm: 203, travelZmm: 762, maxSpindleRpm: 1800, spindlePowerKw: 7.5, rapidXmMin: 11.4, rapidZmMin: 11.4, toolStations: null,
    sourceUrl: 'https://www.haascnc.com/machines/lathes/toolroom-lathe/models/tl-1.html', checked: '2026-09',
    note: 'Tornio da attrezzeria. Valori con portautensile manuale: con la torretta a 4 posti il diametro tornibile scende a 203 mm. Mandrino opzionale.'
  },
  {
    id: 'haas-vf-2', maker: 'Haas', model: 'VF-2', type: 'mill',
    control: 'Haas NGC', iso: 'yes',
    travelXmm: 762, travelYmm: 406, travelZmm: 508, tableLengthMm: 914, tableWidthMm: 356,
    maxSpindleRpm: 8100, spindlePowerKw: 22.4, rapidXYZmMin: 25.4, toolMagazine: 20,
    sourceUrl: 'https://www.haascnc.com/machines/vertical-mills/vf-series/models/small/vf-2.html', checked: '2026-09',
    note: 'Mandrino a presa diretta da 8100 giri/min, cambio utensile a carosello da 20 posti.'
  },
  {
    id: 'haas-vf-3', maker: 'Haas', model: 'VF-3', type: 'mill',
    control: 'Haas NGC', iso: 'yes',
    travelXmm: 1016, travelYmm: 508, travelZmm: 635, tableLengthMm: 1219, tableWidthMm: 457,
    maxSpindleRpm: 8100, spindlePowerKw: 22.4, rapidXYZmMin: 25.4, toolMagazine: 20,
    sourceUrl: 'https://www.haascnc.com/machines/vertical-mills/vf-series/models/medium/vf-3.html', checked: '2026-09',
    note: 'Mandrino a presa diretta da 8100 giri/min, cambio utensile a carosello da 20 posti.'
  },
  {
    id: 'haas-mini-mill', maker: 'Haas', model: 'Mini Mill', type: 'mill',
    control: 'Haas NGC', iso: 'yes',
    travelXmm: 406, travelYmm: 356, travelZmm: 381, tableLengthMm: 914, tableWidthMm: 305,
    maxSpindleRpm: 8000, spindlePowerKw: 7.5, rapidXYZmMin: 20.3, toolMagazine: null,
    sourceUrl: 'https://www.haascnc.com/machines/vertical-mills/mini-mills/models/minimill.html', checked: '2026-09',
    note: 'Magazzino da 10 o 20 utensili secondo la configurazione.'
  },
  {
    id: 'haas-tm-1', maker: 'Haas', model: 'TM-1', type: 'mill',
    control: 'Haas NGC', iso: 'yes',
    travelXmm: 762, travelYmm: 406, travelZmm: 406, tableLengthMm: 1213, tableWidthMm: 267,
    maxSpindleRpm: 4000, spindlePowerKw: 5.6, rapidXYZmMin: 5.1, toolMagazine: null,
    sourceUrl: 'https://www.haascnc.com/machines/vertical-mills/toolroom-mills/models/tm-1.html', checked: '2026-09',
    note: 'Fresa da attrezzeria: nella configurazione base non ha cambio utensile automatico.'
  }
];
