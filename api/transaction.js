const { getColumn } = require("../lib/sheets");

const handler = async (req, res) => {
  try {
    const data = await getColumn("Transaction Type!A:A");
    res.status(200).json({ sheet: "Transaction Type", columnA: data });
  } catch (err) {
    console.error("ERROR in /api/transactionType:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
};

module.exports = handler;
