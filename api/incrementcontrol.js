// /api/incrementcontrol.js
const { getSheetsClient, SPREADSHEET_ID } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // Allow CORS manually
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Step 1: Get current control number
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "SETUP!B4",
    });

    const currentControl = response.data.values?.[0]?.[0] || "ACT000000";

    // Step 2: Increment numeric part
    const prefix = currentControl.match(/[A-Z]+/)?.[0] || "ACT";
    const numberPart = parseInt(currentControl.replace(/\D/g, ""), 10) || 0;
    const newNumberPart = (numberPart + 1).toString().padStart(6, "0");
    const newControlNumber = prefix + newNumberPart;

    // Step 3: Update sheet directly
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "SETUP!B4",
      valueInputOption: "USER_ENTERED",
      resource: { values: [[newControlNumber]] },
    });

    // Step 4: Return new control number
    res.status(200).json({ newControlNumber });
  } catch (err) {
    console.error("ERROR in /api/incrementcontrol:", err);
    res.status(500).json({ error: "Failed to increment control number" });
  }
};

module.exports = handler;
