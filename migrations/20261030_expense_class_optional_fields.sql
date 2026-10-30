alter table public.expense_classes
  add column if not exists not_required_fields text[] not null default '{}';

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
  if not ('supplier' = any(v_expense_class.disabled_fields))
    and not ('supplier' = any(v_expense_class.not_required_fields))
    and (v_supplier_code is null or v_supplier_name is null) then
    raise exception 'Supplier is required for this expense classification';
  end if;
  if (v_supplier_code is null) <> (v_supplier_name is null) then
    raise exception 'Supplier code and name must both be provided';
  end if;

  v_invoice_no := coalesce(nullif(trim(p_header->>'invoice_no'), ''), nullif(trim(v_expense_class.default_invoice_no), ''));
  if not ('invoice_no' = any(v_expense_class.disabled_fields))
    and not ('invoice_no' = any(v_expense_class.not_required_fields))
    and v_invoice_no is null then
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
    if not ('profit_center' = any(v_expense_class.disabled_fields))
      and not ('profit_center' = any(v_expense_class.not_required_fields))
      and nullif(trim(v_line->>'profitcenter_code'), '') is null then
      raise exception 'Profit center is required for this expense classification';
    end if;
    if not ('vat' = any(v_expense_class.disabled_fields))
      and not ('vat' = any(v_expense_class.not_required_fields))
      and nullif(trim(v_line->>'vat'), '') is null then
      raise exception 'VAT is required for this expense classification';
    end if;
    if not ('tax_code' = any(v_expense_class.disabled_fields))
      and not ('tax_code' = any(v_expense_class.not_required_fields))
      and nullif(trim(v_line->>'tax_code'), '') is null then
      raise exception 'Tax code is required for this expense classification';
    end if;
    if nullif(v_line->>'gross_amount', '') is null or (v_line->>'gross_amount')::numeric::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Gross amount must be a finite number';
    end if;
  end loop;
end;
$$;
revoke all on function public.validate_accrual_draft_payload(jsonb, jsonb) from public;
