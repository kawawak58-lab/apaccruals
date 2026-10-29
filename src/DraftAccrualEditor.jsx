import React, { useEffect, useState } from "react";
import { updateAccrualDraft } from "./lib/AccrualSubmissions";
import { getSuppliers } from "./lib/Suppliers";
import { getGLAccounts } from "./lib/GlAccount";
import { getProfitCenters } from "./lib/ProfitCenter";
import { getCompanyNames } from "./lib/Companies";
import { getExpenseClassNames, getExpenseClassRules } from "./lib/ExpenseClasses";
import { getTransactionTypeNames } from "./lib/TransactionTypes";
import { getTaxCodeNames } from "./lib/TaxCodes";

function LookupField({ label, value, company, fetchOptions, onSelect, disabled = false, required = true }) {
  const [search, setSearch] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) setSearch(value || ""); }, [value, open]);
  useEffect(() => {
    if (!open || !company || search.trim().length < 2) {
      setOptions([]);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchOptions(company, search.trim(), 1, 50);
        if (active) setOptions(result.items || []);
      } catch (error) {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [company, fetchOptions, open, search]);

  return <div className="dialogField draftLookupField">
    <span className="label">{label}{required ? " *" : ""}</span>
    <div className="draftLookupControl">
      <input className="input" value={search} disabled={disabled || !company}
        autoComplete="off" aria-label={label} placeholder={`Search ${label.toLowerCase()}...`}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => { setSearch(event.target.value); onSelect(null); setOpen(true); }} />
      {open && search.trim().length >= 2 && <div className="dropdownContainer draftLookupDropdown">
        {loading ? <div className="dropdownEmpty">Searching…</div> : options.length ? options.map((option) =>
          <button type="button" className="dropdownItem" key={option.code}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { onSelect(option); setSearch(option.code); setOpen(false); }}>
            {option.code} — {option.name}
          </button>) : <div className="dropdownEmpty">No matches found</div>}
      </div>}
    </div>
  </div>;
}

const supplierFetcher = async (company, search, page, limit) => {
  const result = await getSuppliers(company, search, page, limit);
  return { items: result.suppliers.map((item) => ({ code: item.supplier, name: item.name })) };
};
const glFetcher = async (company, search, page, limit) => {
  const result = await getGLAccounts(company, search, page, limit);
  return { items: result.glAccounts };
};
const profitFetcher = async (company, search, page, limit) => {
  const result = await getProfitCenters(company, search, page, limit);
  return { items: result.profitCenters };
};

