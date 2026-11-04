import { supabase } from './supabase';
import { getAccrualSetup, getAccrualWindowStatus, saveAccrualSetup, setAccrualSetupActive, archiveAccrualSetup, deleteAccrualSetup, setAccrualSetupLocked, unarchiveAccrualSetup } from './AccrualSetup';
import { fetchAccrualSubmissions } from './AccrualSubmissions';
import { canManageAccrualSetup, isAccrualAdmin } from './access';
jest.mock('./supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));

test('Accrual Admin gets record access but cannot gain setup access from a permission flag', () => {
  expect(isAccrualAdmin({ usergroup: 'accrual_admin' })).toBe(true);
  expect(canManageAccrualSetup({ usergroup: 'accrual_admin', can_update_setup: true })).toBe(false);
  expect(canManageAccrualSetup({ usergroup: 'sysadmin' })).toBe(true);
  expect(isAccrualAdmin({ usergroup: 'accrual_user' })).toBe(false);
});

test('only an active unarchived setup opens the date window, including the cutoff day in Shanghai', () => {
  const setup = { start_date: '2026-11-01', cutoff_date: '2026-11-04', is_active: true };
  expect(getAccrualWindowStatus(setup, new Date('2026-11-04T15:59:00Z')).isOpen).toBe(true);
  expect(getAccrualWindowStatus(setup, new Date('2026-11-04T16:00:00Z')).isOpen).toBe(false);
  expect(getAccrualWindowStatus({ ...setup, is_active: false }, '2026-11-03').isOpen).toBe(false);
  expect(getAccrualWindowStatus({ ...setup, is_archived: true }, '2026-11-03').isOpen).toBe(false);
  expect(getAccrualWindowStatus({ ...setup, is_locked: true }, '2026-11-03').isOpen).toBe(false);
});

test('loads only the active nonarchived filing setup and closes filing when none exists', async () => {
  const query = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); supabase.from.mockReturnValue(query);
  const setup = await getAccrualSetup();
  expect(supabase.from).toHaveBeenCalledWith('accrual_filing_setups');
  expect(query.eq.mock.calls).toEqual([['is_active', true], ['is_archived', false]]);
  expect(getAccrualWindowStatus(setup).isOpen).toBe(false);
});

test('create, activate and archive use the atomic database operations', async () => {
  supabase.rpc.mockResolvedValue({ data: { id: 'setup-1', is_active: true } });
  expect((await saveAccrualSetup({ name: ' Year end ', start_date: '2026-11-01', cutoff_date: '2026-11-30' })).id).toBe('setup-1');
  expect(supabase.rpc).toHaveBeenCalledWith('create_accrual_filing_setup', { p_name: 'Year end', p_start_date: '2026-11-01', p_cutoff_date: '2026-11-30' });
  await setAccrualSetupActive('setup-1', false);
  expect(supabase.rpc).toHaveBeenCalledWith('set_accrual_filing_setup_active', { p_setup_id: 'setup-1', p_active: false });
  await archiveAccrualSetup('setup-1');
  expect(supabase.rpc).toHaveBeenCalledWith('archive_accrual_filing_setup', { p_setup_id: 'setup-1' });
});

test('editing uses the setup update RPC with the original ID and no activation flag', async () => {
  supabase.rpc.mockResolvedValue({ data: [{ id: 'setup-1', is_active: true }] });
  const saved = await saveAccrualSetup({ id: 'setup-1', name: 'Updated', start_date: '2026-11-01', cutoff_date: '2026-12-01' });
  expect(supabase.rpc).toHaveBeenCalledWith('update_accrual_filing_setup', { p_setup_id: 'setup-1', p_name: 'Updated', p_start_date: '2026-11-01', p_cutoff_date: '2026-12-01' });
  expect(saved.id).toBe('setup-1');
  expect(saved.is_active).toBe(true);
});

test('deletion uses the protected setup RPC and propagates linked-entry errors', async () => {
  supabase.rpc.mockResolvedValue({ error: null });
  await deleteAccrualSetup('setup-1');
  expect(supabase.rpc).toHaveBeenCalledWith('delete_accrual_filing_setup', { p_setup_id: 'setup-1' });
  supabase.rpc.mockResolvedValue({ error: new Error('This setup has accrual entries') });
  await expect(deleteAccrualSetup('setup-1')).rejects.toThrow('has accrual entries');
});

test('lock, unlock and unarchive use separate protected operations', async () => {
  supabase.rpc.mockResolvedValue({ error: null, data: 3 });
  await setAccrualSetupLocked('setup-1', true);
  expect(supabase.rpc).toHaveBeenCalledWith('set_accrual_filing_setup_locked', { p_setup_id: 'setup-1', p_locked: true });
  await setAccrualSetupLocked('setup-1', false);
  expect(supabase.rpc).toHaveBeenCalledWith('set_accrual_filing_setup_locked', { p_setup_id: 'setup-1', p_locked: false });
  expect(await unarchiveAccrualSetup('setup-1')).toBe(3);
  expect(supabase.rpc).toHaveBeenCalledWith('unarchive_accrual_filing_setup', { p_setup_id: 'setup-1' });
});

test('archive reads filter by setup and admins see all makers; ordinary users remain scoped', async () => {
  const query = { select: jest.fn(), eq: jest.fn(), order: jest.fn(), then: (resolve) => resolve({ data: [] }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query); supabase.from.mockReturnValue(query);
  await fetchAccrualSubmissions({ currentUser: { usergroup: 'sysadmin', email: 'admin@example.com' }, archived: true, setupId: 'setup-1' });
  expect(query.eq.mock.calls).toEqual([['is_archived', true], ['setup_id', 'setup-1']]);
  query.eq.mockClear();
  await fetchAccrualSubmissions({ currentUser: { usergroup: 'accrual_user', email: 'maker@example.com' } });
  expect(query.eq.mock.calls).toEqual([['is_archived', false], ['maker', 'maker@example.com']]);
});

test('Accrual Admin and ordinary users cannot query archives directly', async () => {
  for (const usergroup of ['accrual_admin', 'accrual_user']) {
    await expect(fetchAccrualSubmissions({ currentUser: { usergroup }, archived: true })).rejects.toThrow('Only sysadmins');
  }
  expect(supabase.from).not.toHaveBeenCalled();
});
