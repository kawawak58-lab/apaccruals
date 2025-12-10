const cors = require("cors");
const { getColumn } = require("../lib/sheets");

const handler = async (req, res) => {
  cors()(req, res, async () => {
    try {
      const data = await getColumn("Transaction Type!A:A");
      res.status(200).json({ sheet: "Transaction Type", columnA: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read sheet" });
    }
  });
};

module.exports = handler;
