import ExcelJS from "exceljs";
import { ACCRUAL_UPLOAD_COLUMNS, buildAccrualUploadTemplateSample } from "./accrualBulkUpload";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function sanitizeList(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function setColumnWidths(sheet) {
  const widthMap = {
    sequence: 12,
    requester_email: 24,
    expense_class: 32,
    company: 24,
    supplier_code: 16,
    invoice_no: 16,
    gross_amount: 14,
    glaccount_code: 18,
    profitcenter_code: 18,
    transaction_type: 20,
    vat: 14,
    tax_code: 22,
    remarks: 28,
  };

  sheet.columns = ACCRUAL_UPLOAD_COLUMNS.map((column) => ({
    key: column,
    width: widthMap[column] || 20,
  }));
}

function applyHeaderStyle(row) {
  row.font = { bold: true, color: { argb: "FF334155" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF4FB" },
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFD7E2F0" } },
      left: { style: "thin", color: { argb: "FFD7E2F0" } },
      bottom: { style: "thin", color: { argb: "FFD7E2F0" } },
      right: { style: "thin", color: { argb: "FFD7E2F0" } },
    };
  });
}

function addListColumn(sheet, columnLetter, title, values) {
  sheet.getCell(`${columnLetter}1`).value = title;
  values.forEach((value, index) => {
    sheet.getCell(`${columnLetter}${index + 2}`).value = value;
  });
}

function applyValidation(sheet, columnIndex, formula, rowLimit = 1000) {
  for (let row = 2; row <= rowLimit; row += 1) {
    sheet.getCell(row, columnIndex).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: "Invalid selection",
      error: "Please choose a value from the dropdown list.",
    };
  }
}

export async function downloadAccrualTemplateWorkbook({
  companies = [],
  expenseClasses = [],
  transactionTypes = [],
  taxCodes = [],
  suppliers = [],
  glAccounts = [],
  profitCenters = [],
  filename = "accrual-upload-template.xlsx",
  includeSampleRows = false,
}) {
  const workbook = new ExcelJS.Workbook();
  const uploadSheet = workbook.addWorksheet("Accrual Upload");
  const listsSheet = workbook.addWorksheet("Lists");

  uploadSheet.addRow(ACCRUAL_UPLOAD_COLUMNS);
  if (includeSampleRows) {
    const sampleRows = buildAccrualUploadTemplateSample({
      companies,
      expenseClasses,
      transactionTypes,
      taxCodes,
      suppliers,
      glAccounts,
      profitCenters,
    });
    sampleRows.forEach((row) => {
      uploadSheet.addRow(ACCRUAL_UPLOAD_COLUMNS.map((column) => row[column] || ""));
    });
  }

  setColumnWidths(uploadSheet);
  applyHeaderStyle(uploadSheet.getRow(1));
  uploadSheet.views = [{ state: "frozen", ySplit: 1 }];
  uploadSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ACCRUAL_UPLOAD_COLUMNS.length },
  };

  const companyList = sanitizeList(companies);
  const expenseClassList = sanitizeList(expenseClasses);
  const transactionTypeList = sanitizeList(transactionTypes);
  const vatList = ["Vatable", "Non-Vatable"];
  const taxCodeList = sanitizeList(taxCodes);

  addListColumn(listsSheet, "A", "Expense Class", expenseClassList);
  addListColumn(listsSheet, "B", "Company", companyList);
  addListColumn(listsSheet, "C", "Transaction Type", transactionTypeList);
  addListColumn(listsSheet, "D", "VAT", vatList);
  addListColumn(listsSheet, "E", "Tax Code", taxCodeList);
  listsSheet.state = "veryHidden";

  if (expenseClassList.length > 0) {
    applyValidation(uploadSheet, ACCRUAL_UPLOAD_COLUMNS.indexOf("expense_class") + 1, `'Lists'!$A$2:$A$${expenseClassList.length + 1}`);
  }
  if (companyList.length > 0) {
    applyValidation(uploadSheet, ACCRUAL_UPLOAD_COLUMNS.indexOf("company") + 1, `'Lists'!$B$2:$B$${companyList.length + 1}`);
  }
  if (transactionTypeList.length > 0) {
    applyValidation(uploadSheet, ACCRUAL_UPLOAD_COLUMNS.indexOf("transaction_type") + 1, `'Lists'!$C$2:$C$${transactionTypeList.length + 1}`);
  }
  applyValidation(uploadSheet, ACCRUAL_UPLOAD_COLUMNS.indexOf("vat") + 1, `'Lists'!$D$2:$D$${vatList.length + 1}`);
  if (taxCodeList.length > 0) {
    applyValidation(uploadSheet, ACCRUAL_UPLOAD_COLUMNS.indexOf("tax_code") + 1, `'Lists'!$E$2:$E$${taxCodeList.length + 1}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
