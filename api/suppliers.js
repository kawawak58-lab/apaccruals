const { getTable } = require("../../../lib/sheets");

const handler = async (req, res) => {
  try {
    const search = (req.query.q || "").toLowerCase();

    // Get company from URL, e.g., /api/suppliers/Bounty Farms Inc.
    const params = req.query.params || [];
    const company = params[0] ? params[0].trim().toLowerCase() : "";

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
    console.error("ERROR in /api/suppliers:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

export default handler;
