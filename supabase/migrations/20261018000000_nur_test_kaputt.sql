-- NUR ZUM TEST (#25): Syntaxfehler im 3. Befehl, wird wieder entfernt
begin;

create type public.probe_typ as enum ('a', 'b');

create table public.probe_tabelle (id uuid primary key default gen_random_uuid(), art public.probe_typ);

alter tabel public.probe_tabelle enable row level security;

commit;
