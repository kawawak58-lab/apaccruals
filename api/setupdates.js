const cors = require("cors");
const { getColumn } = require("../lib/sheets");

const handler = async (req, res) => {
  cors()(req, res, async () => {
    try {
      const values = await getColumn("SETUP!B1:B2");
      res.status(200).json({
        cutoffDate: values[0] ? values[0][0] : null,
        startDate: values[1] ? values[1][0] : null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read setup dates" });
    }
  });
};

module.exports = handler;
