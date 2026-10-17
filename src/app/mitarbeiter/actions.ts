"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { alsBuero } from "@/lib/als-buero";
import { pruefeMitarbeiterEingabe } from "@/lib/mitarbeiter/eingabe";
import { einladungsFehler, pruefeAenderung } from "@/lib/mitarbeiter/regeln";
import { ladeMitarbeiter } from "@/lib/mitarbeiter/verwaltung";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { createDienstClient } from "@/lib/supabase/dienst";
import { texte } from "@/texte";

export async function anlegen(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const eingabe = pruefeMitarbeiterEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { data, error } = await supabase
    .from("mitarbeiter")
    .insert({ firma_id: ich.firma_id, ...eingabe.daten })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    console.error("Mitarbeiter anlegen fehlgeschlagen", error);
    return FEHLER(texte.mitarbeiter.fehlerUnbekannt);
  }

  redirect(`/mitarbeiter/${data.id}`);
}

export async function speichern(
  id: string,
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const bestand = await ladeMitarbeiter(supabase, id);
  if (!bestand) return FEHLER(texte.mitarbeiter.nichtGefunden);

  const eingabe = pruefeMitarbeiterEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);
  const neu = eingabe.daten;

  const regelverstoss = pruefeAenderung(
    bestand,
    { ...neu, aktiv: bestand.aktiv },
    ich.id,
  );
  if (regelverstoss) return FEHLER(regelverstoss);

  // Gibt es schon einen Login, zieht dessen E-Mail mit. So kommt eine
  // erneute Einladung an der neuen Adresse an, und wer schon ein
  // Passwort hat, meldet sich künftig mit der neuen Adresse an.
  if (bestand.authUserId && neu.email && neu.email !== bestand.email) {
    const { error } = await createDienstClient().auth.admin.updateUserById(
      bestand.authUserId,
      { email: neu.email },
    );
    if (error) {
      if (error.code === "email_exists") {
        return FEHLER(texte.mitarbeiter.einladung.fehlerEmailVergeben);
      }
      console.error("E-Mail des Logins ändern fehlgeschlagen", error);
      return FEHLER(texte.mitarbeiter.fehlerUnbekannt);
    }
  }

  const { error } = await supabase
    .from("mitarbeiter")
    .update(neu)
    .eq("id", id);
  if (error) {
    console.error("Mitarbeiter speichern fehlgeschlagen", error);
    return FEHLER(texte.mitarbeiter.fehlerUnbekannt);
  }

  refresh();
  return OK(texte.mitarbeiter.gespeichert);
}

export async function aktivSetzen(
  id: string,
  aktiv: boolean,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const bestand = await ladeMitarbeiter(supabase, id);
  if (!bestand) return FEHLER(texte.mitarbeiter.nichtGefunden);

  const regelverstoss = pruefeAenderung(bestand, { ...bestand, aktiv }, ich.id);
  if (regelverstoss) return FEHLER(regelverstoss);

  const { error } = await supabase
    .from("mitarbeiter")
    .update({ aktiv })
    .eq("id", id);
  if (error) {
    console.error("Aktiv-Status ändern fehlgeschlagen", error);
    return FEHLER(texte.mitarbeiter.fehlerUnbekannt);
  }

  refresh();
  return OK();
}

export async function einladen(
  id: string,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  // Über den eigenen Zugang geladen: Mitarbeiter fremder Firmen findet
  // die Datenbank gar nicht erst.
  const bestand = await ladeMitarbeiter(supabase, id);
  if (!bestand) return FEHLER(texte.mitarbeiter.nichtGefunden);
  if (!bestand.aktiv || !bestand.email) {
    return FEHLER(texte.mitarbeiter.einladung.fehlerUnbekannt);
  }

  // Supabase legt den Login an (bzw. findet den noch nicht bestätigten)
  // und verschickt die Einladung. Wurde der Einladungslink schon geöffnet,
  // gilt der Login als bestätigt und Supabase lehnt ab.
  const dienst = createDienstClient();
  const { data, error } = await dienst.auth.admin.inviteUserByEmail(
    bestand.email,
  );
  if (error) {
    if (error.code !== "email_exists") {
      console.error("Einladung fehlgeschlagen", error);
    }
    return FEHLER(einladungsFehler(error.code, bestand.hatZugang));
  }

  if (data.user.id !== bestand.authUserId) {
    // Die Verknüpfung darf nur der Server setzen (siehe Migration).
    // firma_id als zusätzliche Sicherung gegen fremde Datensätze.
    const { error: fehler } = await dienst
      .from("mitarbeiter")
      .update({ auth_user_id: data.user.id })
      .eq("id", id)
      .eq("firma_id", ich.firma_id);
    if (fehler) {
      // Doppelte Verknüpfung: Der Login gehört schon zu einem anderen
      // Mitarbeiter.
      if (fehler.code === "23505") {
        return FEHLER(texte.mitarbeiter.einladung.fehlerEmailVergeben);
      }
      console.error("Login verknüpfen fehlgeschlagen", fehler);
      return FEHLER(texte.mitarbeiter.einladung.fehlerUnbekannt);
    }
  }

  refresh();
  return OK(texte.mitarbeiter.einladung.verschickt(bestand.email));
}
