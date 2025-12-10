import React, { useState, useEffect } from "react";
import "./YearEndAccrualForm.css";

export default function YearEndAccrualForm() {
  const [headerInfo, setHeaderInfo] = useState({
    email: "",
    company: "",
    supplier: "",
    supplierName: "",
    invoiceNo: "",
    remarks: "",
  });

//   const [lineItems, setLineItems] = useState([]);
const [lineItems, setLineItems] = useState([
  {
    id: 1,
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
  }
]);
  const [lineItemCounter, setLineItemCounter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Dropdown data
  const [companies, setCompanies] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);

  // Supplier (header-level) search optimization
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // GL accounts & profit centers lists (global lists only)
  const [glAccounts, setGlAccounts] = useState([]);
  const [profitCenters, setProfitCenters] = useState([]);

  // ---------- Fetch static lists ----------
  useEffect(() => {
    if (lineItems.length === 0) {
      addLineItem();
    }
  }, [lineItems]);

  useEffect(() => {
    fetch("http://localhost:5000/api/company")
      .then((res) => res.json())
      .then((data) => {
        const companyList = data.columnA.slice(1).map((row) => row[0]);
        setCompanies(companyList);
      })
      .catch((err) => console.error("Failed to fetch companies", err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/suppliers")
      .then((res) => res.json())
      .then((data) => {
        const supplierList = data.suppliers.map((s) => ({
          supplier: s.supplierNo,
          name: s.supplierName,
        }));
        setSuppliers(supplierList);
      })
      .catch((err) => console.error("Failed to fetch suppliers", err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/transaction")
      .then((res) => res.json())
      .then((data) => {
        const transactionList = data.columnA.slice(1).map((row) => row[0]);
        setTransactionTypes(transactionList);
      })
      .catch((err) => console.error("Failed to fetch transaction", err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/taxcode")
      .then((res) => res.json())
      .then((data) => {
        const taxList = data.columnA.slice(1).map((row) => row[0]);
        setTaxCodes(taxList);
      })
      .catch((err) => console.error("Failed to fetch tax codes", err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/glaccount")
      .then((res) => res.json())
      .then((data) => {
        const list = data.glaccount.map((s) => ({
          glaccount: s.glaccountNo,
          name: s.glaccountName,
        }));
        setGlAccounts(list);
      })
      .catch((err) => console.error("Failed to fetch gl accounts", err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/profitcenter")
      .then((res) => res.json())
      .then((data) => {
        const list = data.profitcenter.map((s) => ({
          profitcenter: s.profitcenterNo,
          name: s.profitcenterName,
        }));
        setProfitCenters(list);
      })
      .catch((err) => console.error("Failed to fetch profit centers", err));
  }, []);

  // ---------- Line item helpers ----------
  const addLineItem = () => {
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);

    setLineItems((prev) => [
      ...prev,
      {
        id: newId,
        grossAmount: "",
        transType: "",
        vat: "",
        taxCode: "",
        // per-line GL/profit state:
        glaccount: "",
        glaccountName: "",
        glSearch: "", // the text in the GL search input for this line
        showGLDropdown: false,
        profitcenter: "",
        profitcenterName: "",
        profitSearch: "", // the text in the profit center search input for this line
        showProfitDropdown: false,
      },
    ]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Generic update for a single field of a line
  const updateLineItem = (id, field, value) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // Selecting GL account for a specific line
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

  // Selecting Profit Center for a specific line
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

  // ---------- Supplier selection (header) ----------
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

    // Build rows to submit
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

      setModalMessage(`Form submitted successfully with ${lineItems.length} line item(s)!`);
      setShowModal(true);

      // Reset form
      setHeaderInfo({
        email: "",
        company: "",
        supplier: "",
        supplierName: "",
        invoiceNo: "",
        remarks: "",
      });
      setSupplierSearch("");
      setLineItems([]);
      setLineItemCounter(0);
      addLineItem();
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
            Please complete and submit the required invoices and documents before the deadline.
          </p>
        </div>

        {/* Email & Company */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              className="input"
              placeholder="Your email"
              value={headerInfo.email}
              onChange={(e) => setHeaderInfo({ ...headerInfo, email: e.target.value })}
            />
          </div>
          <div className="formGroup">
            <label className="label">
              Company Charging <span className="required">*</span>
            </label>
            <select
              className="select"
              value={headerInfo.company}
              onChange={(e) => setHeaderInfo({ ...headerInfo, company: e.target.value })}
            >
              <option value="">Choose</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Supplier with Search (header-level) */}
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
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  marginTop: "4px",
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
            <label className="label">
              Invoice No. <span className="required">*</span>
            </label>
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
            <button type="button" className="addBtn" onClick={addLineItem}>
              + Add Line Item
            </button>
          </div>

          {lineItems.map((item, index) => {
            const filteredGL =
              item.glSearch && item.glSearch.length >= 2
                ? glAccounts
                    .filter(
                      (g) =>
                        g.glaccount.toLowerCase().includes(item.glSearch.toLowerCase()) ||
                        g.name.toLowerCase().includes(item.glSearch.toLowerCase())
                    )
                    .slice(0, 50)
                : [];

            const filteredProfit =
              item.profitSearch && item.profitSearch.length >= 2
                ? profitCenters
                    .filter(
                      (p) =>
                        p.profitcenter.toLowerCase().includes(item.profitSearch.toLowerCase()) ||
                        p.name.toLowerCase().includes(item.profitSearch.toLowerCase())
                    )
                    .slice(0, 50)
                : [];

            return (
              <div key={item.id} className="lineItemCard">
                <div className="lineItemHeader">
                  <div className="lineItemTitle">Line Item #{index + 1}</div>
                  {lineItems.length > 1 && (
                    <button type="button" className="removeBtn" onClick={() => removeLineItem(item.id)}>
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="lineItemGrid">
                  {/* Gross Amount */}
                  <div className="formGroup">
                    <label className="label">
                      Gross Amount <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={item.grossAmount}
                      onChange={(e) => updateLineItem(item.id, "grossAmount", e.target.value)}
                    />
                  </div>

                  {/* GL Account (per-line) */}
                  <div className="formGroup" style={{ position: "relative" }}>
                    <label className="label">
                      GL Account <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="inputItem"
                      placeholder="Type to search GL Account (min 2 characters)..."
                      value={item.glSearch}
                      onChange={(e) => {
                        updateLineItem(item.id, "glSearch", e.target.value);
                        updateLineItem(item.id, "showGLDropdown", e.target.value.length >= 2);
                      }}
                      onFocus={() =>
                        updateLineItem(item.id, "showGLDropdown", (item.glSearch || "").length >= 2)
                      }
                    />

                    {item.showGLDropdown && filteredGL.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          maxHeight: "200px",
                          overflowY: "auto",
                          backgroundColor: "white",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          marginTop: "4px",
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

                        {filteredGL.length === 50 && (
                          <div style={{ padding: "8px 12px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                            Showing first 50 results. Refine your search for more specific results.
                          </div>
                        )}
                      </div>
                    )}

                    {item.showGLDropdown && (item.glSearch || "").length >= 2 && filteredGL.length === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          backgroundColor: "white",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          marginTop: "4px",
                          padding: "12px",
                          color: "#666",
                          fontSize: "14px",
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
                        updateLineItem(item.id, "profitSearch", e.target.value);
                        updateLineItem(item.id, "showProfitDropdown", e.target.value.length >= 2);
                      }}
                      onFocus={() =>
                        updateLineItem(item.id, "showProfitDropdown", (item.profitSearch || "").length >= 2)
                      }
                    />

                    {item.showProfitDropdown && filteredProfit.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          maxHeight: "200px",
                          overflowY: "auto",
                          backgroundColor: "white",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          marginTop: "4px",
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

                        {filteredProfit.length === 50 && (
                          <div style={{ padding: "8px 12px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                            Showing first 50 results. Refine your search for more specific results.
                          </div>
                        )}
                      </div>
                    )}

                    {item.showProfitDropdown && (item.profitSearch || "").length >= 2 && filteredProfit.length === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          backgroundColor: "white",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          marginTop: "4px",
                          padding: "12px",
                          color: "#666",
                          fontSize: "14px",
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
                    <label className="label">
                      Transaction Type <span className="required">*</span>
                    </label>
                    <select
                      className="select"
                      value={item.transType}
                      onChange={(e) => updateLineItem(item.id, "transType", e.target.value)}
                    >
                      <option value="">Choose</option>
                      {transactionTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* VAT */}
                  <div className="formGroup">
                    <label className="label">
                      VAT <span className="required">*</span>
                    </label>
                    <select
                      className="select"
                      value={item.vat}
                      onChange={(e) => updateLineItem(item.id, "vat", e.target.value)}
                    >
                      <option value="">Choose</option>
                      <option value="Vatable">Vatable</option>
                      <option value="VAT Exempt">VAT Exempt</option>
                    </select>
                  </div>

                  {/* Tax Code */}
                  <div className="formGroup">
                    <label className="label">
                      Tax Code <span className="required">*</span>
                    </label>
                    <select
                      className="select"
                      value={item.taxCode}
                      onChange={(e) => updateLineItem(item.id, "taxCode", e.target.value)}
                    >
                      <option value="">Choose</option>
                      {taxCodes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
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
            <label className="label">
              Remarks <span className="required">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Remarks"
              value={headerInfo.remarks}
              onChange={(e) => setHeaderInfo({ ...headerInfo, remarks: e.target.value })}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="submitSection">
          <button className="submitBtn" onClick={handleSubmit}>
            SUBMIT
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modalOverlay" onClick={() => setShowModal(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <h2>Submission Successful!</h2>
            <p>{modalMessage}</p>
            <button onClick={() => setShowModal(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
