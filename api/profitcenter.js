const { getTable } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    const search = (req.query.q || "").toLowerCase();
    const values = await getTable("Profit Center!A:B");

    const profitcenter = values.map(row => ({
      profitcenterNo: row[0] || "",
      profitcenterName: row[1] || "",
    }));

    const filtered = profitcenter.filter(s =>
      s.profitcenterNo.toLowerCase().includes(search) ||
      s.profitcenterName.toLowerCase().includes(search)
    );

    res.status(200).json({ profitcenter: filtered.slice(0, 50) });
  } catch (err) {
    console.error("ERROR in /api/profitcenter:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

module.exports = handler;
