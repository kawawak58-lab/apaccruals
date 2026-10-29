-- Run once in the existing Supabase project's SQL Editor before using drafts.
-- Existing Open (0) and Cancelled (1) records are preserved. Draft = 2.
begin;

alter table public.accrual_submissions
  drop constraint if exists accrual_submissions_status_check;
alter table public.accrual_submissions
  add constraint accrual_submissions_status_check check (status in (0, 1, 2));
alter table public.accrual_submissions alter column status set default 2;

create or replace function public.validate_accrual_draft_payload(p_header jsonb, p_line_items jsonb)
returns void language plpgsql set search_path = public as $$
declare v_line jsonb; v_field text;
begin
  if jsonb_typeof(p_header) is distinct from 'object' then
    raise exception 'Accrual header is required';
  end if;
  foreach v_field in array array['requester_email', 'expense_class', 'company', 'supplier_code', 'supplier_name'] loop
    if nullif(trim(p_header->>v_field), '') is null then
      raise exception 'Required header field: %', v_field;
    end if;
  end loop;
  if jsonb_typeof(p_line_items) is distinct from 'array' then
    raise exception 'Line items must be an array';
  end if;
  if jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one line item is required';
  end if;
  for v_line in select value from jsonb_array_elements(p_line_items) loop
    foreach v_field in array array['glaccount_code', 'profitcenter_code', 'transaction_type', 'remarks'] loop
      if nullif(trim(v_line->>v_field), '') is null then
        raise exception 'Required line field: %', v_field;
      end if;
    end loop;
    if nullif(v_line->>'gross_amount', '') is null or (v_line->>'gross_amount')::numeric::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Gross amount must be a finite number';
    end if;
  end loop;
end;
$$;
revoke all on function public.validate_accrual_draft_payload(jsonb, jsonb) from public;

