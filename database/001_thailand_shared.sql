-- Apply once to the confirmed Supabase project. No other public objects are modified.
begin;

create table public.thailand_placements (
  id uuid primary key,
  day_id text not null check (day_id in ('d13','d14','d15','d16','d17','d18','d19','d20','d21','d22','d23','d24','d25','d26')),
  slot text not null check (slot in ('morning','afternoon','evening','night')),
  activity_id text check (activity_id is null or (length(activity_id) between 1 and 80)),
  title text not null check (length(btrim(title)) between 1 and 200),
  cost_low numeric not null check (cost_low >= 0 and cost_low <= 100000000),
  cost_high numeric not null check (cost_high >= cost_low and cost_high <= 100000000),
  city text not null check (city in ('pattaya','phuket','bangkok','travel')),
  sort_order bigint not null default 0 check (sort_order between 0 and 9007199254740991),
  created_at timestamptz not null default now()
);
create index thailand_placements_order_idx on public.thailand_placements (day_id, slot, sort_order, created_at, id);

create function public.thailand_valid_split(p_split text[])
returns boolean language sql immutable set search_path = ''
as $$
  select cardinality(p_split) between 1 and 5
    and p_split <@ array['Moe','Sepehr','Zach','Erfan','Khader']::text[]
    and (select count(distinct n) from unnest(p_split) as n) = cardinality(p_split);
$$;

create table public.thailand_expenses (
  id uuid primary key,
  description text not null check (length(btrim(description)) between 1 and 500),
  amount_thb numeric not null check (amount_thb > 0 and amount_thb <= 1000000000),
  payer text not null check (payer in ('Moe','Sepehr','Zach','Erfan','Khader')),
  split text[] not null check (public.thailand_valid_split(split)),
  created_at timestamptz not null default now()
);

