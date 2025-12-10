import React, { useState, useEffect } from "react";
import "./YearEndAccrualForm.css";
import AccrualSetupDate from "./AccrualSetupDate";


export default function YearEndAccrualForm() {
  // ---------- Header ----------
  const [headerInfo, setHeaderInfo] = useState({
    email: "",
    company: "",
    supplier: "",
    supplierName: "",
    invoiceNo: "",
    remarks: "",
  });

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
  });

  const [lineItems, setLineItems] = useState([createEmptyLineItem(1)]);
  const [lineItemCounter, setLineItemCounter] = useState(1);

  // ---------- Modal ----------
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // ---------- Dropdown data ----------
  const [companies, setCompanies] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [glAccounts, setGlAccounts] = useState([]);
  const [profitCenters, setProfitCenters] = useState([]);

  // ---------- Fetch static lists ----------
  useEffect(() => {
    fetch("http://localhost:5000/api/company")
      .then((res) => res.json())
      .then((data) => setCompanies(data.columnA.slice(1).map((row) => row[0])))
      .catch((err) => console.error("Failed to fetch companies", err));

    fetch("http://localhost:5000/api/suppliers")
      .then((res) => res.json())
      .then((data) =>
        setSuppliers(
          data.suppliers.map((s) => ({ supplier: s.supplierNo, name: s.supplierName }))
        )
      )
      .catch((err) => console.error("Failed to fetch suppliers", err));

    fetch("http://localhost:5000/api/transaction")
      .then((res) => res.json())
      .then((data) =>
        setTransactionTypes(data.columnA.slice(1).map((row) => row[0]))
      )
      .catch((err) => console.error("Failed to fetch transaction types", err));

    fetch("http://localhost:5000/api/taxcode")
      .then((res) => res.json())
      .then((data) => setTaxCodes(data.columnA.slice(1).map((row) => row[0])))
      .catch((err) => console.error("Failed to fetch tax codes", err));

    fetch("http://localhost:5000/api/glaccount")
      .then((res) => res.json())
      .then((data) =>
        setGlAccounts(
          data.glaccount.map((g) => ({ glaccount: g.glaccountNo, name: g.glaccountName }))
        )
      )
      .catch((err) => console.error("Failed to fetch GL accounts", err));

    fetch("http://localhost:5000/api/profitcenter")
      .then((res) => res.json())
      .then((data) =>
        setProfitCenters(
          data.profitcenter.map((p) => ({
            profitcenter: p.profitcenterNo,
            name: p.profitcenterName,
          }))
        )
      )
      .catch((err) => console.error("Failed to fetch profit centers", err));
  }, []);

  // ---------- Line item helpers ----------
  const addLineItem = () => {
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    setLineItems((prev) => [...prev, createEmptyLineItem(newId)]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectGLAccount = (lineId, gl) => {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              glaccount: gl.glaccount,
              glaccountName: gl.name,
              glSearch: gl.glaccount,
              showGLDropdown: false,
            }
          : item
      )
    );
  };

  const selectProfitCenter = (lineId, pc) => {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              profitcenter: pc.profitcenter,
              profitcenterName: pc.name,
              profitSearch: pc.profitcenter,
              showProfitDropdown: false,
            }
          : item
      )
    );
  };

  // ---------- Supplier ----------
  const selectSupplier = (supplier) => {
    setHeaderInfo({
      ...headerInfo,
      supplier: supplier.supplier,
      supplierName: supplier.name,
    });
    setSupplierSearch(supplier.supplier);
    setShowSupplierDropdown(false);
  };

  // ---------- Submit ----------
  const handleSubmit = async () => {
    // Validate header
    if (
      !headerInfo.email ||
      !headerInfo.company ||
      !headerInfo.supplier ||
      !headerInfo.invoiceNo ||
      !headerInfo.remarks
    ) {
      alert("⚠️ Please fill in all required header fields.");
      return;
    }

    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.grossAmount || !item.transType || !item.vat || !item.taxCode) {
        alert(`⚠️ Please fill in all required fields for Line Item #${i + 1}.`);
        return;
      }
    }

    // Build rows
    const timestamp = new Date().toLocaleString();
    const rows = lineItems.map((item) => [
      timestamp,
      headerInfo.email,
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
      headerInfo.remarks,
    ]);

    try {
      const response = await fetch("http://localhost:5000/api/submitform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) throw new Error("Failed to submit form");

      setModalMessage(`Form submitted successfully!`);
      setShowModal(true);

      // Reset form
      setHeaderInfo({ email: "", company: "", supplier: "", supplierName: "", invoiceNo: "", remarks: "" });
      setSupplierSearch("");
      setLineItems([createEmptyLineItem(1)]);
      setLineItemCounter(1);
    } catch (error) {
      console.error("Submission error:", error);
      alert("❌ Submission failed. Please try again.");
    }
  };

  // ---------- Render ----------
  return (
    <div className="body">
      <div className="formWrapper">
        <div className="formHeader">
          <h1 className="h1">Year-End Accrual Template</h1>
          <p className="headerText">
            Bounty D454545ay everyone!<br/><br/>
            As the end of the year approaches, please remember to submit all 2025 invoices together with the approved RFP (single/multiple RFP, Reimbursement, Liquidation) / GRPO & CPO to the AP Team until Monday, December 15, 2025.<br/><br/>
            If you're unable to submit the physical RFP/GRPO by December 15, please complete this form. The information provided will be used in Accrual Templates for recording and withholding tax purposes. Please note that non-recording of transactions may result in discrepancies during BIR Third-party checking Audits, which could lead to fines and penalties. This deadline also applies to any transactions that may affect tax compliance, such as invoice cancellations, price adjustments, and purchase returns.<br/><br/>
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
              className="input"
              placeholder="Your email"
              value={headerInfo.email}
              onChange={(e) => setHeaderInfo({ ...headerInfo, email: e.target.value })}
            />
          </div>

          <div className="formGroup">
            <label className="label"> Company Charging <span className="required">*</span> </label>
            <select
              className="select"
              value={headerInfo.company}
              onChange={(e) => setHeaderInfo({ ...headerInfo, company: e.target.value })}
            >
              <option value="">Choose</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
                className="input"
                placeholder="Type to search supplier (min 2 characters)..."
                value={supplierSearch}
                onChange={(e) => {
                setSupplierSearch(e.target.value);
                setShowSupplierDropdown(e.target.value.length >= 2);
                }}
                onFocus={() => setShowSupplierDropdown(supplierSearch.length >= 2)}
            />

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
                        s.supplier.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
                    )
                    .slice(0, 50)
                    .map((s) => (
                    <div
                        key={s.supplier}
                        onClick={() => selectSupplier(s)}
                        style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f0f0f0",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                        {s.supplier} - {s.name}
                    </div>
                    ))}

                {/* No match label */}
                {suppliers.filter(
                    (s) =>
                    s.supplier.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
                ).length === 0 && (
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
              className="input"
              placeholder="Enter invoice number"
              value={headerInfo.invoiceNo}
              onChange={(e) => setHeaderInfo({ ...headerInfo, invoiceNo: e.target.value })}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="formSection">
          <div className="lineItemsHeader">
            <button type="button" className="addBtn" onClick={addLineItem}> + Add Line Item </button>
          </div>

          {lineItems.map((item, index) => {
            const filteredGL = item.glSearch && item.glSearch.length >= 2
              ? glAccounts.filter(g => g.glaccount.toLowerCase().includes(item.glSearch.toLowerCase()) || g.name.toLowerCase().includes(item.glSearch.toLowerCase())).slice(0, 50)
              : [];

            const filteredProfit = item.profitSearch && item.profitSearch.length >= 2
              ? profitCenters.filter(p => p.profitcenter.toLowerCase().includes(item.profitSearch.toLowerCase()) || p.name.toLowerCase().includes(item.profitSearch.toLowerCase())).slice(0, 50)
              : [];

            return (
              <div key={item.id} className="lineItemCard">
                <div className="lineItemHeader">
                  <div className="lineItemTitle">Line Item #{index + 1}</div>
                  {lineItems.length > 1 && (
                    <button type="button" className="removeBtn" onClick={() => removeLineItem(item.id)}>✕ Remove</button>
                  )}
                </div>

                <div className="lineItemGrid">
                  {/* Gross Amount */}
                  <div className="formGroup">
                    <label className="label"> Gross Amount <span className="required">*</span> </label>
                    <input type="number" step="0.01" className="input" placeholder="0.00"
                      value={item.grossAmount}
                      onChange={(e) => updateLineItem(item.id, "grossAmount", e.target.value)}
                    />
                  </div>

                 {/* GL Account */}
                <div className="formGroup" style={{ position: "relative" }}>
                <label className="label">
                    GL Account <span className="required">*</span>
                </label>
                <input
                    type="text"
                    className="inputItem"
                    placeholder="Type to search GL Account..."
                    value={item.glSearch}
                    onChange={(e) => {
                    const value = e.target.value;
                    setLineItems(prev =>
                        prev.map(li =>
                        li.id === item.id
                            ? { ...li, glSearch: value, showGLDropdown: value.length >= 2 }
                            : li
                        )
                    );
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

                {/* Dropdown list */}
                {item.showGLDropdown && filteredGL.length > 0 && (
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
                    {filteredGL.map((g) => (
                        <div
                        key={g.glaccount}
                        onClick={() => selectGLAccount(item.id, g)}
                        style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f0f0f0",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                        {g.glaccount} - {g.name}
                        </div>
                    ))}
                    </div>
                )}

                {/* No match label */}
                {item.showGLDropdown && item.glSearch.length >= 2 && filteredGL.length === 0 && (
                    <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        marginTop: 4,
                        padding: 12,
                        color: "#666",
                        fontSize: 14,
                        zIndex: 2000,
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                    >
                    No GL accounts found matching "{item.glSearch}"
                    </div>
                )}
                </div>


                  <div className="formGroup">
                    <label className="label">GL Account Name</label>
                    <input type="text" className="inputItemDisabled" value={item.glaccountName} disabled />
                  </div>

                  {/* PROFIT CENTER (per-line) */}
                    <div className="formGroup" style={{ position: "relative" }}>
                    <label className="label">
                        Profit Center Code <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        className="inputItem"
                        placeholder="Type to search Profit Center Code (min 2 characters)..."
                        value={item.profitSearch}
                        onChange={(e) => {
                        const value = e.target.value;
                        setLineItems(prev =>
                            prev.map(li =>
                            li.id === item.id
                                ? { ...li, profitSearch: value, showProfitDropdown: value.length >= 2 }
                                : li
                            )
                        );
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

                    {/* Dropdown list */}
                    {item.showProfitDropdown && filteredProfit.length > 0 && (
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
                        {filteredProfit.map((p) => (
                            <div
                            key={p.profitcenter}
                            onClick={() => selectProfitCenter(item.id, p)}
                            style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f0f0f0",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                            >
                            {p.profitcenter} - {p.name}
                            </div>
                        ))}
                        </div>
                    )}

                    {/* No match label */}
                    {item.showProfitDropdown && item.profitSearch.length >= 2 && filteredProfit.length === 0 && (
                        <div
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            backgroundColor: "white",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            marginTop: 4,
                            padding: 12,
                            color: "#666",
                            fontSize: 14,
                            zIndex: 2000,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        }}
                        >
                        No Profit Center found matching "{item.profitSearch}"
                        </div>
                    )}
                    </div>


                  <div className="formGroup">
                    <label className="label">Profit Center Name</label>
                    <input type="text" className="inputItemDisabled" value={item.profitcenterName} disabled />
                  </div>

                  {/* Transaction Type */}
                  <div className="formGroup">
                    <label className="label"> Transaction Type <span className="required">*</span> </label>
                    <select className="select" value={item.transType} onChange={(e) => updateLineItem(item.id, "transType", e.target.value)}>
                      <option value="">Choose</option>
                      {transactionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* VAT */}
                  <div className="formGroup">
                    <label className="label"> VAT <span className="required">*</span> </label>
                    <select className="select" value={item.vat} onChange={(e) => updateLineItem(item.id, "vat", e.target.value)}>
                      <option value="">Choose</option>
                      <option value="Vatable">Vatable</option>
                      <option value="Non-Vatable">Non-Vatable</option>
                    </select>
                  </div>

                  {/* Tax Code */}
                  <div className="formGroup">
                    <label className="label"> Tax Code <span className="required">*</span> </label>
                    <select className="select" value={item.taxCode} onChange={(e) => updateLineItem(item.id, "taxCode", e.target.value)}>
                      <option value="">Choose</option>
                      {taxCodes.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Remarks */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label">Remarks <span className="required">*</span> </label>
            <textarea
              className="input"
              rows={3}
              value={headerInfo.remarks}
              onChange={(e) => setHeaderInfo({ ...headerInfo, remarks: e.target.value })}
            ></textarea>
          </div>
        </div>

        <div className="formFooter">
          <button type="button" className="submitBtn" onClick={handleSubmit}>Submit</button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modalOverlay">
            <div className="modalContent">
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "24px",
                  fontWeight: "500",
                  color: "#202124",
                  fontFamily: "'Google Sans', sans-serif",
                }}
              >
                {modalMessage}
              </h2>
              <p
                style={{
                  margin: "0 0 32px 0",
                  fontSize: "14px",
                  color: "#5f6368",
                  lineHeight: "1.6",
                }}
              >
                Your form has been recorded and will be processed by the AP Team.
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="submitBtn"
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  fontSize: "15px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
