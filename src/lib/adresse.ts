import { texte } from "@/texte";

// Eine Anschrift in einzelnen Feldern. So lässt sie sich später auch in
// E-Rechnungen übernehmen, die eine gegliederte Adresse verlangen.
export type Adresse = {
  strasse: string;
  adresszusatz: string | null;
  plz: string;
  ort: string;
};

export type AdressErgebnis =
  | { ok: true; adresse: Adresse }
  | { ok: false; fehler: string };

// Prüft die Adressfelder eines Formulars (strasse, adresszusatz, plz, ort).
export function pruefeAdresse(formData: FormData): AdressErgebnis {
  const feld = (name: string) => String(formData.get(name) ?? "").trim();
  const strasse = feld("strasse");
  const adresszusatz = feld("adresszusatz");
  const plz = feld("plz");
  const ort = feld("ort");

  if (!strasse) return { ok: false, fehler: texte.adresse.fehlerStrasse };
  // Vorerst nur deutsche Postleitzahlen.
  if (!/^\d{5}$/.test(plz)) return { ok: false, fehler: texte.adresse.fehlerPlz };
  if (!ort) return { ok: false, fehler: texte.adresse.fehlerOrt };

  return {
    ok: true,
    adresse: { strasse, adresszusatz: adresszusatz || null, plz, ort },
  };
}
