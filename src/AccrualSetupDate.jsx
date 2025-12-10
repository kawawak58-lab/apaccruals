// AccrualSetupDate.jsx
import React, { useEffect, useState } from "react";

// Helper to format a date as "Day, Month Date, Year"
function formatDateWithDay(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString(undefined, options);
}

export default function AccrualSetupDate() {
  const [dates, setDates] = useState({ startDate: null, cutoffDate: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSetupDates() {
      try {
        const res = await fetch("api/setupdates");
        const data = await res.json();
        setDates({ startDate: data.startDate, cutoffDate: data.cutoffDate });
      } catch (err) {
        console.error("Failed to fetch setup dates:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSetupDates();
  }, []);

  const now = new Date();
  const start = dates.startDate ? new Date(dates.startDate) : null;

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}>
        <p style={{ color: "#fff", fontSize: "18px" }}>Loading...</p>
      </div>
    );
  }

  if (!start || now >= start) return null; // If the date has started, don't show this component

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      boxSizing: "border-box",
      overflow: "hidden"
    }}>
      <div style={{
        padding: "40px",
        maxWidth: "600px",
        borderRadius: "8px",
        textAlign: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        color: "#202124",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        overflow: "hidden"
      }}>
        <h2 style={{ fontSize: "24px", marginBottom: "24px" }}>
          ⏳ The Year-End Accrual submission has not yet started.
        </h2>
        <p style={{ fontSize: "16px", marginBottom: "16px", color: "#5f6368", lineHeight: 1.5 }}>
          It will open on <strong>{formatDateWithDay(dates.startDate)}</strong> and will automatically close on <strong>{formatDateWithDay(dates.cutoffDate)}</strong>.
        </p>
        <p style={{ fontSize: "16px", marginTop: "24px", color: "#5f6368" }}>
          Thank you for your usual support and cooperation.
        </p>
        <p style={{ fontSize: "16px", marginTop: "8px", color: "#5f6368" }}>
          Have a great day!
        </p>
      </div>
    </div>
  );
}
