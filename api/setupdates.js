const { getColumn } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    // Optional: allow CORS manually
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const values = await getColumn("SETUP!B1:B2");

    res.status(200).json({
      cutoffDate: values[0] ? values[0][0] : null,
      startDate: values[1] ? values[1][0] : null
    });

  } catch (err) {
    console.error("ERROR in /api/setup:", err);
    res.status(500).json({ error: "Failed to read setup dates" });
  }
};

module.exports = handler;
