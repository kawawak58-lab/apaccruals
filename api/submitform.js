const { appendRows, getColumn, updateCell } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // Allow CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { rows, controlNumber } = req.body;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }
    if (!controlNumber) {
      return res.status(400).json({ error: "No control number provided" });
    }

    // ===== APPEND ROWS TO FORM RESPONSES =====
    const timestamp = new Date().toLocaleString();
    const rowsWithControl = rows.map(row => [controlNumber, timestamp, ...row.slice(2)]);
    await appendRows("Form Responses!A1", rowsWithControl);

    // ===== INCREMENT CONTROL NUMBER =====
    // Read current control number from SETUP!B4
    const values = await getColumn("SETUP!B4");
    const currentControl = values[0] ? values[0][0] : controlNumber;
    const prefix = currentControl.match(/[A-Z]+/)?.[0] || "ACT";
    const numberPart = parseInt(currentControl.replace(/\D/g, ""), 10) || 0;
    const newNumberPart = (numberPart + 1).toString().padStart(6, "0");
    const newControlNumber = prefix + newNumberPart;

    // Update SETUP!B4 with the new control number
    await updateCell("SETUP!B4", newControlNumber);

    // ===== RETURN SUCCESS =====
    res.status(200).json({ success: true, controlNumber });

  } catch (err) {
    console.error("ERROR in /api/submitform:", err);
    res.status(500).json({ error: "Failed to submit form" });
  }
};

module.exports = handler;
