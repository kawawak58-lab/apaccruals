// const { getTable } = require("../lib/sheets");

// const handler = async (req, res) => {
//   try {
//     const search = (req.query.q || "").toLowerCase();
//     const values = await getTable("GL Account!A:B");

//     const glaccount = values.map(row => ({
//       glaccountNo: row[0] || "",
//       glaccountName: row[1] || "",
//     }));

//     const filtered = glaccount.filter(s =>
//       s.glaccountNo.toLowerCase().includes(search) ||
//       s.glaccountName.toLowerCase().includes(search)
//     );

//     res.status(200).json({ glaccount: filtered.slice(0, 50) });
//   } catch (err) {
//     console.error("ERROR in /api/glaccount:", err);
//     res.status(500).json({ error: "Failed to read sheet" });
//   }
// };

// module.exports = handler;


import { getTable } from "../lib/sheets.js";

const handler = async (req, res) => {
  try {
    const company = (req.query.company || "").trim().toLowerCase();
    const search = (req.query.search || "").trim().toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Get all supplier data
    const values = await getTable("GL Account!A:C");

    const glaccount = values.map(row => ({
      glaccountNo: row[0] || "",
      glaccountName: row[1] || "",
      glaccountCompany: row[2] || "",
    }));

    // Filter by company
    const filteredByCompany = company
      ? glaccount.filter(
          (s) => s.glaccountCompany.toLowerCase() === company
        )
      : glaccount;

    // Filter by search term
    const filtered = search
      ? filteredByCompany.filter(
          (s) =>
            s.glaccountNo.toLowerCase().includes(search) ||
            s.glaccountName.toLowerCase().includes(search)
        )
      : filteredByCompany;

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    res.status(200).json({
      glaccount: paginated,
     pagination: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  } catch (err) {
    console.error("ERROR in /api/glaccount:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

export default handler;
