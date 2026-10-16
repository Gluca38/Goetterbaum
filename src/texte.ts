// Alle Texte der Oberfläche an einer Stelle, damit später weitere
// Sprachen ohne Umbau nachgerüstet werden können.
import type { Abrechnungsart, Abrechnungszeitraum } from "@/lib/abrechnung";
import type { Rolle } from "@/lib/rollen";

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
    keineBerechtigung: "Kunden und Objekte verwalten darf nur das Büro.",
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
  stammdaten: {
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
