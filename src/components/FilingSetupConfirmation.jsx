import React from 'react';
import { formatDisplayDate } from '../lib/AccrualSetup';

export default function FilingSetupConfirmation({ setup, action, error, saving, onCancel, onConfirm }) {
  const deleting = action === 'delete';
  const restoring = action === 'unarchive';
  const label = deleting ? 'Delete' : restoring ? 'Unarchive' : 'Archive';
  return <div className="modalOverlay maintenanceOverlay"><section className={`modalContent maintenanceDialog filingSetupConfirm${deleting ? ' filingSetupConfirmDanger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="filing-confirm-title" aria-describedby="filing-confirm-description" onKeyDown={(event) => {
    if (event.key === 'Escape' && !saving) onCancel();
    if (event.key === 'Tab') {
      const buttons = Array.from(event.currentTarget.querySelectorAll('button:not(:disabled)'));
      if (!buttons.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
    }
  }}>
    <header className="filingSetupConfirmHeader">
      <span className="filingSetupConfirmIcon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {deleting ? <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /> : restoring ? <><path d="M8 7H4V3M4 7a9 9 0 1 1-1 8" /><path d="M12 8v5l3 2" /></> : <path d="M4 4h16v4H4zM6 8v12h12V8M10 12h4" />}
      </svg></span>
      <div><h2 id="filing-confirm-title">{label} filing window?</h2><p id="filing-confirm-description">{deleting ? 'Permanently remove this filing window.' : restoring ? 'Restore this window and its accrual records.' : 'Move this window and its accrual records to the archive.'}</p></div>
    </header>
    {error && <div className="inlineError" role="alert">{error}</div>}
    <div className="filingSetupConfirmRecord"><strong>{setup.name}</strong><span>{formatDisplayDate(setup.start_date)} — {formatDisplayDate(setup.cutoff_date)}</span></div>
    <p className="filingSetupConfirmEffect">{deleting ? <>Only windows with <strong>no linked accrual entries</strong> can be deleted. Archive windows that already have entries.</> : restoring ? <>Linked entries will return to <strong>All Accruals</strong>.</> : <>Linked entries will appear in <strong>Archive List</strong> and stay read only.</>}</p>
    <div className="filingSetupConfirmNote"><span aria-hidden="true">{deleting ? '!' : 'i'}</span><p>{deleting ? <>This action cannot be undone.{setup.is_active && ' Deleting this active window will also close filing.'}</> : restoring ? <>This window will stay <strong>inactive</strong>. Activate it separately when ready to open filing.</> : <>You can restore these records later by unlocking and unarchiving this window.</>}</p></div>
    <footer className="dialogActions filingSetupConfirmActions"><button autoFocus type="button" className="tableActionBtn" disabled={saving} onClick={onCancel}>Cancel</button><button type="button" className="submitBtn" disabled={saving} onClick={onConfirm}>{saving ? 'Saving...' : label}</button></footer>
  </section></div>;
}
