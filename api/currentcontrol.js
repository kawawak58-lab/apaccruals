// /api/currentcontrol.js
const { getColumn } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const values = await getColumn("SETUP!B4");
    if (!values || !values[0] || !values[0][0]) {
      return res.status(500).json({ error: "Failed to read current control number" });
    }

    res.status(200).json({ currentControlNumber: values[0][0] });

  } catch (err) {
    console.error("ERROR in /api/currentcontrol:", err);
    res.status(500).json({ error: "Failed to get control number" });
  }
};

module.exports = handler;
