-- Run after 20261104_filing_setups_archives.sql.
-- New setups stay inactive. Editing never changes activation or setup membership.
begin;
create or replace function public.create_accrual_filing_setup(p_name text, p_start_date date, p_cutoff_date date)
returns public.accrual_filing_setups language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot manage accrual setups'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 160
    or p_start_date is null or p_cutoff_date is null or p_cutoff_date < p_start_date then
    raise exception 'A name and valid filing dates are required';
  end if;
  perform pg_advisory_xact_lock(20261104, 1);
  insert into public.accrual_filing_setups(name, start_date, cutoff_date, is_active, created_by)
  values (btrim(p_name), p_start_date, p_cutoff_date, false, auth.jwt()->>'email') returning * into v_setup;
  return v_setup;
end;
$$;

create or replace function public.update_accrual_filing_setup(p_setup_id uuid, p_name text, p_start_date date, p_cutoff_date date)
returns public.accrual_filing_setups language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot manage accrual setups'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 160
    or p_start_date is null or p_cutoff_date is null or p_cutoff_date < p_start_date then
    raise exception 'A name and valid filing dates are required';
  end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if v_setup.is_archived then raise exception 'Archived setups are read only'; end if;
  update public.accrual_filing_setups set name = btrim(p_name), start_date = p_start_date,
    cutoff_date = p_cutoff_date, updated_at = now() where id = p_setup_id returning * into v_setup;
  if v_setup.is_active then perform public.sync_active_accrual_setup(); end if;
  return v_setup;
end;
$$;
revoke all on function public.create_accrual_filing_setup(text, date, date) from public, anon;
revoke all on function public.update_accrual_filing_setup(uuid, text, date, date) from public, anon;
grant execute on function public.create_accrual_filing_setup(text, date, date),
  public.update_accrual_filing_setup(uuid, text, date, date) to authenticated;
commit;
