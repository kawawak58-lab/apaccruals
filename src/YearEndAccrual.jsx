import React, { useState, useEffect } from "react";
import "./YearEndAccrualForm.css";
import { apiFetch } from "./api";

export default function YearEndAccrualForm() {
  // ---------- Header ----------
  const [headerInfo, setHeaderInfo] = useState({
    email: "",
    expenseclass: "",
    company: "",
    supplier: "",
    supplierName: "",
    invoiceNo: "",
  });

  const [headerErrors, setHeaderErrors] = useState({});

  // ---------- Line Items ----------
  const createEmptyLineItem = (id) => ({
    id,
    grossAmount: "",
    transType: "",
    vat: "",
    taxCode: "",
    glaccount: "",
    glaccountName: "",
    glSearch: "",
    showGLDropdown: false,
    profitcenter: "",
    profitcenterName: "",
    profitSearch: "",
    showProfitDropdown: false,
    remarks: "",
  });

  const [lineItems, setLineItems] = useState([createEmptyLineItem(1)]);
  const [lineItemErrors, setLineItemErrors] = useState([{}]);
  const [lineItemCounter, setLineItemCounter] = useState(1);

  // ---------- Modal ----------
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // ---------- Dropdown data ----------
  const [companies, setCompanies] = useState([]);
  const [expenseClass, setExpenseClass] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);

  // ---------- Supplier ----------
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierTotal, setSupplierTotal] = useState(0);
  const supplierLimit = 50;
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // ---------- GL Accounts ----------
  const [glAccountsList, setGlAccountsList] = useState([]);
  const [glAccountsSearch, setGlAccountsSearch] = useState("");
  const [glAccountsPage, setGlAccountsPage] = useState(1);
  const [glAccountsTotal, setGlAccountsTotal] = useState(0);
  const glAccountsLimit = 50;

  // ---------- Profit Centers ----------
  const [profitCentersList, setProfitCentersList] = useState([]);
  const [profitCentersSearch, setProfitCentersSearch] = useState("");
  const [profitCentersPage, setProfitCentersPage] = useState(1);
  const [profitCentersTotal, setProfitCentersTotal] = useState(0);
  const profitCentersLimit = 50;

  // ---------- Fetch static lists ----------
  useEffect(() => {
    apiFetch("/api/company")
      .then((res) => res.json())
      .then((data) => setCompanies(data.columnA.slice(1).map((row) => row[0])))
      .catch((err) => console.error("Failed to fetch companies", err));

    apiFetch("/api/expenseclass")
      .then((res) => res.json())
      .then((data) => setExpenseClass(data.columnA.slice(1).map((row) => row[0])))
      .catch((err) => console.error("Failed to fetch expenseclass", err));

    apiFetch("/api/transaction")
      .then((res) => res.json())
      .then((data) => setTransactionTypes(data.columnA.slice(1).map((row) => row[0])))
      .catch((err) => console.error("Failed to fetch transaction types", err));

    apiFetch("/api/taxcode")
      .then((res) => res.json())
      .then((data) => setTaxCodes(data.columnA.slice(1).map((row) => row[0])))
      .catch((err) => console.error("Failed to fetch tax codes", err));
  }, []);

  // ---------- Supplier API ----------
  useEffect(() => {
    if (!headerInfo.company || supplierSearch.length < 2) return;

    const fetchSuppliers = async () => {
      try {
        const query = new URLSearchParams({
          company: headerInfo.company,
          search: supplierSearch,
          page: supplierPage,
          limit: supplierLimit,
        }).toString();

        const res = await apiFetch(`/api/suppliers?${query}`);
        const data = await res.json();

        setSuppliers((prev) =>
          supplierPage === 1
            ? data.suppliers
            : [...prev, ...data.suppliers]
        );
        setSupplierTotal(data.total);
      } catch (err) {
        console.error("Failed to fetch suppliers", err);
      }
    };

    fetchSuppliers();
  }, [headerInfo.company, supplierSearch, supplierPage]);

  // ---------- GL Accounts API ----------
  useEffect(() => {
    if (!headerInfo.company || glAccountsSearch.length < 2) return;

    const fetchGLAccounts = async () => {
      try {
        const query = new URLSearchParams({
          company: headerInfo.company,
          search: glAccountsSearch,
          page: glAccountsPage,
          limit: glAccountsLimit,
        }).toString();

        const res = await apiFetch(`/api/glaccounts?${query}`);
        const data = await res.json();

        setGlAccountsList((prev) =>
          glAccountsPage === 1 ? data.glaccounts : [...prev, ...data.glaccounts]
        );
        setGlAccountsTotal(data.total);
      } catch (err) {
        console.error("Failed to fetch GL accounts", err);
      }
    };

    fetchGLAccounts();
  }, [headerInfo.company, glAccountsSearch, glAccountsPage]);

  // ---------- Profit Centers API ----------
  useEffect(() => {
    if (!headerInfo.company || profitCentersSearch.length < 2) return;

    const fetchProfitCenters = async () => {
      try {
        const query = new URLSearchParams({
          company: headerInfo.company,
          search: profitCentersSearch,
          page: profitCentersPage,
          limit: profitCentersLimit,
        }).toString();

        const res = await apiFetch(`/api/profitcenters?${query}`);
        const data = await res.json();

        setProfitCentersList((prev) =>
          profitCentersPage === 1
            ? data.profitcenters
            : [...prev, ...data.profitcenters]
        );
        setProfitCentersTotal(data.total);
      } catch (err) {
        console.error("Failed to fetch profit centers", err);
      }
    };

    fetchProfitCenters();
  }, [headerInfo.company, profitCentersSearch, profitCentersPage]);

  // ---------- Line Item handlers ----------
  const addLineItem = () => {
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    setLineItems((prev) => [...prev, createEmptyLineItem(newId)]);
    setLineItemErrors((prev) => [...prev, {}]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
      setLineItemErrors((prev) => prev.filter((_, i) => lineItems[i].id !== id));
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectSupplier = (s) => {
    setHeaderInfo({
      ...headerInfo,
      supplier: s.supplier,
      supplierName: s.name,
    });
    setSupplierSearch(s.supplier);
    setShowSupplierDropdown(false);
  };

  const selectGLAccount = (lineId, g) => {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              glaccount: g.glaccount,
              glaccountName: g.name,
              glSearch: g.glaccount,
              showGLDropdown: false,
            }
          : item
      )
    );
  };

  const selectProfitCenter = (lineId, p) => {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              profitcenter: p.profitcenter,
              profitcenterName: p.name,
              profitSearch: p.profitcenter,
              showProfitDropdown: false,
            }
          : item
      )
    );
  };

  // ---------- Submit ----------
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    const headerErrs = {};

    if (!headerInfo.email || !isValidEmail(headerInfo.email)) headerErrs.email = true;
    if (!headerInfo.expenseclass) headerErrs.expenseclass = true;
    if (!headerInfo.company) headerErrs.company = true;
    if (!headerInfo.supplier) headerErrs.supplier = true;
    if (headerInfo.expenseclass !== "Non-deductible expense (no valid receipt/invoice)" && !headerInfo.invoiceNo)
      headerErrs.invoiceNo = true;

    setHeaderErrors(headerErrs);

    const newLineItemErrors = lineItems.map((item) => {
      const errors = {};
      if (!item.grossAmount) errors.grossAmount = true;
      if (!item.transType) errors.transType = true;
      if (!item.glaccount) errors.glaccount = true;
      if (!item.remarks) errors.remarks = true;
      if (!item.profitcenter) errors.profitcenter = true;
      if (headerInfo.expenseclass !== "Non-deductible expense (no valid receipt/invoice)") {
        if (!item.vat) errors.vat = true;
        if (!item.taxCode) errors.taxCode = true;
      }
      return errors;
    });

    setLineItemErrors(newLineItemErrors);

    if (Object.keys(headerErrs).length > 0 || newLineItemErrors.some((err) => Object.keys(err).length > 0)) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    const timestamp = new Date().toLocaleString();
    const rows = lineItems.map((item) => [
      timestamp,
      headerInfo.email,
      headerInfo.expenseclass,
      headerInfo.company,
      headerInfo.supplier,
      headerInfo.supplierName,
      headerInfo.invoiceNo,
      item.grossAmount,
      item.glaccount,
      item.glaccountName,
      item.profitcenter,
      item.profitcenterName,
      item.transType,
      item.vat,
      item.taxCode,
      item.remarks,
    ]);

    try {
      const response = await apiFetch("/api/submitform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) throw new Error("Failed to submit form");

      setModalMessage("Form submitted successfully!");
      setShowModal(true);

      // Reset form
      setHeaderInfo({
        email: "",
        expenseclass: "",
        company: "",
        supplier: "",
        supplierName: "",
        invoiceNo: "",
      });
      setHeaderErrors({});
      setSupplierSearch("");
      setLineItems([createEmptyLineItem(1)]);
      setLineItemErrors([{}]);
      setLineItemCounter(1);
    } catch (error) {
      console.error("Submission error:", error);
      alert("❌ Submission failed. Please try again.");
    }
  };

  const isDisabled = !headerInfo.email || !headerInfo.expenseclass;

  // ---------- Render ----------
  return (
    <div className="body">
      <div className="formWrapper">
         <div className="formHeader">
          <h1 className="h1">Year-End Accrual Template</h1>
          <p className="headerText">
            Bounty Day everyone!<br/><br/>
            As the end of the year approaches, please remember to submit all 2025 invoices together with the approved RFP (single/multiple RFP, Reimbursement, Liquidation) / GRPO & CPO to the AP Team until <b style={{ color: "black" }}> Monday, January 05, 2026</b>.<br/><br/>
            If you're unable to submit the physical RFP/GRPO by <b style={{ color: "black" }}>January 05</b>, please complete this form. The information provided will be used in Accrual Templates for recording and withholding tax purposes. Please note that non-recording of transactions may result in discrepancies during BIR Third-party checking Audits, which could lead to fines and penalties. This deadline also applies to any transactions that may affect tax compliance, such as invoice cancellations, price adjustments, and purchase returns. <b style={{ color: "black" }}> This form will automatically close on January 07, 2026</b>.<br/><br/>
            In addition, we kindly request your cooperation in gradually submitting the physical RFPs and GRPOs, along with the receipts, to the AP Teams so we can begin processing payments.<br/><br/>
            Thank you for your continued support and cooperation.
          </p>
        </div>

        {/* Email & Company */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label"> Email <span className="required">*</span> </label>
            <input
              type="email"
              className={`input ${headerErrors.email ? "inputError" : ""}`}
              placeholder="Your email"
              value={headerInfo.email}
              onChange={(e) => {
                const value = e.target.value;
                setHeaderInfo({ ...headerInfo, email: value });
                setHeaderErrors((prev) => ({
                  ...prev,
                  email: !isValidEmail(value) // mark error if invalid
                }));
              }}
            />
            {headerErrors.email && <div className="errorText">Please enter a valid email</div>}
          </div>

           <div className="formGroup">
            <label className="label"> Expense Classifications <span className="required">*</span> </label>
            <select
              className={`select ${headerErrors.expenseclass ? "inputError" : ""}`}
              value={headerInfo.expenseclass}
              // onChange={(e) => setHeaderInfo({ ...headerInfo, : e.target.value })}
              onChange={(e) => {
                setHeaderInfo({ ...headerInfo, expenseclass: e.target.value });
                setHeaderErrors((prev) => ({ ...prev, expenseclass: false }));
              }}
            >
              <option value="">Choose</option>
              {expenseClass.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {headerErrors.expenseclass && <div className="errorText">Expense Classification is Required</div>}
          </div>

          <div className="formGroup">
            <label className="label"> Company Charging <span className="required">*</span> </label>
            <select
              className={`select ${headerErrors.company ? "inputError" : ""}`}
              disabled={isDisabled}
              value={headerInfo.company}
              // onChange={(e) => setHeaderInfo({ ...headerInfo, company: e.target.value })}
               onChange={(e) => {
                const newCompany = e.target.value;
                setHeaderInfo({
                  ...headerInfo,
                  company: newCompany,
                  supplier: "",
                  supplierName: "",
                });
                setSupplierSearch("");  
                setSuppliers([]); 
                setHeaderErrors((prev) => ({ ...prev, company: false }));
              }}
            >
              <option value="">Choose</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              
            </select>
            {headerErrors.company && <div className="errorText">Company Charging is Required</div>}
          </div>
        </div>

        {/* Supplier */}
        <div className="formSection">
          <div className="formGroup" style={{ position: "relative" }}>
            <label className="label">
                Supplier <span className="required">*</span>
            </label>
            <input
                type="text"
                className={`input ${headerErrors.supplier ? "inputError" : ""}`}
                placeholder="Type to search supplier."
                value={supplierSearch}
                onChange={(e) => {
                setSupplierSearch(e.target.value);
                setShowSupplierDropdown(e.target.value.length >= 2);
                setHeaderErrors((prev) => ({ ...prev, supplier: false }));
                }}
                onFocus={() => setShowSupplierDropdown(supplierSearch.length >= 2)}
                disabled={isDisabled}
            />
            {headerErrors.supplier && <div className="errorText">Supplier is Required.</div>}
            {showSupplierDropdown && supplierSearch.length >= 2 && (
  <div
    style={{
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      maxHeight: 200,
      overflowY: "auto",
      backgroundColor: "white",
      border: "1px solid #ddd",
      borderRadius: 4,
      marginTop: 4,
      zIndex: 1000,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    }}
  >
    {suppliers
      .filter(
        (s) =>
          s.suppcompany === headerInfo.company &&
          (s.supplier.toLowerCase().includes(supplierSearch.toLowerCase()) ||
            s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
      )
      .map((s) => (
        <div
          key={s.supplier}
          onClick={() => selectSupplier(s)}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#f5f5f5")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "white")
          }
        >
          {s.supplier} - {s.name}
        </div>
      ))}

    {/* Load more button */}
    {suppliers.length < supplierTotal && (
      <div
        style={{
          padding: "8px",
          textAlign: "center",
          cursor: "pointer",
          fontWeight: "500",
          color: "#007bff",
        }}
        onClick={() => setSupplierPage((prev) => prev + 1)}
      >
        Load more...
      </div>
    )}

    {/* No match */}
    {suppliers.length === 0 && (
      <div
        style={{
          padding: "12px",
          color: "#666",
          fontSize: 14,
          fontStyle: "italic",
        }}
      >
        No supplier found matching "{supplierSearch}"
      </div>
    )}
  </div>
)}
           </div>

          <div className="formGroup">
            <label className="label">Supplier Name</label>
            <input type="text" className="inputDisabled" value={headerInfo.supplierName} disabled />
          </div>
        </div>

        {/* Invoice No */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label"> Invoice No. <span className="required">*</span> </label>
            <input
              type="text"
              className={`input ${headerErrors.invoiceNo ? "inputError" : ""}`}
              disabled={isDisabled}
              placeholder="Enter invoice number"
              value={headerInfo.invoiceNo}
               onChange={(e) => {
                  setHeaderInfo({ ...headerInfo, invoiceNo: e.target.value });
                  setHeaderErrors((prev) => ({ ...prev, invoiceNo: false }));
                }}
            />
            {headerErrors.invoiceNo && <div className="errorText">Required</div>}
          </div>
        </div>
        {/* Line Items */}
        <div className="formSection">
          <div className="lineItemsHeader">
            <button type="button" className="addBtn" onClick={addLineItem} disabled={isDisabled}>
              + Add Line Item
            </button>
          </div>

          {lineItems.map((item, index) => {
            return (
              <div key={item.id} className="lineItemCard">
                {/* Line Item Header */}
                <div className="lineItemHeader">
                  <div className="lineItemTitle">Line Item #{index + 1}</div>
                  {lineItems.length > 1 && (
                    <button type="button" className="removeBtn" onClick={() => removeLineItem(item.id)}>
                      ✕ Remove
                    </button>
                  )}
                </div>

                {/* Line Item Grid */}
                <div className="lineItemGrid">
                  {/* Gross Amount */}
                  <div className="formGroup1">
                    <label className="label">Gross Amount <span className="required">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      className={`input ${lineItemErrors[index]?.grossAmount ? "inputError" : ""}`}
                      placeholder="0.00"
                      value={item.grossAmount}
                      disabled={isDisabled}
                      onChange={(e) => updateLineItem(item.id, "grossAmount", e.target.value)}
                    />
                    {lineItemErrors[index]?.grossAmount && <div className="errorText">Gross Amount is required</div>}
                  </div>

                  {/* GL Account */}
                  <div className="formGroup1" style={{ position: "relative" }}>
                    <label className="label">GL Account <span className="required">*</span></label>
                    <input
                      type="text"
                      className={`inputItem ${lineItemErrors[index]?.glaccount ? "inputError" : ""}`}
                      placeholder="Type to search GL Account."
                      value={item.glSearch}
                      disabled={isDisabled}
                      onChange={(e) => {
                        const value = e.target.value;
                        setLineItems(prev =>
                          prev.map(li =>
                            li.id === item.id
                              ? { ...li, glSearch: value, showGLDropdown: value.length >= 2 }
                              : li
                          )
                        );
                        setGlAccountsSearch(value);
                        setGlAccountsPage(1);
                        setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, glaccount: false } : err));
                      }}
                      onFocus={() =>
                        setLineItems(prev =>
                          prev.map(li =>
                            li.id === item.id
                              ? { ...li, showGLDropdown: (item.glSearch || "").length >= 2 }
                              : li
                          )
                        )
                      }
                    />

                    {/* Dropdown */}
                    {item.showGLDropdown && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 200, overflowY: "auto", backgroundColor: "white", border: "1px solid #ddd", borderRadius: 4, marginTop: 4, zIndex: 1000, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                        {glAccountsList.length > 0 ? (
                          glAccountsList.map(g => (
                            <div key={g.glaccount} onClick={() => selectGLAccount(item.id, g)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                            >
                              {g.glaccount} - {g.name}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: 12, color: "#666", fontStyle: "italic" }}>No GL accounts found matching "{item.glSearch}"</div>
                        )}

                        {glAccountsList.length < glAccountsTotal && (
                          <div style={{ padding: 8, textAlign: "center", cursor: "pointer", color: "#007bff" }} onClick={() => setGlAccountsPage(prev => prev + 1)}>
                            Load more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* GL Account Name */}
                  <div className="formGroup1">
                    <label className="label">GL Account Name</label>
                    <input type="text" className="inputItemDisabled" value={item.glaccountName} disabled />
                  </div>

                  {/* Profit Center */}
                  <div className="formGroup1" style={{ position: "relative" }}>
                    <label className="label">Profit Center Code <span className="required">*</span></label>
                    <input
                      type="text"
                      className={`inputItem ${lineItemErrors[index]?.profitcenter ? "inputError" : ""}`}
                      placeholder="Type to search Profit Center."
                      value={item.profitSearch}
                      disabled={isDisabled}
                      onChange={(e) => {
                        const value = e.target.value;
                        setLineItems(prev =>
                          prev.map(li =>
                            li.id === item.id
                              ? { ...li, profitSearch: value, showProfitDropdown: value.length >= 2 }
                              : li
                          )
                        );
                        setProfitCentersSearch(value);
                        setProfitCentersPage(1);
                        setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, profitcenter: false } : err));
                      }}
                      onFocus={() =>
                        setLineItems(prev =>
                          prev.map(li =>
                            li.id === item.id
                              ? { ...li, showProfitDropdown: (item.profitSearch || "").length >= 2 }
                              : li
                          )
                        )
                      }
                    />
                    {item.showProfitDropdown && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 200, overflowY: "auto", backgroundColor: "white", border: "1px solid #ddd", borderRadius: 4, marginTop: 4, zIndex: 1000, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                        {profitCentersList.length > 0 ? (
                          profitCentersList.map(p => (
                            <div key={p.profitcenter} onClick={() => selectProfitCenter(item.id, p)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                            >
                              {p.profitcenter} - {p.name}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: 12, color: "#666", fontStyle: "italic" }}>No Profit Centers found matching "{item.profitSearch}"</div>
                        )}

                        {profitCentersList.length < profitCentersTotal && (
                          <div style={{ padding: 8, textAlign: "center", cursor: "pointer", color: "#007bff" }} onClick={() => setProfitCentersPage(prev => prev + 1)}>
                            Load more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transaction Type */}
                  <div className="formGroup1">
                    <label className="label">Transaction Type <span className="required">*</span></label>
                    <select className={`input ${lineItemErrors[index]?.transType ? "inputError" : ""}`} value={item.transType} disabled={isDisabled} onChange={(e) => updateLineItem(item.id, "transType", e.target.value)}>
                      <option value="">Select...</option>
                      {transactionTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* VAT */}
                  <div className="formGroup1">
                    <label className="label">VAT %</label>
                    <input type="number" step="0.01" className="input" value={item.vat} disabled={isDisabled} onChange={(e) => updateLineItem(item.id, "vat", e.target.value)} />
                  </div>

                  {/* Tax Code */}
                  <div className="formGroup1">
                    <label className="label">Tax Code</label>
                    <select className="input" value={item.taxCode} disabled={isDisabled} onChange={(e) => updateLineItem(item.id, "taxCode", e.target.value)}>
                      <option value="">Select...</option>
                      {taxCodes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="formGroup1">
                    <label className="label">Remarks <span className="required">*</span></label>
                    <input type="text" className={`input ${lineItemErrors[index]?.remarks ? "inputError" : ""}`} value={item.remarks} disabled={isDisabled} onChange={(e) => updateLineItem(item.id, "remarks", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className="submitBtn" onClick={handleSubmit} disabled={isDisabled}>
          Submit
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modalOverlay">
          <div className="modalContent">
            <p>{modalMessage}</p>
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
