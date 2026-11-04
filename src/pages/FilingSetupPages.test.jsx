import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AccrualSetupPage from './AccrualSetupPage';
import ArchiveListPage from './ArchiveListPage';
import { listAccrualSetups, saveAccrualSetup, setAccrualSetupActive, archiveAccrualSetup, unarchiveAccrualSetup, setAccrualSetupLocked, deleteAccrualSetup } from '../lib/AccrualSetup';

jest.mock('../lib/AccrualSetup', () => ({
  ...jest.requireActual('../lib/AccrualSetup'), listAccrualSetups: jest.fn(), saveAccrualSetup: jest.fn(), setAccrualSetupActive: jest.fn(), archiveAccrualSetup: jest.fn(), unarchiveAccrualSetup: jest.fn(), setAccrualSetupLocked: jest.fn(), deleteAccrualSetup: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({ supabase: {} }));
const mockToast = jest.fn();
jest.mock('../lib/toast', () => ({ useToast: () => ({ showToast: mockToast }) }));
jest.mock('./AllAccrualsPage', () => ({ archived, setupId, beforeFilters }) => <>{beforeFilters}<div data-testid="archive-records">{archived ? 'Archived' : 'Current'}:{setupId || 'all'}</div></>);
const setups = [
  { id: 'setup-new', name: 'New window', start_date: '2026-11-01', cutoff_date: '2026-11-30', is_active: true },
  { id: 'setup-old', name: 'Old window', start_date: '2026-10-01', cutoff_date: '2026-10-31', is_active: false, is_archived: true, is_locked: true },
];
beforeEach(() => {
  listAccrualSetups.mockResolvedValue(setups);
  saveAccrualSetup.mockResolvedValue({ id: 'created' });
  setAccrualSetupActive.mockResolvedValue(); archiveAccrualSetup.mockResolvedValue(4);
  deleteAccrualSetup.mockResolvedValue();
  setAccrualSetupLocked.mockResolvedValue(); unarchiveAccrualSetup.mockResolvedValue(4);
});

test('setup form opens only on Add and creating does not activate the window', async () => {
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  await screen.findByText('New window');
  expect(screen.queryByLabelText('Setup name')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+ Add setup' }));
  fireEvent.change(screen.getByLabelText('Setup name'), { target: { value: 'Year end' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('Cutoff date'), { target: { value: '2026-11-30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create setup' }));
  await waitFor(() => expect(saveAccrualSetup).toHaveBeenCalledWith({ name: 'Year end', start_date: '2026-11-01', cutoff_date: '2026-11-30' }));
  await waitFor(() => expect(screen.queryByLabelText('Setup name')).not.toBeInTheDocument());
  expect(setAccrualSetupActive).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Deactivate' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
  await waitFor(() => expect(setAccrualSetupActive).toHaveBeenCalledWith('setup-new', false));
});

test('only double-click opens editing and saving preserves the ID and activation', async () => {
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  const row = (await screen.findByText('New window')).closest('tr');
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  fireEvent.click(row);
  expect(screen.queryByLabelText('Setup name')).not.toBeInTheDocument();
  fireEvent.doubleClick(row);
  expect(screen.getByRole('dialog', { name: 'Edit filing window' })).toBeInTheDocument();
  expect(screen.getByLabelText('Setup name')).toHaveValue('New window');
  fireEvent.change(screen.getByLabelText('Cutoff date'), { target: { value: '2026-12-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(saveAccrualSetup).toHaveBeenCalledWith({ id: 'setup-new', name: 'New window', start_date: '2026-11-01', cutoff_date: '2026-12-01' }));
  expect(setAccrualSetupActive).not.toHaveBeenCalled();
});

test('archiving requires the setup confirmation and targets that setup only', async () => {
  listAccrualSetups.mockResolvedValue(setups.map((row) => row.id === 'setup-new' ? { ...row, is_locked: true, is_active: false } : row));
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  const row = (await screen.findByText('New window')).closest('tr');
  expect(within(row).queryByRole('button', { name: /Archive/ })).not.toBeInTheDocument();
  fireEvent.doubleClick(row);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Edit filing window' })).getByRole('button', { name: 'Archive' }));
  expect(archiveAccrualSetup).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Archive filing window?' });
  expect(within(dialog).getByText('New window')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
  await waitFor(() => expect(archiveAccrualSetup).toHaveBeenCalledWith('setup-new'));
});

test('Lock closes filing, disables editing and hides Delete before enabling Archive', async () => {
  listAccrualSetups.mockResolvedValueOnce(setups).mockResolvedValue(setups.map((row) => row.id === 'setup-new' ? { ...row, is_locked: true, is_active: false } : row));
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  fireEvent.doubleClick((await screen.findByText('New window')).closest('tr'));
  fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Lock first to archive.');
  expect(screen.getByRole('button', { name: 'Lock' })).toHaveFocus();
  expect(archiveAccrualSetup).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog', { name: 'Archive filing window?' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
  await waitFor(() => expect(setAccrualSetupLocked).toHaveBeenCalledWith('setup-new', true));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled());
  expect(screen.getByLabelText('Setup name')).toBeDisabled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Archive' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  expect(within(screen.getByText('New window').closest('tr')).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});

test('archived setups must be unlocked before a confirmed unarchive and are not autoactivated', async () => {
  listAccrualSetups.mockResolvedValueOnce(setups).mockResolvedValue(setups.map((row) => row.id === 'setup-old' ? { ...row, is_locked: false } : row));
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  fireEvent.doubleClick((await screen.findByText('Old window')).closest('tr'));
  fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unlock first to unarchive.');
  expect(screen.getByRole('button', { name: 'Unlock' })).toHaveFocus();
  expect(unarchiveAccrualSetup).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog', { name: 'Unarchive filing window?' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
  await waitFor(() => expect(setAccrualSetupLocked).toHaveBeenCalledWith('setup-old', false));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Unarchive' })).toBeEnabled();
  expect(screen.getByLabelText('Setup name')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
  expect(unarchiveAccrualSetup).not.toHaveBeenCalled();
  const confirmation = screen.getByRole('dialog', { name: 'Unarchive filing window?' });
  expect(within(confirmation).getByText('Old window')).toBeInTheDocument();
  expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Unarchive' }));
  await waitFor(() => expect(unarchiveAccrualSetup).toHaveBeenCalledWith('setup-old'));
  expect(setAccrualSetupActive).not.toHaveBeenCalled();
});

test('Delete sits after activation, requires confirmation, and removes the setup', async () => {
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  const row = (await screen.findByText('New window')).closest('tr');
  expect(within(row).getAllByRole('button').map((button) => button.textContent)).toEqual(['Deactivate', 'Delete']);
  fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
  expect(deleteAccrualSetup).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Delete filing window?' });
  expect(within(dialog).getByText('New window')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(deleteAccrualSetup).toHaveBeenCalledWith('setup-new'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('a deletion rejected because of linked entries keeps the setup and shows the reason', async () => {
  deleteAccrualSetup.mockRejectedValue(new Error('This setup has accrual entries and cannot be deleted. Archive it instead'));
  render(<AccrualSetupPage currentUser={{ usergroup: 'sysadmin' }} />);
  const row = (await screen.findByText('New window')).closest('tr');
  fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete filing window?' })).getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Archive it instead');
  expect(screen.getByRole('row', { name: /New window/ })).toBeInTheDocument();
});

test('archive selection changes the setup ID passed to the shared records list', async () => {
  render(<ArchiveListPage currentUser={{ usergroup: 'sysadmin' }} />);
  await screen.findByRole('option', { name: /Old window/ });
  expect(screen.queryByRole('option', { name: /New window/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Accrual Setup'), { target: { value: 'setup-old' } });
  expect(screen.getByTestId('archive-records')).toHaveTextContent('Archived:setup-old');
});

test('Accrual Admin cannot open setup administration even with a legacy setup flag', () => {
  render(<AccrualSetupPage currentUser={{ usergroup: 'accrual_admin', can_update_setup: true }} />);
  expect(screen.getByText('You do not have access to Accrual Setup.')).toBeInTheDocument();
  expect(listAccrualSetups).not.toHaveBeenCalled();
});

test.each(['accrual_admin', 'accrual_user'])('%s cannot open Archive List or load its records', (usergroup) => {
  render(<ArchiveListPage currentUser={{ usergroup }} />);
  expect(screen.getByText('You do not have access to Archive List.')).toBeInTheDocument();
  expect(listAccrualSetups).not.toHaveBeenCalled();
  expect(screen.queryByTestId('archive-records')).not.toBeInTheDocument();
});
