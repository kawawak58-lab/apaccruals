import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { getCompanyNames } from "./lib/Companies";

export default function AddSupplier() {
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [company, setCompany] = useState("");
  const [companies, setCompanies] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await getCompanyNames();
        setCompanies(data);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!supplierCode) newErrors.supplierCode = "Supplier Code is required";
    if (!supplierName) newErrors.supplierName = "Supplier Name is required";
    if (!company) newErrors.company = "Company is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("suppliernenroll")
        .insert([
          {
            suppliercode: supplierCode,
            suppliername: supplierName,
            company: company,
          }
        ]);

      if (error) throw error;

      // Show success toast
      setToast({
        show: true,
        message: `🎉 Supplier "${supplierName}" successfully enrolled!`,
        type: "success"
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);

      setSupplierCode("");
      setSupplierName("");
      setCompany("");

    } catch (err) {
      console.error("Failed to enroll supplier:", err);
      setToast({
        show: true,
        message: "❌ Failed to enroll supplier. Check console.",
        type: "error"
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      fontFamily: "'Roboto', sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px 20px",
      position: "relative"
    }}>
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: 30,
        borderRadius: 16,
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        width: "100%",
        maxWidth: 500
      }}>
        <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333" }}>Enroll Supplier</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500 }}>Supplier Code <span style={{ color: "red" }}>*</span></label>
            <input
              type="text"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              style={inputStyle}
            />
            {errors.supplierCode && <p style={errorStyle}>{errors.supplierCode}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500 }}>Supplier Name <span style={{ color: "red" }}>*</span></label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              style={inputStyle}
            />
            {errors.supplierName && <p style={errorStyle}>{errors.supplierName}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500 }}>Company <span style={{ color: "red" }}>*</span></label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.company && <p style={errorStyle}>{errors.company}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: 12,
              background: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: 12,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "0.3s ease"
            }}
          >
            {isSubmitting ? "Enrolling..." : "Enroll Supplier"}
          </button>
        </form>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: "fixed",
          bottom: 30,
          right: 30,
          padding: "16px 24px",
          borderRadius: 12,
          backgroundColor: toast.type === "success" ? "#28a745" : "#dc3545",
          color: "white",
          boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
          fontWeight: "bold",
          animation: "slideIn 0.5s ease"
        }}>
          {toast.message}
        </div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  marginTop: 4,
  borderRadius: 8,
  border: "1px solid #ccc",
  outline: "none"
};

const errorStyle = {
  color: "red",
  marginTop: 4
};
