import React from "react";
import { createPortal } from "react-dom";

function FloatingFieldMessage({ anchorId, children, className, role }) {
  const [position, setPosition] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!children) {
      setPosition(null);
      return undefined;
    }
    const updatePosition = () => {
      const anchor = document.getElementById(anchorId);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(260, window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
      const below = window.innerHeight - rect.bottom;
      const top = below > 64 ? rect.bottom + 5 : Math.max(margin, rect.top - 40);
      setPosition({ position: "fixed", top, left, maxWidth: width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorId, children]);

  return children && position ? createPortal(
    <div className={className} style={position} role={role} aria-live={role === "alert" ? "assertive" : "polite"}>{children}</div>,
    document.body
  ) : null;
}

const FieldError = ({ anchorId, children }) => children
  ? anchorId
    ? <FloatingFieldMessage anchorId={anchorId} className="accrualEntryFieldError" role="alert">{children}</FloatingFieldMessage>
    : <div className="errorText">{children}</div>
  : null;

function FieldHint({ anchorId, children }) {
  return <FloatingFieldMessage anchorId={anchorId} className="accrualEntryFieldHint" role="status">{children}</FloatingFieldMessage>;
}

function AccrualEntryPortalDropdown({ anchorId, dropdownId, className, children, minWidth = 300, maxWidth = 440, role }) {
  const [position, setPosition] = React.useState(null);

  React.useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = document.getElementById(anchorId);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 8;
      const width = Math.min(Math.max(rect.width, minWidth), maxWidth, window.innerWidth - viewportPadding * 2);
      const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));
      const below = window.innerHeight - rect.bottom - viewportPadding;
      const above = rect.top - viewportPadding;
      const openAbove = below < 160 && above > below;
      const availableHeight = Math.max(100, Math.min(260, openAbove ? above : below));
      const top = openAbove ? Math.max(viewportPadding, rect.top - availableHeight - 6) : rect.bottom + 4;
      setPosition({ position: "fixed", top, left, width, maxHeight: availableHeight });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorId, minWidth, maxWidth]);

  return position ? createPortal(
    <div id={dropdownId} className={className} style={position} role={role}>{children}</div>,
    document.body
  ) : null;
}

