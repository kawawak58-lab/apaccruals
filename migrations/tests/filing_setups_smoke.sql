-- Run in staging AFTER all 20261104 filing migrations, including filing_setup_lock_restore.sql.
-- Runs as the database owner; all fixture data and active-window changes roll back.
begin;
do $$
declare
  v_auth uuid := gen_random_uuid();
  v_first public.accrual_filing_setups;
  v_second public.accrual_filing_setups;
  v_empty public.accrual_filing_setups;
  v_submission bigint;
  v_other bigint;
  v_day date := (now() at time zone 'Asia/Shanghai')::date;
  v_blocked boolean;
begin
  insert into public.users(auth_user_id, email, display_name, usergroup)
  values(v_auth, v_auth::text || '@filing-test.invalid', 'Filing test', 'sysadmin');
  perform set_config('request.jwt.claim.sub', v_auth::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'email', v_auth::text || '@filing-test.invalid')::text, true);
  v_first := public.create_accrual_filing_setup('Test first', v_day, v_day);
  if v_first.is_active then raise exception 'FAIL: new setup was automatically activated'; end if;
  perform public.set_accrual_filing_setup_active(v_first.id, true);
  v_first := public.update_accrual_filing_setup(v_first.id, 'Test renamed', v_day, v_day + 1);
  if not v_first.is_active then raise exception 'FAIL: editing changed activation'; end if;
  insert into public.accrual_submissions(control_number, maker, requester_email, expense_class, company, supplier_code, supplier_name)
  values(gen_random_uuid()::text, 'test', 'test', 'test', 'test', 'test', 'test') returning id into v_submission;
  if (select setup_id from public.accrual_submissions where id = v_submission) <> v_first.id then
    raise exception 'FAIL: new accrual did not receive active setup';
  end if;
  v_second := public.create_accrual_filing_setup('Test second', v_day, v_day);
  if not (select is_active from public.accrual_filing_setups where id = v_first.id) then
    raise exception 'FAIL: creation changed the existing active setup';
  end if;
  perform public.set_accrual_filing_setup_active(v_second.id, true);
  if (select count(*) from public.accrual_filing_setups where is_active) <> 1
    or (select is_active from public.accrual_filing_setups where id = v_first.id) then
    raise exception 'FAIL: multiple active setups';
  end if;
  insert into public.accrual_submissions(control_number, maker, requester_email, expense_class, company, supplier_code, supplier_name)
  values(gen_random_uuid()::text, 'test', 'test', 'test', 'test', 'test', 'test') returning id into v_other;
  v_blocked := false;
  begin perform public.archive_accrual_filing_setup(v_first.id);
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: unlocked setup could be archived'; end if;
  perform public.set_accrual_filing_setup_locked(v_first.id, true);
  v_blocked := false;
  begin update public.accrual_submissions set company = 'Changed' where id = v_submission;
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: locked setup accrual could be edited'; end if;
  perform public.archive_accrual_filing_setup(v_first.id);
  if not (select is_archived from public.accrual_submissions where id = v_submission)
    or (select is_archived from public.accrual_submissions where id = v_other) then
    raise exception 'FAIL: archive did not stay within its setup';
  end if;
  v_blocked := false;
  begin update public.accrual_submissions set company = 'Changed' where id = v_submission;
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: archived accrual could be edited'; end if;
  v_blocked := false;
  begin
    insert into public.accrual_submission_lines(submission_id, line_number, gross_amount, glaccount_code, profitcenter_code, transaction_type, remarks)
    values(v_submission, 1, 10, 'test', 'test', 'test', 'test');
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: archived accrual accepted a new line'; end if;
  v_blocked := false;
  begin perform public.set_accrual_filing_setup_active(v_first.id, true);
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: archived setup could be activated'; end if;
  v_blocked := false;
  begin perform public.delete_accrual_filing_setup(v_first.id);
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: setup with accruals could be deleted'; end if;
  v_blocked := false;
  begin perform public.unarchive_accrual_filing_setup(v_first.id);
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: locked archive could be unarchived'; end if;
  perform public.set_accrual_filing_setup_locked(v_first.id, false);
  v_blocked := false;
  begin update public.accrual_submissions set company = 'Changed' where id = v_submission;
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: unlocking made an archived accrual editable'; end if;
  perform public.unarchive_accrual_filing_setup(v_first.id);
  if (select is_archived from public.accrual_submissions where id = v_submission)
    or (select is_active from public.accrual_filing_setups where id = v_first.id)
    or not (select is_active from public.accrual_filing_setups where id = v_second.id) then
    raise exception 'FAIL: restore changed activation or failed to restore accruals';
  end if;
  perform public.set_accrual_filing_setup_locked(v_second.id, true);
  perform public.archive_accrual_filing_setup(v_second.id);
  if exists(select 1 from public.accrual_filing_setups where is_active) then
    raise exception 'FAIL: archiving the active setup left it active';
  end if;
  v_blocked := false;
  begin
    insert into public.accrual_submissions(control_number, maker, requester_email, expense_class, company, supplier_code, supplier_name)
    values(gen_random_uuid()::text, 'test', 'test', 'test', 'test', 'test', 'test');
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: submission accepted without active setup'; end if;
  v_empty := public.create_accrual_filing_setup('Empty setup', v_day, v_day);
  perform public.set_accrual_filing_setup_active(v_empty.id, true);
  perform public.set_accrual_filing_setup_locked(v_empty.id, true);
  v_blocked := false;
  begin perform public.delete_accrual_filing_setup(v_empty.id);
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: locked empty setup could be deleted'; end if;
  perform public.set_accrual_filing_setup_locked(v_empty.id, false);
  perform public.delete_accrual_filing_setup(v_empty.id);
  if exists(select 1 from public.accrual_filing_setups where id = v_empty.id or is_active) then
    raise exception 'FAIL: empty active setup was not deleted and deactivated';
  end if;
  update public.users set usergroup = 'accrual_admin', can_update_setup = true, can_update_control_number = true where auth_user_id = v_auth;
  if not public.is_accrual_admin() or public.can_update_setup() or public.can_update_control_number() then
    raise exception 'FAIL: Accrual Admin permissions incorrect';
  end if;
  v_blocked := false;
  begin perform public.create_accrual_filing_setup('Forbidden', v_day, v_day);
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'FAIL: Accrual Admin created a setup'; end if;
  raise notice 'Filing setup smoke checks passed; rolling back fixtures.';
end;
$$;
rollback;
