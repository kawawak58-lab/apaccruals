// /api/currentcontrol.js
const { getColumn, updateCell } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    // ===== GET CURRENT CONTROL NUMBER =====
    const values = await getColumn("SETUP!B4");
    if (!values || !values[0] || !values[0][0]) {
      return res.status(500).json({ error: "Failed to read current control number" });
    }

    const currentControl = values[0][0];

    // ===== ONLY INCREMENT IF SUCCESSFULLY READ =====
    const prefix = currentControl.match(/[A-Z]+/)?.[0] || "ACT";
    const numberPart = parseInt(currentControl.replace(/\D/g, ""), 10) || 0;
    const newNumberPart = (numberPart + 1).toString().padStart(6, "0");
    const newControlNumber = prefix + newNumberPart;

    await updateCell("SETUP!B4", newControlNumber);

    // ===== RETURN CURRENT NUMBER (before increment) =====
    res.status(200).json({ controlNumber: currentControl });

  } catch (err) {
    console.error("ERROR in /api/currentcontrol:", err);
    res.status(500).json({ error: "Failed to get control number" });
  }
};

module.exports = handler;