create or replace function public.update_accrual_draft(
  p_submission_id bigint, p_header jsonb, p_line_items jsonb
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_submission public.accrual_submissions%rowtype; v_line jsonb; v_number integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to edit a draft'; end if;
  select * into v_submission from public.accrual_submissions where id = p_submission_id for update;
  if not found then raise exception 'Accrual not found'; end if;
  if not public.is_sysadmin() and lower(v_submission.maker) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'You cannot edit this draft';
  end if;
  if v_submission.status <> 2 then raise exception 'Only drafts can be edited'; end if;
  perform public.validate_accrual_draft_payload(p_header, p_line_items);
  update public.accrual_submissions set
    requester_email = trim(p_header->>'requester_email'), expense_class = trim(p_header->>'expense_class'),
    company = trim(p_header->>'company'), supplier_code = trim(p_header->>'supplier_code'),
    supplier_name = trim(p_header->>'supplier_name'), invoice_no = nullif(trim(p_header->>'invoice_no'), '')
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
revoke all on function public.update_accrual_draft(bigint, jsonb, jsonb) from public;
grant execute on function public.update_accrual_draft(bigint, jsonb, jsonb) to authenticated;

create or replace function public.open_accrual_draft(p_submission_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_submission public.accrual_submissions%rowtype; v_lines jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to add an accrual'; end if;
  select * into v_submission from public.accrual_submissions where id = p_submission_id for update;
  if not found then raise exception 'Accrual not found'; end if;
  if not public.is_sysadmin() and lower(v_submission.maker) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'You cannot add this draft';
  end if;
  if v_submission.status <> 2 then raise exception 'Only drafts can be added'; end if;
  if not exists (
    select 1 from public.accrual_setup where id = true
      and start_date is not null and cutoff_date is not null
      and (now() at time zone 'Asia/Shanghai')::date between start_date and cutoff_date
  ) then raise exception 'The accrual filing period is closed or not configured'; end if;
  select coalesce(jsonb_agg(to_jsonb(l) order by l.line_number), '[]'::jsonb)
    into v_lines from public.accrual_submission_lines l where submission_id = p_submission_id;
  perform public.validate_accrual_draft_payload(to_jsonb(v_submission), v_lines);
  update public.accrual_submissions set status = 0, submitted_at = now() where id = p_submission_id;
  return true;
end;
$$;
revoke all on function public.open_accrual_draft(bigint) from public;
grant execute on function public.open_accrual_draft(bigint) to authenticated;
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

  if auth.uid() is null then raise exception 'Sign in to save a draft'; end if;
  perform public.validate_accrual_draft_payload(p_header, p_line_items);
  v_control_number := public.get_next_control_number();

  insert into public.accrual_submissions (
    control_number,
    maker,
    requester_email,
    expense_class,
    company,
    supplier_code,
    supplier_name,
    invoice_no,
    status,
    submitted_at
  )
  values (
    v_control_number,
    coalesce(nullif(auth.jwt()->>'email', ''), nullif(p_header->>'maker', ''), p_header->>'requester_email', ''),
    coalesce(p_header->>'requester_email', ''),
    coalesce(p_header->>'expense_class', ''),
    coalesce(p_header->>'company', ''),
    coalesce(p_header->>'supplier_code', ''),
    coalesce(p_header->>'supplier_name', ''),
    nullif(p_header->>'invoice_no', ''),
    2,
    timezone('utc', now())
  )
  returning id into v_submission_id;

  for v_line in
    select value
    from jsonb_array_elements(p_line_items)
  loop
    insert into public.accrual_submission_lines (
      submission_id,
      line_number,
      gross_amount,
      glaccount_code,
      glaccount_name,
      profitcenter_code,
      profitcenter_name,
      transaction_type,
      vat,
      tax_code,
      remarks
    )
    values (
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

revoke all on function public.submit_accrual(jsonb, jsonb) from public;
grant execute on function public.submit_accrual(jsonb, jsonb) to anon, authenticated, service_role;


commit;



-- =============================================================================
-- UPDATE 2026-10-28: Direct Add (Open) or Save Draft for new accruals
-- ALREADY RAN THE DRAFT MIGRATION? Run only this section through COMMIT.
-- No existing records are changed. Add validates the filing period on the server.
-- =============================================================================
begin;
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
  v_status integer;
begin
  if p_header is null then
    raise exception 'Header payload is required';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  if auth.uid() is null then raise exception 'Sign in to save a draft'; end if;
  perform public.validate_accrual_draft_payload(p_header, p_line_items);
  v_status := coalesce((p_header->>'status')::integer, 2);
  if v_status not in (0, 2) then
    raise exception 'New accruals must be Draft or Open';
  end if;
  if v_status = 0 and not exists (
    select 1 from public.accrual_setup where id = true
      and start_date is not null and cutoff_date is not null
      and (now() at time zone 'Asia/Shanghai')::date between start_date and cutoff_date
  ) then
    raise exception 'The accrual filing period is closed or not configured';
  end if;
  v_control_number := public.get_next_control_number();

  insert into public.accrual_submissions (
    control_number,
    maker,
    requester_email,
    expense_class,
    company,
    supplier_code,
    supplier_name,
    invoice_no,
    status,
    submitted_at
  )
  values (
    v_control_number,
    coalesce(nullif(auth.jwt()->>'email', ''), nullif(p_header->>'maker', ''), p_header->>'requester_email', ''),
    coalesce(p_header->>'requester_email', ''),
    coalesce(p_header->>'expense_class', ''),
    coalesce(p_header->>'company', ''),
    coalesce(p_header->>'supplier_code', ''),
    coalesce(p_header->>'supplier_name', ''),
    nullif(p_header->>'invoice_no', ''),
    v_status,
    timezone('utc', now())
  )
  returning id into v_submission_id;

  for v_line in
    select value
    from jsonb_array_elements(p_line_items)
  loop
    insert into public.accrual_submission_lines (
      submission_id,
      line_number,
      gross_amount,
      glaccount_code,
      glaccount_name,
      profitcenter_code,
      profitcenter_name,
      transaction_type,
      vat,
      tax_code,
      remarks
    )
    values (
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

revoke all on function public.submit_accrual(jsonb, jsonb) from public;
grant execute on function public.submit_accrual(jsonb, jsonb) to anon, authenticated, service_role;

commit;

-- =============================================================================
-- UPDATE 2026-10-28: Accrual notes
-- Already ran this file? Run only this section through COMMIT in Supabase SQL Editor.
-- Signed-in users can read notes and add notes to an existing accrual.
-- Notes are append-only; the database records the signed-in author and time.
-- =============================================================================
begin;

create table if not exists public.accrual_notes (
  id bigint generated by default as identity primary key,
  submission_id bigint not null references public.accrual_submissions(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  author_name text not null,
  author_email text not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists accrual_notes_submission_created_idx
  on public.accrual_notes (submission_id, created_at, id);

alter table public.accrual_notes enable row level security;

drop policy if exists "authenticated accrual notes read" on public.accrual_notes;
create policy "authenticated accrual notes read"
  on public.accrual_notes for select to authenticated using (true);

revoke all on public.accrual_notes from public, anon, authenticated;
grant select on public.accrual_notes to authenticated;

create or replace function public.add_accrual_note(p_submission_id bigint, p_body text)
returns public.accrual_notes
language plpgsql security definer set search_path = public
as $$
declare
  v_author_id uuid := auth.uid();
  v_author_email text;
  v_author_name text;
  v_note public.accrual_notes%rowtype;
begin
  if v_author_id is null then
    raise exception 'Sign in to add a note';
  end if;
  if p_submission_id is null or not exists (
    select 1 from public.accrual_submissions where id = p_submission_id
  ) then
    raise exception 'Accrual not found';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'A note must contain 1 to 2000 characters';
  end if;

  v_author_email := coalesce(nullif(auth.jwt()->>'email', ''), 'Unknown user');
  select nullif(btrim(display_name), ''), email
    into v_author_name, v_author_email
    from public.users where auth_user_id = v_author_id;
  v_author_email := coalesce(v_author_email, nullif(auth.jwt()->>'email', ''), 'Unknown user');
  v_author_name := coalesce(v_author_name, v_author_email);

  insert into public.accrual_notes (
    submission_id, author_id, author_name, author_email, body
  ) values (
    p_submission_id, v_author_id, v_author_name, v_author_email, btrim(p_body)
  ) returning * into v_note;
  return v_note;
end;
$$;

revoke all on function public.add_accrual_note(bigint, text) from public, anon;
grant execute on function public.add_accrual_note(bigint, text) to authenticated;

commit;

-- =============================================================================
-- UPDATE 2026-10-28: Rich-text notes (no image storage)
-- Already ran the notes section? Run only this section through COMMIT.
-- Existing plain-text notes remain readable; new notes may contain editor HTML.
-- If an earlier image-storage update was run, remove its access policies and
-- remove the unused bucket only when it contains no objects.
-- =============================================================================
begin;

alter table public.accrual_notes drop constraint if exists accrual_notes_body_check;
alter table public.accrual_notes
  add constraint accrual_notes_body_check check (char_length(btrim(body)) between 1 and 20000);

drop policy if exists "authenticated accrual note images read" on storage.objects;
drop policy if exists "authors upload accrual note images" on storage.objects;
delete from storage.buckets
where id = 'accrual-note-images'
  and not exists (
    select 1 from storage.objects where bucket_id = 'accrual-note-images'
  );

create or replace function public.add_accrual_note(p_submission_id bigint, p_body text)
returns public.accrual_notes
language plpgsql security definer set search_path = public
as $$
declare
  v_author_id uuid := auth.uid();
  v_author_email text;
  v_author_name text;
  v_note public.accrual_notes%rowtype;
begin
  if v_author_id is null then
    raise exception 'Sign in to add a note';
  end if;
  if p_submission_id is null or not exists (
    select 1 from public.accrual_submissions where id = p_submission_id
  ) then
    raise exception 'Accrual not found';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 20000 then
    raise exception 'A note must contain 1 to 20000 characters';
  end if;

  v_author_email := coalesce(nullif(auth.jwt()->>'email', ''), 'Unknown user');
  select nullif(btrim(display_name), ''), email
    into v_author_name, v_author_email
    from public.users where auth_user_id = v_author_id;
  v_author_email := coalesce(v_author_email, nullif(auth.jwt()->>'email', ''), 'Unknown user');
  v_author_name := coalesce(v_author_name, v_author_email);

  insert into public.accrual_notes (
    submission_id, author_id, author_name, author_email, body
  ) values (
    p_submission_id, v_author_id, v_author_name, v_author_email, btrim(p_body)
  ) returning * into v_note;
  return v_note;
end;
$$;

revoke all on function public.add_accrual_note(bigint, text) from public, anon;
grant execute on function public.add_accrual_note(bigint, text) to authenticated;

commit;
