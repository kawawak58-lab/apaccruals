import React, { useState, useEffect, useRef, useCallback } from "react";
import "./YearEndAccrualForm.css";
import { apiFetch } from "./api";
import { getNextControlNumber } from "./lib/ControlNumber";
import { getExpenseClassNames } from "./lib/ExpenseClasses";
import { getTaxCodeNames } from "./lib/TaxCodes";
import { getTransactionTypeNames } from "./lib/TransactionTypes";
import { getCompanyNames } from "./lib/Companies";

// Add CSS animation for spinner
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(spinnerStyle);

// Debounce hook to prevent excessive API calls
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
    glAccounts: [],
    glPage: 1,
    glTotal: 0,
    showGLDropdown: false,
    profitcenter: "",
    profitcenterName: "",
    profitSearch: "",
    profitCenters: [],
    profitPage: 1,
    profitTotal: 0,
    showProfitDropdown: false,
    remarks: "",
  });

  const [headerErrors, setHeaderErrors] = useState({});
  const [lineItems, setLineItems] = useState([createEmptyLineItem(1)]);
  const [lineItemErrors, setLineItemErrors] = useState([{}]);
  const [lineItemCounter, setLineItemCounter] = useState(1);

  // ---------- Modal ----------
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // ---------- Dropdown data with caching ----------
  const [companies, setCompanies] = useState([]);
  const [expenseClass, setExpenseClass] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);

  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierTotal, setSupplierTotal] = useState(0);
  const supplierLimit = 50;
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "bounty.com.ph"];

  // Cache for API responses
  const cacheRef = useRef({
    companies: null,
    expenseClass: null,
    transactionTypes: null,
    taxCodes: null,
  });

  // Debounce supplier search
  const debouncedSupplierSearch = useDebounce(supplierSearch, 500);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track previous search values to prevent duplicate requests
  const prevSupplierSearchRef = useRef("");
  const prevGLSearchesRef = useRef({});
  const prevProfitSearchesRef = useRef({});

  // Track static data fetch attempts
  const [staticDataLoading, setStaticDataLoading] = useState(true);
  const [staticDataError, setStaticDataError] = useState(false);
  const staticDataRetryRef = useRef(0);
  const maxStaticDataRetries = 5;
  const [controlNumber, setControlNumber] = useState("");
  const handleClick = async () => {
    try {
      const nextNumber = await getNextControlNumber();
      setControlNumber(nextNumber);
      alert(`Next Control Number: ${nextNumber}`);
    } catch (err) {
      console.error("Failed to get control number:", err);
      alert("❌ Failed to get control number. Check console.");
    }
  };
  
  // ---------- Fetch static lists with caching and retry ----------
 useEffect(() => {
  const fetchStaticDataWithRetry = async () => {
    // Use cached data if available
    if (cacheRef.current.companies) {
      setCompanies(cacheRef.current.companies);
      setExpenseClass(cacheRef.current.expenseClass);
      setTransactionTypes(cacheRef.current.transactionTypes);
      setTaxCodes(cacheRef.current.taxCodes);
      setStaticDataLoading(false);
      return;
    }

    let delay = 2000; // initial delay for exponential backoff

    while (staticDataRetryRef.current < maxStaticDataRetries) {
      try {
        setStaticDataLoading(true);
        setStaticDataError(false);

        // Fetch everything in parallel from Supabase
        const [expenseList, transactionList, taxList, companiesList] = await Promise.all([
          getExpenseClassNames(),
          getTransactionTypeNames(),
          getTaxCodeNames(),
          getCompanyNames()
        ]);

        // Validate all lists
        if (
          !companiesList.length ||
          !expenseList.length ||
          !transactionList.length ||
          !taxList.length
        ) {
          throw new Error("Empty data received from one or more sources");
        }

        // Cache results
        cacheRef.current = {
          companies: companiesList,
          expenseClass: expenseList,
          transactionTypes: transactionList,
          taxCodes: taxList,
        };

        // Update state
        setCompanies(companiesList);
        setExpenseClass(expenseList);
        setTransactionTypes(transactionList);
        setTaxCodes(taxList);
        setStaticDataLoading(false);
        setStaticDataError(false);

        console.log("✅ Static data loaded successfully");
        return; // success

      } catch (err) {
        staticDataRetryRef.current++;
        console.warn(
          `⚠️ Static data fetch attempt ${staticDataRetryRef.current}/${maxStaticDataRetries} failed:`,
          err.message
        );

        if (staticDataRetryRef.current >= maxStaticDataRetries) {
          setStaticDataError(true);
          setStaticDataLoading(false);
          console.error("❌ Failed to load static data after maximum retries");
          return;
        }

        // Wait before retrying
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
        delay = Math.min(delay * 2, 32000); // optional: cap exponential backoff
      }
    }
  };

  fetchStaticDataWithRetry();
}, []);




  // FIXED: Supplier search with proper duplicate prevention
  useEffect(() => {
    if (!headerInfo.company || debouncedSupplierSearch.length < 2) return;

    // Check if this is the same search we already did
    const searchKey = `${headerInfo.company}-${debouncedSupplierSearch}-${supplierPage}`;
    if (prevSupplierSearchRef.current === searchKey) {
      return; // Skip duplicate request
    }

    prevSupplierSearchRef.current = searchKey;
    let cancelled = false;

    const fetchSuppliers = async () => {
      try {
        const query = new URLSearchParams({
          company: headerInfo.company,
          search: debouncedSupplierSearch,
          page: supplierPage,
          limit: supplierLimit,
        }).toString();

        const res = await apiFetch(`/api/suppliers?${query}`);

        if (!res.ok || cancelled) return;

        const data = await res.json();

        if (!data?.suppliers) return;

        setSuppliers(prev =>
          supplierPage === 1
            ? data.suppliers.map(s => ({
                supplier: s.supplierNo,
                name: s.supplierName,
                suppcompany: s.supplierCompany,
              }))
            : [
                ...prev,
                ...data.suppliers.map(s => ({
                  supplier: s.supplierNo,
                  name: s.supplierName,
                  suppcompany: s.supplierCompany,
                })),
              ]
        );

        setSupplierTotal(data.pagination?.total || 0);
      } catch (err) {
        console.warn("Supplier fetch failed", err);
      }
    };

    fetchSuppliers();

    return () => {
      cancelled = true;
    };
  }, [headerInfo.company, debouncedSupplierSearch, supplierPage]);


  // Debounced GL Account search per line
  const handleGLSearchChange = useCallback((lineId, value) => {
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, glSearch: value, glPage: 1, showGLDropdown: value.length >= 2 }
          : li
      )
    );
  }, []);

  // FIXED: Fetch GL accounts with proper duplicate prevention
  useEffect(() => {
    if (!headerInfo.company) return;

    const linesToFetch = lineItems.filter(
      li => li.glSearch && li.glSearch.length >= 2
    );

    if (linesToFetch.length === 0) return;

    const fetchGLForLines = async () => {
      for (const line of linesToFetch) {
        const searchKey = `${headerInfo.company}-${line.glSearch}-${line.glPage}`;
        
        // Check if we already fetched this exact search
        if (prevGLSearchesRef.current[line.id] === searchKey) {
          continue; // Skip duplicate request
        }

        prevGLSearchesRef.current[line.id] = searchKey;

        try {
          const query = new URLSearchParams({
            company: headerInfo.company,
            search: line.glSearch,
            page: line.glPage,
            limit: 50,
          }).toString();

          const res = await apiFetch(`/api/glaccount?${query}`);
          const data = await res.json();

          setLineItems(prev =>
            prev.map(li =>
              li.id === line.id
                ? {
                    ...li,
                    glAccounts: data?.glaccount?.map(g => ({
                      glaccount: g.glaccountNo,
                      name: g.glaccountName,
                    })) || [],
                    glTotal: data.pagination?.total || 0,
                  }
                : li
            )
          );
        } catch (err) {
          console.error("Failed to fetch GL Accounts", err);
        }

        await sleep(100);
      }
    };

    const debounceTimer = setTimeout(fetchGLForLines, 500);
    return () => clearTimeout(debounceTimer);
  }, [lineItems.map(li => `${li.id}-${li.glSearch}-${li.glPage}`).join(','), headerInfo.company]);

  // Debounced Profit Center search
  const handleProfitSearchChange = useCallback((lineId, value) => {
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, profitSearch: value, profitPage: 1, showProfitDropdown: value.length >= 2 }
          : li
      )
    );
  }, []);

  // FIXED: Fetch Profit Centers with proper duplicate prevention
  useEffect(() => {
    if (!headerInfo.company) return;

    const linesToFetch = lineItems.filter(
      li => li.profitSearch && li.profitSearch.length >= 2
    );

    if (linesToFetch.length === 0) return;

    const fetchProfitForLines = async () => {
      for (const line of linesToFetch) {
        const searchKey = `${headerInfo.company}-${line.profitSearch}-${line.profitPage}`;
        
        // Check if we already fetched this exact search
        if (prevProfitSearchesRef.current[line.id] === searchKey) {
          continue; // Skip duplicate request
        }

        prevProfitSearchesRef.current[line.id] = searchKey;

        try {
          const query = new URLSearchParams({
            company: headerInfo.company,
            search: line.profitSearch,
            page: line.profitPage,
            limit: 50,
          }).toString();

          const res = await apiFetch(`/api/profitcenter?${query}`);
          const data = await res.json();

          setLineItems(prev =>
            prev.map(li =>
              li.id === line.id
                ? {
                    ...li,
                    profitCenters: data?.profitcenter?.map(p => ({
                      profitcenter: p.profitcenterNo,
                      name: p.profitcenterName,
                    })) || [],
                    profitTotal: data.pagination?.total || 0,
                  }
                : li
            )
          );
        } catch (err) {
          console.error("Failed to fetch Profit Centers", err);
        }

        await sleep(100);
      }
    };

    const debounceTimer = setTimeout(fetchProfitForLines, 500);
    return () => clearTimeout(debounceTimer);
  }, [lineItems.map(li => `${li.id}-${li.profitSearch}-${li.profitPage}`).join(','), headerInfo.company]);

  const loadMoreGLAccounts = (lineId) => {
    const li = lineItems.find(li => li.id === lineId);
    if (!li || !headerInfo.company) return;

    const nextPage = li.glPage + 1;

    const fetchNextPage = async () => {
      try {
        const query = new URLSearchParams({
          company: headerInfo.company,
          search: li.glSearch,
          page: nextPage,
          limit: 50,
        }).toString();

        const res = await apiFetch(`/api/glaccount?${query}`);
        const data = await res.json();

        setLineItems(prev =>
          prev.map(li =>
            li.id === lineId
              ? {
                  ...li,
                  glAccounts: data.glaccount?.map(g => ({
                    glaccount: g.glaccountNo,
                    name: g.glaccountName,
                  })) || [],
                  glTotal: data.pagination.total,
                  glPage: nextPage,
                }
              : li
          )
        );
      } catch (err) {
        console.error("Failed to load GL Accounts", err);
      }
    };

    fetchNextPage();
  };

  const loadMoreProfitCenters = (lineId) => {
    const li = lineItems.find(li => li.id === lineId);
    if (!li || !headerInfo.company) return;

    const nextPage = li.profitPage + 1;

    const fetchNextPage = async () => {
      try {
        const query = new URLSearchParams({
          company: headerInfo.company,
          search: li.profitSearch,
          page: nextPage,
          limit: 50,
        }).toString();

        const res = await apiFetch(`/api/profitcenter?${query}`);
        const data = await res.json();

        setLineItems(prev =>
          prev.map(li =>
            li.id === lineId
              ? {
                  ...li,
                  profitCenters: data.profitcenter?.map(p => ({
                    profitcenter: p.profitcenterNo,
                    name: p.profitcenterName,
                  })) || [],
                  profitTotal: data.pagination.total,
                  profitPage: nextPage,
                }
              : li
          )
        );
      } catch (err) {
        console.error("Failed to load Profit Centers", err);
      }
    };

    fetchNextPage();
  };

  const addLineItem = () => {
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    setLineItems((prev) => [...prev, createEmptyLineItem(newId)]);
    setLineItemErrors((prev) => [...prev, {}]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
      setLineItemErrors((prev) => prev.slice(0, -1));
      // Clean up tracking refs
      delete prevGLSearchesRef.current[id];
      delete prevProfitSearchesRef.current[id];
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

  const selectSupplier = (supplier) => {
    setHeaderInfo({
      ...headerInfo,
      supplier: supplier.supplier,
      supplierName: supplier.name,
    });
    setSupplierSearch(supplier.supplier);
    setShowSupplierDropdown(false);
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value) => {
    setHeaderInfo({ ...headerInfo, email: value });
    setHeaderErrors((prev) => ({ ...prev, email: !isValidEmail(value) }));

    if (value && !value.includes("@")) {
      setEmailSuggestions(commonDomains.map((domain) => `${value}@${domain}`));
    } else {
      setEmailSuggestions([]);
    }
  };

  const selectEmailSuggestion = (suggestion) => {
    setHeaderInfo({ ...headerInfo, email: suggestion });
    setHeaderErrors((prev) => ({ ...prev, email: !isValidEmail(suggestion) }));
    setEmailSuggestions([]);
  };


  const getControlNumberWithRetry = async (
    maxRetries = 5,
    initialDelay = 1000
  ) => {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxRetries) {
      try {
        const res = await apiFetch("/api/currentcontrol");

        if (res.ok) {
          const data = await res.json();
          const controlNumber = data?.currentControlNumber?.trim();

          if (controlNumber) {
            return controlNumber; 
          }
        }
      } catch (err) {
        console.warn(`Control fetch attempt ${attempt + 1} failed`, err);
      }

      attempt++;
      await sleep(delay);  
      delay *= 2;    
    }

    throw new Error("Control number unavailable after retries");
  };

  const handleIncrementWithRetry = async (
    maxRetries = 3,
    initialDelay = 1000
  ) => {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxRetries) {
      try {
        const res = await apiFetch("/api/incrementcontrol", { method: "POST" });

        if (res.ok) {
          const data = await res.json();
          console.log("New Control Number:", data.newControlNumber);
          return true; 
        }
      } catch (err) {
        console.warn(`Increment attempt ${attempt + 1} failed`, err);
      }

      attempt++;
      await sleep(delay);
      delay *= 2;
    }

    return false;
  };


