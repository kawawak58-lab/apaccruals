import React, { useState } from "react";
import { updateAccrualDraft } from "./lib/AccrualSubmissions";

const headerFields = [
  ["requester_email", "Requester email", "email"],
  ["expense_class", "Expense class"], ["company", "Company"],
  ["supplier_code", "Supplier code"], ["supplier_name", "Supplier name"],
  ["invoice_no", "Invoice number"],
];
const lineFields = [
  ["gross_amount", "Gross amount", "number"], ["glaccount_code", "GL account code"],
  ["glaccount_name", "GL account name"], ["profitcenter_code", "Profit center code"],
  ["profitcenter_name", "Profit center name"], ["transaction_type", "Transaction type"],
  ["vat", "VAT"], ["tax_code", "Tax code"], ["remarks", "Remarks"],
];
const optionalFields = new Set(["invoice_no", "glaccount_name", "profitcenter_name", "vat", "tax_code"]);

export default function DraftAccrualEditor({ submission, onClose, onSaved }) {
  const [header, setHeader] = useState(() => Object.fromEntries(headerFields.map(([key]) => [key, submission[key] || ""])));
  const [lines, setLines] = useState(() => [...(submission.accrual_submission_lines || [])].sort((a, b) => a.line_number - b.line_number).map((line) => ({ ...line })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!lines.length) { setError("At least one line item is required."); return; }
    setSaving(true);
    try {
      await updateAccrualDraft(submission.id, header, lines.map((line, index) => ({ ...line, line_number: index + 1, gross_amount: Number(line.gross_amount) })));
      await onSaved();
    } catch (saveError) {
      setError(saveError.message || "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modalOverlay maintenanceOverlay">
      <section className="modalContent maintenanceDialog draftEditorDialog" role="dialog" aria-modal="true" aria-labelledby="draftEditorTitle">
        <div className="dialogHeader">
          <div><h2 id="draftEditorTitle" className="modalTitle">Edit Draft</h2><p className="dialogDescription">{submission.control_number} · Changes stay in Draft until you select Add.</p></div>
          <button type="button" className="dialogClose" disabled={saving} onClick={onClose} aria-label="Close draft editor">x</button>
        </div>
        <form onSubmit={save}>
          <fieldset disabled={saving} className="draftEditorFields">
            {error ? <div className="inlineError" role="alert">{error}</div> : null}
            <h3>General information</h3>
            <div className="dialogGrid">
              {headerFields.map(([key, label, type]) => <label className="dialogField" key={key}><span className="label">{label}{!optionalFields.has(key) ? " *" : ""}</span><input className="input" type={type || "text"} value={header[key]} required={!optionalFields.has(key)} onChange={(event) => setHeader({ ...header, [key]: event.target.value })} /></label>)}
            </div>
            <h3>Line items</h3>
            {lines.map((line, index) => <section className="draftEditorLine" key={index}>
              <div className="draftEditorLineHeading"><h4>Line {index + 1}</h4><button type="button" className="tableActionBtn danger" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}>Remove</button></div>
              <div className="dialogGrid">
                {lineFields.map(([key, label, type]) => <label className={`dialogField${key === "remarks" ? " spanTwo" : ""}`} key={key}><span className="label">{label}{!optionalFields.has(key) ? " *" : ""}</span><input className="input" type={type || "text"} step={type === "number" ? "0.01" : undefined} required={!optionalFields.has(key)} value={line[key] ?? ""} onChange={(event) => setLines(lines.map((item, lineIndex) => lineIndex === index ? { ...item, [key]: event.target.value } : item))} /></label>)}
              </div>
            </section>)}
            <button type="button" className="tableActionBtn" onClick={() => setLines([...lines, {}])}>+ Add line item</button>
          </fieldset>
          <div className="dialogActions"><button type="button" className="tableActionBtn" disabled={saving} onClick={onClose}>Close</button><button type="submit" className="submitBtn" disabled={saving}>{saving ? "Saving..." : "Save Draft"}</button></div>
        </form>
      </section>
    </div>
  );
}