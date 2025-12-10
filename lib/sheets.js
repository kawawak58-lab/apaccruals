const { google } = require("googleapis");

const SPREADSHEET_ID = "1g9gm_c0_JtztF0Ta-C6A1BAG86RlFQUieCpdy_Tu1QI";

let auth, sheetsClient;

function getAuth() {
  if (!auth) {
    let creds;
    try {
      creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      console.log("SERVICE_ACCOUNT_JSON length:", process.env.SERVICE_ACCOUNT_JSON.length);
    } catch (err) {
      console.error("Failed to parse SERVICE_ACCOUNT_JSON:", err);
      throw err;
    }

    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
  return auth;
}

async function getSheetsClient() {
  if (!sheetsClient) {
    const client = await getAuth().getClient();
    sheetsClient = google.sheets({ version: "v4", auth: client });
  }
  return sheetsClient;
}

async function getColumn(range) {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    return res.data.values || [];
  } catch (err) {
    console.error("getColumn error:", err);
    throw err;
  }
}

async function getTable(range) {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const values = res.data.values || [];
    return values.slice(1); // skip header
  } catch (err) {
    console.error("getTable error:", err);
    throw err;
  }
}

async function appendRows(range, rows) {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      resource: { values: rows },
    });
  } catch (err) {
    console.error("appendRows error:", err);
    throw err;
  }
}

module.exports = { getColumn, getTable, appendRows };
