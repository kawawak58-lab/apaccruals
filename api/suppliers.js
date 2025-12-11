const { getTable } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    const search = (req.query.q || "").toLowerCase();
    const company = (req.query.companyParam || req.query.company || req.params.company || "").trim().toLowerCase();

    const values = await getTable("Supplier Data!A:C");

    const suppliers = values.map(row => ({
      supplierNo: row[0] || "",
      supplierName: row[1] || "",
      supplierCompany: row[2] || "",
    }));

    const filtered = suppliers.filter(s => {
      const matchesSearch =
        s.supplierNo.toLowerCase().includes(search) ||
        s.supplierName.toLowerCase().includes(search);

      const matchesCompany = company
        ? s.supplierCompany.toLowerCase() === company
        : true;

      return matchesSearch && matchesCompany;
    });

    res.status(200).json({ suppliers: filtered.slice(0, 50) });
  } catch (err) {
    console.error("ERROR in /api/supplier:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

module.exports = handler;
