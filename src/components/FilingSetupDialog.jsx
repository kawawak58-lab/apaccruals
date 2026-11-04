import React, { useEffect, useRef, useState } from 'react';

export default function FilingSetupDialog({ values, onChange, onClose, onSubmit, onArchive, onUnarchive, onToggleLock, locked = false, archived = false, saving, error }) {
  const ref = useRef(null);
  const unlockRef = useRef(null);
  const [actionError, setActionError] = useState('');
  const readOnly = locked || archived;
  useEffect(() => { setActionError(''); }, [locked, archived]);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input:not(:disabled), button:not(:disabled)')?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="modalOverlay maintenanceOverlay"><section ref={ref} className="modalContent maintenanceDialog filingSetupDialog" role="dialog" aria-modal="true" aria-labelledby="filing-setup-title" onKeyDown={(event) => {
    if (event.key === 'Escape' && !saving) onClose();
    if (event.key === 'Tab') {
      const controls = Array.from(ref.current.querySelectorAll('input:not(:disabled), button:not(:disabled)'));
      if (!controls.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    }
  }}>
    <div className="dialogHeader"><div><h2 className="modalTitle" id="filing-setup-title">{values.id ? 'Edit filing window' : 'New filing window'}</h2><p className="dialogDescription">{archived ? (locked ? 'This setup is archived and locked. Unlock it first, then unarchive it to restore its accruals.' : 'This setup is still archived. Unarchive it to restore its accruals; it will stay inactive.') : locked ? 'This setup is locked. Its filing window is closed and its accruals are read only. You can archive it or unlock it.' : values.id ? 'Update the name and dates, or lock this setup before archiving it. Locking discards unsaved edits and closes filing.' : 'New setups are inactive. Use Activate in the list when you are ready to open filing.'}</p></div><button type="button" className="dialogClose" aria-label="Close filing window" disabled={saving} onClick={onClose}>×</button></div>
    <form onSubmit={(event) => { event.preventDefault(); if (!readOnly) onSubmit(); }}>
      {error && <div className="inlineError" role="alert">{error}</div>}
      <fieldset className="filingSetupDialogFields" disabled={saving || readOnly}>
        <label className="headerFieldGroup filingSetupNameField"><span className="headerFieldLabel">Setup name</span><input className="input" required maxLength={160} value={values.name} onChange={(event) => onChange({ ...values, name: event.target.value })} placeholder="e.g. Year-end 2026" /></label>
        <label className="headerFieldGroup"><span className="headerFieldLabel">Start date</span><input className="input" type="date" required value={values.start_date} onChange={(event) => onChange({ ...values, start_date: event.target.value })} /></label>
        <label className="headerFieldGroup"><span className="headerFieldLabel">Cutoff date</span><input className="input" type="date" required min={values.start_date} value={values.cutoff_date} onChange={(event) => onChange({ ...values, cutoff_date: event.target.value })} /></label>
      </fieldset>
      {actionError && <div className="inlineError" role="alert">{actionError}</div>}
      <div className="dialogActions filingSetupDialogActions">
        {values.id && <div className="filingSetupLifecycleActions">
          {onToggleLock && <button ref={unlockRef} type="button" className="tableActionBtn" disabled={saving} onClick={() => { setActionError(''); onToggleLock(); }}>{locked ? 'Unlock' : 'Lock'}</button>}
          {archived ? <button type="button" className="tableActionBtn" disabled={saving} onClick={() => {
            if (locked) { setActionError('Unlock first to unarchive.'); unlockRef.current?.focus(); return; }
            onUnarchive?.();
          }} title={locked ? 'Unlock the setup first' : 'Restore this setup and its accruals'}>Unarchive</button> : onArchive && <button type="button" className="tableActionBtn" disabled={saving} onClick={() => {
            if (!locked) { setActionError('Lock first to archive.'); unlockRef.current?.focus(); return; }
            onArchive();
          }} title={!locked ? 'Lock the setup first' : 'Archive this setup and its accruals'}>Archive</button>}
        </div>}
        <button type="button" className="tableActionBtn" disabled={saving} onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
        {!readOnly && <button type="submit" className="submitBtn" disabled={saving}>{saving ? (values.id ? 'Updating...' : 'Creating...') : values.id ? 'Update' : 'Create setup'}</button>}
      </div>
    </form>
  </section></div>;
}
