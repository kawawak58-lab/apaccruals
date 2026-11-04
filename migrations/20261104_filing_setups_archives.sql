-- Apply after 20261030_expense_class_optional_fields.sql, before deploying the UI.
-- Keeps existing accruals, lines, notes and control numbers in their original tables.
begin;

alter table public.users drop constraint if exists users_usergroup_check;
alter table public.users add constraint users_usergroup_check
  check (usergroup in ('sysadmin', 'accrual_admin', 'accrual_user'));
update public.users set can_update_setup = false, can_update_control_number = false
where usergroup = 'accrual_admin';

create or replace function public.is_accrual_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where auth_user_id = auth.uid()
    and usergroup in ('sysadmin', 'accrual_admin'));
$$;
create or replace function public.can_update_setup()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where auth_user_id = auth.uid()
    and (usergroup = 'sysadmin' or (usergroup <> 'accrual_admin' and can_update_setup)));
$$;
create or replace function public.can_update_control_number()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where auth_user_id = auth.uid()
    and usergroup <> 'accrual_admin' and can_update_control_number);
$$;
revoke all on function public.is_accrual_admin() from public, anon;
grant execute on function public.is_accrual_admin() to authenticated;

create table if not exists public.accrual_filing_setups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  start_date date,
  cutoff_date date,
  is_active boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by text,
  archived_at timestamptz,
  archived_by text,
  updated_at timestamptz not null default now(),
  constraint filing_setup_dates check (cutoff_date >= start_date),
  constraint archived_setup_inactive check (not (is_active and is_archived))
);
create unique index if not exists one_active_accrual_filing_setup
  on public.accrual_filing_setups ((true)) where is_active;

alter table public.accrual_submissions
  add column if not exists setup_id uuid references public.accrual_filing_setups(id),
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

-- Only the current legacy window is known. Do not guess historical periods by dates.
-- Linking legacy rows is a migration, not a user edit; retain their audit timestamps.
alter table public.accrual_submissions disable trigger trg_accrual_submissions_updated_at;
do $$
declare v_id uuid;
begin
  if not exists(select 1 from public.accrual_filing_setups) then
    insert into public.accrual_filing_setups(name, start_date, cutoff_date, is_active)
    select 'Imported filing window', start_date, cutoff_date,
      start_date is not null and cutoff_date is not null
    from public.accrual_setup where id = true returning id into v_id;
    if v_id is null then
      insert into public.accrual_filing_setups(name) values ('Imported filing window') returning id into v_id;
    end if;
    update public.accrual_submissions set setup_id = v_id where setup_id is null;
  end if;
end;
$$;
alter table public.accrual_submissions alter column setup_id set not null;
alter table public.accrual_submissions enable trigger trg_accrual_submissions_updated_at;
create index if not exists accrual_archive_setup_idx on public.accrual_submissions(is_archived, setup_id);

alter table public.accrual_filing_setups enable row level security;
revoke all on public.accrual_filing_setups from public, anon, authenticated;
grant select on public.accrual_filing_setups to authenticated;
drop policy if exists "filing setups read" on public.accrual_filing_setups;
create policy "filing setups read" on public.accrual_filing_setups
for select to authenticated using (not is_archived or public.is_accrual_admin());

-- The legacy singleton remains a read-only mirror for older RPCs and clients.
revoke update on public.accrual_setup from authenticated;
create or replace function public.sync_active_accrual_setup()
returns void language sql security definer set search_path = public as $$
  insert into public.accrual_setup(id, start_date, cutoff_date)
  values (true,
    (select start_date from public.accrual_filing_setups where is_active),
    (select cutoff_date from public.accrual_filing_setups where is_active))
  on conflict (id) do update set start_date = excluded.start_date, cutoff_date = excluded.cutoff_date;
$$;
revoke all on function public.sync_active_accrual_setup() from public, anon, authenticated;

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

