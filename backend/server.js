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
const GLACCOUNT_RANGE = "GL Account!A:C";
const PROFITCENTER_RANGE = "Profit Center!A:C";
const EXPENSECLASS_RANGE = "Expense Classification!A:A";

// Create Google Auth client once
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "keys/service_account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Get sheets client once
let sheetsClient;
async function getSheetsClient() {
  if (!sheetsClient) {
    const client = await auth.getClient();
    sheetsClient = google.sheets({ version: "v4", auth: client });
  }
  return sheetsClient;
}

// --- CACHE SETUP ---
let cache = {
  company: null,
  suppliers: null,
  transaction: null,
  taxcode: null,
  glaccount: null,
  profitcenter: null,
  expenseclass: null,
  setupDates: null,
  currentControlNumber: null,
  lastUpdated: 0,
};

const CACHE_TTL = 30 * 1000; // 30 seconds

async function getCachedData(key, fetchFn) {
  const now = Date.now();
  if (!cache[key] || now - cache.lastUpdated > CACHE_TTL) {
    cache[key] = await fetchFn();
    cache.lastUpdated = now;
  }
  return cache[key];
}

// --- SHEETS FUNCTIONS ---
async function getCompanyColumn() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: COMPANY_RANGE,
  });
  return response.data.values || [];
}

async function getSuppliers() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SUPPLIER_RANGE,
  });

  const values = response.data.values || [];
  const suppliers = values.slice(1).map(row => ({
    supplierNo: row[0] || "",
    supplierName: row[1] || "",
    supplierCompany: row[2] || ""
  }));
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
  const glaccount = values.slice(1).map(row => ({
    glaccountNo: row[0] || "",
    glaccountName: row[1] || "",
    glaccountCompany: row[2] || ""
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
  const profitcenter = values.slice(1).map(row => ({
    profitcenterNo: row[0] || "",
    profitcenterName: row[1] || "",
    profitcenterCompany: row[2] || ""
  }));

  return profitcenter;
}

async function getSetupDates() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "SETUP!B1:B2"
  });

  const values = response.data.values || [];
  return {
    cutoffDate: values[0] ? values[0][0] : null,
    startDate: values[1] ? values[1][0] : null
  };
}

async function getCurrentControlNumber() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "SETUP!B4"
  });

  const values = response.data.values || [];
  return values[0] ? values[0][0] : null;
}

async function getExpenseClass() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: EXPENSECLASS_RANGE,
  });
  return response.data.values || [];
}

// Increment the control number in SETUP!B4
async function incrementControlNumber() {
  try {
    const sheets = await getSheetsClient();

    // Step 1: Read current control number
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "SETUP!B4"
    });

    const currentControl = res.data.values?.[0]?.[0] || "ACT00000";

    // Step 2: Increment numeric part
    const prefix = currentControl.match(/[A-Z]+/)?.[0] || "ACT";
    const numberPart = parseInt(currentControl.replace(/\D/g, ""), 10) || 0;
    const newNumberPart = (numberPart + 1).toString().padStart(6, "0");
    const newControlNumber = prefix + newNumberPart;

    // Step 3: Update sheet with new control number
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "SETUP!B4",
      valueInputOption: "USER_ENTERED",
      resource: { values: [[newControlNumber]] }
    });

    // Optional: update cache if using cached control number
    cache.currentControlNumber = newControlNumber;

    return newControlNumber;

  } catch (err) {
    console.error("Error incrementing control number:", err);
    throw err;
  }
}


// --- API ENDPOINTS ---
app.get("/api/company", async (req, res) => {
  try {
    const data = await getCachedData("company", getCompanyColumn);
    res.json({ sheet: "Company", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/suppliers", async (req, res) => {
  try {
    const company = (req.query.company || "").trim().toLowerCase();
    const search = (req.query.search || "").trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const allSuppliers = await getCachedData("suppliers", getSuppliers);

    const filtered = allSuppliers.filter(supplier => {
      const matchesCompany = company
        ? supplier.supplierCompany.toLowerCase() === company
        : true;
      const matchesSearch = search
        ? supplier.supplierNo.toLowerCase().includes(search) ||
          supplier.supplierName.toLowerCase().includes(search)
        : true;
      return matchesCompany && matchesSearch;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    res.json({
      suppliers: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/transaction", async (req, res) => {
  try {
    const data = await getCachedData("transaction", getTransactionColumn);
    res.json({ sheet: "Transaction Type", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/taxcode", async (req, res) => {
  try {
    const data = await getCachedData("taxcode", getTaxColumn);
    res.json({ sheet: "TAXCODE", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/glaccount", async (req, res) => {
  try {
    const company = (req.query.company || "").trim().toLowerCase();
    const search = (req.query.search || "").trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const allGLaccount = await getCachedData("glaccount", getGLAccount);

    const filtered = allGLaccount.filter(gl => {
      const matchesCompany = company
        ? gl.glaccountCompany.toLowerCase() === company
        : true;
      const matchesSearch = search
        ? gl.glaccountNo.toLowerCase().includes(search) ||
          gl.glaccountName.toLowerCase().includes(search)
        : true;
      return matchesCompany && matchesSearch;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    res.json({
      glaccount: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/profitcenter", async (req, res) => {
  try {
    const company = (req.query.company || "").trim().toLowerCase();
    const search = (req.query.search || "").trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const allProfitCenter = await getCachedData("profitcenter", getProfitCenter);

    const filtered = allProfitCenter.filter(pc => {
      const matchesCompany = company
        ? pc.profitcenterCompany.toLowerCase() === company
        : true;
      const matchesSearch = search
        ? pc.profitcenterNo.toLowerCase().includes(search) ||
          pc.profitcenterName.toLowerCase().includes(search)
        : true;
      return matchesCompany && matchesSearch;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    res.json({
      profitcenter: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.post("/api/submitform", async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    const sheets = await getSheetsClient();
    let controlNumber = await getCachedData("currentControlNumber", getCurrentControlNumber);


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
    const dates = await getCachedData("setupDates", getSetupDates);
    res.json(dates);
  } catch (error) {
    console.error("Error reading setup dates:", error);
    res.status(500).json({ error: "Failed to read setup dates" });
  }
});

app.get("/api/expenseclass", async (req, res) => {
  try {
    const data = await getCachedData("expenseclass", getExpenseClass);
    res.json({ sheet: "Expense Classification", columnA: data });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read sheet" });
  }
});

app.get("/api/currentcontrol", async (req, res) => {
  try {
    const currentControlNumber = await getCachedData("currentControlNumber", getCurrentControlNumber);
    res.json({ currentControlNumber });
  } catch (error) {
    console.error("Error reading current control number:", error);
    res.status(500).json({ error: "Failed to read current control number" });
  }
});

app.post("/api/incrementcontrol", async (req, res) => {
  try {
    const newControlNumber = await incrementControlNumber();
    res.json({ success: true, newControlNumber });
  } catch (err) {
    res.status(500).json({ error: "Failed to increment control number" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