create function public.thailand_valid_setting(p_key text, p_value jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when p_key = 'mode' then p_value in ('"cash"'::jsonb, '"points"'::jsonb)
    when p_key = 'party' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 1 and 12 and (p_value #>> '{}')::numeric % 1 = 0
    when p_key = 'travelCredit' or p_key in ('b1.done','b2.done','b3.done')
      or p_key ~ '^check\.(0[1-9]|1[0-9]|2[0-4])$'
      then jsonb_typeof(p_value) = 'boolean'
    when p_key in ('ptNights','ptRate','ptPts','phNights','phRate','phPts','bkNights','bkRate','bkPts',
                   'balUR','balMR','cDays','cDaily','cActs','cFee','b1.cost','b2.cost','b3.cost')
      then jsonb_typeof(p_value) = 'number'
        and (p_value #>> '{}')::numeric between (case when p_key = 'cDays' then 1 else 0 end) and 1000000000
    else false
  end;
$$;

create table public.thailand_settings (
  key text primary key,
  value jsonb not null,
  constraint thailand_settings_valid check (public.thailand_valid_setting(key, value))
);

create function public.thailand_default_settings()
returns table(key text, value jsonb) language sql immutable set search_path = ''
as $$
  select x.key, x.value from jsonb_each(
    '{
      "mode":"cash","party":5,"travelCredit":true,
      "ptNights":6,"ptRate":45,"ptPts":10000,
      "phNights":15,"phRate":65,"phPts":10000,
      "bkNights":12,"bkRate":60,"bkPts":11000,
      "balUR":0,"balMR":0,"cDays":14,"cDaily":2000,"cActs":12000,"cFee":220,
      "b1.cost":765,"b1.done":false,"b2.cost":431,"b2.done":false,"b3.cost":640,"b3.done":false,
      "check.01":false,"check.02":false,"check.03":false,"check.04":false,"check.05":false,"check.06":false,
      "check.07":false,"check.08":false,"check.09":false,"check.10":false,"check.11":false,"check.12":false,
      "check.13":false,"check.14":false,"check.15":false,"check.16":false,"check.17":false,"check.18":false,
      "check.19":false,"check.20":false,"check.21":false,"check.22":false,"check.23":false,"check.24":false
    }'::jsonb
  ) as x(key, value);
$$;

insert into public.thailand_settings(key, value)
select key, value from public.thailand_default_settings();

alter table public.thailand_placements enable row level security;
alter table public.thailand_expenses enable row level security;
alter table public.thailand_settings enable row level security;

-- The product intentionally gives any visitor with the link the same access.
create policy thailand_placements_select on public.thailand_placements for select to anon using (true);
create policy thailand_placements_insert on public.thailand_placements for insert to anon with check (true);
create policy thailand_placements_update on public.thailand_placements for update to anon using (true) with check (true);
create policy thailand_placements_delete on public.thailand_placements for delete to anon using (true);
create policy thailand_expenses_select on public.thailand_expenses for select to anon using (true);
create policy thailand_expenses_insert on public.thailand_expenses for insert to anon with check (true);
create policy thailand_expenses_delete on public.thailand_expenses for delete to anon using (true);
create policy thailand_settings_select on public.thailand_settings for select to anon using (true);
create policy thailand_settings_update on public.thailand_settings for update to anon using (true) with check (true);

revoke all on public.thailand_placements, public.thailand_expenses, public.thailand_settings from public, anon, authenticated;
grant select, insert, update, delete on public.thailand_placements to anon;
grant select, insert, delete on public.thailand_expenses to anon;
grant select, update on public.thailand_settings to anon;

create function public.thailand_clear_calendar()
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  delete from public.thailand_placements;
end;
$$;

create function public.thailand_reset_all()
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  delete from public.thailand_placements;
  delete from public.thailand_expenses;
  update public.thailand_settings s set value = d.value
    from public.thailand_default_settings() d where s.key = d.key;
end;
$$;

create function public.thailand_import_records(p_placements jsonb, p_expenses jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
declare
  placement_count integer;
  expense_count integer;
begin
  if jsonb_typeof(p_placements) is distinct from 'array'
    or jsonb_typeof(p_expenses) is distinct from 'array'
    or jsonb_array_length(p_placements) > 1000
    or jsonb_array_length(p_expenses) > 1000 then
    raise exception 'Import must contain arrays of at most 1000 records';
  end if;

  insert into public.thailand_placements
    (id, day_id, slot, activity_id, title, cost_low, cost_high, city, sort_order, created_at)
  select id, day_id, slot, activity_id, title, cost_low, cost_high, city,
         coalesce(sort_order, 0), coalesce(created_at, now())
    from jsonb_to_recordset(p_placements) as r(
      id uuid, day_id text, slot text, activity_id text, title text,
      cost_low numeric, cost_high numeric, city text, sort_order bigint, created_at timestamptz
    )
  on conflict (id) do nothing;
  get diagnostics placement_count = row_count;

  insert into public.thailand_expenses
    (id, description, amount_thb, payer, split, created_at)
  select id, description, amount_thb, payer, split, coalesce(created_at, now())
    from jsonb_to_recordset(p_expenses) as r(
      id uuid, description text, amount_thb numeric, payer text, split text[], created_at timestamptz
    )
  on conflict (id) do nothing;
  get diagnostics expense_count = row_count;

  return jsonb_build_object('placements', placement_count, 'expenses', expense_count);
end;
$$;

revoke all on function public.thailand_valid_split(text[]), public.thailand_valid_setting(text,jsonb), public.thailand_default_settings(),
  public.thailand_clear_calendar(), public.thailand_reset_all(),
  public.thailand_import_records(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.thailand_clear_calendar(), public.thailand_reset_all(),
  public.thailand_import_records(jsonb,jsonb) to anon;
grant execute on function public.thailand_valid_split(text[]), public.thailand_valid_setting(text,jsonb),
  public.thailand_default_settings() to anon;

-- Supabase projects already have this publication. Limit this migration to app tables.
alter publication supabase_realtime add table public.thailand_placements, public.thailand_expenses, public.thailand_settings;
commit;