export default function DraftAccrualEditor({ submission, onClose, onSaved }) {
  const [header, setHeader] = useState(() => ({
    requester_email: submission.requester_email || submission.maker || "",
    expense_class: submission.expense_class || "", company: submission.company || "",
    supplier_code: submission.supplier_code || "", supplier_name: submission.supplier_name || "",
    invoice_no: submission.invoice_no || "",
  }));
  const [lines, setLines] = useState(() => [...(submission.accrual_submission_lines || [])].sort((a, b) => a.line_number - b.line_number).map((line) => ({ ...line })));
  const [companies, setCompanies] = useState([]);
  const [expenseClasses, setExpenseClasses] = useState([]);
  const [expenseClassRules, setExpenseClassRules] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedExpenseClassRule = expenseClassRules.find((rule) => String(rule.name).trim().toLowerCase() === String(header.expense_class).trim().toLowerCase());
  const disabledFields = selectedExpenseClassRule?.disabled_fields || [];
  const requiresSupplier = !disabledFields.includes("supplier");
  const requiresInvoice = !disabledFields.includes("invoice_no");
  const requiresProfitCenter = !disabledFields.includes("profit_center");
  const requiresVat = !disabledFields.includes("vat");
  const requiresTaxCode = !disabledFields.includes("tax_code");

  useEffect(() => {
    Promise.all([getCompanyNames(), getExpenseClassNames(), getExpenseClassRules(), getTransactionTypeNames(), getTaxCodeNames()])
      .then(([companyList, expenseList, expenseRules, transactionList, taxList]) => {
        setCompanies(companyList); setExpenseClasses(expenseList);
        setExpenseClassRules(expenseRules);
        setTransactionTypes(transactionList); setTaxCodes(taxList);
      }).catch(() => {});
  }, []);

  const setLineField = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!lines.length) { setError("At least one line item is required."); return; }
    if ((requiresSupplier && (!header.supplier_code || !header.supplier_name)) || ((header.supplier_code && !header.supplier_name) || (!header.supplier_code && header.supplier_name)) || (requiresInvoice && !header.invoice_no && !selectedExpenseClassRule?.default_invoice_no) || lines.some((line) => !line.glaccount_code || !line.glaccount_name || (requiresProfitCenter && (!line.profitcenter_code || !line.profitcenter_name)) || (requiresVat && !line.vat) || (requiresTaxCode && !line.tax_code))) {
      setError("Select a supplier, GL account, and profit center from the search results."); return;
    }
    setSaving(true);
    try {
      await updateAccrualDraft(submission.id, { ...header, invoice_no: header.invoice_no || selectedExpenseClassRule?.default_invoice_no || "" }, lines.map((line, index) => ({ ...line, line_number: index + 1, gross_amount: Number(line.gross_amount) })));
      await onSaved();
    } catch (saveError) {
      setError(saveError.message || "Unable to update accrual.");
    } finally { setSaving(false); }
  };

  return (
    <div className="modalOverlay maintenanceOverlay">
      <section className="modalContent maintenanceDialog draftEditorDialog" role="dialog" aria-modal="true" aria-labelledby="draftEditorTitle">
        <div className="dialogHeader">
          <div><h2 id="draftEditorTitle" className="modalTitle">Edit Accrual</h2><p className="dialogDescription">{submission.control_number} · Changes stay For Confirmation until you select Confirm.</p></div>
          <button type="button" className="dialogClose" disabled={saving} onClick={onClose} aria-label="Close accrual editor">×</button>
        </div>
        <form onSubmit={save}>
          <fieldset disabled={saving} className="draftEditorFields">
            {error ? <div className="inlineError" role="alert">{error}</div> : null}
            <h3>General information</h3>
            <div className="dialogGrid">
              <label className="dialogField"><span className="label">Requester email *</span><input className="input" type="email" value={header.requester_email} disabled readOnly /></label>
              <label className="dialogField"><span className="label">Expense class *</span><select className="select" value={header.expense_class} required onChange={(event) => { const nextRule = expenseClassRules.find((rule) => rule.name === event.target.value); setHeader((current) => ({ ...current, expense_class: event.target.value, invoice_no: nextRule?.default_invoice_no ? current.invoice_no || nextRule.default_invoice_no : current.invoice_no === selectedExpenseClassRule?.default_invoice_no ? "" : current.invoice_no })); }}><option value="">Choose</option>{expenseClasses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="dialogField"><span className="label">Company *</span><select className="select" value={header.company} required onChange={(event) => { setHeader({ ...header, company: event.target.value, supplier_code: "", supplier_name: "" }); setLines((current) => current.map((line) => ({ ...line, glaccount_code: "", glaccount_name: "", profitcenter_code: "", profitcenter_name: "" }))); }}><option value="">Choose</option>{companies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <div aria-hidden="true" />
                <LookupField label="Supplier code" required={requiresSupplier} disabled={!requiresSupplier} value={header.supplier_code} company={header.company} fetchOptions={supplierFetcher} onSelect={(supplier) => setHeader((current) => ({ ...current, supplier_code: supplier?.code || "", supplier_name: supplier?.name || "" }))} />
              <label className="dialogField"><span className="label">Supplier name</span><input className="inputDisabled" value={header.supplier_name} disabled readOnly /></label>
              <label className="dialogField"><span className="label">Invoice number{requiresInvoice ? " *" : ""}</span><input className="input" disabled={!requiresInvoice} value={header.invoice_no} onChange={(event) => setHeader({ ...header, invoice_no: event.target.value })} /></label>
            </div>
            <h3>Line items</h3>
            {lines.map((line, index) => <section className="draftEditorLine" key={line.id || index}>
              <div className="draftEditorLineHeading"><h4>Line {index + 1}</h4><button type="button" className="tableActionBtn danger" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}>Remove</button></div>
              <div className="dialogGrid draftEditorLineGrid">
                <label className="dialogField"><span className="label">Gross amount *</span><input className="input" type="number" step="0.01" required value={line.gross_amount ?? ""} onChange={(event) => setLineField(index, "gross_amount", event.target.value)} /></label>
                <LookupField label="GL account code" value={line.glaccount_code} company={header.company} fetchOptions={glFetcher} onSelect={(option) => { setLineField(index, "glaccount_code", option?.code || ""); setLineField(index, "glaccount_name", option?.name || ""); }} />
                <label className="dialogField"><span className="label">GL account name</span><input className="inputDisabled" value={line.glaccount_name || ""} disabled readOnly /></label>
                <LookupField label="Profit center code" required={requiresProfitCenter} disabled={!requiresProfitCenter} value={line.profitcenter_code} company={header.company} fetchOptions={profitFetcher} onSelect={(option) => { setLineField(index, "profitcenter_code", option?.code || ""); setLineField(index, "profitcenter_name", option?.name || ""); }} />
                <label className="dialogField"><span className="label">Profit center name</span><input className="inputDisabled" value={line.profitcenter_name || ""} disabled readOnly /></label>
                <label className="dialogField"><span className="label">Transaction type *</span><select className="select" required value={line.transaction_type || ""} onChange={(event) => setLineField(index, "transaction_type", event.target.value)}><option value="">Choose</option>{transactionTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="dialogField"><span className="label">VAT{requiresVat ? " *" : ""}</span><select className="select" required={requiresVat} disabled={!requiresVat} value={line.vat || ""} onChange={(event) => setLineField(index, "vat", event.target.value)}><option value="">Choose</option><option value="Vatable">Vatable</option><option value="Non-Vatable">Non-Vatable</option></select></label>
                <label className="dialogField"><span className="label">Tax code{requiresTaxCode ? " *" : ""}</span><select className="select" required={requiresTaxCode} disabled={!requiresTaxCode} value={line.tax_code || ""} onChange={(event) => setLineField(index, "tax_code", event.target.value)}><option value="">Choose</option>{taxCodes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="dialogField spanTwo"><span className="label">Remarks *</span><input className="input" required value={line.remarks || ""} onChange={(event) => setLineField(index, "remarks", event.target.value)} /></label>
              </div>
            </section>)}
            <button type="button" className="tableActionBtn" onClick={() => setLines([...lines, { gross_amount: "", remarks: "" }])}>+ Add line item</button>
          </fieldset>
          <div className="dialogActions"><button type="button" className="tableActionBtn" disabled={saving} onClick={onClose}>Close</button><button type="submit" className="submitBtn" disabled={saving}>{saving ? "Updating..." : "Update"}</button></div>
        </form>
      </section>
    </div>
  );
}
