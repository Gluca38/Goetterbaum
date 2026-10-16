// Rechenbaustein Abrechnung: berechnet aus den Daten eines Kunden die
// Rechnungsvorbereitung für einen Abrechnungszeitraum. Ein reiner
// Baustein ohne Datenbank und Oberfläche; er ist die einzige Stelle, an
// der Geld berechnet wird. Alle Beträge in Cent als ganze Zahlen.

// Ein Monat als "JJJJ-MM", z. B. "2026-07".
export type Monat = string;

export type Kunde = {
  // Die bereits aufgelöste Rundungsregel (Kunde oder Firmen-Standard).
  rundungsregel: "minutengenau" | "15-minuten";
  abrechnungszeitraum: "monatlich" | "quartalsweise";
};

export type Objekt = {
  id: string;
  abrechnungsart: "pauschale" | "stunden";
  pauschaleCent: number | null;
};

export type Taetigkeit = {
  id: string;
  standardStundensatzCent: number;
  kundenStundensatzCent: number | null;
};

export type Zusatzauftrag = {
  id: string;
  objektId: string;
  abrechnungsart: "stunden" | "festbetrag";
  festbetragCent: number | null;
  erledigt: boolean;
};

export type Zeiteintrag = {
  id: string;
  mitarbeiterId: string;
  art: "taetigkeit" | "fahrt";
  objektId: string | null;
  taetigkeitId: string | null;
  zusatzauftragId: string | null;
  // Zeitpunkte als ISO-Text mit Zeitzone, wie sie aus der Datenbank kommen.
  beginn: string;
  ende: string;
};

export type Eingabe = {
  kunde: Kunde;
  // Erster Monat des Abrechnungszeitraums; quartalsweise umfasst er drei.
  ersterMonat: Monat;
  objekte: Objekt[];
  taetigkeiten: Taetigkeit[];
  zusatzauftraege: Zusatzauftrag[];
  // Freigegebene, noch nicht abgerechnete Zeiteinträge des Kunden.
  zeiteintraege: Zeiteintrag[];
  abgerechnetePauschalMonate: { objektId: string; monat: Monat }[];
};

export type Position =
  | {
      art: "pauschale";
      objektId: string;
      monat: Monat;
      betragCent: number;
    }
  | {
      art: "stunden";
      objektId: string;
      taetigkeitId: string;
      // Gerundete Minuten; Stunden = minuten / 60.
      minuten: number;
      stundensatzCent: number;
      betragCent: number;
    }
  | {
      art: "zusatzauftrag-stunden";
      zusatzauftragId: string;
      objektId: string;
      taetigkeitId: string;
      minuten: number;
      stundensatzCent: number;
      betragCent: number;
    }
  | {
      art: "zusatzauftrag-festbetrag";
      zusatzauftragId: string;
      objektId: string;
      betragCent: number;
    };

// Die Arbeit eines Kalendertags (Europe/Berlin) an einem Objekt für eine
// Tätigkeit, nach der Rundungsregel gerundet. Zugleich eine Zeile des
// Stundennachweises; Mitarbeiter werden nur gezählt, nicht genannt.
export type GerundeterTag = {
  datum: string;
  objektId: string;
  taetigkeitId: string;
  zusatzauftragId: string | null;
  minuten: number;
  personen: number;
};

export type Rechnungsvorbereitung = {
  positionen: Position[];
  summeCent: number;
  // Die Zeiteinträge, die mit dieser Abrechnung als abgerechnet gelten.
  zeiteintragIds: string[];
  stundennachweis: GerundeterTag[];
};

