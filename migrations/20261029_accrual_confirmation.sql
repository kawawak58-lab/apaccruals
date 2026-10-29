-- Accrual workflow: new and uploaded rows await confirmation; confirmed rows
-- are immutable through the application. Existing status 2 rows become
-- For Confirmation, and existing status 0 rows become Confirmed.
-- Run this migration in the Supabase SQL Editor before deploying the app.
begin;

-- Status 0 is Confirmed, 1 is Cancelled, and 2 is For Confirmation.
alter table public.accrual_submissions
  drop constraint if exists accrual_submissions_status_check;
alter table public.accrual_submissions
  add constraint accrual_submissions_status_check check (status in (0, 1, 2));
alter table public.accrual_submissions alter column status set default 2;
alter table public.accrual_submissions
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text;

-- Older Confirmed rows changed submitted_at at confirmation time, so preserve
-- that timestamp as the best available confirmation date for existing data.
update public.accrual_submissions
set confirmed_at = submitted_at
where status = 0 and confirmed_at is null;

create or replace function public.track_accrual_submission_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(new.*) is distinct from row(old.*) then
    new.updated_at := timezone('utc', now());
    new.updated_by := coalesce(nullif(auth.jwt()->>'email', ''), 'System');
    if old.status is distinct from new.status and new.status = 0 then
      new.confirmed_at := coalesce(new.confirmed_at, timezone('utc', now()));
      new.confirmed_by := coalesce(new.confirmed_by, nullif(auth.jwt()->>'email', ''), 'System');
    elsif old.status is distinct from new.status and new.status = 1 then
      new.cancelled_at := coalesce(new.cancelled_at, timezone('utc', now()));
      new.cancelled_by := coalesce(new.cancelled_by, nullif(auth.jwt()->>'email', ''), 'System');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accrual_submissions_updated_at on public.accrual_submissions;
create trigger trg_accrual_submissions_updated_at
before update on public.accrual_submissions
for each row execute function public.track_accrual_submission_update();

comment on column public.accrual_submissions.status is
  '0 = Confirmed, 1 = Cancelled, 2 = For Confirmation';

-- Expense-class rules are maintained in expense_classes; validation reads these
-- settings so UI, uploads, and RPCs share one source of truth.
do $$
declare
  v_seed_existing_classes boolean;
  v_seed_disabled_fields boolean;
begin
  select not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'expense_classes'
      and column_name = 'requires_supplier'
  ) into v_seed_existing_classes;
  select not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'expense_classes'
      and column_name = 'disabled_fields'
  ) into v_seed_disabled_fields;

  alter table public.expense_classes
    add column if not exists requires_supplier boolean not null default true,
    add column if not exists requires_invoice boolean not null default true,
    add column if not exists default_invoice_no text,
    add column if not exists requires_profit_center boolean not null default true,
    add column if not exists requires_vat boolean not null default true,
    add column if not exists requires_tax_code boolean not null default true;
  alter table public.expense_classes
    add column if not exists disabled_fields text[] not null default '{}';

  -- Apply sensible starting rules only on first install; later migration reruns
  -- must preserve any settings maintained by admins.
  if v_seed_existing_classes then
    update public.expense_classes
    set requires_supplier = false, requires_invoice = false,
        requires_vat = false, requires_tax_code = false
    where name ilike '%disallowable%';

    update public.expense_classes
    set requires_invoice = false, default_invoice_no = '00000'
    where name ilike '%no actual invoice%';
  end if;

  if v_seed_disabled_fields then
    update public.expense_classes
    set disabled_fields = array_remove(array[
      case when not requires_supplier then 'supplier' end,
      case when not requires_invoice then 'invoice_no' end,
      case when not requires_profit_center then 'profit_center' end,
      case when not requires_vat then 'vat' end,
      case when not requires_tax_code then 'tax_code' end
    ], null);
  end if;
end;
$$;

