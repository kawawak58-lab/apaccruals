const { updateCell } = require("../lib/sheets");

function normalizeControlNumber(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

function isValidControlNumber(value) {
  return /^[A-Z]+\d+$/.test(normalizeControlNumber(value));
}

const handler = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const controlNumber = normalizeControlNumber(req.body?.controlNumber);
    if (!isValidControlNumber(controlNumber)) {
      return res.status(400).json({ error: "Invalid control number format." });
    }

    await updateCell("SETUP!B4", controlNumber);

    res.status(200).json({ success: true, currentControlNumber: controlNumber });
  } catch (err) {
    console.error("ERROR in /api/setcontrol:", err);
    res.status(500).json({ error: "Failed to update control number" });
  }
};

module.exports = handler;
