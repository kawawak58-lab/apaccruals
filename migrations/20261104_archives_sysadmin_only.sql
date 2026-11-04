-- Run after the filing setup migrations. Archive viewing is sysadmin-only.
begin;
drop policy if exists "filing setups read" on public.accrual_filing_setups;
create policy "filing setups read" on public.accrual_filing_setups
for select to authenticated using (not is_archived or public.is_sysadmin());

drop policy if exists "public accrual submissions read" on public.accrual_submissions;
create policy "public accrual submissions read" on public.accrual_submissions
for select to authenticated using (
  public.is_sysadmin()
  or (not is_archived and (public.is_accrual_admin()
    or lower(maker) = lower(coalesce(auth.jwt()->>'email', ''))))
);
-- Line and note SELECT policies already check access to their parent submission.
commit;
