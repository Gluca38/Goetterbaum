import { expect, test } from "vitest";
import { protokollAnzeigen, type ProtokollZeile } from "./protokoll";

const HAUS_A = "4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const HAUS_B = "5f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const REINIGUNG = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const NAMEN = {
  objekte: new Map([
    [HAUS_A, "Haus A"],
    [HAUS_B, "Haus B"],
  ]),
  taetigkeiten: new Map([[REINIGUNG, "Unterhaltsreinigung"]]),
};

// So schreibt die Datenbank einen Zeiteintrag ins Protokoll.
const LIVE = {
  id: "eintrag",
  art: "taetigkeit" as const,
  objekt_id: HAUS_A,
  taetigkeit_id: REINIGUNG,
  beginn: "2026-10-16T06:00:00+00:00",
  ende: null,
  nachtrag: false,
  angelegt_am: "2026-10-16T06:00:00+00:00",
};
const GESTOPPT = { ...LIVE, ende: "2026-10-16T08:30:00+00:00" };

test("Das Anlegen zeigt alle Angaben, das Ändern nur, was sich geändert hat", () => {
  const zeilen: ProtokollZeile[] = [
    {
      id: 1,
      aktion: "angelegt",
      geaendert_am: "2026-10-16T06:00:01+00:00",
      geaendert_von_name: "Anna Fleißig",
      vorher: null,
      nachher: LIVE,
    },
    {
      id: 2,
      aktion: "geaendert",
      geaendert_am: "2026-10-16T08:30:00+00:00",
      geaendert_von_name: "Anna Fleißig",
      vorher: LIVE,
      nachher: GESTOPPT,
    },
    {
      id: 3,
      aktion: "geaendert",
      // Winterzeit: Berlin ist UTC + 1 Stunde.
      geaendert_am: "2026-11-02T07:05:00+00:00",
      geaendert_von_name: "Anna Fleißig",
      vorher: GESTOPPT,
      nachher: {
        ...GESTOPPT,
        objekt_id: HAUS_B,
        beginn: "2026-10-16T05:45:00+00:00",
        nachtrag: true,
      },
    },
  ];

  expect(protokollAnzeigen(zeilen, NAMEN)).toEqual([
    {
      id: 1,
      wann: "16.10.2026, 08:00",
      wer: "Anna Fleißig",
      aktion: "Angelegt",
      aenderungen: [
        { feld: "Art", vorher: "–", nachher: "Tätigkeit" },
        { feld: "Objekt", vorher: "–", nachher: "Haus A" },
        { feld: "Tätigkeit", vorher: "–", nachher: "Unterhaltsreinigung" },
        { feld: "Beginn", vorher: "–", nachher: "16.10.2026, 08:00" },
        { feld: "Ende", vorher: "–", nachher: "–" },
        { feld: "Nachtrag", vorher: "–", nachher: "nein" },
      ],
    },
    {
      id: 2,
      wann: "16.10.2026, 10:30",
      wer: "Anna Fleißig",
      aktion: "Geändert",
      aenderungen: [{ feld: "Ende", vorher: "–", nachher: "16.10.2026, 10:30" }],
    },
    {
      id: 3,
      wann: "02.11.2026, 08:05",
      wer: "Anna Fleißig",
      aktion: "Geändert",
      aenderungen: [
        { feld: "Objekt", vorher: "Haus A", nachher: "Haus B" },
        { feld: "Beginn", vorher: "16.10.2026, 08:00", nachher: "16.10.2026, 07:45" },
        { feld: "Nachtrag", vorher: "nein", nachher: "ja" },
      ],
    },
  ]);
});

test("Eine Fahrt hat kein Objekt; Änderungen ohne Benutzer stammen vom System", () => {
  const fahrt = { ...GESTOPPT, art: "fahrt" as const, objekt_id: null, taetigkeit_id: null };
  const [zeile] = protokollAnzeigen(
    [
      {
        id: 7,
        aktion: "geaendert",
        geaendert_am: "2026-10-16T09:00:00+00:00",
        geaendert_von_name: null,
        vorher: GESTOPPT,
        nachher: fahrt,
      },
    ],
    NAMEN,
  );
  expect(zeile.wer).toBe("System");
  expect(zeile.aenderungen).toEqual([
    { feld: "Art", vorher: "Tätigkeit", nachher: "Fahrt" },
    { feld: "Objekt", vorher: "Haus A", nachher: "–" },
    { feld: "Tätigkeit", vorher: "Unterhaltsreinigung", nachher: "–" },
  ]);
});