export default function AccrualEntryTable({
  lineItems,
  currentUser,
  expenseClass,
  expenseClassRules,
  companies,
  transactionTypes,
  taxCodes,
  lineItemErrors,
  isDisabled,
  isEditingExistingAccrual = false,
  isAccrualWindowLocked,
  setLineItems,
  setLineItemErrors,
  handleSupplierSearchChange,
  selectSupplier,
  loadMoreSuppliers,
  handleManageSuppliers,
  updateLineItem,
  handleGLSearchChange,
  selectGLAccount,
  loadMoreGLAccounts,
  handleProfitSearchChange,
  selectProfitCenter,
  loadMoreProfitCenters,
  handleCompanyChange,
  handleSequenceChange,
  handleExpenseClassChange,
  updateHeaderField,
  addLineItemAfter,
  addNextSequenceLineItem,
  removeLineItem,
}) {
  const [hoveredSeparator, setHoveredSeparator] = React.useState(null);
  const [activeFieldHint, setActiveFieldHint] = React.useState(null);
  const separatorHideTimer = React.useRef(null);
  const fieldHintTimer = React.useRef(null);
  const tableScrollRef = React.useRef(null);
  const showFieldHint = (key, message) => {
    if (!message) return;
    window.clearTimeout(fieldHintTimer.current);
    setActiveFieldHint({ key, message });
    fieldHintTimer.current = window.setTimeout(() => setActiveFieldHint(null), 2600);
  };
  const insertAndScrollToRow = (insert, scrollToBottom = false) => {
    const newId = insert();
    if (newId == null) return;
    const performScroll = () => {
      const scrollContainer = tableScrollRef.current;
      if (!scrollContainer) return;
      if (scrollToBottom) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        return;
      }
      const insertedRow = Array.from(scrollContainer.querySelectorAll("tbody tr[data-entry-id]"))
        .find((row) => row.dataset.entryId === String(newId));
      if (!insertedRow) return;
      const containerRect = scrollContainer.getBoundingClientRect();
      const rowRect = insertedRow.getBoundingClientRect();
      const bottomOverflow = rowRect.bottom - (containerRect.bottom - 16);
      if (bottomOverflow > 0) scrollContainer.scrollTop += bottomOverflow;
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      performScroll();
      window.setTimeout(performScroll, 80);
    }));
  };
  const ruleFor = (value) => expenseClassRules.find(
    (rule) => String(rule.name).trim().toLowerCase() === String(value || "").trim().toLowerCase()
  );
  const clearError = (index, field) => setLineItemErrors((errors) =>
    errors.map((error, errorIndex) => errorIndex === index ? { ...error, [field]: false } : error)
  );
  const handleTableKeyDown = (event) => {
    const arrowKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!arrowKeys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const current = event.target;
    if (!(current instanceof HTMLElement) || !current.matches("input, select, textarea, button.accrualDeleteIconButton, button.accrualNewInvoiceButton")) return;

    // Keep the usual caret behavior while editing text; move to another cell at its edge.
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        current instanceof HTMLInputElement && !current.readOnly &&
        ["text", "search", "email", "tel", "url", "password"].includes(current.type)) {
      const selectionStart = current.selectionStart;
      const selectionEnd = current.selectionEnd;
      if (selectionStart !== selectionEnd ||
          (event.key === "ArrowLeft" && selectionStart > 0) ||
          (event.key === "ArrowRight" && selectionEnd < current.value.length)) return;
    }
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        current instanceof HTMLTextAreaElement && !current.readOnly) {
      const selectionStart = current.selectionStart;
      const selectionEnd = current.selectionEnd;
      if (selectionStart !== selectionEnd ||
          (event.key === "ArrowLeft" && selectionStart > 0) ||
          (event.key === "ArrowRight" && selectionEnd < current.value.length)) return;
    }

    const scrollContainer = tableScrollRef.current;
    const currentRow = current.closest("tr[data-entry-id]");
    if (!scrollContainer || !currentRow) return;
    const rows = Array.from(scrollContainer.querySelectorAll("tbody tr[data-entry-id]"));
    const rowIndex = rows.indexOf(currentRow);
    const controlsForRow = (row) => Array.from(row.querySelectorAll("button.accrualDeleteIconButton, button.accrualNewInvoiceButton, input:not([type='hidden']), select, textarea"))
      .filter((control) => !control.disabled && control.tabIndex >= 0);
    const controls = controlsForRow(currentRow);
    const columnIndex = controls.indexOf(current);
    if (rowIndex < 0 || columnIndex < 0) return;

    let target = null;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const nextRow = rows[rowIndex + (event.key === "ArrowUp" ? -1 : 1)];
      const nextControls = nextRow ? controlsForRow(nextRow) : [];
      target = nextControls[Math.min(columnIndex, nextControls.length - 1)] || null;
    } else {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const nextColumn = columnIndex + direction;
      if (nextColumn >= 0 && nextColumn < controls.length) {
        target = controls[nextColumn];
      } else {
        const nextRow = rows[rowIndex + direction];
        const nextControls = nextRow ? controlsForRow(nextRow) : [];
        target = direction < 0 ? nextControls[nextControls.length - 1] : nextControls[0];
      }
    }
    if (!target) return;

    event.preventDefault();
    setLineItems((items) => items.map((item) => ({
      ...item,
      showSupplierDropdown: false,
      showGLDropdown: false,
      showProfitDropdown: false,
    })));
    target.focus({ preventScroll: true });
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (targetRect.top < containerRect.top) scrollContainer.scrollTop -= containerRect.top - targetRect.top;
    else if (targetRect.bottom > containerRect.bottom) scrollContainer.scrollTop += targetRect.bottom - containerRect.bottom;
    if (targetRect.left < containerRect.left) scrollContainer.scrollLeft -= containerRect.left - targetRect.left;
    else if (targetRect.right > containerRect.right) scrollContainer.scrollLeft += targetRect.right - containerRect.right;
  };
  const focusLookupOption = (event, dropdownId) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
    const options = Array.from(document.getElementById(dropdownId)?.querySelectorAll(".accrualEntryDropdownOption:not(:disabled)") || []);
    if (!options.length) return false;
    event.preventDefault();
    event.stopPropagation();
    options[event.key === "ArrowDown" ? 0 : options.length - 1].focus();
    return true;
  };
  const selectLookupOption = (selectOption, lineId, inputId, option) => {
    selectOption(lineId, option);
    window.requestAnimationFrame(() => {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.focus({ preventScroll: true });
      if (input instanceof HTMLInputElement && input.type !== "number") {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  };
  const handleLookupOptionKeyDown = (event, lineId, dropdownField, inputId) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setLineItems((items) => items.map((item) => item.id === lineId ? { ...item, [dropdownField]: false } : item));
      document.getElementById(inputId)?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const options = Array.from(event.currentTarget.closest(".accrualEntryPortalDropdown")?.querySelectorAll(".accrualEntryDropdownOption:not(:disabled)") || []);
    const currentIndex = options.indexOf(event.currentTarget);
    if (currentIndex < 0 || !options.length) return;
    event.preventDefault();
    event.stopPropagation();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    options[Math.max(0, Math.min(options.length - 1, currentIndex + offset))].focus();
  };

  return (
    <>
    <section className="formSection sectionCard accrualEntryTablePanel">
      <div className="accrualEntryTableHeading">
        <div className="accrualEntryHeadingText">
          <h2 className="accrualEntrySectionLabel">Entry</h2>
          <p className="accrualEntrySubmittingAs">
            Submitting as <strong>{currentUser?.email || ""}</strong><span className="accrualEntryMetaDot"> · </span><span className="accrualEntryRequiredMark">*</span> Required<span className="accrualEntryMetaDot"> · </span>Rows with the same Seq. number constitute one (1) invoice or accrual.
          </p>
        </div>
        <div className="accrualEntryTableActions">
          <button type="button" className="missingSupplierLink" onClick={handleManageSuppliers} disabled={isAccrualWindowLocked}>
            Request Supplier Enrollment
          </button>
          {!isEditingExistingAccrual ? (
            <button
              type="button"
              className="submitBtn accrualAddLineBtn"
              onClick={() => insertAndScrollToRow(addNextSequenceLineItem, true)}
              disabled={isDisabled}
            >
              + Add New Invoice
            </button>
          ) : null}
        </div>
      </div>

      <div ref={tableScrollRef} className="accrualEntryTableScroll" role="region" aria-label="Accrual entries table" tabIndex={0} onKeyDown={handleTableKeyDown}>
        <table className="accrualEntryTable">
          <colgroup>
            {[
              48, 72, 300, 280, 240, 240, 180, 160, 250, 240, 220, 240, 230, 220, 160, 180,
              160,
            ].map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th aria-label="Entry actions"></th>
              <th>Seq.</th>
              <th>Expense Classification</th>
              <th>Company Charging</th>
              <th>Supplier</th>
              <th>Supplier Name</th>
              <th>Invoice No.</th>
              <th>Gross Amount</th>
              <th>GL Account</th>
              <th>GL Account Name</th>
              <th>Profit Center Code</th>
              <th>Profit Center Name</th>
              <th>Transaction Type</th>
              <th>VAT</th>
              <th>Tax Code</th>
              <th>Remarks</th>
              <th className="accrualNewInvoiceActionCell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => {
              const errors = lineItemErrors[index] || {};
              const rule = ruleFor(item.expenseclass);
              const disabledFields = rule?.disabled_fields || [];
              const requiresSupplier = !disabledFields.includes("supplier");
              const requiresInvoice = !disabledFields.includes("invoice_no");
              const requiresProfitCenter = !disabledFields.includes("profit_center");
              const requiresVat = !disabledFields.includes("vat");
              const requiresTaxCode = !disabledFields.includes("tax_code");
              const sequenceReadOnly = isDisabled || isEditingExistingAccrual;
              const expenseClassReadOnly = isDisabled || isAccrualWindowLocked;
              const companyReadOnly = isDisabled || !item.expenseclass;
              const supplierReadOnly = isDisabled || !item.company || !requiresSupplier;
              const invoiceReadOnly = isDisabled || !requiresInvoice;
              const amountReadOnly = isDisabled;
              const glReadOnly = isDisabled || !item.company;
              const profitReadOnly = isDisabled || !item.company || !requiresProfitCenter;
              const transTypeReadOnly = isDisabled;
              const vatReadOnly = isDisabled || !requiresVat;
              const taxCodeReadOnly = isDisabled || !requiresTaxCode;
              const remarksReadOnly = isDisabled;
              const expenseClassHint = expenseClassReadOnly ? (isAccrualWindowLocked ? "Filing period is closed" : "Entry is locked") : "";
              const companyHint = isDisabled ? "Entry is locked" : !item.expenseclass ? "Choose expense classification first" : "";
              const supplierHint = isDisabled ? "Entry is locked" : !item.company ? "Choose company first" : !requiresSupplier ? "Not required for this expense type" : "";
              const invoiceHint = isDisabled ? "Entry is locked" : !requiresInvoice ? "Not required for this expense type" : "";
              const glHint = isDisabled ? "Entry is locked" : !item.company ? "Choose company first" : "";
              const profitHint = isDisabled ? "Entry is locked" : !item.company ? "Choose company first" : !requiresProfitCenter ? "Not required for this expense type" : "";
              const vatHint = isDisabled ? "Entry is locked" : !requiresVat ? "Not required for this expense type" : "";
              const taxCodeHint = isDisabled ? "Entry is locked" : !requiresTaxCode ? "Not required for this expense type" : "";
              const fieldHint = (field) => activeFieldHint?.key === `${item.id}:${field}` ? activeFieldHint.message : "";
              const showHint = (field, message) => () => showFieldHint(`${item.id}:${field}`, message);
              const rowDeleteDisabled = lineItems.length <= 1;
              const currentSequence = Number(item.sequence);
              const highestSequence = Math.max(0, ...lineItems
                .map((entry) => Number(entry.sequence))
                .filter((sequence) => Number.isInteger(sequence) && sequence > 0));
              const canAddNextSequence = index === lineItems.length - 1 && currentSequence === highestSequence;
              const glAccounts = item.glAccounts || [];
              const profitCenters = item.profitCenters || [];
              const suppliers = item.suppliers || [];

              return (
                <React.Fragment key={item.id}>
                <tr
                  data-entry-id={item.id}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const distanceToBottom = rect.bottom - event.clientY;
                    if (distanceToBottom < -2 || distanceToBottom > 12) {
                      if (hoveredSeparator?.id === item.id) setHoveredSeparator(null);
                      return;
                    }
                    window.clearTimeout(separatorHideTimer.current);
                    setHoveredSeparator({ id: item.id, left: event.clientX, top: rect.bottom });
                  }}
                  onMouseLeave={() => {
                    separatorHideTimer.current = window.setTimeout(() => setHoveredSeparator(null), 500);
                  }}
                >
                  <td className="accrualEntryActionCell" data-label="Entry actions">
                    <div className="accrualEntryRowActions">
                      {!isEditingExistingAccrual ? (
                        <button
                          type="button"
                          className="accrualInsertRowButton"
                          aria-label={`Add next sequence after entry ${index + 1}`}
                          title={canAddNextSequence ? "Add a blank entry with the next Seq." : "Add from the last row of the highest Seq."}
                          aria-disabled={!canAddNextSequence || isDisabled || undefined}
                          onClick={() => {
                            if (canAddNextSequence && !isDisabled) addNextSequenceLineItem();
                          }}
                        >
                          <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                        </button>
                      ) : null}
                      <button type="button" className="accrualDeleteIconButton" aria-label={`Delete entry ${index + 1}`} title="Delete entry" aria-disabled={rowDeleteDisabled || undefined} tabIndex={0} onClick={() => { if (!rowDeleteDisabled) removeLineItem(item.id); }}>
                        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M4 6h12m-10 0 .7 10h6.6L14 6M8 6V4h4v2m-3 3v4m2-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </td>
                  <td className="accrualSequenceCell" data-label="Seq.">
                    <input id={`sequence-${item.id}`} className={`input accrualSequenceInput ${errors.sequence ? "inputError" : ""}`} type="number" min="1" step="1" aria-label={`Sequence number for entry ${index + 1}`} value={item.sequence ?? index + 1} readOnly={sequenceReadOnly} aria-disabled={sequenceReadOnly || undefined} onClick={showHint("sequence", isEditingExistingAccrual ? "This edit keeps the existing control number, so all entries stay in one Seq. group" : sequenceReadOnly ? "Entry is locked" : "")} onDoubleClick={showHint("sequence", isEditingExistingAccrual ? "This edit keeps the existing control number, so all entries stay in one Seq. group" : sequenceReadOnly ? "Entry is locked" : "")} onKeyDown={(event) => { if (event.key === "Enter" && sequenceReadOnly) showFieldHint(`${item.id}:sequence`, isEditingExistingAccrual ? "This edit keeps the existing control number, so all entries stay in one Seq. group" : "Entry is locked"); }} onChange={(event) => { handleSequenceChange(item.id, event.target.value); }} />
                    <FieldHint anchorId={`sequence-${item.id}`}>{fieldHint("sequence")}</FieldHint>
                    <FieldError anchorId={`sequence-${item.id}`}>{errors.sequence ? "Use an existing Seq. or the next number in order" : ""}</FieldError>
                  </td>
                  <td>
                    <select id={`expenseclass-${item.id}`} className={`select ${errors.expenseclass ? "inputError" : ""} ${expenseClassReadOnly ? "accrualKeyboardDisabled" : ""}`} value={item.expenseclass} aria-disabled={expenseClassReadOnly || undefined} tabIndex={expenseClassReadOnly ? 0 : undefined} onMouseDown={(event) => { if (expenseClassReadOnly) { event.preventDefault(); event.currentTarget.focus(); showFieldHint(`${item.id}:expenseclass`, expenseClassHint); } }} onDoubleClick={showHint("expenseclass", expenseClassHint)} onKeyDown={(event) => { if (expenseClassReadOnly && event.key !== "Tab") { if (event.key === "Enter") showFieldHint(`${item.id}:expenseclass`, expenseClassHint); event.preventDefault(); } }} onChange={(event) => {
                      if (expenseClassReadOnly) return;
                      handleExpenseClassChange(item.id, event.target.value);
                      clearError(index, "expenseclass");
                    }}>
                      <option value="">Choose</option>
                      {expenseClass.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <FieldHint anchorId={`expenseclass-${item.id}`}>{fieldHint("expenseclass")}</FieldHint>
                    <FieldError>{errors.expenseclass ? "Required" : ""}</FieldError>
                  </td>
                  <td>
                    <select id={`company-${item.id}`} className={`select ${errors.company ? "inputError" : ""} ${companyReadOnly ? "accrualKeyboardDisabled" : ""}`} value={item.company} aria-disabled={companyReadOnly || undefined} tabIndex={companyReadOnly ? 0 : undefined} onMouseDown={(event) => { if (companyReadOnly) { event.preventDefault(); event.currentTarget.focus(); showFieldHint(`${item.id}:company`, companyHint); } }} onDoubleClick={showHint("company", companyHint)} onKeyDown={(event) => { if (companyReadOnly && event.key !== "Tab") { if (event.key === "Enter") showFieldHint(`${item.id}:company`, companyHint); event.preventDefault(); } }} onChange={(event) => { if (companyReadOnly) return; handleCompanyChange(item.id, event.target.value); clearError(index, "company"); }}>
                      <option value="">Choose</option>
                      {companies.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <FieldHint anchorId={`company-${item.id}`}>{fieldHint("company")}</FieldHint>
                    <FieldError>{errors.company ? "Required" : ""}</FieldError>
                  </td>
                  <td className="accrualSupplierCell" data-label="Supplier">
                    <div className="accrualSupplierSearchWrap">
                    <input id={`supplier-search-${item.id}`} className={`input ${errors.supplier ? "inputError" : ""}`} type="text" role="combobox" aria-autocomplete="list" placeholder="Search supplier" value={item.supplierSearch} readOnly={supplierReadOnly} aria-disabled={supplierReadOnly || undefined} aria-controls={`supplier-dropdown-${item.id}`} aria-expanded={Boolean(item.showSupplierDropdown && item.supplierSearch?.length >= 2 && requiresSupplier && !supplierReadOnly)} onClick={showHint("supplier", supplierHint)} onDoubleClick={showHint("supplier", supplierHint)} onKeyDown={(event) => { if (focusLookupOption(event, `supplier-dropdown-${item.id}`)) return; if (event.key === "Enter") showFieldHint(`${item.id}:supplier`, supplierHint); }} onChange={(event) => { handleSupplierSearchChange(item.id, event.target.value); clearError(index, "supplier"); }} onFocus={() => setLineItems((rows) => rows.map((row) => row.id === item.id ? { ...row, showSupplierDropdown: !supplierReadOnly && !(row.supplier && row.supplierSearch === row.supplier) && (row.supplierSearch || "").length >= 2 } : row))} />
                      <FieldHint anchorId={`supplier-search-${item.id}`}>{fieldHint("supplier")}</FieldHint>
                      {item.showSupplierDropdown && item.supplierSearch?.length >= 2 && requiresSupplier && !supplierReadOnly ? (
                        <AccrualEntryPortalDropdown anchorId={`supplier-search-${item.id}`} dropdownId={`supplier-dropdown-${item.id}`} className="dropdownContainer accrualEntryPortalDropdown" role="listbox">
                          {suppliers.map((supplier) => <button key={supplier.supplier} type="button" className="dropdownItem accrualEntryDropdownItem accrualEntryDropdownOption" role="option" aria-selected={item.supplier === supplier.supplier} onKeyDown={(event) => handleLookupOptionKeyDown(event, item.id, "showSupplierDropdown", `supplier-search-${item.id}`)} onClick={() => selectLookupOption(selectSupplier, item.id, `supplier-search-${item.id}`, supplier)}>{supplier.supplier} - {supplier.name}</button>)}
                          {suppliers.length < item.supplierTotal ? <button type="button" className="dropdownLoadMore" onClick={() => loadMoreSuppliers(item.id)}>Load more...</button> : null}
                          {suppliers.length === 0 ? <div className="dropdownEmpty">No supplier found matching &quot;{item.supplierSearch}&quot;</div> : null}
                        </AccrualEntryPortalDropdown>
                      ) : null}
                    </div>
                    <FieldError>{errors.supplier ? "Supplier is required" : ""}</FieldError>
                  </td>
                  <td><input id={`supplier-name-${item.id}`} className="inputDisabled" value={item.supplierName} readOnly aria-disabled="true" placeholder="Supplier name" onClick={showHint("supplierName", "Auto-filled from supplier")} onDoubleClick={showHint("supplierName", "Auto-filled from supplier")} onKeyDown={(event) => { if (event.key === "Enter") showFieldHint(`${item.id}:supplierName`, "Auto-filled from supplier"); }} /><FieldHint anchorId={`supplier-name-${item.id}`}>{fieldHint("supplierName")}</FieldHint></td>
                  <td>
                    <input id={`invoice-no-${item.id}`} className={`input ${errors.invoiceNo ? "inputError" : ""}`} value={item.invoiceNo} readOnly={invoiceReadOnly} aria-disabled={invoiceReadOnly || undefined} placeholder="Invoice no." onClick={showHint("invoice", invoiceHint)} onDoubleClick={showHint("invoice", invoiceHint)} onKeyDown={(event) => { if (event.key === "Enter") showFieldHint(`${item.id}:invoice`, invoiceHint); }} onChange={(event) => { if (invoiceReadOnly) return; updateHeaderField(item.id, "invoiceNo", event.target.value); clearError(index, "invoiceNo"); }} />
                    <FieldHint anchorId={`invoice-no-${item.id}`}>{fieldHint("invoice")}</FieldHint>
                    <FieldError>{errors.invoiceNo ? "Required" : ""}</FieldError>
                  </td>
                  <td>
                    <input id={`gross-amount-${item.id}`} type="number" step="0.01" className={`input ${errors.grossAmount ? "inputError" : ""}`} placeholder="0.00" value={item.grossAmount} readOnly={amountReadOnly} aria-disabled={amountReadOnly || undefined} onClick={showHint("amount", amountReadOnly ? "Entry is locked" : "")} onDoubleClick={showHint("amount", amountReadOnly ? "Entry is locked" : "")} onKeyDown={(event) => { if (event.key === "Enter" && amountReadOnly) showFieldHint(`${item.id}:amount`, "Entry is locked"); }} onChange={(event) => { if (amountReadOnly) return; updateLineItem(item.id, "grossAmount", event.target.value); clearError(index, "grossAmount"); }} />
                    <FieldHint anchorId={`gross-amount-${item.id}`}>{fieldHint("amount")}</FieldHint>
                    <FieldError>{errors.grossAmount ? "Required" : ""}</FieldError>
                  </td>
                  <td className="accrualLookupCell">
                    <input id={`gl-search-${item.id}`} className={`inputItem ${errors.glaccount ? "inputError" : ""}`} role="combobox" aria-autocomplete="list" placeholder="Search GL account" value={item.glSearch} readOnly={glReadOnly} aria-disabled={glReadOnly || undefined} aria-controls={`gl-dropdown-${item.id}`} aria-expanded={Boolean(item.showGLDropdown && !glReadOnly)} onClick={showHint("gl", glHint)} onDoubleClick={showHint("gl", glHint)} onKeyDown={(event) => { if (focusLookupOption(event, `gl-dropdown-${item.id}`)) return; if (event.key === "Enter") showFieldHint(`${item.id}:gl`, glHint); }} onChange={(event) => { if (glReadOnly) return; handleGLSearchChange(item.id, event.target.value); clearError(index, "glaccount"); }} onFocus={() => setLineItems((rows) => rows.map((row) => row.id === item.id ? { ...row, showGLDropdown: !glReadOnly && !(row.glaccount && row.glSearch === row.glaccount) && (row.glSearch || "").length >= 2 } : row))} />
                    <FieldHint anchorId={`gl-search-${item.id}`}>{fieldHint("gl")}</FieldHint>
                    <FieldError>{errors.glaccount ? "Required" : ""}</FieldError>
                    {item.showGLDropdown && !glReadOnly ? <AccrualEntryPortalDropdown anchorId={`gl-search-${item.id}`} dropdownId={`gl-dropdown-${item.id}`} className="accrualEntryLookupDropdown accrualEntryPortalDropdown" minWidth={320} maxWidth={460} role="listbox">
                      {glAccounts.map((account) => <button key={account.code} type="button" className="accrualEntryDropdownOption" role="option" aria-selected={item.glaccount === account.code} onKeyDown={(event) => handleLookupOptionKeyDown(event, item.id, "showGLDropdown", `gl-search-${item.id}`)} onClick={() => selectLookupOption(selectGLAccount, item.id, `gl-search-${item.id}`, account)}>{account.code} - {account.name}</button>)}
                      {glAccounts.length === 0 ? <span>No GL accounts found</span> : null}
                      {glAccounts.length < item.glTotal ? <button type="button" className="loadMore" onClick={() => loadMoreGLAccounts(item.id)}>Load more...</button> : null}
                    </AccrualEntryPortalDropdown> : null}
                  </td>
                  <td><input id={`gl-name-${item.id}`} className="inputItemDisabled" value={item.glaccountName} readOnly aria-disabled="true" placeholder="GL account name" onClick={showHint("glName", "Auto-filled from GL account")} onDoubleClick={showHint("glName", "Auto-filled from GL account")} onKeyDown={(event) => { if (event.key === "Enter") showFieldHint(`${item.id}:glName`, "Auto-filled from GL account"); }} /><FieldHint anchorId={`gl-name-${item.id}`}>{fieldHint("glName")}</FieldHint></td>
                  <td className="accrualLookupCell">
                    <input id={`profit-search-${item.id}`} className={`inputItem ${errors.profitcenter ? "inputError" : ""}`} role="combobox" aria-autocomplete="list" placeholder="Search profit center" value={item.profitSearch} readOnly={profitReadOnly} aria-disabled={profitReadOnly || undefined} aria-controls={`profit-dropdown-${item.id}`} aria-expanded={Boolean(item.showProfitDropdown && !profitReadOnly)} onClick={showHint("profit", profitHint)} onDoubleClick={showHint("profit", profitHint)} onKeyDown={(event) => { if (focusLookupOption(event, `profit-dropdown-${item.id}`)) return; if (event.key === "Enter") showFieldHint(`${item.id}:profit`, profitHint); }} onChange={(event) => { if (profitReadOnly) return; handleProfitSearchChange(item.id, event.target.value); clearError(index, "profitcenter"); }} onFocus={() => setLineItems((rows) => rows.map((row) => row.id === item.id ? { ...row, showProfitDropdown: !profitReadOnly && !(row.profitcenter && row.profitSearch === row.profitcenter) && (row.profitSearch || "").length >= 2 } : row))} />
                    <FieldHint anchorId={`profit-search-${item.id}`}>{fieldHint("profit")}</FieldHint>
                    <FieldError>{errors.profitcenter ? "Required" : ""}</FieldError>
                    {item.showProfitDropdown && !profitReadOnly ? <AccrualEntryPortalDropdown anchorId={`profit-search-${item.id}`} dropdownId={`profit-dropdown-${item.id}`} className="accrualEntryLookupDropdown accrualEntryPortalDropdown" minWidth={320} maxWidth={460} role="listbox">
                      {profitCenters.map((center) => <button key={center.code} type="button" className="accrualEntryDropdownOption" role="option" aria-selected={item.profitcenter === center.code} onKeyDown={(event) => handleLookupOptionKeyDown(event, item.id, "showProfitDropdown", `profit-search-${item.id}`)} onClick={() => selectLookupOption(selectProfitCenter, item.id, `profit-search-${item.id}`, center)}>{center.code} - {center.name}</button>)}
                      {profitCenters.length === 0 ? <span>No profit centers found</span> : null}
                      {profitCenters.length < item.profitTotal ? <button type="button" className="loadMore" onClick={() => loadMoreProfitCenters(item.id)}>Load more...</button> : null}
                    </AccrualEntryPortalDropdown> : null}
                  </td>
                  <td><input id={`profit-name-${item.id}`} className="inputItemDisabled" value={item.profitcenterName} readOnly aria-disabled="true" placeholder="Profit center name" onClick={showHint("profitName", "Auto-filled from profit center")} onDoubleClick={showHint("profitName", "Auto-filled from profit center")} onKeyDown={(event) => { if (event.key === "Enter") showFieldHint(`${item.id}:profitName`, "Auto-filled from profit center"); }} /><FieldHint anchorId={`profit-name-${item.id}`}>{fieldHint("profitName")}</FieldHint></td>
                  <td>
                    <select id={`trans-type-${item.id}`} className={`select ${errors.transType ? "inputError" : ""} ${transTypeReadOnly ? "accrualKeyboardDisabled" : ""}`} value={item.transType} aria-disabled={transTypeReadOnly || undefined} tabIndex={transTypeReadOnly ? 0 : undefined} onMouseDown={(event) => { if (transTypeReadOnly) { event.preventDefault(); event.currentTarget.focus(); showFieldHint(`${item.id}:transType`, "Entry is locked"); } }} onDoubleClick={showHint("transType", transTypeReadOnly ? "Entry is locked" : "")} onKeyDown={(event) => { if (transTypeReadOnly && event.key !== "Tab") { if (event.key === "Enter") showFieldHint(`${item.id}:transType`, "Entry is locked"); event.preventDefault(); } }} onChange={(event) => { if (transTypeReadOnly) return; updateLineItem(item.id, "transType", event.target.value); clearError(index, "transType"); }}>
                      <option value="">Choose</option>
                      {transactionTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <FieldHint anchorId={`trans-type-${item.id}`}>{fieldHint("transType")}</FieldHint>
                    <FieldError>{errors.transType ? "Required" : ""}</FieldError>
                  </td>
                  <td>
                    <select id={`vat-${item.id}`} className={`select ${errors.vat ? "inputError" : ""} ${vatReadOnly ? "accrualKeyboardDisabled" : ""}`} value={item.vat} aria-disabled={vatReadOnly || undefined} tabIndex={vatReadOnly ? 0 : undefined} onMouseDown={(event) => { if (vatReadOnly) { event.preventDefault(); event.currentTarget.focus(); showFieldHint(`${item.id}:vat`, vatHint); } }} onDoubleClick={showHint("vat", vatHint)} onKeyDown={(event) => { if (vatReadOnly && event.key !== "Tab") { if (event.key === "Enter") showFieldHint(`${item.id}:vat`, vatHint); event.preventDefault(); } }} onChange={(event) => { if (vatReadOnly) return; updateLineItem(item.id, "vat", event.target.value); clearError(index, "vat"); }}>
                      <option value="">Choose</option><option value="Vatable">Vatable</option><option value="Non-Vatable">Non-Vatable</option>
                    </select>
                    <FieldHint anchorId={`vat-${item.id}`}>{fieldHint("vat")}</FieldHint>
                    <FieldError>{errors.vat ? "Required" : ""}</FieldError>
                  </td>
                  <td>
                    <select id={`tax-code-${item.id}`} className={`select ${errors.taxCode ? "inputError" : ""} ${taxCodeReadOnly ? "accrualKeyboardDisabled" : ""}`} value={item.taxCode} aria-disabled={taxCodeReadOnly || undefined} tabIndex={taxCodeReadOnly ? 0 : undefined} onMouseDown={(event) => { if (taxCodeReadOnly) { event.preventDefault(); event.currentTarget.focus(); showFieldHint(`${item.id}:taxCode`, taxCodeHint); } }} onDoubleClick={showHint("taxCode", taxCodeHint)} onKeyDown={(event) => { if (taxCodeReadOnly && event.key !== "Tab") { if (event.key === "Enter") showFieldHint(`${item.id}:taxCode`, taxCodeHint); event.preventDefault(); } }} onChange={(event) => { if (taxCodeReadOnly) return; updateLineItem(item.id, "taxCode", event.target.value); clearError(index, "taxCode"); }}>
                      <option value="">Choose</option>
                      {taxCodes.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <FieldHint anchorId={`tax-code-${item.id}`}>{fieldHint("taxCode")}</FieldHint>
                    <FieldError>{errors.taxCode ? "Required" : ""}</FieldError>
                  </td>
                  <td>
                    <textarea id={`remarks-${item.id}`} className={`input ${errors.remarks ? "inputError" : ""}`} rows={1} value={item.remarks} readOnly={remarksReadOnly} aria-disabled={remarksReadOnly || undefined} onClick={showHint("remarks", remarksReadOnly ? "Entry is locked" : "")} onDoubleClick={showHint("remarks", remarksReadOnly ? "Entry is locked" : "")} onKeyDown={(event) => { if (event.key === "Enter" && remarksReadOnly) showFieldHint(`${item.id}:remarks`, "Entry is locked"); }} onChange={(event) => { if (remarksReadOnly) return; updateLineItem(item.id, "remarks", event.target.value); clearError(index, "remarks"); }} />
                    <FieldHint anchorId={`remarks-${item.id}`}>{fieldHint("remarks")}</FieldHint>
                    <FieldError>{errors.remarks ? "Required" : ""}</FieldError>
                  </td>
                  <td className="accrualNewInvoiceActionCell">
                    <button
                      type="button"
                      className="accrualNewInvoiceButton"
                      aria-label={`Add line item after entry ${index + 1} with Seq. ${item.sequence}`}
                      title={`Add a new line item with Seq. ${item.sequence}`}
                      disabled={isDisabled}
                      onClick={() => insertAndScrollToRow(() => addLineItemAfter(item.id))}
                    >
                      <span aria-hidden="true">+</span> Add Line Item
                    </button>
                  </td>
                </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
    {hoveredSeparator && !isDisabled ? createPortal(
      <button
        type="button"
        className="accrualEntryInsertSeparatorButton"
        aria-label={`Add a new entry below row ${lineItems.findIndex((item) => item.id === hoveredSeparator.id) + 1}`}
        style={{ left: hoveredSeparator.left, top: hoveredSeparator.top }}
        onMouseEnter={() => window.clearTimeout(separatorHideTimer.current)}
        onMouseLeave={() => { separatorHideTimer.current = window.setTimeout(() => setHoveredSeparator(null), 500); }}
        onClick={() => {
          insertAndScrollToRow(() => addLineItemAfter(hoveredSeparator.id));
          setHoveredSeparator(null);
        }}
      ><span aria-hidden="true">+</span></button>,
      document.body
    ) : null}
    </>
  );
}
