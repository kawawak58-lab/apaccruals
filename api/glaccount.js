const cors = require("cors");
const { getTable } = require("../lib/sheets");

const handler = async (req, res) => {
  cors()(req, res, async () => {
    try {
      const search = (req.query.q || "").toLowerCase();
      const values = await getTable("GL Account!A:B");

      const glaccount = values.map(row => ({
        glaccountNo: row[0] || "",
        glaccountName: row[1] || "",
      }));

      const filtered = glaccount.filter(s =>
        s.glaccountNo.toLowerCase().includes(search) ||
        s.glaccountName.toLowerCase().includes(search)
      );

      res.status(200).json({ glaccount: filtered.slice(0, 50) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read sheet" });
    }
  });
};

module.exports = handler;
