const { appendRows } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // Optional: allow CORS manually if needed
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const { rows } = req.body;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    await appendRows("Form Responses!A1", rows);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("ERROR in /api handler:", err);
    res.status(500).json({ error: "Failed to submit form" });
  }
};

module.exports = handler;
