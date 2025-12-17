import { getTable } from "../lib/sheets.js";

const handler = async (req, res) => {
  try {
    const company = (req.query.company || "").trim().toLowerCase();
    const search = (req.query.search || "").trim().toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Get all supplier data
    const values = await getTable("Profit Center!A:C"); 

    // Map to objects
    const profitcenter = values.map((row) => ({
      profitcenterNo: row[0] || "",
      profitcenterName: row[1] || "",
      profitcenterCompany: row[2] || "",
    }));

    // Filter by company
    const filteredByCompany = company
      ? profitcenter.filter(
          (s) => s.profitcenterCompany.toLowerCase() === company
        )
      : profitcenter;

    // Filter by search term
    const filtered = search
      ? filteredByCompany.filter(
          (s) =>
            s.profitcenterNo.toLowerCase().includes(search) ||
            s.profitcenterName.toLowerCase().includes(search)
        )
      : filteredByCompany;

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    res.status(200).json({
      profitcenter: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      limit,
    });
  } catch (err) {
    console.error("ERROR in /api/profitcenter:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

export default handler;