create or replace function public.validate_accrual_draft_payload(p_header jsonb, p_line_items jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_line jsonb;
  v_field text;
  v_expense_class public.expense_classes%rowtype;
  v_supplier_code text;
  v_supplier_name text;
  v_invoice_no text;
begin
  if jsonb_typeof(p_header) is distinct from 'object' then
    raise exception 'Accrual header is required';
  end if;
  foreach v_field in array array['requester_email', 'expense_class', 'company'] loop
    if nullif(trim(p_header->>v_field), '') is null then
      raise exception 'Required header field: %', v_field;
    end if;
  end loop;

  select * into v_expense_class
  from public.expense_classes
  where lower(name) = lower(trim(p_header->>'expense_class'))
  limit 1;
  if not found then raise exception 'Expense classification does not exist'; end if;

  v_supplier_code := nullif(trim(p_header->>'supplier_code'), '');
  v_supplier_name := nullif(trim(p_header->>'supplier_name'), '');
  if not ('supplier' = any(v_expense_class.disabled_fields)) and (v_supplier_code is null or v_supplier_name is null) then
    raise exception 'Supplier is required for this expense classification';
  end if;
  if (v_supplier_code is null) <> (v_supplier_name is null) then
    raise exception 'Supplier code and name must both be provided';
  end if;

  v_invoice_no := coalesce(nullif(trim(p_header->>'invoice_no'), ''), nullif(trim(v_expense_class.default_invoice_no), ''));
  if not ('invoice_no' = any(v_expense_class.disabled_fields)) and v_invoice_no is null then
    raise exception 'Invoice number is required for this expense classification';
  end if;

  if jsonb_typeof(p_line_items) is distinct from 'array' then
    raise exception 'Line items must be an array';
  end if;
  if jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  for v_line in select value from jsonb_array_elements(p_line_items) loop
    foreach v_field in array array['glaccount_code', 'transaction_type', 'remarks'] loop
      if nullif(trim(v_line->>v_field), '') is null then
        raise exception 'Required line field: %', v_field;
      end if;
    end loop;
    if not ('profit_center' = any(v_expense_class.disabled_fields)) and nullif(trim(v_line->>'profitcenter_code'), '') is null then
      raise exception 'Profit center is required for this expense classification';
    end if;
    if not ('vat' = any(v_expense_class.disabled_fields)) and nullif(trim(v_line->>'vat'), '') is null then
      raise exception 'VAT is required for this expense classification';
    end if;
    if not ('tax_code' = any(v_expense_class.disabled_fields)) and nullif(trim(v_line->>'tax_code'), '') is null then
      raise exception 'Tax code is required for this expense classification';
    end if;
    if nullif(v_line->>'gross_amount', '') is null or (v_line->>'gross_amount')::numeric::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Gross amount must be a finite number';
    end if;
  end loop;
end;
$$;
revoke all on function public.validate_accrual_draft_payload(jsonb, jsonb) from public;

-- Always record edits, including saves that only change line items.
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
  if auth.uid() is null then raise exception 'Sign in to edit this accrual'; end if;
  select * into v_submission
  from public.accrual_submissions
  where id = p_submission_id
  for update;
  if not found then raise exception 'Accrual not found'; end if;
  if not public.is_sysadmin()
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
revoke all on function public.update_accrual_draft(bigint, jsonb, jsonb) from public, anon;
grant execute on function public.update_accrual_draft(bigint, jsonb, jsonb) to authenticated;

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
    control_number, maker, requester_email, expense_class, company,
    supplier_code, supplier_name, invoice_no, status, submitted_at
  ) values (
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

revoke all on function public.submit_accrual(jsonb, jsonb) from public;
grant execute on function public.submit_accrual(jsonb, jsonb) to anon, authenticated, service_role;

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
  if auth.uid() is null then raise exception 'Sign in to confirm an accrual'; end if;
  select * into v_submission
  from public.accrual_submissions
  where id = p_submission_id
  for update;
  if not found then raise exception 'Accrual not found'; end if;
  if not public.is_sysadmin()
    and lower(v_submission.maker) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'You cannot confirm this accrual';
  end if;
  if v_submission.status <> 2 then
    raise exception 'Only For Confirmation accruals can be confirmed';
  end if;
  if not exists (
    select 1 from public.accrual_setup where id = true
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

revoke all on function public.confirm_accrual_submission(bigint) from public, anon;
grant execute on function public.confirm_accrual_submission(bigint) to authenticated;

commit;