const handleSubmit = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    const headerErrs = {};

    // ===== HEADER VALIDATION =====
    if (!headerInfo.email || !isValidEmail(headerInfo.email)) headerErrs.email = true;
    if (!headerInfo.expenseclass) headerErrs.expenseclass = true;
    if (!headerInfo.company) headerErrs.company = true;
    if (!headerInfo.supplier) headerErrs.supplier = true;

    if (
      headerInfo.expenseclass !==
        "Non-deductible expense (no valid receipt/invoice)" &&
      !headerInfo.invoiceNo
    ) {
      headerErrs.invoiceNo = true;
    }

    setHeaderErrors(headerErrs);

    // ===== LINE ITEM VALIDATION =====
    const newLineItemErrors = lineItems.map(item => {
      const errors = {};
      if (!item.grossAmount) errors.grossAmount = true;
      if (!item.transType) errors.transType = true;
      if (!item.glaccount) errors.glaccount = true;
      if (!item.remarks) errors.remarks = true;
      if (!item.profitcenter) errors.profitcenter = true;

      if (
        headerInfo.expenseclass !==
        "Non-deductible expense (no valid receipt/invoice)"
      ) {
        if (!item.vat) errors.vat = true;
        if (!item.taxCode) errors.taxCode = true;
      }
      return errors;
    });

    setLineItemErrors(newLineItemErrors);

    // ===== CHECK FOR VALIDATION ERRORS =====
    if (
      Object.keys(headerErrs).length > 0 ||
      newLineItemErrors.some(err => Object.keys(err).length > 0)
    ) {
      alert("⚠️ Please fill in all required fields.");
      return; // STOP here, do not submit
    }

    // ===== GET CONTROL NUMBER =====
    let controlNumber;
    try {
      controlNumber = await getNextControlNumber(); // this calls your RPC function
    } catch (err) {
      console.error("Failed to get control number:", err);
      alert("❌ Unable to get control number. Submission cancelled.");
      return;
    }

    // ===== BUILD ROWS =====
    const timestamp = new Date().toLocaleString();
    const rows = lineItems.map(item => [
      controlNumber,
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
      0
    ]);

    // ===== SUBMIT FORM =====
    const response = await apiFetch("/api/submitform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    if (!response.ok) {
      alert("❌ Submission failed. Control number not incremented.");
      return; 
    }



    // ===== SUCCESS =====
    setModalMessage(controlNumber);
    setShowModal(true);

    // ===== RESET FORM =====
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

    // Clear tracking refs
    prevSupplierSearchRef.current = "";
    prevGLSearchesRef.current = {};
    prevProfitSearchesRef.current = {};

  } catch (error) {
    console.error("Submission error:", error);
    alert("❌ Unable to submit. Please try again later.");
  } finally {
    setIsSubmitting(false);
  }
};

  const isDisabled = !headerInfo.email || !headerInfo.expenseclass || staticDataLoading;

  // Manual retry function
  const retryStaticData = () => {
    staticDataRetryRef.current = 0;
    setStaticDataError(false);
    setStaticDataLoading(true);
    
    // Trigger re-fetch by clearing cache
    cacheRef.current = {
      companies: null,
      expenseClass: null,
      transactionTypes: null,
      taxCodes: null,
    };
    
    // Force re-run of useEffect
    window.location.reload();
  };

  return (
    <div className="body">
      <div className="formWrapper">
        {/* Loading Overlay */}
        {staticDataLoading && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "32px",
              borderRadius: "8px",
              textAlign: "center",
              maxWidth: "400px",
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}></div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#202124" }}>
                Loading Form Data...
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#5f6368" }}>
                Setting up Accrual Template
                {staticDataRetryRef.current > 0 && (
                  <><br/>Retry attempt {staticDataRetryRef.current}/{maxStaticDataRetries}</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {staticDataError && (
          <div style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "4px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ flex: 1 }}>
              <strong style={{ color: "#856404" }}>⚠️ Unable to load form data</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#856404" }}>
                The form could not load required dropdown data. Please check your connection and try again.
              </p>
            </div>
            <button
              onClick={retryStaticData}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                marginLeft: "16px",
              }}
            >
              Retry
            </button>
          </div>
        )}

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
              onChange={(e) => handleEmailChange(e.target.value)}
              onFocus={() => {
                if (emailSuggestions.length > 0) setEmailSuggestions(emailSuggestions);
              }}
            />
            {headerErrors.email && <div className="errorText">Please enter a valid email</div>}
            {emailSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  zIndex: 1000,
                }}
              >
                {emailSuggestions.map((sugg) => (
                  <div
                    key={sugg}
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    onClick={() => selectEmailSuggestion(sugg)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    {sugg}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="formGroup">
            <label className="label"> Expense Classifications <span className="required">*</span> </label>
            <select
              className={`select ${headerErrors.expenseclass ? "inputError" : ""}`}
              value={headerInfo.expenseclass}
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
                setSupplierPage(1);
                prevSupplierSearchRef.current = "";
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
                setSupplierPage(1);
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
            const filteredGL =
              item.glSearch && item.glSearch.length >= 2
                ? item.glAccounts.filter(
                    (g) =>
                      g.glaccount.toLowerCase().includes(item.glSearch.toLowerCase()) ||
                      g.name.toLowerCase().includes(item.glSearch.toLowerCase())
                  ).slice(0, 50)
                : [];
            
            const filteredProfit =
              item.profitSearch && item.profitSearch.length >= 2
                ? item.profitCenters.filter(
                    (g) =>
                      g.profitcenter.toLowerCase().includes(item.profitSearch.toLowerCase()) ||
                      g.name.toLowerCase().includes(item.profitSearch.toLowerCase())
                  ).slice(0, 50)
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
                  <div className="formGroup1">
                    <label className="label"> Gross Amount <span className="required">*</span> </label>
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
                    <label className="label">
                      GL Account <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className={`inputItem ${lineItemErrors[index]?.glaccount ? "inputError" : ""}`}
                      disabled={isDisabled}
                      placeholder="Type to search GL Account."
                      value={item.glSearch}
                      onChange={(e) => handleGLSearchChange(item.id, e.target.value)}
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
                    {lineItemErrors[index]?.glaccount && <div className="errorText">GL Account is required</div>}
                    {item.showGLDropdown && (
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
                        {filteredGL.length > 0 ? (
                          filteredGL.map((g) => (
                            <div
                              key={g.glaccount}
                              onClick={() => selectGLAccount(item.id, g)}
                              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                            >
                              {g.glaccount} - {g.name}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: 12, color: "#666", fontSize: 14, fontStyle: "italic" }}>
                            No GL accounts found matching "{item.glSearch}"
                          </div>
                        )}

                        {item.glAccounts.length < item.glTotal && (
                          <div
                            style={{
                              padding: "8px",
                              textAlign: "center",
                              cursor: "pointer",
                              fontWeight: "500",
                              color: "#007bff",
                            }}
                            onClick={() => loadMoreGLAccounts(item.id)}
                          >
                            Load more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="formGroup1">
                    <label className="label">GL Account Name</label>
                    <input type="text" className="inputItemDisabled" value={item.glaccountName} disabled />
                  </div>

                  {/* PROFIT CENTER */}
                  <div className="formGroup1" style={{ position: "relative" }}>
                    <label className="label">
                      Profit Center Code <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isDisabled}
                      className={`inputItem ${lineItemErrors[index]?.profitcenter ? "inputError" : ""}`}
                      placeholder="Type to search Profit Center Code."
                      value={item.profitSearch}
                      onChange={(e) => handleProfitSearchChange(item.id, e.target.value)}
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
                    {lineItemErrors[index]?.profitcenter && <div className="errorText">Profit Center is required</div>}
                    {item.showProfitDropdown && (
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
                        {filteredProfit.length > 0 ? (
                          filteredProfit.map((p) => (
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
                          ))
                        ) : (
                          <div style={{ padding: 12, color: "#666", fontSize: 14, fontStyle: "italic" }}>
                            No Profit Center found matching "{item.profitSearch}"
                          </div>
                        )}

                        {item.profitCenters.length < item.profitTotal && (
                          <div
                            style={{
                              padding: "8px",
                              textAlign: "center",
                              cursor: "pointer",
                              fontWeight: "500",
                              color: "#007bff",
                            }}
                            onClick={() => loadMoreProfitCenters(item.id)}
                          >
                            Load more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="formGroup1">
                    <label className="label">Profit Center Name</label>
                    <input type="text" className="inputItemDisabled" value={item.profitcenterName} disabled />
                  </div>

                  {/* Transaction Type */}
                  <div className="formGroup1">
                    <label className="label"> Transaction Type <span className="required">*</span> </label>
                    <select
                      className={`select ${lineItemErrors[index]?.transType ? "inputError" : ""}`}
                      value={item.transType}
                      disabled={isDisabled}
                      onChange={(e) => {
                        updateLineItem(item.id, "transType", e.target.value);
                        setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, transType: false } : err));
                      }}
                    >
                      <option value="">Choose</option>
                      {transactionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {lineItemErrors[index]?.transType && <div className="errorText">Transaction Type is required</div>}
                  </div>

                  {headerInfo.expenseclass !== "Non-deductible expense (no valid receipt/invoice)" && (
                    <>
                      {/* VAT */}
                      <div className="formGroup1">
                        <label className="label"> VAT <span className="required">*</span> </label>
                        <select
                          className={`select ${lineItemErrors[index]?.vat ? "inputError" : ""}`}
                          value={item.vat}
                          disabled={isDisabled}
                          onChange={(e) => {
                            updateLineItem(item.id, "vat", e.target.value);
                            setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, vat: false } : err));
                          }}
                        >
                          <option value="">Choose</option>
                          <option value="Vatable">Vatable</option>
                          <option value="Non-Vatable">Non-Vatable</option>
                        </select>
                        {lineItemErrors[index]?.vat && <div className="errorText">VAT is required</div>}
                      </div>

                      {/* Tax Code */}
                      <div className="formGroup1">
                        <label className="label"> Tax Code <span className="required">*</span> </label>
                        <select
                          className={`select ${lineItemErrors[index]?.taxCode ? "inputError" : ""}`}
                          value={item.taxCode}
                          disabled={isDisabled}
                          onChange={(e) => {
                            updateLineItem(item.id, "taxCode", e.target.value);
                            setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, taxCode: false } : err));
                          }}
                        >
                          <option value="">Choose</option>
                          {taxCodes.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
                        </select>
                        {lineItemErrors[index]?.taxCode && <div className="errorText">Tax Code is required</div>}
                      </div>
                    </>
                  )}

                  <div className="formGroup1">
                    <label className="label">Remarks <span className="required">*</span> </label>
                    <textarea
                      className={`input ${lineItemErrors[index]?.remarks ? "inputError" : ""}`}
                      rows={2}
                      disabled={isDisabled}
                      value={item.remarks}
                      onChange={(e) => updateLineItem(item.id, "remarks", e.target.value)}
                    ></textarea>
                    {lineItemErrors[index]?.remarks && <div className="errorText">Remarks are required</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="formFooter">
          <button
            type="button"
            className="submitBtn"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
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
                Thank you for submitting!
              </h2>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  color: "#5f6368",
                  lineHeight: "1.6",
                }}
              >
                This is your Accrual Template control number:
              </p>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#202124",
                  margin: "16px 0 24px 0",
                  fontFamily: "'Google Sans', sans-serif",
                  letterSpacing: "2px",
                }}
              >
                {modalMessage}
              </div>
              <p
                style={{
                  margin: "0 0 32px 0",
                  fontSize: "13px",
                  color: "#5f6368",
                  lineHeight: "1.6",
                }}
              >
                Kindly note it in the upper-right corner of your printed RFP/GRPO for easier tracking. Thank you!
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