import ExcelJS from "exceljs";

function escapeCsvCell(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export function parseCsvText(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("The uploaded CSV file is empty.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  if (headers.length === 0 || headers.every((header) => !header)) {
    throw new Error("The uploaded CSV file must include a header row.");
  }

  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);

    return headers.reduce((record, header, index) => {
      record[header] = (cells[index] || "").trim();
      return record;
    }, {});
  });

  return { headers, rows };
}

function normalizeSpreadsheetCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if (value.text) {
      return String(value.text).trim();
    }
    if (value.result) {
      return String(value.result).trim();
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || "").join("").trim();
    }
  }

  return String(value).trim();
}

export async function parseUploadFile(file) {
  const fileName = String(file?.name || "").toLowerCase();

  if (fileName.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("The uploaded Excel file does not contain any worksheet.");
    }

    const sheetRows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      sheetRows.push(values.map((cell) => normalizeSpreadsheetCell(cell)));
    });

    const lines = sheetRows.filter((row) => row.some((cell) => cell));

    if (lines.length === 0) {
      throw new Error("The uploaded Excel file is empty.");
    }

    const headers = lines[0].map((header) => String(header || "").trim());

    if (headers.length === 0 || headers.every((header) => !header)) {
      throw new Error("The uploaded file must include a header row.");
    }

    const rows = lines.slice(1).map((cells) =>
      headers.reduce((record, header, index) => {
        record[header] = String(cells[index] || "").trim();
        return record;
      }, {})
    );

    return { headers, rows };
  }

  const text = await file.text();
  return parseCsvText(text);
}

export function buildTemplateCsv(columns, sampleRow = null) {
  const headerLine = columns.map((column) => escapeCsvCell(column)).join(",");

  if (!sampleRow) {
    return `${headerLine}\n`;
  }

  const sampleRows = Array.isArray(sampleRow) ? sampleRow : [sampleRow];
  const sampleLines = sampleRows
    .map((row) => columns.map((column) => escapeCsvCell(row[column] || "")).join(","))
    .join("\n");

  return `${headerLine}\n${sampleLines}\n`;
}

export function downloadTextFile(filename, content, mimeType = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
