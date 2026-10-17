-- Als abgerechnet markieren (Ticket #16)
--
-- Nach dem Export markiert das Büro eine Rechnungsvorbereitung als
-- abgerechnet. Gespeichert wird eine Abrechnung: Kunde, Zeitraum, die
-- Positionen und die Summe, wie der Rechenbaustein sie berechnet hat, wann
-- und von wem. Dazu, was sie umfasst:
-- * Zeiteinträge zeigen mit abgerechnet_in auf ihre Abrechnung. Jeder
--   Zeiteintrag steckt so in höchstens einer gültigen Abrechnung.
-- * Pauschal-Monate stehen in abrechnung_pauschal_monat. Ein Monat eines
--   Objekts steckt in höchstens einer gültigen Abrechnung.
--
-- Das Büro kann eine Abrechnung zurücknehmen. Wann und von wem steht an
-- der Abrechnung; die Zeiteinträge verlieren ihren Verweis und sind wieder
-- abrechenbar, die Pauschal-Monate ebenso. Jeder Zeiteintrag zeigt das in
-- seinem Änderungsprotokoll (#11), weil sich abgerechnet_in ändert. Die
-- Zeilen der Abrechnung bleiben stehen; nichts wird gelöscht.
--
-- Abrechnen und Zurücknehmen gehen nur über die beiden Funktionen unten;
-- sie setzen Zeitpunkt und Nutzer selbst. Direkt schreiben darf niemand
-- in die neuen Tabellen oder in abgerechnet_in.
--
-- Zugriffsrechte, die sich ändern:
-- * Abgerechnete Zeiteinträge sind für alle gesperrt, auch fürs Büro und
--   für den Dienstschlüssel. Auch die Freigabe lässt sich nicht mehr
--   zurücknehmen. Erst die Rücknahme der Abrechnung gibt sie wieder frei.
-- * Abrechnungen sieht nur das Büro der eigenen Firma.

begin;

-- ---------------------------------------------------------------------------
-- Abrechnung
-- ---------------------------------------------------------------------------

create table public.abrechnung (
  id uuid primary key default gen_random_uuid(),
  -- "on delete cascade" greift nur, wenn eine ganze Firma gelöscht wird
  -- (nur mit dem Dienstschlüssel möglich, z. B. Aufräumen nach Tests).
  firma_id uuid not null references public.firma (id) on delete cascade,
  kunde_id uuid not null,
  -- Erster Tag des ersten Monats; quartalsweise umfasst der Zeitraum drei.
  erster_monat date not null check (extract(day from erster_monat) = 1),
  abrechnungszeitraum public.abrechnungszeitraum not null,
  -- So, wie der Rechenbaustein sie berechnet hat: Stundensätze können sich
  -- später ändern, die Abrechnung nicht.
  positionen jsonb not null check (jsonb_typeof(positionen) = 'array'),
  summe_cent integer not null,
  abgerechnet_am timestamptz not null default now(),
  abgerechnet_von uuid not null,
  zurueckgenommen_am timestamptz,
  zurueckgenommen_von uuid,
  unique (id, firma_id),
  -- Kunde und Mitarbeiter gehören zur selben Firma.
  foreign key (kunde_id, firma_id) references public.kunde (id, firma_id),
  foreign key (abgerechnet_von, firma_id) references public.mitarbeiter (id, firma_id),
  foreign key (zurueckgenommen_von, firma_id) references public.mitarbeiter (id, firma_id),
  constraint zurueckgenommen_mit_wann_und_wer
    check ((zurueckgenommen_am is null) = (zurueckgenommen_von is null))
);

alter table public.abrechnung enable row level security;

-- Nur lesen. Schreiben tun allein die Funktionen unten.
revoke all on public.abrechnung from anon, authenticated, service_role;
grant select on public.abrechnung to authenticated, service_role;

create policy "Büro sieht die Abrechnungen der eigenen Firma"
  on public.abrechnung
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

comment on table public.abrechnung is
  'Eine als abgerechnet markierte Rechnungsvorbereitung. Schreiben nur über als_abgerechnet_markieren und abrechnung_zuruecknehmen.';

create index abrechnung_kunde_idx on public.abrechnung (kunde_id, abgerechnet_am);
create index abrechnung_firma_id_idx on public.abrechnung (firma_id);
create index abrechnung_abgerechnet_von_idx on public.abrechnung (abgerechnet_von);
create index abrechnung_zurueckgenommen_von_idx on public.abrechnung (zurueckgenommen_von);

-- ---------------------------------------------------------------------------
-- Abgerechnete Pauschal-Monate
-- ---------------------------------------------------------------------------

create table public.abrechnung_pauschal_monat (
  abrechnung_id uuid not null,
  firma_id uuid not null,
  objekt_id uuid not null,
  -- Erster Tag des Monats.
  monat date not null check (extract(day from monat) = 1),
  -- Wird bei der Rücknahme der Abrechnung falsch; die Zeile bleibt stehen.
  gueltig boolean not null default true,
  primary key (abrechnung_id, objekt_id, monat),
  foreign key (abrechnung_id, firma_id)
    references public.abrechnung (id, firma_id) on delete cascade,
  foreign key (objekt_id, firma_id) references public.objekt (id, firma_id)
);

alter table public.abrechnung_pauschal_monat enable row level security;

revoke all on public.abrechnung_pauschal_monat from anon, authenticated, service_role;
grant select on public.abrechnung_pauschal_monat to authenticated, service_role;

create policy "Büro sieht die abgerechneten Pauschal-Monate der eigenen Firma"
  on public.abrechnung_pauschal_monat
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

-- Ein Monat eines Objekts wird nur einmal abgerechnet.
create unique index abrechnung_pauschal_monat_einmal_idx
  on public.abrechnung_pauschal_monat (objekt_id, monat)
  where gueltig;
create index abrechnung_pauschal_monat_firma_id_idx
  on public.abrechnung_pauschal_monat (firma_id);

-- ---------------------------------------------------------------------------
-- Abgerechnete Zeiteinträge
-- ---------------------------------------------------------------------------

alter table public.zeiteintrag
  add column abgerechnet_in uuid,
  -- Die Abrechnung gehört zur selben Firma wie der Zeiteintrag.
  add constraint zeiteintrag_abgerechnet_in_fkey
    foreign key (abgerechnet_in, firma_id) references public.abrechnung (id, firma_id),
  add constraint nur_freigegebene_abrechnen
    check (abgerechnet_in is null or freigegeben_am is not null);

comment on column public.zeiteintrag.abgerechnet_in is
  'Die gültige Abrechnung, die den Zeiteintrag umfasst; leer, solange er nicht abgerechnet ist. Setzen nur die Abrechnungs-Funktionen.';

create index zeiteintrag_abgerechnet_in_idx on public.zeiteintrag (abgerechnet_in);

-- Ein abgerechneter Zeiteintrag ändert sich nicht mehr, für niemanden.
-- Erlaubt ist allein, abgerechnet_in zu leeren; das tut nur
-- abrechnung_zuruecknehmen, denn die Spalte darf sonst niemand ändern. Der
-- Name sorgt dafür, dass dieser Trigger vor den anderen läuft und die
-- Änderung so sieht, wie sie geschickt wurde.
create function privat.zeiteintrag_abgerechnet_sperren()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.abgerechnet_in is not null
     and (to_jsonb(new) - 'abgerechnet_in') is distinct from (to_jsonb(old) - 'abgerechnet_in')
  then
    raise exception 'Ein abgerechneter Zeiteintrag kann nicht geändert werden.'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger zeiteintrag_abgerechnet_sperren
  before update on public.zeiteintrag
  for each row
  execute function privat.zeiteintrag_abgerechnet_sperren();

revoke all on function privat.zeiteintrag_abgerechnet_sperren() from public;

-- ---------------------------------------------------------------------------
-- Abrechnen und Zurücknehmen
-- ---------------------------------------------------------------------------

-- Markiert eine Rechnungsvorbereitung als abgerechnet und gibt die
-- Kennung der neuen Abrechnung zurück. Positionen und Summe kommen aus dem
-- Rechenbaustein der App. Die Datenbank prüft, dass alles Übergebene zum
-- Kunden und Zeitraum gehört und noch nicht abgerechnet ist: Zeiteinträge
-- freigegeben, in Objekten des Kunden, vor dem Ende des Zeitraums;
-- Pauschal-Monate in Pauschal-Objekten des Kunden, im Zeitraum. Passt
-- etwas nicht, wird nichts gespeichert.
--
-- monate: Liste von {"objekt_id": …, "monat": "JJJJ-MM-01"}.
create function public.als_abgerechnet_markieren(
  fuer_kunde uuid,
  ab_monat date,
  eintraege uuid[],
  monate jsonb,
  aufstellung jsonb,
  summe integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ich uuid := privat.meine_mitarbeiter_id();
  firma uuid := privat.meine_firma_id();
  zeitraum public.abrechnungszeitraum;
  anzahl_monate integer;
  zeitraum_ende timestamptz;
  neu uuid;
  anzahl integer;
begin
  if privat.meine_rolle() is distinct from 'buero' then
    raise exception 'Abrechnen darf nur das Büro.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Sperrt den Kunden bis zum Ende: Zwei gleichzeitige Abrechnungen
  -- desselben Kunden warten aufeinander und rechnen nichts doppelt ab.
  select k.abrechnungszeitraum into zeitraum
  from public.kunde k
  where k.id = fuer_kunde and k.firma_id = firma
  for update;
  if not found then
    raise exception 'Diesen Kunden gibt es nicht.' using errcode = 'no_data_found';
  end if;

  anzahl_monate := case when zeitraum = 'quartalsweise' then 3 else 1 end;
  if extract(day from ab_monat) <> 1
     or (zeitraum = 'quartalsweise' and extract(month from ab_monat) not in (1, 4, 7, 10))
  then
    raise exception 'Der Zeitraum passt nicht zum Abrechnungszeitraum des Kunden.'
      using errcode = 'check_violation';
  end if;
  zeitraum_ende := (ab_monat + make_interval(months => anzahl_monate))::timestamp
    at time zone 'Europe/Berlin';

  eintraege := array(select distinct e from unnest(coalesce(eintraege, '{}')) e);
  monate := coalesce(monate, '[]');
  if cardinality(eintraege) = 0 and jsonb_array_length(monate) = 0 then
    raise exception 'Es gibt nichts abzurechnen.' using errcode = 'check_violation';
  end if;

  insert into public.abrechnung
    (firma_id, kunde_id, erster_monat, abrechnungszeitraum, positionen, summe_cent,
     abgerechnet_von)
  values (firma, fuer_kunde, ab_monat, zeitraum, aufstellung, summe, ich)
  returning id into neu;

  update public.zeiteintrag z
  set abgerechnet_in = neu
  where z.id = any (eintraege)
    and z.firma_id = firma
    and z.abgerechnet_in is null
    and z.freigegeben_am is not null
    and z.beginn < zeitraum_ende
    and z.objekt_id in (select o.id from public.objekt o where o.kunde_id = fuer_kunde);
  get diagnostics anzahl = row_count;
  if anzahl <> cardinality(eintraege) then
    raise exception 'Mindestens ein Zeiteintrag ist nicht (mehr) abrechenbar.'
      using errcode = 'check_violation';
  end if;

  -- Ein schon abgerechneter Monat scheitert am eindeutigen Index.
  insert into public.abrechnung_pauschal_monat (abrechnung_id, firma_id, objekt_id, monat)
  select neu, firma, p.objekt_id, p.monat
  from jsonb_to_recordset(monate) as p (objekt_id uuid, monat date)
  join public.objekt o
    on o.id = p.objekt_id
    and o.kunde_id = fuer_kunde
    and o.abrechnungsart = 'pauschale'
  where p.monat >= ab_monat
    and p.monat < ab_monat + make_interval(months => anzahl_monate);
  get diagnostics anzahl = row_count;
  if anzahl <> jsonb_array_length(monate) then
    raise exception 'Mindestens ein Pauschal-Monat gehört nicht zu dieser Abrechnung.'
      using errcode = 'check_violation';
  end if;

  return neu;
end
$$;

-- Nimmt eine gültige Abrechnung zurück: Zeiteinträge und Pauschal-Monate
-- sind danach wieder abrechenbar.
create function public.abrechnung_zuruecknehmen(welche uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if privat.meine_rolle() is distinct from 'buero' then
    raise exception 'Abrechnungen zurücknehmen darf nur das Büro.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.abrechnung a
  set zurueckgenommen_am = now(), zurueckgenommen_von = privat.meine_mitarbeiter_id()
  where a.id = welche
    and a.firma_id = privat.meine_firma_id()
    and a.zurueckgenommen_am is null;
  if not found then
    raise exception 'Diese Abrechnung gibt es nicht, oder sie ist schon zurückgenommen.'
      using errcode = 'no_data_found';
  end if;

  update public.zeiteintrag z set abgerechnet_in = null where z.abgerechnet_in = welche;
  update public.abrechnung_pauschal_monat p set gueltig = false where p.abrechnung_id = welche;
end
$$;

-- Fürs Büro: die Abrechnungen eines Kunden, die neueste zuerst, mit den
-- Namen dessen, der abgerechnet bzw. zurückgenommen hat. Läuft mit den
-- Rechten des Aufrufers; andere Rollen bekommen nichts.
create function public.abrechnungen_des_kunden(fuer_kunde uuid)
returns table (
  id uuid,
  erster_monat date,
  abrechnungszeitraum public.abrechnungszeitraum,
  summe_cent integer,
  abgerechnet_am timestamptz,
  abgerechnet_von_name text,
  zurueckgenommen_am timestamptz,
  zurueckgenommen_von_name text
)
language sql
stable
set search_path = ''
as $$
  select
    a.id, a.erster_monat, a.abrechnungszeitraum, a.summe_cent,
    a.abgerechnet_am, m.name, a.zurueckgenommen_am, r.name
  from public.abrechnung a
  join public.mitarbeiter m on m.id = a.abgerechnet_von
  left join public.mitarbeiter r on r.id = a.zurueckgenommen_von
  where a.kunde_id = fuer_kunde
  order by a.abgerechnet_am desc, a.id
$$;

revoke all on function public.als_abgerechnet_markieren(uuid, date, uuid[], jsonb, jsonb, integer)
  from public, anon;
revoke all on function public.abrechnung_zuruecknehmen(uuid) from public, anon;
revoke all on function public.abrechnungen_des_kunden(uuid) from public, anon;
grant execute on function public.als_abgerechnet_markieren(uuid, date, uuid[], jsonb, jsonb, integer)
  to authenticated;
grant execute on function public.abrechnung_zuruecknehmen(uuid) to authenticated;
grant execute on function public.abrechnungen_des_kunden(uuid) to authenticated;

commit;
