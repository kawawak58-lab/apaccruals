const cors = require("cors");
const { appendRows } = require("../lib/sheets");

const handler = async (req, res) => {
  cors()(req, res, async () => {
    try {
      const { rows } = req.body;
      if (!rows || rows.length === 0) {
        return res.status(400).json({ error: "No data provided" });
      }

      await appendRows("Form Responses!A1", rows);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit form" });
    }
  });
};

module.exports = handler;
