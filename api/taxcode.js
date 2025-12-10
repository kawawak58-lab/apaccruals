const { getColumn } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    const data = await getColumn("TAXCODE!A:A");
    res.status(200).json({ sheet: "TAXCODE", columnA: data });
  } catch (err) {
    console.error("ERROR in /api/taxcode:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

module.exports = handler;
