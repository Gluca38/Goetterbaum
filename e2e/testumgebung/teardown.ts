import { dienstZugang, ladeTestdaten, TEST_FIRMA_PRAEFIX } from "./testdaten";

// Reste abgebrochener Läufe werden erst nach dieser Zeit entfernt, damit
// ein gleichzeitig laufender Testlauf nicht seine Firma verliert.
const RESTE_AELTER_ALS_MS = 2 * 60 * 60 * 1000;

// Entfernt nach allen Browsertests die Test-Firmen dieses Laufs samt
// Zugängen wieder von Supabase-Staging.
export default async function teardown() {
  const supabase = dienstZugang();
  if (!supabase) return;

  const eigene = ladeTestdaten();
  const eigeneIds = eigene ? [eigene.firmaA.id, eigene.firmaB.id] : [];

  const grenze = new Date(Date.now() - RESTE_AELTER_ALS_MS).toISOString();
  const { data: reste, error } = await supabase
    .from("firma")
    .select("id")
    .like("name", `${TEST_FIRMA_PRAEFIX} %`)
    .lt("angelegt_am", grenze);
  if (error) throw error;

  const firmaIds = [...new Set([...eigeneIds, ...reste.map((f) => f.id)])];
  if (firmaIds.length === 0) return;

  // Zuerst die Logins, dann die Firmen (die Mitarbeiter verschwinden mit
  // ihrer Firma).
  const { data: mitarbeiter, error: fehler } = await supabase
    .from("mitarbeiter")
    .select("auth_user_id")
    .in("firma_id", firmaIds)
    .not("auth_user_id", "is", null);
  if (fehler) throw fehler;

  for (const { auth_user_id } of mitarbeiter) {
    const { error } = await supabase.auth.admin.deleteUser(auth_user_id);
    if (error) throw error;
  }

  const { error: loeschFehler } = await supabase.from("firma").delete().in("id", firmaIds);
  if (loeschFehler) throw loeschFehler;
}
