import { getColumn } from "../lib/sheets.js";

export default async function handler(req, res) {
  console.log("API /company invoked");

  try {
    console.log("Calling getColumn...");
    const data = await getColumn("Expense Classification!A:A");
    // console.log("Data received:", data);

    res.status(200).json({ sheet: "Expense Classification", columnA: data });
  } catch (err) {
    console.error("ERROR in /api/expenseclass:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
}
