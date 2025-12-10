import { getColumn } from "../lib/sheets.js";

export default async function handler(req, res) {
  console.log("API /company invoked");

  try {
    console.log("Calling getColumn...");
    const data = await getColumn("Company!A:A");
    // console.log("Data received:", data);

    res.status(200).json({ sheet: "Company", columnA: data });
  } catch (err) {
    console.error("ERROR in /api/company:", err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
}
