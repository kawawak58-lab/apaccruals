// /api/incrementcontrol.js
const { getColumn, updateCell } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // Optional: allow CORS manually
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Step 1: Read current control number from SETUP!B4
    const values = await getColumn("SETUP!B4");
    const currentControl = values[0] ? values[0][0] : "ACT00000";

    // Step 2: Increment numeric part
    const prefix = currentControl.match(/[A-Z]+/)?.[0] || "ACT";
    const numberPart = parseInt(currentControl.replace(/\D/g, ""), 10) || 0;
    const newNumberPart = (numberPart + 1).toString().padStart(6, "0");
    const newControlNumber = prefix + newNumberPart;

    // Step 3: Update the sheet with the new control number
    await updateCell("SETUP!B4", newControlNumber);

    // Return new control number
    res.status(200).json({ newControlNumber });
  } catch (err) {
    console.error("ERROR in /api/incrementcontrol:", err);
    res.status(500).json({ error: "Failed to increment control number" });
  }
};

module.exports = handler;
