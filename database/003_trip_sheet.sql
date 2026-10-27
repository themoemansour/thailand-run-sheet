-- Trip sheet (page 17): the shared version of Thailand_Trip_Cost_Split.xlsx.
-- Apply once in the Supabase SQL editor for project gvlpnygtuuouejndhzzh. Touches no existing object.
-- Same access model as the rest of the planner: anyone with the link can read and edit.
begin;

create table public.thailand_sheet (
  id uuid primary key,
  tab text not null check (tab in ('ledger','payments','setup')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 8000),
  sort_order bigint not null default 0 check (sort_order between 0 and 9007199254740991),
  created_at timestamptz not null default now()
);
create index thailand_sheet_order_idx on public.thailand_sheet (tab, sort_order, created_at, id);

alter table public.thailand_sheet enable row level security;
create policy thailand_sheet_select on public.thailand_sheet for select to anon using (true);
create policy thailand_sheet_insert on public.thailand_sheet for insert to anon with check (true);
create policy thailand_sheet_update on public.thailand_sheet for update to anon using (true) with check (true);
create policy thailand_sheet_delete on public.thailand_sheet for delete to anon using (true);
revoke all on public.thailand_sheet from public, anon, authenticated;
grant select, insert, update, delete on public.thailand_sheet to anon;

-- Starting rows copied from the workbook (Setup rate and the five hotel charges).
insert into public.thailand_sheet (id, tab, data, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'setup', '{"rate":33.5}', 0),
  ('5e1d0c4a-0b1a-4c35-9f0e-000000000001', 'ledger', '{"date":"2026-11-13","category":"Hotel","description":"Acqua Hotel — 3 nights, 3 rooms (11/13–11/16)","city":"Pattaya","paidBy":"Sepehr","amount":620,"currency":"USD","shares":{"Moe":1,"Zain":1,"Sepehr":1,"Zach":1,"Erfan":1,"Khader":1}}', 1),
  ('5e1d0c4a-0b1a-4c35-9f0e-000000000002', 'ledger', '{"date":"2026-11-16","category":"Hotel","description":"Radisson Red — 5 nights, 3 rooms (11/16–11/21)","city":"Phuket / Patong","paidBy":"Sepehr","amount":1976.55,"currency":"USD","shares":{"Moe":1,"Zain":1,"Sepehr":1,"Zach":1,"Erfan":1,"Khader":1}}', 2),
  ('5e1d0c4a-0b1a-4c35-9f0e-000000000003', 'ledger', '{"date":"2026-11-21","category":"Hotel","description":"Maison Hotel — 4 nights, 1 room (11/21–11/25)","city":"Bangkok","paidBy":"Moe","amount":366,"currency":"USD","shares":{"Moe":1,"Zain":1}}', 3),
  ('5e1d0c4a-0b1a-4c35-9f0e-000000000004', 'ledger', '{"date":"2026-11-21","category":"Hotel","description":"Maison Hotel — 5 nights, 1 room (11/21–11/26)","city":"Bangkok","paidBy":"Zach","amount":394,"currency":"USD","shares":{"Sepehr":1,"Zach":1,"Erfan":1,"Khader":1}}', 4),
  ('5e1d0c4a-0b1a-4c35-9f0e-000000000005', 'ledger', '{"date":"2026-11-21","category":"Hotel","description":"Maison Hotel — 6 nights, 1 room (11/21–11/27)","city":"Bangkok","paidBy":"Sepehr","amount":507,"currency":"USD","shares":{"Sepehr":1,"Zach":1,"Erfan":1,"Khader":1}}', 5);

alter publication supabase_realtime add table public.thailand_sheet;
commit;
