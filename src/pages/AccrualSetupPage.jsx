import React, { useCallback, useEffect, useState } from 'react';
import MaintenanceTable from '../components/MaintenanceTable';
import FilingSetupDialog from '../components/FilingSetupDialog';
import FilingSetupConfirmation from '../components/FilingSetupConfirmation';
import { useToast } from '../lib/toast';
import { canManageAccrualSetup } from '../lib/access';
import { archiveAccrualSetup, unarchiveAccrualSetup, setAccrualSetupLocked, deleteAccrualSetup, formatDisplayDate, getAccrualWindowStatus, listAccrualSetups, saveAccrualSetup, setAccrualSetupActive } from '../lib/AccrualSetup';

export default function AccrualSetupPage({ currentUser }) {
  const { showToast } = useToast();
  const [setups, setSetups] = useState([]);
  const [form, setForm] = useState({ name: '', start_date: '', cutoff_date: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const hasAccess = canManageAccrualSetup(currentUser);
  const load = useCallback(async () => {
    if (!hasAccess) { setLoading(false); return; }
    setLoading(true);
    try { setSetups(await listAccrualSetups()); setError(''); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [hasAccess]);
  useEffect(() => { load(); }, [load]);
  const run = async (action, message, keepEditor = false) => {
    if (!hasAccess || saving) return;
    setSaving(true);
    try {
      await action(); setArchiveTarget(null); setDeleteTarget(null); if (!keepEditor) setDialogOpen(false); showToast(message, 'success');
      window.dispatchEvent(new Event('accrual-setup-updated')); await load();
    } catch (err) { setError(err.message); showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };
  const create = () => {
    const setup = setups.find((row) => row.id === form.id);
    if (setup?.is_locked || setup?.is_archived) return;
    if (!form.name.trim() || !form.start_date || !form.cutoff_date || form.cutoff_date < form.start_date) {
      showToast('Enter a setup name and valid start and cutoff dates.', 'error'); return;
    }
    run(() => saveAccrualSetup(form), form.id ? 'Filing setup updated.' : 'Setup created. Activate it from the list when ready.');
  };
  const openEditor = (row) => {
    if (saving) return;
    setError('');
    setForm(row ? { id: row.id, name: row.name, start_date: row.start_date || '', cutoff_date: row.cutoff_date || '' } : { name: '', start_date: '', cutoff_date: '' });
    setDialogOpen(true);
  };
  const editorSetup = setups.find((row) => row.id === form.id);
  const changeLock = () => {
    if (!editorSetup) return;
    setForm({ id: editorSetup.id, name: editorSetup.name, start_date: editorSetup.start_date || '', cutoff_date: editorSetup.cutoff_date || '' });
    run(() => setAccrualSetupLocked(editorSetup.id, !editorSetup.is_locked), editorSetup.is_locked ? 'Setup unlocked. It remains inactive.' : 'Setup locked. Filing is closed.', true);
  };
  const reviewArchive = (restore) => {
    setError(''); setDialogOpen(false); setArchiveTarget({ ...editorSetup, restore });
  };
  if (!hasAccess) return <div className="contentPage"><div className="inlineError">You do not have access to Accrual Setup.</div></div>;
  return <div className="contentPage managementPage filingSetupPage">
    <div className="pageIntro"><div><h1 className="pageTitle">Accrual Setup</h1><p className="pageSubtitle">Manage filing windows. Only one setup can be active at a time.</p></div><div className="headerActions"><button type="button" className="tableActionBtn" onClick={load} disabled={loading || saving}>Refresh</button><button type="button" className="submitBtn" disabled={loading || saving} onClick={() => openEditor()}>+ Add setup</button></div></div>
    {error && !dialogOpen && !archiveTarget && !deleteTarget && <div className="inlineError" role="alert">{error}</div>}
    {dialogOpen && <FilingSetupDialog values={form} onChange={setForm} saving={saving} error={error} locked={Boolean(editorSetup?.is_locked)} archived={Boolean(editorSetup?.is_archived)} onToggleLock={changeLock} onClose={() => { if (!saving) setDialogOpen(false); }} onSubmit={create} onArchive={() => reviewArchive(false)} onUnarchive={() => reviewArchive(true)} />}
    <MaintenanceTable loading={loading} rows={setups} emptyText="No filing windows yet." onRowDoubleClick={openEditor} columns={[
      { key: 'name', label: 'Accrual Setup', render: (row) => <strong>{row.name}</strong> },
      { key: 'start_date', label: 'Start date', render: (row) => formatDisplayDate(row.start_date) },
      { key: 'cutoff_date', label: 'Cutoff date', render: (row) => formatDisplayDate(row.cutoff_date) },
      { key: 'is_active', label: 'Status', render: (row) => <span className="statusPill">{row.is_archived ? 'Archived' : row.is_active ? 'Active' : 'Inactive'}</span> },
      { key: 'is_locked', label: 'Lock', render: (row) => <span className={`filingSetupLockBadge${row.is_locked ? ' locked' : ''}`}>{row.is_locked ? 'Locked' : 'Unlocked'}</span> },
      { key: 'window', label: 'Filing window', render: (row) => getAccrualWindowStatus(row).isOpen ? 'Open' : 'Closed' },
    ]} rowActions={(row) => <div className="filingSetupActions" onDoubleClick={(event) => { if (event.target.closest('button')) event.stopPropagation(); }}>
      {row.is_archived || row.is_locked ? <span className="filingSetupArchived">Double-click to {row.is_locked ? 'unlock' : 'unarchive'}</span> : <>
        <button type="button" className="tableActionBtn" disabled={saving} onClick={() => run(() => setAccrualSetupActive(row.id, !row.is_active), row.is_active ? 'Setup deactivated.' : 'Setup activated.')}>{row.is_active ? 'Deactivate' : 'Activate'}</button>
        <button type="button" className="tableActionBtn danger" disabled={saving} onClick={() => { setError(''); setDeleteTarget(row); }}>Delete</button>
      </>}
    </div>} />
    {archiveTarget && <FilingSetupConfirmation setup={archiveTarget} action={archiveTarget.restore ? 'unarchive' : 'archive'} error={error} saving={saving}
      onCancel={() => { setArchiveTarget(null); setDialogOpen(true); }}
      onConfirm={() => run(() => archiveTarget.restore ? unarchiveAccrualSetup(archiveTarget.id) : archiveAccrualSetup(archiveTarget.id), archiveTarget.restore ? 'Setup and its accruals restored. The setup remains inactive.' : 'Setup and its accruals archived.')} />}
    {deleteTarget && <FilingSetupConfirmation setup={deleteTarget} action="delete" error={error} saving={saving}
      onCancel={() => { setDeleteTarget(null); setError(''); }}
      onConfirm={() => run(() => deleteAccrualSetup(deleteTarget.id), 'Setup deleted.')} />}
  </div>;
}
