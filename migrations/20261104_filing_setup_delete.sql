-- Run after 20261104_filing_setup_edit.sql. Deleting a setup never deletes accruals.
begin;
create or replace function public.delete_accrual_filing_setup(p_setup_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot delete accrual setups'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if exists(select 1 from public.accrual_submissions where setup_id = p_setup_id) then
    raise exception 'This setup has accrual entries and cannot be deleted. Archive it instead';
  end if;
  delete from public.accrual_filing_setups where id = p_setup_id;
  perform public.sync_active_accrual_setup();
end;
$$;
revoke all on function public.delete_accrual_filing_setup(uuid) from public, anon;
grant execute on function public.delete_accrual_filing_setup(uuid) to authenticated;
commit;
