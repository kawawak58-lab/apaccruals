export const NON_DEDUCTIBLE_EXPENSE = "Non-deductible expense (no valid receipt/invoice)";

export const ACCRUAL_UPLOAD_COLUMNS = [
  "sequence",
  "requester_email",
  "expense_class",
  "company",
  "supplier_code",
  "supplier_name",
  "invoice_no",
  "gross_amount",
  "glaccount_code",
  "glaccount_name",
  "profitcenter_code",
  "profitcenter_name",
  "transaction_type",
  "vat",
  "tax_code",
  "remarks",
];

export function buildAccrualUploadTemplateSample({
  expenseClasses = [],
  companies = [],
  transactionTypes = [],
  taxCodes = [],
  suppliers = [],
  glAccounts = [],
  profitCenters = [],
}) {
  const expenseClass =
    expenseClasses.find((value) => value !== NON_DEDUCTIBLE_EXPENSE) ||
    expenseClasses[0] ||
    "Deductible Expense (with valid receipt/invoice)";
  const company = companies[0] || "Example Company";
  const primarySupplier = suppliers[0] || { suppliercode: "", suppliername: "" };
  const secondarySupplier = suppliers[1] || primarySupplier;
  const primaryGl = glAccounts[0] || { glaccountcode: "", glaccountname: "" };
  const secondaryGl = glAccounts[1] || primaryGl;
  const tertiaryGl = glAccounts[2] || secondaryGl || primaryGl;
  const primaryProfitCenter = profitCenters[0] || { profitcentercode: "", profitcentername: "" };
  const secondaryProfitCenter = profitCenters[1] || primaryProfitCenter;
  const tertiaryProfitCenter = profitCenters[2] || secondaryProfitCenter || primaryProfitCenter;

  const sharedHeader = {
    requester_email: "user@example.com",
    expense_class: expenseClass,
    company,
    supplier_code: primarySupplier.suppliercode || "",
    supplier_name: primarySupplier.suppliername || "",
    invoice_no: "INV-001",
    vat: expenseClass === NON_DEDUCTIBLE_EXPENSE ? "" : "Vatable",
    tax_code: expenseClass === NON_DEDUCTIBLE_EXPENSE ? "" : taxCodes[0] || "Input VAT",
  };

  return [
    {
      ...sharedHeader,
      sequence: "1",
      gross_amount: "1000.00",
      glaccount_code: primaryGl.glaccountcode || "",
      glaccount_name: primaryGl.glaccountname || "",
      profitcenter_code: primaryProfitCenter.profitcentercode || "",
      profitcenter_name: primaryProfitCenter.profitcentername || "",
      transaction_type: transactionTypes[0] || "Invoice",
      remarks: "Sample accrual upload row 1",
    },
    {
      ...sharedHeader,
      sequence: "1",
      gross_amount: "500.00",
      glaccount_code: secondaryGl.glaccountcode || primaryGl.glaccountcode || "",
      glaccount_name: secondaryGl.glaccountname || primaryGl.glaccountname || "",
      profitcenter_code: secondaryProfitCenter.profitcentercode || primaryProfitCenter.profitcentercode || "",
      profitcenter_name: secondaryProfitCenter.profitcentername || primaryProfitCenter.profitcentername || "",
      transaction_type: transactionTypes[1] || transactionTypes[0] || "Invoice",
      remarks: "Sample accrual upload row 2",
    },
    {
      ...sharedHeader,
      sequence: "2",
      supplier_code: secondarySupplier.suppliercode || primarySupplier.suppliercode || "",
      supplier_name: secondarySupplier.suppliername || primarySupplier.suppliername || "",
      invoice_no: "INV-002",
      gross_amount: "250.00",
      glaccount_code: tertiaryGl.glaccountcode || primaryGl.glaccountcode || "",
      glaccount_name: tertiaryGl.glaccountname || primaryGl.glaccountname || "",
      profitcenter_code: tertiaryProfitCenter.profitcentercode || primaryProfitCenter.profitcentercode || "",
      profitcenter_name: tertiaryProfitCenter.profitcentername || primaryProfitCenter.profitcentername || "",
      transaction_type: transactionTypes[0] || "Invoice",
      remarks: "Sample accrual upload row 3",
    },
  ];
}

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeKeyValue(value) {
  return normalizeValue(value).toLowerCase();
}

export function toAccrualHeaderKey(row) {
  return normalizeKeyValue(row.sequence);
}

export function buildAccrualUploadPayloads(rows) {
  const groupedRows = new Map();

  rows.forEach((row) => {
    const groupKey = toAccrualHeaderKey(row);

    if (!groupedRows.has(groupKey)) {
      groupedRows.set(groupKey, {
        header: {
          requester_email: normalizeValue(row.requester_email),
          expense_class: normalizeValue(row.expense_class),
          company: normalizeValue(row.company),
          supplier_code: normalizeValue(row.supplier_code),
          supplier_name: normalizeValue(row.supplier_name),
          invoice_no: normalizeValue(row.invoice_no) || null,
          status: 2,
        },
        lineItems: [],
        sequence: Number(normalizeValue(row.sequence) || 0),
      });
    }

    const entry = groupedRows.get(groupKey);
    entry.lineItems.push({
      gross_amount: Number(normalizeValue(row.gross_amount) || 0),
      glaccount_code: normalizeValue(row.glaccount_code),
      glaccount_name: normalizeValue(row.glaccount_name) || null,
      profitcenter_code: normalizeValue(row.profitcenter_code),
      profitcenter_name: normalizeValue(row.profitcenter_name) || null,
      transaction_type: normalizeValue(row.transaction_type),
      vat: normalizeValue(row.vat) || null,
      tax_code: normalizeValue(row.tax_code) || null,
      remarks: normalizeValue(row.remarks),
    });
  });

  return Array.from(groupedRows.values())
    .sort((left, right) => left.sequence - right.sequence)
    .map((group) => ({
      header: group.header,
      lineItems: group.lineItems.map((lineItem, index) => ({
        ...lineItem,
        line_number: index + 1,
      })),
    }));
}
