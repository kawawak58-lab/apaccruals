const express = require("express");
const { google } = require("googleapis");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// GOOGLE SHEET DETAILS
const SPREADSHEET_ID = "1g9gm_c0_JtztF0Ta-C6A1BAG86RlFQUieCpdy_Tu1QI";
const COMPANY_RANGE = "Company!A:A"; // Column A only
const SUPPLIER_RANGE = "Supplier Data!A:C";
const TRANSACTION_RANGE = "Transaction Type!A:A";
const TAXCODE_RANGE = "TAXCODE!A:A";
const GLACCOUNT_RANGE = "GL Account!A:B";
const PROFITCENTER_RANGE = "Profit Center!A:B";
const EXPENSECLASS_RANGE = "Expense Classification!A:A";

// Create Google Auth client once
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "keys/service_account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// const auth = new google.auth.GoogleAuth({
//   credentials: JSON.parse(process.env.SERVICE_ACCOUNT_JSON),
//   scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// });
// Get sheets client once
let sheetsClient;
async function getSheetsClient() {
  if (!sheetsClient) {
    const client = await auth.getClient();
    sheetsClient = google.sheets({ version: "v4", auth: client });
  }
  return sheetsClient;
}

// Get company column
async function getCompanyColumn() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: COMPANY_RANGE,
  });
  return response.data.values || [];
}

// Get suppliers
async function getSuppliers() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SUPPLIER_RANGE,
  });

  const values = response.data.values || [];
  
  // Skip header row and map columns A and B
  const suppliers = values.slice(1).map(row => ({
    supplierNo: row[0] || "",
    supplierName: row[1] || "",
    supplierCompany: row[2] || ""
  }));
  // console.log(suppliers);
  return suppliers;
}


async function getTransactionColumn() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: TRANSACTION_RANGE,
  });
  return response.data.values || [];
}

async function getTaxColumn() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: TAXCODE_RANGE,
  });
  return response.data.values || [];
}

async function getGLAccount() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: GLACCOUNT_RANGE,
  });

  const values = response.data.values || [];
  
  // Skip header row and map columns A and B
  const glaccount = values.slice(1).map(row => ({
    glaccountNo: row[0] || "",
    glaccountName: row[1] || ""
  }));

  return glaccount;
}

async function getProfitCenter() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: PROFITCENTER_RANGE,
  });

  const values = response.data.values || [];
  
  // Skip header row and map columns A and B
  const profitcenter = values.slice(1).map(row => ({
    profitcenterNo: row[0] || "",
    profitcenterName: row[1] || ""
  }));

  return profitcenter;
}

async function getSetupDates() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "SETUP!B1:B2" // B1 = Cutoff Date, B2 = Start Date
  });

  const values = response.data.values || [];

  return {
    cutoffDate: values[0] ? values[0][0] : null, // B1
    startDate: values[1] ? values[1][0] : null   // B2
  };
}


async function getExpenseClass() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: EXPENSECLASS_RANGE,
  });
  return response.data.values || [];
}

// API endpoints
app.get("/api/company", async (req, res) => {
  try {
    const data = await getCompanyColumn();
    res.json({ sheet: "Company", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

// app.get("/api/suppliers", async (req, res) => {
//   try {
//     const search = (req.query.q || "").toLowerCase();
//     const allSuppliers = await getSuppliers();
    
//     // Filter suppliers by supplierNo or supplierName
//     const filtered = allSuppliers.filter(s => 
//       s.supplierNo.toLowerCase().includes(search) ||
//       s.supplierName.toLowerCase().includes(search) ||
//       s.supplierCompany.toLowerCase().includes(search)
//     );

//     res.json({ suppliers: filtered.slice(0, 50) }); // Limit to 50 results
//   } catch (error) {
//     console.error("Error reading sheet:", error);
//     res.status(500).json({ error: "Failed to read sheet" });
//   }
// });

// Get suppliers by company (company as URL parameter)
app.get("/api/suppliers/:company?", async (req, res) => {
  try {
    // Read company from either path param or query string
    const company =
      (req.params.company || req.query.company || "").trim().toLowerCase();

    const allSuppliers = await getSuppliers();

    // If company is provided, filter; otherwise return all
    const filtered = company
      ? allSuppliers.filter(
          (s) => s.supplierCompany.toLowerCase() === company
        )
      : allSuppliers;

    res.json({ suppliers: filtered });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});



app.get("/api/transaction", async (req, res) => {
  try {
    const data = await getTransactionColumn();
    res.json({ sheet: "Transaction Type", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});


app.get("/api/taxcode", async (req, res) => {
  try {
    const data = await getTaxColumn();
    res.json({ sheet: "TAXCODE", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});


app.get("/api/glaccount", async (req, res) => {
  try {
    const search = (req.query.q || "").toLowerCase();
    const allGLaccount = await getGLAccount();
    
    const filtered = allGLaccount.filter(s => 
      s.glaccountNo.toLowerCase().includes(search) ||
      s.glaccountName.toLowerCase().includes(search)
    );

    res.json({ glaccount: filtered.slice(0, 50) }); // Limit to 50 results
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/profitcenter", async (req, res) => {
  try {
    const search = (req.query.q || "").toLowerCase();
    const allProfitCenter = await getProfitCenter();
    
    const filtered = allProfitCenter.filter(s => 
      s.profitcenterNo.toLowerCase().includes(search) ||
      s.profitcenterName.toLowerCase().includes(search)
    );

    res.json({ profitcenter: filtered.slice(0, 50) }); // Limit to 50 results
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.post("/api/submitform", async (req, res) => {
  try {
    // console.log("Incoming request body:", req.body);
    const { rows } = req.body; // Expecting array of rows from React
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Form Responses!A1",
      valueInputOption: "USER_ENTERED",
      resource: { values: rows }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error writing to Form Responses:", err);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

app.get("/api/setupdates", async (req, res) => {
  try {
    const dates = await getSetupDates();
    res.json(dates);
  } catch (error) {
    console.error("Error reading setup dates:", error);
    res.status(500).json({ error: "Failed to read setup dates" });
  }
});


app.get("/api/expenseclass", async (req, res) => {
  try {
    const data = await getExpenseClass();
    res.json({ sheet: "Expense Classification", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
