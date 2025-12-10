import Cors from "cors";
import { getColumn } from "../lib/sheets.js";

// Initialize CORS middleware
const cors = Cors({
  methods: ["GET", "HEAD"],
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  try {
    const data = await getColumn("Company!A:A");
    res.status(200).json({ sheet: "Company", columnA: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read sheet" });
  }
}
