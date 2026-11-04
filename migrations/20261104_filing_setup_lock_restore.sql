-- Run after filing_setups_archives, filing_setup_edit and filing_setup_delete.
-- Lock -> Archive; Unlock -> Unarchive. Restored setups always remain inactive.
begin;
alter table public.accrual_filing_setups
  add column if not exists is_locked boolean not null default false,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists unlocked_at timestamptz,
  add column if not exists unlocked_by text,
  add column if not exists unarchived_at timestamptz,
  add column if not exists unarchived_by text;
alter table public.accrual_submissions
  add column if not exists unarchived_at timestamptz,
  add column if not exists unarchived_by text;
-- Preserve existing archives and initialize their lock state once.
update public.accrual_filing_setups set is_locked = true, locked_at = coalesce(locked_at, archived_at, now()),
  locked_by = coalesce(locked_by, archived_by, 'Migration')
where is_archived and locked_at is null;
alter table public.accrual_filing_setups drop constraint if exists locked_setup_inactive;
alter table public.accrual_filing_setups add constraint locked_setup_inactive check (not (is_active and is_locked));

create or replace function public.set_accrual_filing_setup_locked(p_setup_id uuid, p_locked boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot lock or unlock accrual setups'; end if;
  if p_locked is null then raise exception 'A lock state is required'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if v_setup.is_locked = p_locked then return; end if;
  update public.accrual_filing_setups set is_locked = p_locked, is_active = false, updated_at = now(),
    locked_at = case when p_locked then now() else locked_at end,
    locked_by = case when p_locked then auth.jwt()->>'email' else locked_by end,
    unlocked_at = case when not p_locked then now() else unlocked_at end,
    unlocked_by = case when not p_locked then auth.jwt()->>'email' else unlocked_by end
  where id = p_setup_id;
  perform public.sync_active_accrual_setup();
end;
$$;

create or replace function public.archive_accrual_filing_setup(p_setup_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups; v_count bigint;
begin
  if not public.can_update_setup() then raise exception 'You cannot archive accrual setups'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if not v_setup.is_locked then raise exception 'Lock the setup before archiving it'; end if;
  if v_setup.is_archived then return 0; end if;
  update public.accrual_filing_setups set is_archived = true, is_active = false,
    archived_at = now(), archived_by = auth.jwt()->>'email', updated_at = now() where id = p_setup_id;
  update public.accrual_submissions set is_archived = true, archived_at = now(), archived_by = auth.jwt()->>'email'
    where setup_id = p_setup_id and not is_archived;
  get diagnostics v_count = row_count;
  perform public.sync_active_accrual_setup();
  return v_count;
end;
$$;

create or replace function public.unarchive_accrual_filing_setup(p_setup_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups; v_count bigint;
begin
  if not public.can_update_setup() then raise exception 'You cannot unarchive accrual setups'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if v_setup.is_locked then raise exception 'Unlock the setup before unarchiving it'; end if;
  if not v_setup.is_archived then raise exception 'This setup is not archived'; end if;
  update public.accrual_filing_setups set is_archived = false, is_active = false,
    unarchived_at = now(), unarchived_by = auth.jwt()->>'email', updated_at = now() where id = p_setup_id;
  update public.accrual_submissions set is_archived = false, unarchived_at = now(), unarchived_by = auth.jwt()->>'email'
    where setup_id = p_setup_id and is_archived;
  get diagnostics v_count = row_count;
  perform public.sync_active_accrual_setup();
  return v_count;
end;
$$;

create or replace function public.set_accrual_filing_setup_active(p_setup_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot manage accrual setups'; end if;
  if p_active is null then raise exception 'An activation state is required'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if v_setup.is_locked then raise exception 'Unlock the setup before changing activation'; end if;
  if v_setup.is_archived then raise exception 'Unarchive the setup before activating it'; end if;
  if p_active and (v_setup.start_date is null or v_setup.cutoff_date is null) then raise exception 'Setup dates are missing'; end if;
  if p_active then update public.accrual_filing_setups set is_active = false, updated_at = now() where is_active; end if;
  update public.accrual_filing_setups set is_active = p_active, updated_at = now() where id = p_setup_id;
  perform public.sync_active_accrual_setup();
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
  if v_setup.is_locked then raise exception 'Unlock the setup before editing it'; end if;
  if v_setup.is_archived then raise exception 'Unarchive the setup before editing it'; end if;
  update public.accrual_filing_setups set name = btrim(p_name), start_date = p_start_date,
    cutoff_date = p_cutoff_date, updated_at = now() where id = p_setup_id returning * into v_setup;
  if v_setup.is_active then perform public.sync_active_accrual_setup(); end if;
  return v_setup;
end;
$$;

create or replace function public.delete_accrual_filing_setup(p_setup_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot delete accrual setups'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if v_setup.is_locked then raise exception 'Unlock the setup before deleting it'; end if;
  if v_setup.is_archived then raise exception 'Unarchive the setup before deleting it'; end if;
  if exists(select 1 from public.accrual_submissions where setup_id = p_setup_id) then
    raise exception 'This setup has accrual entries and cannot be deleted. Archive it instead';
  end if;
  delete from public.accrual_filing_setups where id = p_setup_id;
  perform public.sync_active_accrual_setup();
end;
$$;

-- Only archive metadata may change during a managed archive/unarchive operation.
-- Locked and archived business data remains immutable, including after unlocking an archive.
create or replace function public.guard_accrual_setup_membership()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then raise exception 'Sign in to submit accruals'; end if;
    perform pg_advisory_xact_lock(20261104, 1);
    select * into v_setup from public.accrual_filing_setups where is_active and not is_archived and not is_locked;
    if not found or v_setup.start_date is null or v_setup.cutoff_date is null
      or (now() at time zone 'Asia/Shanghai')::date not between v_setup.start_date and v_setup.cutoff_date then
      raise exception 'The accrual filing period is closed or not configured';
    end if;
    if new.setup_id is not null and new.setup_id <> v_setup.id then raise exception 'The active filing setup changed. Refresh and try again'; end if;
    new.setup_id := v_setup.id; new.is_archived := false;
    new.archived_at := null; new.archived_by := null; new.unarchived_at := null; new.unarchived_by := null;
    return new;
  end if;
  select * into v_setup from public.accrual_filing_setups where id = old.setup_id;
  if tg_op = 'UPDATE' then
    if new.setup_id is distinct from old.setup_id then raise exception 'An accrual cannot move to another setup'; end if;
    if new.is_archived is distinct from old.is_archived then
      if not public.can_update_setup() or new.is_archived <> v_setup.is_archived
        or (new.is_archived and not v_setup.is_locked) or (not new.is_archived and v_setup.is_locked)
        or (to_jsonb(new) - array['is_archived','archived_at','archived_by','unarchived_at','unarchived_by'])
          is distinct from (to_jsonb(old) - array['is_archived','archived_at','archived_by','unarchived_at','unarchived_by']) then
        raise exception 'Use the setup archive or unarchive operation';
      end if;
      return new;
    end if;
  end if;
  if old.is_archived or v_setup.is_archived then raise exception 'Archived accruals are read only'; end if;
  if v_setup.is_locked then raise exception 'This filing setup is locked; its accruals are read only'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.guard_archived_accrual_child()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform pg_advisory_xact_lock(20261104, 1);
  if tg_op = 'DELETE' then v_id := old.submission_id; else v_id := new.submission_id; end if;
  perform 1 from public.accrual_submissions where id = v_id for share;
  if exists(select 1 from public.accrual_submissions s join public.accrual_filing_setups f on f.id = s.setup_id
    where s.id = v_id and (s.is_archived or f.is_archived or f.is_locked)) then
    raise exception 'This accrual belongs to a locked or archived setup and is read only';
  end if;
  if tg_op = 'UPDATE' and old.submission_id is distinct from new.submission_id then raise exception 'An accrual line or note cannot move to another accrual'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.set_accrual_filing_setup_locked(uuid, boolean) from public, anon;
revoke all on function public.unarchive_accrual_filing_setup(uuid) from public, anon;
grant execute on function public.set_accrual_filing_setup_locked(uuid, boolean), public.unarchive_accrual_filing_setup(uuid) to authenticated;
commit;
