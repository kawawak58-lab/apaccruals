import { getTable } from "../lib/sheets.js";

const handler = async (req, res) => {
  try {
    const company = (req.query.company || "").trim().toLowerCase();
    const search = (req.query.search || "").trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    // Fetch supplier data from Google Sheet
    const values = await getTable("Supplier Data!A:C"); // [supplierNo, supplierName, supplierCompany]

    // Map rows to objects
    const suppliers = values.map((row) => ({
      supplierNo: row[0] || "",
      supplierName: row[1] || "",
      supplierCompany: row[2] || "",
    }));

    // Filter by company if provided
    const filteredByCompany = company
      ? suppliers.filter(
          (s) => s.supplierCompany.toLowerCase() === company
        )
      : suppliers;

    // Filter by search term if provided
    const filtered = search
      ? filteredByCompany.filter(
          (s) =>
            s.supplierNo.toLowerCase().includes(search) ||
            s.supplierName.toLowerCase().includes(search)
        )
      : filteredByCompany;

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    // Return suppliers + pagination info
    res.status(200).json({
      suppliers: paginated,
      total: filtered.length,              // total matching suppliers
      page,                                // current page
      totalPages: Math.ceil(filtered.length / limit), // total pages
      limit,                               // page limit
    });
  } catch (err) {
    console.error("ERROR in /api/suppliers:", err);
    res.status(500).json({ error: "Failed to read supplier data" });
  }
};

export default handler;
