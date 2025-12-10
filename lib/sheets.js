const { google } = require("googleapis");

const SPREADSHEET_ID = "1g9gm_c0_JtztF0Ta-C6A1BAG86RlFQUieCpdy_Tu1QI";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

let sheetsClient;
async function getSheetsClient() {
  if (!sheetsClient) {
    const client = await auth.getClient();
    sheetsClient = google.sheets({ version: "v4", auth: client });
  }
  return sheetsClient;
}

async function getColumn(range) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

async function getTable(range) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const values = res.data.values || [];
  return values.slice(1); // Skip header
}

async function appendRows(range, rows) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: rows },
  });
}

module.exports = { getColumn, getTable, appendRows };
