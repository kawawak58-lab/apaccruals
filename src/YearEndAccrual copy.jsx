import React, { useState, useEffect, useMemo } from 'react';
import './YearEndAccrualForm.css';

export default function YearEndAccrualForm() {
  const [headerInfo, setHeaderInfo] = useState({
    email: '',
    company: '',
    supplier: '',
    supplierName: '',
    invoiceNo: '',
    remarks: ''
  });

  const [lineItems, setLineItems] = useState([]);
  const [lineItemCounter, setLineItemCounter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Dropdown data
  const [companies, setCompanies] = useState([]);
  const [transactionTypes,setTransactionTypes] = useState([]);
  const [taxCodes,setTaxCodes] = useState([]);

  // Supplier search optimization
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // GL ACCOUNT search optimization
  const [glAccounts, setglAccounts] = useState([]);
  const [glAccountsSearch, setglAccountsSearch] = useState('');
  const [showglAccountsDropdown, setShowglAccountsDropdown] = useState(false);

    // PROFIT CENTER search optimization
  const [profitCenters, setprofitCenters] = useState([]);
  const [profitCentersSearch, setprofitCentersSearch] = useState('');
  const [showprofitCentersDropdown, setShowprofitCentersDropdown] = useState(false);


  // Initialize with one line item
  useEffect(() => {
  if (lineItems.length === 0) {
    addLineItem();
  }
}, [lineItems]);

  useEffect(()=> {
    fetch("http://localhost:5000/api/company")
    .then(res => res.json())
    .then(data => {
        const companyList = data.columnA.slice(1).map(row => row[0]);
        setCompanies(companyList);
    })
    .catch(err => console.error("Failed to fetch companies", err))
  },[]);

  useEffect(() => {
    fetch("http://localhost:5000/api/suppliers")
      .then(res => res.json())
      .then(data => {
        const supplierList = data.suppliers.map(s => ({
          supplier: s.supplierNo,
          name: s.supplierName
        }));
        setSuppliers(supplierList);
      })
      .catch(err => console.error("Failed to fetch suppliers", err));
  }, []);

  useEffect(()=> {
    fetch("http://localhost:5000/api/transaction")
    .then(res => res.json())
    .then(data => {
        const transactionList = data.columnA.slice(1).map(row => row[0]);
        setTransactionTypes(transactionList);
    })
    .catch(err => console.error("Failed to fetch transaction", err))
  },[]);

  useEffect(()=> {
    fetch("http://localhost:5000/api/taxcode")
    .then(res => res.json())
    .then(data => {
        const taxList = data.columnA.slice(1).map(row => row[0]);
        setTaxCodes(taxList);
    })
    .catch(err => console.error("Failed to fetch transaction", err))
  },[]);

  // Memoized filtered suppliers - only show top 50 results
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch || supplierSearch.length < 2) {
      return [];
    }
    
    const searchLower = supplierSearch.toLowerCase();
    return suppliers
      .filter(s => 
        s.supplier.toLowerCase().includes(searchLower) ||
        s.name.toLowerCase().includes(searchLower)
      )
      .slice(0, 50); // Limit to 50 results for performance
  }, [suppliers, supplierSearch]);


  
  useEffect(() => {
    fetch("http://localhost:5000/api/glaccount")
      .then(res => res.json())
      .then(data => {
        const glaccountList = data.glaccount.map(s => ({
          glaccount: s.glaccountNo,
          name: s.glaccountName
        }));
        setglAccounts(glaccountList);
      })
      .catch(err => console.error("Failed to fetch gl acccounts", err));
  }, []);

  const filteredGLAccounts = useMemo(() => {
    if (!glAccountsSearch || glAccountsSearch.length < 2) return [];

    const searchLower = glAccountsSearch.toLowerCase();
    return glAccounts
        .filter(gl => 
        gl.glaccount.toLowerCase().includes(searchLower) ||
        gl.name.toLowerCase().includes(searchLower)
        )
        .slice(0, 50);
    }, [glAccounts, glAccountsSearch]);

  
      useEffect(() => {
    fetch("http://localhost:5000/api/profitcenter")
      .then(res => res.json())
      .then(data => {
        const profitcenterList = data.profitcenter.map(s => ({
          profitcenter: s.profitcenterNo,
          name: s.profitcenterName
        }));
        setprofitCenters(profitcenterList);
      })
      .catch(err => console.error("Failed to fetch profit centers", err));
  }, []);

  const filteredProfitCenter = useMemo(() => {
    if (!profitCentersSearch || profitCentersSearch.length < 2) return [];

    const searchLower = profitCentersSearch.toLowerCase();
    return profitCenters
        .filter(gl => 
        gl.profitcenter.toLowerCase().includes(searchLower) ||
        gl.name.toLowerCase().includes(searchLower)
        )
        .slice(0, 50);
    }, [profitCenters, profitCentersSearch]);



  const addLineItem = () => {
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    setLineItems([...lineItems, {
      id: newId,
      grossAmount: '',
      transType: '',
      vat: '',
      taxCode: '',
      glaccount: '',
      glaccountName: '',
      profitcenter:'',
      profitcenterName:'',
      

    }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // GL Code search
        // if (field === 'glCode' && value.length >= 2) {
        //  const results = glAccounts.filter(gl =>
        //     gl.glaccount.toLowerCase().includes(value.toLowerCase()) ||
        //     gl.name.toLowerCase().includes(value.toLowerCase())
        // );

        //   updated.glSearchResults = results;
        //   updated.showGLDropdown = results.length > 0;
        // } else if (field === 'glCode' && value.length < 2) {
        //   updated.showGLDropdown = false;
        // }

        // Profit Center search
        // if (field === 'profitCode' && value.length >= 2) {
        //   const results = profitCenters.filter(pc => 
        //     pc.code.toLowerCase().includes(value.toLowerCase()) ||
        //     pc.name.toLowerCase().includes(value.toLowerCase())
        //   );
        //   updated.profitSearchResults = results;
        //   updated.showProfitDropdown = results.length > 0;
        // } else if (field === 'profitCode' && value.length < 2) {
        //   updated.showProfitDropdown = false;
        // }

        return updated;
      }
      return item;
    }));
  };

  



  const selectSupplier = (supplier) => {
    setHeaderInfo({
      ...headerInfo,
      supplier: supplier.supplier,
      supplierName: supplier.name
    });
    setSupplierSearch(supplier.supplier);
    setShowSupplierDropdown(false);
  };

    const selectGLAccount = (glaccount) => {
    setHeaderInfo({
      ...headerInfo,
      glaccount: glaccount.glaccount,
      glaccountName: glaccount.name
    });
    setglAccountsSearch(glaccount.glaccount);
    setShowglAccountsDropdown(false);
  };

  const selectProfitCenter = (profitcenter) => {
    setHeaderInfo({
      ...headerInfo,
      profitcenterNo: profitcenter.profitcenter,
      profitcenterName: profitcenter.name
    });
    setprofitCentersSearch(profitcenter.profitcenter);
    setShowprofitCentersDropdown(false);
  };

  const handleSubmit = async () => {
  // Validate header
  if (!headerInfo.email || !headerInfo.company || !headerInfo.supplier || 
      !headerInfo.invoiceNo || !headerInfo.remarks) {
    alert('⚠️ Please fill in all required header fields.');
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
  const rows = lineItems.map(item => [
    timestamp,
    headerInfo.email,
    headerInfo.company,
    headerInfo.supplier,
    headerInfo.supplierName,
    headerInfo.invoiceNo,
    item.grossAmount,
    item.glCode || headerInfo.glaccount,         // GL Account Code
    item.glName || headerInfo.glaccountName,    // GL Account Name
    item.profitCode || headerInfo.profitcenterNo,   // Profit Center Code
    item.profitName || headerInfo.profitcenterName, // Profit Center Name
    item.transType,
    item.vat,
    item.taxCode,
    headerInfo.remarks
  ]);

  try {
    const response = await fetch("http://localhost:5000/api/submitform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows })
    });

    if (!response.ok) throw new Error("Failed to submit form");

    const result = await response.json();
    setModalMessage(`Form submitted successfully with ${lineItems.length} line item(s)!`);
    setShowModal(true);

    // Reset form
    setHeaderInfo({
      email: '',
      company: '',
      supplier: '',
      supplierName: '',
      glaccount: '',
      glaccountName: '',
      invoiceNo: '',
      remarks: '',
      grossAmount:0,
      profitcenterName:'',
      transType:'',
      vat:'',
     taxCode:''

    });
    setSupplierSearch('');
    setglAccountsSearch('');
    setprofitCentersSearch('');
    setLineItems([]);
    setLineItemCounter(0);
    // addLineItem();

  } catch (error) {
    console.error("Submission error:", error);
    alert("❌ Submission failed. Please try again.");
  }
};


  return (
    <div className="body">
      <div className="formWrapper">
        <div className="formHeader">
          <h1 className="h1">Year-End Accrual Template</h1>
          <p className="headerText">
            Bounty Day everyone!<br/><br/>
            As the end of the year approaches, please remember to submit all 2025 invoices together with the approved RFP (single/multiple RFP, Reimbursement, Liquidation) / GRPO & CPO to the AP Team until Monday, December 15, 2025.<br/><br/>
            If you're unable to submit the physical RFP/GRPO by December 15, please complete this form. The information provided will be used in Accrual Templates for recording and withholding tax purposes. Please note that non-recording of transactions may result in discrepancies during BIR Third-party checking Audits, which could lead to fines and penalties. This deadline also applies to any transactions that may affect tax compliance, such as invoice cancellations, price adjustments, and purchase returns.<br/><br/>
            In addition, we kindly request your cooperation in gradually submitting the physical RFPs and GRPOs, along with the receipts, to the AP Teams so we can begin processing payments.<br/><br/>
            Thank you for your continued support and cooperation.
          </p>
        </div>

        {/* Email & Company */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label">Email <span className="required">*</span></label>
            <input
              type="email"
              className="input"
              placeholder="Your email"
              value={headerInfo.email}
              onChange={(e) => setHeaderInfo({...headerInfo, email: e.target.value})}
            />
          </div>
          <div className="formGroup">
            <label className="label">Company Charging <span className="required">*</span></label>
            <select
              className="select"
              value={headerInfo.company}
              onChange={(e) => setHeaderInfo({...headerInfo, company: e.target.value})}
            >
              <option value="">Choose</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Supplier with Search */}
        <div className="formSection">
          <div className="formGroup" style={{ position: 'relative' }}>
            <label className="label">Supplier <span className="required">*</span></label>
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
            {showSupplierDropdown && filteredSuppliers.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginTop: '4px',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {filteredSuppliers.map(s => (
                  <div
                    key={s.supplier}
                    onClick={() => selectSupplier(s)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    {s.supplier} - {s.name}
                  </div>
                ))}
                {filteredSuppliers.length === 50 && (
                  <div style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    Showing first 50 results. Refine your search for more specific results.
                  </div>
                )}
              </div>
            )}
            {showSupplierDropdown && supplierSearch.length >= 2 && filteredSuppliers.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginTop: '4px',
                padding: '12px',
                color: '#666',
                fontSize: '14px',
                zIndex: 2000,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}>
                No suppliers found matching "{supplierSearch}"
              </div>
            )}
          </div>
          <div className="formGroup">
            <label className="label">Supplier Name</label>
            <input
              type="text"
              className="inputDisabled"
              value={headerInfo.supplierName}
              disabled
            />
          </div>
        </div>

        {/* Invoice No */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label">Invoice No. <span className="required">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="Enter invoice number"
              value={headerInfo.invoiceNo}
              onChange={(e) => setHeaderInfo({...headerInfo, invoiceNo: e.target.value})}
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

          {lineItems.map((item, index) => (
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
                  <label className="label">Gross Amount <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={item.grossAmount}
                    onChange={(e) => updateLineItem(item.id, 'grossAmount', e.target.value)}
                  />
                </div>

                {/* GL Account */}
                <div className="formGroup" style={{ position: 'relative' }}>
                    <label className="label">GL Account <span className="required">*</span></label>
                    <input
                    type="text"
                    className="inputItem"
                    placeholder="Type to search GL Account (min 2 characters)..."
                    value={glAccountsSearch}
                    onChange={(e) => {
                        setglAccountsSearch(e.target.value);
                        setShowglAccountsDropdown(e.target.value.length >= 2);
                    }}
                    onFocus={() => setShowglAccountsDropdown(glAccountsSearch.length >= 2)}
                    />
                    {showglAccountsDropdown && filteredGLAccounts.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginTop: '4px',
                        zIndex: 1000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        {filteredGLAccounts.map(s => (
                        <div
                            key={s.glaccount}
                            onClick={() => selectGLAccount(s)}
                            style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                            {s.glaccount} - {s.name}
                        </div>
                        ))}
                        {filteredGLAccounts.length === 50 && (
                        <div style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            color: '#666',
                            fontStyle: 'italic'
                        }}>
                            Showing first 50 results. Refine your search for more specific results.
                        </div>
                        )}
                    </div>
                    )}
                    {showglAccountsDropdown && glAccountsSearch.length >= 2 && filteredGLAccounts.length === 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginTop: '4px',
                        padding: '12px',
                        color: '#666',
                        fontSize: '14px',
                        zIndex: 2000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}>
                        No suppliers found matching "{glAccountsSearch}"
                    </div>
                    )}
                </div>
                <div className="formGroup">
                    <label className="label">GL Account Name</label>
                    <input
                    type="text"
                    className="inputItemDisabled"
                    value={headerInfo.glaccountName}
                    disabled
                    />
                </div>

                {/* PROFIT CENTER */}
                <div className="formGroup" style={{ position: 'relative' }}>
                    <label className="label">Profit Center Code <span className="required">*</span></label>
                    <input
                    type="text"
                    className="inputItem"
                    placeholder="Type to search Profit Center Code (min 2 characters)..."
                    value={profitCentersSearch}
                    onChange={(e) => {
                        setprofitCentersSearch(e.target.value);
                        setShowprofitCentersDropdown(e.target.value.length >= 2);
                    }}
                    onFocus={() => setShowprofitCentersDropdown(profitCentersSearch.length >= 2)}
                    />
                    {showprofitCentersDropdown && filteredProfitCenter.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginTop: '4px',
                        zIndex: 1000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        {filteredProfitCenter.map(s => (
                        <div
                            key={s.profitcenter}
                            onClick={() => selectProfitCenter(s)}
                            style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                            {s.profitcenter} - {s.name}
                        </div>
                        ))}
                        {filteredProfitCenter.length === 50 && (
                        <div style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            color: '#666',
                            fontStyle: 'italic'
                        }}>
                            Showing first 50 results. Refine your search for more specific results.
                        </div>
                        )}
                    </div>
                    )}
                    {showprofitCentersDropdown && profitCentersSearch.length >= 2 && filteredProfitCenter.length === 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginTop: '4px',
                        padding: '12px',
                        color: '#666',
                        fontSize: '14px',
                        zIndex: 2000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}>
                        No Profit Center found matching "{profitCentersSearch}"
                    </div>
                    )}
                </div>
                <div className="formGroup">
                    <label className="label">Profit Center Name</label>
                    <input
                    type="text"
                    className="inputItemDisabled"
                    value={headerInfo.profitcenterName}
                    disabled
                    />
                </div>
                {/* Transaction Type */}
                <div className="formGroup">
                  <label className="label">Transaction Type <span className="required">*</span></label>
                  <select className="select" value={item.transType} onChange={(e) => updateLineItem(item.id, 'transType', e.target.value)}>
                    <option value="">Choose</option>
                    {transactionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* VAT */}
                <div className="formGroup">
                  <label className="label">VAT <span className="required">*</span></label>
                  <select className="select" value={item.vat} onChange={(e) => updateLineItem(item.id, 'vat', e.target.value)}>
                    <option value="">Choose</option>
                    <option value="Vatable">Vatable</option>
                    <option value="VAT Exempt">VAT Exempt</option>
                  </select>
                </div>

                {/* Tax Code */}
                <div className="formGroup">
                  <label className="label">Tax Code <span className="required">*</span></label>
                  <select className="select" value={item.taxCode} onChange={(e) => updateLineItem(item.id, 'taxCode', e.target.value)}>
                    <option value="">Choose</option>
                    {taxCodes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div className="formSection">
          <div className="formGroup">
            <label className="label">Remarks <span className="required">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="Remarks"
              value={headerInfo.remarks}
              onChange={(e) => setHeaderInfo({...headerInfo, remarks: e.target.value})}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="submitSection">
          <button className="submitBtn" onClick={handleSubmit}>SUBMIT</button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modalOverlay" onClick={() => setShowModal(false)}>
          <div className="modalContent" onClick={e => e.stopPropagation()}>
            <h2>Submission Successful!</h2>
            <button onClick={() => setShowModal(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}