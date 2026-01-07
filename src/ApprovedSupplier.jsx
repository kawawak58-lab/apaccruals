import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function ApprovedSupplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Fetch only suppliers that are not approved
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliernenroll")
        .select("*")
        .eq("isapproved", false) // only pending approvals
        .order("id", { ascending: true });

      if (error) throw error;
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Approve supplier
  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      // Update isapproved in suppliernenroll
      const { data: updatedSupplier, error: updateError } = await supabase
        .from("suppliernenroll")
        .update({ isapproved: true })
        .eq("id", id)
        .select();

      if (updateError) throw updateError;

      const approvedSupplier = updatedSupplier[0];

      // Insert into main suppliers table
      const { error: insertError } = await supabase
        .from("suppliers")
        .insert([{
          suppliercode: approvedSupplier.suppliercode,
          suppliername: approvedSupplier.suppliername,
          company: approvedSupplier.company
        }]);

      if (insertError) throw insertError;

      // Remove approved supplier from local state
      setSuppliers((prev) => prev.filter((s) => s.id !== id));

      // Show success toast
      setToast({
        show: true,
        message: `🎉 Supplier "${approvedSupplier.suppliername}" successfully enrolled!`,
        type: "success",
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);

    } catch (err) {
      console.error("Failed to approve supplier:", err);
      setToast({
        show: true,
        message: "❌ Failed to enroll supplier. Check console for details.",
        type: "error",
      });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div style={{
      fontFamily: "'Roboto', sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      padding: "40px 20px",
      position: "relative"
    }}>
      <div style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        padding: 30,
        borderRadius: 16,
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        maxWidth: 900,
        margin: "0 auto"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333" }}>Approve Suppliers</h2>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : suppliers.length === 0 ? (
          <p style={{ textAlign: "center" }}>No pending suppliers for approval</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Supplier Code</th>
                <th style={thStyle}>Supplier Name</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{s.suppliercode}</td>
                  <td style={tdStyle}>{s.suppliername}</td>
                  <td style={tdStyle}>{s.company}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleApprove(s.id)}
                      disabled={approvingId === s.id}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        backgroundColor: "#28a745",
                        color: "white",
                        cursor: "pointer"
                      }}
                    >
                      {approvingId === s.id ? "Approving..." : "Approve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

// Table styles
const thStyle = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "2px solid #ccc"
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee"
};
