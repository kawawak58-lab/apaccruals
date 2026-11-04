import React from 'react';
import { createPortal } from 'react-dom';
import { PASTE_COLUMNS } from '../lib/accrualClipboard';

export default function ExcelPastePreview({ preview, onCancel, onApply }) {
  const ref = React.useRef(null);
  const errorsRef = React.useRef(null);
  const [attention, setAttention] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!attention) return;
    errorsRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
    errorsRef.current?.focus({ preventScroll: true });
  }, [attention]);
  const handleApply = () => {
    if (preview.loading) return;
    if (preview.errors?.length) {
      setAttention((value) => value + 1);
      return;
    }
    onApply();
  };
  const errorGroups = new Map();
  (preview.errors || []).forEach((error) => {
    const match = /^Row (\d+):\s*(.*)$/.exec(error);
    const label = match ? `Row ${match[1]}` : 'Paste';
    const message = (match ? match[2] : error).replace(/\b(glaccount|profitcenter|invoiceNo|expenseclass|transType|taxCode|grossAmount)\b/g, (field) => ({
      glaccount: 'GL account', profitcenter: 'Profit center', invoiceNo: 'Invoice no.',
      expenseclass: 'Expense classification', transType: 'Transaction type', taxCode: 'Tax code', grossAmount: 'Gross amount',
    }[field]));
    if (!errorGroups.has(label)) errorGroups.set(label, []);
    errorGroups.get(label).push(message);
  });
  React.useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  return createPortal(
    <div className="modalOverlay maintenanceOverlay">
      <section ref={ref} tabIndex={-1} className="modalContent maintenanceDialog excelPastePreview" role="dialog" aria-modal="true" aria-labelledby="excel-paste-title" onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
        if (event.key === 'Tab') {
          const controls = Array.from(ref.current.querySelectorAll('button:not(:disabled), [tabindex="0"]'));
          const next = controls.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1);
          event.preventDefault();
          controls[(next + controls.length) % controls.length]?.focus();
        }
      }}>
        <h2 id="excel-paste-title">Preview Excel paste</h2>
        {preview.loading ? <p role="status">Checking copied cells and account codes…</p> : <>
          <p>{preview.rowCount || 0} copied rows. Existing values in the pasted range will be replaced. Invoice details apply to all lines with the same Seq. Required fields are checked again when you submit.</p>
          {preview.errors?.length > 0 && <div key={attention} ref={errorsRef} tabIndex={-1} className={`excelPasteErrors${attention ? ' excelPasteErrorsAttention' : ''}`} role="alert" aria-label="Paste issues">
            <div className="excelPasteErrorsHeading">
              <span className="excelPasteErrorIcon" aria-hidden="true">!</span>
              <div><strong>{preview.errors.length} {preview.errors.length === 1 ? 'issue needs' : 'issues need'} attention</strong><p>Update the affected cells in Excel, then copy and paste again.</p></div>
            </div>
            <div className="excelPasteErrorRows">{Array.from(errorGroups, ([label, messages]) => <div className="excelPasteErrorRow" key={label}>
              <span className="excelPasteErrorBadge">{label}</span>
              <ul>{messages.map((message, index) => <li key={index}>{message}</li>)}</ul>
            </div>)}</div>
          </div>}
          {preview.changes?.length > 0 && <div className="excelPasteScroll" tabIndex={0} aria-label="Pasted entries preview"><table><thead><tr><th>Row</th>{PASTE_COLUMNS.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{preview.changes.slice(0, 50).map(({ index }) => <tr key={index}><td>{index + 1}</td>{PASTE_COLUMNS.map(([key]) => <td key={key}>{preview.items[index][key]}</td>)}</tr>)}</tbody></table>{preview.changes.length > 50 && <p>Showing the first 50 copied rows.</p>}</div>}
        </>}
        <div className="excelPasteActions"><button type="button" className="tableActionBtn" onClick={onCancel}>Cancel</button><button type="button" className="submitBtn" disabled={preview.loading} onClick={handleApply}>Apply paste</button></div>
      </section>
    </div>, document.body
  );
}
