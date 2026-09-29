-- Retain caller privileges and RLS; make intentional shared clears explicit.
begin;
create or replace function public.thailand_clear_calendar()
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  delete from public.thailand_placements where id is not null;
end;
$$;
create or replace function public.thailand_reset_all()
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  delete from public.thailand_placements where id is not null;
  delete from public.thailand_expenses where id is not null;
  update public.thailand_settings s set value = d.value
    from public.thailand_default_settings() d where s.key = d.key;
end;
$$;
commit;
