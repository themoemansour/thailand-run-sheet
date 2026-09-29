-- Run as one transaction in SQL tooling. This restores existing data via ROLLBACK.
-- This checks caller privileges and effects, not PostgREST's session-loaded safeupdate guard.
begin;
set local role anon;
do $$
declare expense_count bigint;
begin
  select count(*) into expense_count from public.thailand_expenses;
  perform public.thailand_clear_calendar();
  assert not exists (select 1 from public.thailand_placements), 'Calendar was not cleared';
  assert (select count(*) from public.thailand_expenses) = expense_count, 'Calendar clear changed expenses';
  perform public.thailand_reset_all();
  assert not exists (select 1 from public.thailand_expenses), 'Reset did not clear expenses';
  assert not exists (
    select 1 from public.thailand_settings s
    full join public.thailand_default_settings() d using (key)
    where s.key is null or d.key is null or s.value is distinct from d.value
  ), 'Reset did not restore default settings';
end $$;
rollback;
