import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AccrualSetupDate from "./AccrualSetupDate";
import YearEndAccrual from "./YearEndAccrual";
import AddSupplier from "./AddSupplier"; // import the Add Supplier page
import ApprovedSupplier from "./ApprovedSupplier"; // import the Approved Supplier page
import { apiFetch } from "./api";

function MainRoutes() {
  const [setupDates, setSetupDates] = useState({ startDate: null, cutoffDate: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSetupDates() {
      try {
        const res = await apiFetch("/api/setupdates");
        const data = await res.json();
        setSetupDates({ startDate: data.startDate, cutoffDate: data.cutoffDate });
      } catch (err) {
        console.error("Failed to fetch setup dates:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSetupDates();
  }, []);

  if (loading) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  const now = new Date();
  const start = setupDates.startDate ? new Date(setupDates.startDate) : null;
  const cutoff = setupDates.cutoffDate ? new Date(setupDates.cutoffDate) : null;

  // Before start date
  if (start && now < start) {
    return <AccrualSetupDate />;
  }

  // After cutoff date
  if (cutoff && now > cutoff) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontSize: "18px" }}>
        ⛔ The Year-End Accrual submission period has ended.<br />
        Please contact the AP Team if you have any questions.
      </div>
    );
  }

  // Main form
  return <YearEndAccrual />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainRoutes />} />
        <Route path="/add-supplier" element={<AddSupplier />} />
        <Route path="/approved-supplier" element={<ApprovedSupplier />} /> {/* NEW ROUTE */}
      </Routes>
    </Router>
  );
}
