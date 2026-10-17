import type { Adresse } from "@/lib/adresse";
import { texte } from "@/texte";

// Die Felder einer Anschrift (Straße, Zusatz, PLZ, Ort) unter einer
// gemeinsamen Überschrift, für Kunden- wie Objekt-Formular.
export function AdressFelder({
  titel,
  vorgabe,
}: {
  titel: string;
  vorgabe?: Partial<Adresse>;
}) {
  return (
    <fieldset>
      <legend>{titel}</legend>
      <p>
        <label>
          {texte.adresse.strasse}
          <br />
          <input name="strasse" defaultValue={vorgabe?.strasse} required />
        </label>
      </p>
      <p>
        <label>
          {texte.adresse.adresszusatz}
          <br />
          <input name="adresszusatz" defaultValue={vorgabe?.adresszusatz ?? ""} />
        </label>
      </p>
      <p>
        <label>
          {texte.adresse.plz}
          <br />
          <input
            name="plz"
            defaultValue={vorgabe?.plz}
            required
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            size={5}
          />
        </label>
      </p>
      <p>
        <label>
          {texte.adresse.ort}
          <br />
          <input name="ort" defaultValue={vorgabe?.ort} required />
        </label>
      </p>
    </fieldset>
  );
}