create or replace function public.set_accrual_filing_setup_active(p_setup_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if not public.can_update_setup() then raise exception 'You cannot manage accrual setups'; end if;
  if p_active is null then raise exception 'An activation state is required'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  select * into v_setup from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  if v_setup.is_archived then raise exception 'Archived setups are read only'; end if;
  if p_active and (v_setup.start_date is null or v_setup.cutoff_date is null) then raise exception 'Setup dates are missing'; end if;
  if p_active then
    update public.accrual_filing_setups set is_active = false, updated_at = now() where is_active;
  end if;
  update public.accrual_filing_setups set is_active = p_active, updated_at = now() where id = p_setup_id;
  perform public.sync_active_accrual_setup();
end;
$$;

create or replace function public.archive_accrual_filing_setup(p_setup_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_count bigint;
begin
  if not public.can_update_setup() then raise exception 'You cannot archive accrual setups'; end if;
  perform pg_advisory_xact_lock(20261104, 1);
  perform 1 from public.accrual_filing_setups where id = p_setup_id for update;
  if not found then raise exception 'Setup not found'; end if;
  update public.accrual_filing_setups set is_archived = true, is_active = false,
    archived_at = coalesce(archived_at, now()), archived_by = coalesce(archived_by, auth.jwt()->>'email'), updated_at = now()
  where id = p_setup_id;
  update public.accrual_submissions set is_archived = true, archived_at = now(), archived_by = auth.jwt()->>'email'
  where setup_id = p_setup_id and not is_archived;
  get diagnostics v_count = row_count;
  perform public.sync_active_accrual_setup();
  return v_count;
end;
$$;
revoke all on function public.create_accrual_filing_setup(text, date, date) from public, anon;
revoke all on function public.set_accrual_filing_setup_active(uuid, boolean) from public, anon;
revoke all on function public.archive_accrual_filing_setup(uuid) from public, anon;
grant execute on function public.create_accrual_filing_setup(text, date, date),
  public.set_accrual_filing_setup_active(uuid, boolean), public.archive_accrual_filing_setup(uuid) to authenticated;

-- Every creation route, including uploads and older submit RPCs, gets the active setup.
create or replace function public.guard_accrual_setup_membership()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_setup public.accrual_filing_setups;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then raise exception 'Sign in to submit accruals'; end if;
    perform pg_advisory_xact_lock(20261104, 1);
    select * into v_setup from public.accrual_filing_setups where is_active and not is_archived;
    if not found or v_setup.start_date is null or v_setup.cutoff_date is null
      or (now() at time zone 'Asia/Shanghai')::date not between v_setup.start_date and v_setup.cutoff_date then
      raise exception 'The accrual filing period is closed or not configured';
    end if;
    if new.setup_id is not null and new.setup_id <> v_setup.id then
      raise exception 'The active filing setup changed. Refresh and try again';
    end if;
    new.setup_id := v_setup.id;
    new.is_archived := false; new.archived_at := null; new.archived_by := null;
    return new;
  end if;
  if old.is_archived then raise exception 'Archived accruals are read only'; end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.setup_id is distinct from old.setup_id then raise exception 'An accrual cannot move to another setup'; end if;
  if new.is_archived then
    if not public.can_update_setup() or not exists(select 1 from public.accrual_filing_setups where id = old.setup_id and is_archived) then
      raise exception 'Use Archive setup to archive accruals';
    end if;
  elsif exists(select 1 from public.accrual_filing_setups where id = old.setup_id and is_archived) then
    raise exception 'Archived accruals are read only';
  end if;
  return new;
end;
$$;
drop trigger if exists accrual_setup_membership on public.accrual_submissions;
create trigger accrual_setup_membership before insert or update or delete on public.accrual_submissions
for each row execute function public.guard_accrual_setup_membership();

create or replace function public.guard_archived_accrual_child()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if tg_op = 'DELETE' then v_id := old.submission_id; else v_id := new.submission_id; end if;
  -- A shared parent lock serializes note/line changes against archiving.
  perform 1 from public.accrual_submissions where id = v_id for share;
  if exists(select 1 from public.accrual_submissions where id = v_id and is_archived) then
    raise exception 'Archived accruals are read only';
  end if;
  if tg_op = 'UPDATE' and old.submission_id is distinct from new.submission_id then
    raise exception 'An accrual line or note cannot move to another accrual';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists archived_accrual_lines_guard on public.accrual_submission_lines;
create trigger archived_accrual_lines_guard before insert or update or delete on public.accrual_submission_lines
for each row execute function public.guard_archived_accrual_child();
drop trigger if exists archived_accrual_notes_guard on public.accrual_notes;
create trigger archived_accrual_notes_guard before insert or update or delete on public.accrual_notes
for each row execute function public.guard_archived_accrual_child();

-- Record access is enforced by RLS as well as the client filters.
drop policy if exists "public accrual submissions read" on public.accrual_submissions;
create policy "public accrual submissions read" on public.accrual_submissions for select to authenticated
using (public.is_accrual_admin() or (not is_archived and lower(maker) = lower(coalesce(auth.jwt()->>'email', ''))));
revoke insert, update, delete on public.accrual_submissions from anon, authenticated;
revoke insert, update, delete on public.accrual_submission_lines from anon, authenticated;
drop policy if exists "public accrual submission lines read" on public.accrual_submission_lines;
create policy "public accrual submission lines read" on public.accrual_submission_lines for select to authenticated
using (exists(select 1 from public.accrual_submissions s where s.id = submission_id));
drop policy if exists "authenticated accrual notes read" on public.accrual_notes;
create policy "authenticated accrual notes read" on public.accrual_notes for select to authenticated
using (exists(select 1 from public.accrual_submissions s where s.id = submission_id));

-- Accrual Admin may maintain master data but cannot administer users or announcements.
drop policy if exists "public announcements write" on public.announcements;
create policy "public announcements write" on public.announcements for all to authenticated
using (public.is_sysadmin()) with check (public.is_sysadmin());

-- RPC replacements for the broader accrual role are appended below.

create or replace function public.update_accrual_draft(
  p_submission_id bigint, p_header jsonb, p_line_items jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.accrual_submissions%rowtype;
  v_line jsonb;
  v_number integer := 0;
  v_editor text := coalesce(nullif(auth.jwt()->>'email', ''), 'System');
begin
  perform pg_advisory_xact_lock(20261104, 1);
  if auth.uid() is null then raise exception 'Sign in to edit this accrual'; end if;
  select * into v_submission
  from public.accrual_submissions
  where id = p_submission_id
  for update;
  if not found then raise exception 'Accrual not found'; end if;
  if not public.is_accrual_admin()
    and lower(v_submission.maker) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'You cannot edit this accrual';
  end if;
  if v_submission.status <> 2 then raise exception 'Only For Confirmation accruals can be edited'; end if;
  perform public.validate_accrual_draft_payload(p_header, p_line_items);

  update public.accrual_submissions set
    requester_email = trim(p_header->>'requester_email'),
    expense_class = trim(p_header->>'expense_class'),
    company = trim(p_header->>'company'),
    supplier_code = trim(p_header->>'supplier_code'),
    supplier_name = trim(p_header->>'supplier_name'),
    invoice_no = coalesce(
      nullif(trim(p_header->>'invoice_no'), ''),
      (select nullif(trim(default_invoice_no), '') from public.expense_classes where lower(name) = lower(trim(p_header->>'expense_class')))
    ),
    updated_at = timezone('utc', now()),
    updated_by = v_editor
  where id = p_submission_id;

  delete from public.accrual_submission_lines where submission_id = p_submission_id;
  for v_line in select value from jsonb_array_elements(p_line_items) loop
    v_number := v_number + 1;
    insert into public.accrual_submission_lines (
      submission_id, line_number, gross_amount, glaccount_code, glaccount_name,
      profitcenter_code, profitcenter_name, transaction_type, vat, tax_code, remarks
    ) values (
      p_submission_id, v_number, (v_line->>'gross_amount')::numeric,
      trim(v_line->>'glaccount_code'), nullif(trim(v_line->>'glaccount_name'), ''),
      trim(v_line->>'profitcenter_code'), nullif(trim(v_line->>'profitcenter_name'), ''),
      trim(v_line->>'transaction_type'), nullif(trim(v_line->>'vat'), ''),
      nullif(trim(v_line->>'tax_code'), ''), trim(v_line->>'remarks')
    );
  end loop;
  return true;
end;
$$;

create or replace function public.confirm_accrual_submission(p_submission_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.accrual_submissions%rowtype;
  v_lines jsonb;
begin
  perform pg_advisory_xact_lock(20261104, 1);
  if auth.uid() is null then raise exception 'Sign in to confirm an accrual'; end if;
  select * into v_submission
  from public.accrual_submissions
  where id = p_submission_id
  for update;
  if not found then raise exception 'Accrual not found'; end if;
  if not public.is_accrual_admin()
    and lower(v_submission.maker) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'You cannot confirm this accrual';
  end if;
  if v_submission.status <> 2 then
    raise exception 'Only For Confirmation accruals can be confirmed';
  end if;
  if not exists (
    select 1 from public.accrual_filing_setups where id = v_submission.setup_id and is_active and not is_archived
      and start_date is not null and cutoff_date is not null
      and (now() at time zone 'Asia/Shanghai')::date between start_date and cutoff_date
  ) then
    raise exception 'The accrual filing period is closed or not configured';
  end if;

  select coalesce(jsonb_agg(to_jsonb(line) order by line.line_number), '[]'::jsonb)
  into v_lines
  from public.accrual_submission_lines line
  where line.submission_id = p_submission_id;
  perform public.validate_accrual_draft_payload(to_jsonb(v_submission), v_lines);

  update public.accrual_submissions
  set status = 0, confirmed_at = now()
  where id = p_submission_id;
  return true;
end;
$$;

create or replace function public.cancel_accrual(
  p_submission_id bigint,
  p_cancellation_remarks text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.accrual_submissions%rowtype;
  v_user_email text;
begin
  perform pg_advisory_xact_lock(20261104, 1);
  if auth.uid() is null then
    raise exception 'You must be signed in to cancel an accrual';
  end if;

  if coalesce(nullif(trim(p_cancellation_remarks), ''), '') = '' then
    raise exception 'Cancellation remarks are required';
  end if;

  v_user_email := lower(coalesce(auth.jwt()->>'email', ''));

  select *
  into v_submission
  from public.accrual_submissions
  where id = p_submission_id;

  if not found then
    raise exception 'Accrual submission not found';
  end if;

  if v_submission.status = 1 then
    raise exception 'This accrual submission is already cancelled';
  end if;

  if not public.is_accrual_admin() and lower(coalesce(v_submission.maker, '')) <> v_user_email then
    raise exception 'You are not allowed to cancel this accrual submission';
  end if;

  update public.accrual_submissions
  set
    status = 1,
    cancellation_remarks = trim(p_cancellation_remarks)
  where id = p_submission_id;

  return true;
end;
$$;

create or replace function public.set_control_number_sequence(
  p_prefix text,
  p_last_value integer,
  p_padding integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_last_value integer;
  v_padding integer;
begin
  if not (public.is_sysadmin() or public.can_update_control_number()) then raise exception 'You cannot update control numbers'; end if;
  v_prefix := upper(trim(coalesce(p_prefix, '')));
  v_last_value := coalesce(p_last_value, -1);
  v_padding := coalesce(p_padding, 0);

  if v_prefix = '' or v_prefix !~ '^[A-Z]+$' then
    raise exception 'Invalid control number prefix.';
  end if;

  if v_last_value < 0 then
    raise exception 'Invalid control number value.';
  end if;

  if v_padding <= 0 then
    raise exception 'Invalid control number padding.';
  end if;

  update public.control_number_sequence
  set
    prefix = v_prefix,
    last_value = v_last_value,
    padding = v_padding,
    updated_at = timezone('utc', now())
  where id = true;

  return v_prefix || lpad(v_last_value::text, v_padding, '0');
end;
$$;

create or replace function public.submit_accrual(
  p_header jsonb,
  p_line_items jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_control_number text;
  v_submission_id bigint;
  v_line jsonb;
begin
  if p_header is null then
    raise exception 'Header payload is required';
  end if;
  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one line item is required';
  end if;
  if auth.uid() is null then raise exception 'Sign in to submit an accrual'; end if;

  perform public.validate_accrual_draft_payload(p_header, p_line_items);
  v_control_number := public.get_next_control_number();

  insert into public.accrual_submissions (
    setup_id, control_number, maker, requester_email, expense_class, company,
    supplier_code, supplier_name, invoice_no, status, submitted_at
  ) values (
    nullif(p_header->>'setup_id', '')::uuid,
    v_control_number,
    coalesce(nullif(auth.jwt()->>'email', ''), nullif(p_header->>'maker', ''), p_header->>'requester_email', ''),
    coalesce(p_header->>'requester_email', ''),
    coalesce(p_header->>'expense_class', ''),
    coalesce(p_header->>'company', ''),
    coalesce(p_header->>'supplier_code', ''),
    coalesce(p_header->>'supplier_name', ''),
    coalesce(
      nullif(trim(p_header->>'invoice_no'), ''),
      (select nullif(trim(default_invoice_no), '') from public.expense_classes where lower(name) = lower(trim(p_header->>'expense_class')))
    ),
    2,
    timezone('utc', now())
  ) returning id into v_submission_id;

  for v_line in select value from jsonb_array_elements(p_line_items) loop
    insert into public.accrual_submission_lines (
      submission_id, line_number, gross_amount, glaccount_code, glaccount_name,
      profitcenter_code, profitcenter_name, transaction_type, vat, tax_code, remarks
    ) values (
      v_submission_id,
      coalesce((v_line->>'line_number')::integer, 0),
      coalesce((v_line->>'gross_amount')::numeric, 0),
      coalesce(v_line->>'glaccount_code', ''),
      nullif(v_line->>'glaccount_name', ''),
      coalesce(v_line->>'profitcenter_code', ''),
      nullif(v_line->>'profitcenter_name', ''),
      coalesce(v_line->>'transaction_type', ''),
      nullif(v_line->>'vat', ''),
      nullif(v_line->>'tax_code', ''),
      coalesce(v_line->>'remarks', '')
    );
  end loop;

  return v_control_number;
end;
$$;

-- Function execute privileges survive CREATE OR REPLACE; explicitly restrict RPCs.
revoke all on function public.submit_accrual(jsonb, jsonb) from public, anon;
grant execute on function public.submit_accrual(jsonb, jsonb) to authenticated;
select public.sync_active_accrual_setup();

-- Enable setup changes for subscribed clients when Realtime is installed.
do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'accrual_filing_setups') then
    alter publication supabase_realtime add table public.accrual_filing_setups;
  end if;
end;
$$;
commit;