export function rechnungsvorbereitung(eingabe: Eingabe): Rechnungsvorbereitung {
  const objektNummer = (id: string) => eingabe.objekte.findIndex((o) => o.id === id);
  const taetigkeitNummer = (id: string) =>
    eingabe.taetigkeiten.findIndex((t) => t.id === id);

  const monate = monateImZeitraum(eingabe);
  const positionen: Position[] = [];
  for (const objekt of eingabe.objekte) {
    if (objekt.abrechnungsart !== "pauschale") continue;
    for (const monat of monate) {
      const schonAbgerechnet = eingabe.abgerechnetePauschalMonate.some(
        (a) => a.objektId === objekt.id && a.monat === monat,
      );
      if (schonAbgerechnet) continue;
      positionen.push({
        art: "pauschale",
        objektId: objekt.id,
        monat,
        betragCent: objekt.pauschaleCent ?? 0,
      });
    }
  }

  const zusatzauftrag = (id: string) => eingabe.zusatzauftraege.find((za) => za.id === id);
  const zusatzauftragNummer = (id: string | null) =>
    id === null ? -1 : eingabe.zusatzauftraege.findIndex((za) => za.id === id);

  // Zeit für einen Zusatzauftrag mit Festbetrag bleibt offen, bis er
  // erledigt ist und sein Betrag abgerechnet wird. Fahrten und Zeit in
  // fremden Objekten gehören nie dazu. Ein Zeiteintrag zählt zu dem
  // Zeitraum, in dem er (in Berlin) beginnt.
  const umfassteZeiteintraege = eingabe.zeiteintraege.filter((z) => {
    if (z.objektId === null || objektNummer(z.objektId) < 0) return false;
    if (!monate.includes(berlinerDatum(Date.parse(z.beginn)).slice(0, 7))) return false;
    if (z.zusatzauftragId === null) return true;
    const za = zusatzauftrag(z.zusatzauftragId);
    return za !== undefined && (za.abrechnungsart === "stunden" || za.erledigt);
  });

  // Nach Stunden berechnet werden die reguläre Zeit in Stunden-Objekten und
  // die Zeit für Zusatzaufträge nach Stunden. Nur diese Tage zeigt auch der
  // Stundennachweis.
  const berechneteTage = gerundeteTage(umfassteZeiteintraege, eingabe.kunde.rundungsregel)
    .filter((t) =>
      t.zusatzauftragId === null
        ? eingabe.objekte[objektNummer(t.objektId)].abrechnungsart === "stunden"
        : zusatzauftrag(t.zusatzauftragId)?.abrechnungsart === "stunden",
    )
    .sort(
      (a, b) =>
        a.datum.localeCompare(b.datum) ||
        objektNummer(a.objektId) - objektNummer(b.objektId) ||
        zusatzauftragNummer(a.zusatzauftragId) - zusatzauftragNummer(b.zusatzauftragId) ||
        taetigkeitNummer(a.taetigkeitId) - taetigkeitNummer(b.taetigkeitId),
    );

  // Minuten und Betrag je Tätigkeit für die Tage, die zur Position gehören.
  function jeTaetigkeit(gehoertDazu: (t: GerundeterTag) => boolean) {
    return eingabe.taetigkeiten.flatMap((taetigkeit) => {
      const minuten = berechneteTage
        .filter((t) => gehoertDazu(t) && t.taetigkeitId === taetigkeit.id)
        .reduce((summe, t) => summe + t.minuten, 0);
      if (minuten === 0) return [];
      const stundensatzCent =
        taetigkeit.kundenStundensatzCent ?? taetigkeit.standardStundensatzCent;
      return [
        {
          taetigkeitId: taetigkeit.id,
          minuten,
          stundensatzCent,
          betragCent: Math.round((minuten * stundensatzCent) / 60),
        },
      ];
    });
  }

  for (const objekt of eingabe.objekte) {
    const stunden = jeTaetigkeit((t) => t.objektId === objekt.id && t.zusatzauftragId === null);
    for (const s of stunden) positionen.push({ art: "stunden", objektId: objekt.id, ...s });
  }
  for (const za of eingabe.zusatzauftraege) {
    if (objektNummer(za.objektId) < 0) continue;
    if (za.abrechnungsart === "festbetrag") {
      if (!za.erledigt) continue;
      positionen.push({
        art: "zusatzauftrag-festbetrag",
        zusatzauftragId: za.id,
        objektId: za.objektId,
        betragCent: za.festbetragCent ?? 0,
      });
      continue;
    }
    for (const s of jeTaetigkeit((t) => t.zusatzauftragId === za.id)) {
      positionen.push({
        art: "zusatzauftrag-stunden",
        zusatzauftragId: za.id,
        objektId: za.objektId,
        ...s,
      });
    }
  }

  const summeCent = positionen.reduce((summe, p) => summe + p.betragCent, 0);
  return {
    positionen,
    summeCent,
    zeiteintragIds: umfassteZeiteintraege.map((z) => z.id),
    stundennachweis: berechneteTage,
  };
}

