import { expect, test } from "vitest";
import { rechnungsCsv } from "./csv";

test("Die CSV-Datei hat BOM, Semikolons, deutsche Kommazahlen ohne Euro-Zeichen und eine Summe", () => {
  const csv = rechnungsCsv({
    zeilen: [
      {
        position: "Pauschale",
        objekt: "Wohnanlage Ringstraße",
        taetigkeit: "",
        monat: "März 2026",
        minuten: null,
        stundensatzCent: null,
        betragCent: 123456,
      },
      {
        position: "Stunden",
        objekt: "Büro Domplatz",
        taetigkeit: "Unterhaltsreinigung",
        monat: "",
        minuten: 75,
        stundensatzCent: 3000,
        betragCent: 3750,
      },
    ],
    summeCent: 127206,
  });

  expect(csv).toBe(
    "﻿" +
      "Position;Objekt;Tätigkeit;Monat;Stunden;Minuten;Stundensatz;Betrag\r\n" +
      "Pauschale;Wohnanlage Ringstraße;;März 2026;;;;1234,56\r\n" +
      "Stunden;Büro Domplatz;Unterhaltsreinigung;;1:15;75;30,00;37,50\r\n" +
      "Summe;;;;;;;1272,06\r\n",
  );
});

test("Semikolons, Anführungszeichen und Zeilenumbrüche in Namen bleiben in ihrer Zelle", () => {
  const csv = rechnungsCsv({
    zeilen: [
      {
        position: "Pauschale",
        objekt: 'Haus "Sonne"; Eingang B\nHinterhof',
        taetigkeit: "",
        monat: "März 2026",
        minuten: null,
        stundensatzCent: null,
        betragCent: 50000,
      },
    ],
    summeCent: 50000,
  });
  expect(csv.split("\r\n")[1]).toBe(
    'Pauschale;"Haus ""Sonne""; Eingang B\nHinterhof";;März 2026;;;;500,00',
  );
});

test("Ein Name, der wie eine Formel beginnt, führt Excel nicht aus", () => {
  const csv = rechnungsCsv({
    zeilen: [
      {
        position: "Stunden",
        objekt: '=HYPERLINK("http://example.com")',
        taetigkeit: "+Glas",
        monat: "",
        minuten: 30,
        stundensatzCent: 4000,
        betragCent: 2000,
      },
    ],
    summeCent: 2000,
  });
  expect(csv.split("\r\n")[1]).toBe(
    'Stunden;"\'=HYPERLINK(""http://example.com"")";\'+Glas;;0:30;30;40,00;20,00',
  );
});
