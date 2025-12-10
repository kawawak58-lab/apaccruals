import React, { useEffect, useState } from "react";
import AccrualSetupDate from "./AccrualSetupDate";
import YearEndAccrual from "./YearEndAccrual";

export default function App() {
  const [setupDates, setSetupDates] = useState({ startDate: null, cutoffDate: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSetupDates() {
      try {
        const res = await fetch("http://localhost:5000/api/setupdates");
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

  // If before start date, show AccrualSetupDate
  if (start && now < start) {
    return <AccrualSetupDate />;
  }

  // If after cutoff date, optionally you could show a "submission closed" message
  if (cutoff && now > cutoff) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontSize: "18px" }}>
        ⛔ The Year-End Accrual submission period has ended.<br />
        Please contact the AP Team if you have any questions.
      </div>
    );
  }

  // Otherwise, show the main form
  return <YearEndAccrual />;
}
