// Alle Texte der Oberfläche an einer Stelle, damit später weitere
// Sprachen ohne Umbau nachgerüstet werden können.
import type { Abrechnungsart, Abrechnungszeitraum } from "@/lib/abrechnung";
import type { Rolle } from "@/lib/rollen";
import type { Sparte } from "@/lib/sparte";

export const texte = {
  appName: "Götterbaum",
  anmelden: {
    titel: "Anmelden",
    email: "E-Mail",
    passwort: "Passwort",
    knopf: "Anmelden",
    knopfLaeuft: "Anmeldung läuft …",
    passwortVergessen: "Passwort vergessen?",
    fehlerFalsch: "E-Mail oder Passwort ist falsch.",
    fehlerDeaktiviert:
      "Dieser Zugang ist deaktiviert. Bitte wende dich an das Büro.",
    fehlerUnbekannt:
      "Die Anmeldung hat nicht geklappt. Bitte versuche es noch einmal.",
    fehlerLink:
      "Dieser Link ist ungültig oder abgelaufen. Bitte fordere über „Passwort vergessen?“ einen neuen an oder wende dich an das Büro.",
  },
  start: {
    laedt: "Lädt …",
    angemeldetAls: "Angemeldet als",
    rolle: "Rolle",
    abmelden: "Abmelden",
    mitarbeiterVerwalten: "Mitarbeiter verwalten",
    kundenVerwalten: "Kunden verwalten",
    objekteVerwalten: "Objekte verwalten",
    taetigkeitenVerwalten: "Tätigkeiten verwalten",
  },
  passwortVergessen: {
    titel: "Passwort vergessen",
    hinweis:
      "Gib die E-Mail-Adresse deines Zugangs ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst.",
    email: "E-Mail",
    knopf: "Link anfordern",
    knopfLaeuft: "Wird angefordert …",
    verschickt:
      "Falls es zu dieser E-Mail-Adresse einen Zugang gibt, haben wir dir einen Link geschickt. Bitte sieh in dein Postfach.",
    zurueck: "Zurück zur Anmeldung",
  },
  passwortFestlegen: {
    titel: "Passwort festlegen",
    hinweis: "Lege ein Passwort mit mindestens 8 Zeichen fest.",
    passwort: "Neues Passwort",
    wiederholung: "Passwort wiederholen",
    knopf: "Passwort speichern",
    knopfLaeuft: "Wird gespeichert …",
    fehlerZuKurz: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    fehlerUngleich: "Die beiden Passwörter stimmen nicht überein.",
    fehlerGleich:
      "Das ist dein bisheriges Passwort. Bitte wähle ein neues.",
    fehlerUnbekannt:
      "Das Passwort konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
  },
  mitarbeiter: {
    titel: "Mitarbeiter",
    laedt: "Lädt …",
    keineBerechtigung: "Mitarbeiter verwalten darf nur das Büro.",
    neu: "Neuer Mitarbeiter",
    zurUebersicht: "Zurück zur Übersicht",
    zurStartseite: "Zur Startseite",
    nichtGefunden: "Diesen Mitarbeiter gibt es nicht.",
    keine: "Noch keine Mitarbeiter angelegt.",
    spalteName: "Name",
    spalteEmail: "E-Mail",
    spalteRolle: "Rolle",
    spalteZugang: "Zugang",
    name: "Name",
    email: "E-Mail (optional, nötig für einen Zugang)",
    rolle: "Rolle",
    zugang: "Zugang",
    anlegen: "Anlegen",
    anlegenLaeuft: "Wird angelegt …",
    speichern: "Speichern",
    speichernLaeuft: "Wird gespeichert …",
    gespeichert: "Gespeichert.",
    deaktivieren: "Deaktivieren",
    aktivieren: "Aktivieren",
    deaktiviertHinweis:
      "Deaktivierte Mitarbeiter können sich nicht mehr anmelden. Ihre Daten bleiben erhalten.",
    fehlerName: "Bitte gib einen Namen ein.",
    fehlerEmail: "Diese E-Mail-Adresse ist ungültig.",
    fehlerRolle: "Bitte wähle eine Rolle.",
    fehlerSelbstDeaktivieren: "Du kannst dich nicht selbst deaktivieren.",
    fehlerSelbstRolle: "Du kannst dir nicht selbst die Rolle Büro entziehen.",
    fehlerEmailEntfernen:
      "Die E-Mail kann nach der Einladung nicht entfernt werden. Um den Zugang zu sperren, deaktiviere den Mitarbeiter.",
    fehlerUnbekannt:
      "Das hat nicht geklappt. Bitte lade die Seite neu und versuche es noch einmal.",
    status: {
      deaktiviert: "Deaktiviert",
      keineEmail: "Kein Zugang (keine E-Mail)",
      nichtEingeladen: "Noch nicht eingeladen",
      eingeladen: "Eingeladen",
    },
    einladung: {
      senden: "Einladung senden",
      erneutSenden: "Einladung erneut senden",
      laeuft: "Wird verschickt …",
      verschickt: (email: string) => `Einladung an ${email} verschickt.`,
      fehlerEinladungGeoeffnet:
        "Dieser Mitarbeiter hat die Einladung bereits geöffnet. Er kann sich auf der Anmeldeseite über „Passwort vergessen“ selbst einen neuen Link schicken.",
      fehlerEmailVergeben:
        "Für diese E-Mail-Adresse gibt es bereits einen anderen Zugang.",
      fehlerZuVieleMails:
        "Es wurden gerade zu viele E-Mails verschickt. Bitte versuche es später noch einmal.",
      fehlerUnbekannt:
        "Die Einladung konnte nicht verschickt werden. Bitte versuche es noch einmal.",
    },
  },
  kunden: {
    titel: "Kunden",
    laedt: "Lädt …",
    neu: "Neuer Kunde",
    zurUebersicht: "Zurück zu den Kunden",
    zumKunden: "Zurück zum Kunden",
    nichtGefunden: "Diesen Kunden gibt es nicht.",
    keine: "Noch keine Kunden angelegt.",
    archivierteTitel: "Archivierte Kunden",
    spalteName: "Name",
    spalteOrt: "Ort",
    spalteAbrechnungszeitraum: "Abrechnungszeitraum",
    name: "Name",
    rechnungsadresse: "Rechnungsadresse",
    abrechnungszeitraum: "Abrechnungszeitraum",
    objekte: "Objekte",
    keineObjekte: "Dieser Kunde hat noch keine Objekte.",
    archiviertHinweis:
      "Dieser Kunde ist archiviert. Er erscheint in keiner Auswahlliste mehr; seine Daten bleiben erhalten.",
    archivierenHinweis:
      "Archivierte Kunden erscheinen in keiner Auswahlliste mehr. Ihre Objekte werden mit archiviert. Gelöscht wird nichts.",
    fehlerName: "Bitte gib einen Namen ein.",
    fehlerAbrechnungszeitraum: "Bitte wähle einen Abrechnungszeitraum.",
  },
  objekte: {
    titel: "Objekte",
    laedt: "Lädt …",
    neu: "Neues Objekt",
    zurUebersicht: "Zurück zu den Objekten",
    nichtGefunden: "Dieses Objekt gibt es nicht.",
    keine: "Noch keine Objekte angelegt.",
    archivierteTitel: "Archivierte Objekte",
    spalteBezeichnung: "Bezeichnung",
    spalteKunde: "Kunde",
    spalteOrt: "Ort",
    spalteAbrechnung: "Abrechnung",
    bezeichnung: "Bezeichnung",
    kunde: "Kunde",
    kundeWaehlen: "Bitte wählen …",
    adresse: "Adresse",
    abrechnungsart: "Abrechnungsart",
    pauschale: "Pauschale pro Monat in Euro",
    pauschaleProMonat: (betrag: string) => `Pauschale ${betrag} pro Monat`,
    keineAktivenKunden:
      "Es gibt noch keinen aktiven Kunden. Lege zuerst einen Kunden an.",
    archiviertHinweis:
      "Dieses Objekt ist archiviert. Es erscheint in keiner Auswahlliste mehr; seine Daten bleiben erhalten.",
    archivierenHinweis:
      "Archivierte Objekte erscheinen in keiner Auswahlliste mehr. Gelöscht wird nichts.",
    fehlerBezeichnung: "Bitte gib eine Bezeichnung ein.",
    fehlerKunde: "Bitte wähle einen Kunden.",
    fehlerAbrechnungsart: "Bitte wähle eine Abrechnungsart.",
    fehlerPauschaleFehlt: "Bitte gib die Pauschale pro Monat ein.",
    fehlerPauschaleUngueltig:
      "Die Pauschale ist kein gültiger Betrag. Beispiel: 1.250,00",
    fehlerPauschaleBeiStunden:
      "Bei Stundenabrechnung gibt es keine Pauschale. Bitte lass das Feld leer.",
    fehlerKundeArchiviert:
      "Der Kunde dieses Objekts ist archiviert. Aktiviere zuerst den Kunden.",
  },
  taetigkeiten: {
    titel: "Tätigkeiten",
    laedt: "Lädt …",
    keineBerechtigung: "Tätigkeiten und Stundensätze verwalten darf nur das Büro.",
    neu: "Neue Tätigkeit",
    zurUebersicht: "Zurück zu den Tätigkeiten",
    nichtGefunden: "Diese Tätigkeit gibt es nicht.",
    keine: "Noch keine Tätigkeiten angelegt.",
    archivierteTitel: "Archivierte Tätigkeiten",
    spalteName: "Name",
    spalteSparte: "Sparte",
    spalteStundensatz: "Standard-Stundensatz",
    name: "Name",
    sparte: "Sparte",
    standardStundensatz: "Standard-Stundensatz pro Stunde in Euro",
    archiviertHinweis:
      "Diese Tätigkeit ist archiviert. Sie erscheint in keiner Auswahlliste mehr; ihre Daten bleiben erhalten.",
    archivierenHinweis:
      "Archivierte Tätigkeiten erscheinen in keiner Auswahlliste mehr. Gelöscht wird nichts.",
    fehlerName: "Bitte gib einen Namen ein.",
    fehlerNameVergeben: "Eine Tätigkeit mit diesem Namen gibt es schon.",
    fehlerSparte: "Bitte wähle eine Sparte.",
  },
  stundensaetze: {
    titel: "Stundensätze",
    hinweis:
      "Ohne Absprache gilt der Standard-Stundensatz der Tätigkeit. Ein abweichender Stundensatz hat Vorrang.",
    keineTaetigkeiten: "Es gibt noch keine Tätigkeiten.",
    spalteTaetigkeit: "Tätigkeit",
    spalteStandard: "Standard",
    spalteAbweichend: "Abweichend",
    spalteGilt: "Gilt",
    gilt: (betrag: string, abweichend: boolean) =>
      `${betrag} (${abweichend ? "abweichend" : "Standard"})`,
    festlegenTitel: "Abweichenden Stundensatz festlegen",
    taetigkeit: "Tätigkeit",
    taetigkeitWaehlen: "Bitte wählen …",
    stundensatz: "Abweichender Stundensatz pro Stunde in Euro",
    festlegen: "Festlegen",
    festlegenLaeuft: "Wird festgelegt …",
    festgelegt: "Stundensatz festgelegt.",
    entfernen: "Entfernen",
    entfernenLaeuft: "Wird entfernt …",
    fehlerTaetigkeit: "Bitte wähle eine Tätigkeit.",
    fehlerTaetigkeitArchiviert:
      "Diese Tätigkeit ist archiviert. Aktiviere sie zuerst wieder.",
    fehlerStundensatz: "Der Stundensatz ist kein gültiger Betrag. Beispiel: 32,50",
  },
  erfassung: {
    laeuftSeit: (seit: string) => `Läuft seit ${seit}`,
    fahrt: "Fahrt",
    stopp: "Stopp",
    stoppLaeuft: "Wird gestoppt …",
    start: "Start",
    startLaeuft: "Wird gestartet …",
    fahrtStarten: "Fahrt starten",
    objektSuchen: "Objekt suchen",
    keineTreffer: "Kein Objekt gefunden.",
    weitereTreffer: "Weitere Objekte: bitte genauer suchen.",
    keineObjekte: "Es gibt noch keine Objekte. Bitte wende dich an das Büro.",
    taetigkeit: "Tätigkeit",
    taetigkeitWaehlen: "Bitte wählen …",
    keineTaetigkeiten: "Es gibt noch keine Tätigkeiten. Bitte wende dich an das Büro.",
    meineEintraege: "Meine Zeiteinträge",
    keineEintraege: (tage: number) =>
      `In den letzten ${tage} Tagen gibt es noch keine Zeiteinträge.`,
    vonBis: (von: string, bis: string) => `${von}–${bis}`,
    fehlerObjekt: "Bitte wähle ein Objekt.",
    fehlerTaetigkeit: "Bitte wähle eine Tätigkeit.",
    fehlerLaeuftSchon:
      "Es läuft schon ein Zeiteintrag. Stoppe ihn, bevor du einen neuen startest.",
    fehlerLaeuftNichts: "Es läuft kein Zeiteintrag mehr.",
    fehlerNichtZurAuswahl:
      "Dieses Objekt oder diese Tätigkeit steht nicht mehr zur Auswahl. Bitte lade die Seite neu.",
    fehlerAbgemeldet: "Du bist nicht mehr angemeldet. Bitte melde dich neu an.",
    fehlerStart:
      "Der Start wurde nicht gespeichert. Bitte versuche es noch einmal oder trage die Zeit später als Nachtrag ein.",
    fehlerStopp:
      "Der Stopp wurde nicht gespeichert. Bitte versuche es noch einmal oder trage die Zeit später als Nachtrag ein.",
    ohneNetzStart:
      "Kein Internet: Der Start wurde nicht gespeichert. Bitte trage diese Zeit später als Nachtrag ein.",
    ohneNetzStopp:
      "Kein Internet: Der Stopp wurde nicht gespeichert. Bitte trage das Ende später als Nachtrag ein.",
  },
  stammdaten: {
    keineBerechtigung: "Kunden und Objekte verwalten darf nur das Büro.",
    archivieren: "Archivieren",
    aktivieren: "Wieder aktivieren",
    archiviert: "archiviert",
    anlegen: "Anlegen",
    anlegenLaeuft: "Wird angelegt …",
    speichern: "Speichern",
    speichernLaeuft: "Wird gespeichert …",
    gespeichert: "Gespeichert.",
    zurStartseite: "Zur Startseite",
    fehlerUnbekannt:
      "Das hat nicht geklappt. Bitte lade die Seite neu und versuche es noch einmal.",
  },
  abrechnungszeitraeume: {
    monatlich: "Monatlich",
    quartalsweise: "Quartalsweise",
  } satisfies Record<Abrechnungszeitraum, string>,
  sparten: {
    reinigung: "Reinigung",
    garten: "Garten",
  } satisfies Record<Sparte, string>,
  abrechnungsarten: {
    pauschale: "Pauschale",
    stunden: "Stundenabrechnung",
  } satisfies Record<Abrechnungsart, string>,
  adresse: {
    strasse: "Straße und Hausnummer",
    adresszusatz: "Adresszusatz (optional)",
    plz: "PLZ",
    ort: "Ort",
    fehlerStrasse: "Bitte gib Straße und Hausnummer ein.",
    fehlerPlz: "Die PLZ muss aus fünf Ziffern bestehen.",
    fehlerOrt: "Bitte gib den Ort ein.",
  },
  rollen: {
    mitarbeiter: "Mitarbeiter",
    vorarbeiter: "Vorarbeiter",
    buero: "Büro",
  } satisfies Record<Rolle, string>,
};