function monateImZeitraum(eingabe: Eingabe): Monat[] {
  const anzahl = eingabe.kunde.abrechnungszeitraum === "quartalsweise" ? 3 : 1;
  const [jahr, monat] = eingabe.ersterMonat.split("-").map(Number);
  return Array.from({ length: anzahl }, (_, i) => {
    const datum = new Date(Date.UTC(jahr, monat - 1 + i, 1));
    return datum.toISOString().slice(0, 7);
  });
}

// Fasst die Zeiteinträge je Objekt, Tätigkeit, Zusatzauftrag und
// Kalendertag zusammen und rundet die Summe.
function gerundeteTage(
  zeiteintraege: Zeiteintrag[],
  regel: Kunde["rundungsregel"],
): GerundeterTag[] {
  type Gruppe = Omit<GerundeterTag, "minuten" | "personen"> & {
    ms: number;
    mitarbeiter: Set<string>;
  };
  const gruppen = new Map<string, Gruppe>();
  for (const z of zeiteintraege) {
    if (z.objektId === null || z.taetigkeitId === null) continue;
    for (const { datum, ms } of aufTageVerteilt(z)) {
      const schluessel = [z.objektId, z.taetigkeitId, z.zusatzauftragId, datum].join("|");
      const gruppe = gruppen.get(schluessel) ?? {
        datum,
        objektId: z.objektId,
        taetigkeitId: z.taetigkeitId,
        zusatzauftragId: z.zusatzauftragId,
        ms: 0,
        mitarbeiter: new Set<string>(),
      };
      gruppe.ms += ms;
      gruppe.mitarbeiter.add(z.mitarbeiterId);
      gruppen.set(schluessel, gruppe);
    }
  }
  return [...gruppen.values()].map(({ ms, mitarbeiter, ...tag }) => ({
    ...tag,
    minuten: runde(Math.round(ms / 60_000), regel),
    personen: mitarbeiter.size,
  }));
}

function runde(minuten: number, regel: Kunde["rundungsregel"]): number {
  if (regel === "minutengenau") return minuten;
  return Math.ceil(minuten / 15) * 15;
}

// Teilt einen Zeiteintrag an den Mitternachtsgrenzen in Berlin auf.
function aufTageVerteilt(z: Zeiteintrag): { datum: string; ms: number }[] {
  const ende = Date.parse(z.ende);
  const stuecke: { datum: string; ms: number }[] = [];
  let von = Date.parse(z.beginn);
  while (von < ende) {
    const datum = berlinerDatum(von);
    const bis = Math.min(ende, berlinerMitternacht(naechsterTag(datum)));
    stuecke.push({ datum, ms: bis - von });
    von = bis;
  }
  return stuecke;
}

const berlinerUhr = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// Die Uhrzeit in Berlin zu einem Zeitpunkt, als Zahlen.
function berlinerZeit(zeitpunkt: number) {
  const teile = Object.fromEntries(
    berlinerUhr.formatToParts(zeitpunkt).map((t) => [t.type, Number(t.value)]),
  );
  return teile as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

// Kalendertag in Berlin als "JJJJ-MM-TT".
function berlinerDatum(zeitpunkt: number): string {
  const { year, month, day } = berlinerZeit(zeitpunkt);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

// Wie weit Berlin zu einem Zeitpunkt der UTC-Zeit voraus ist, in ms.
function berlinerVersatz(zeitpunkt: number): number {
  const t = berlinerZeit(zeitpunkt);
  const alsUtc = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  return alsUtc - Math.floor(zeitpunkt / 1000) * 1000;
}

// Der Zeitpunkt, zu dem in Berlin der Tag beginnt. Der Wechsel zwischen
// Sommer- und Winterzeit liegt nie auf Mitternacht.
function berlinerMitternacht(datum: string): number {
  const mitternachtUtc = Date.parse(`${datum}T00:00:00Z`);
  return mitternachtUtc - berlinerVersatz(mitternachtUtc - berlinerVersatz(mitternachtUtc));
}

function naechsterTag(datum: string): string {
  const tag = new Date(`${datum}T00:00:00Z`);
  tag.setUTCDate(tag.getUTCDate() + 1);
  return tag.toISOString().slice(0, 10);
}
