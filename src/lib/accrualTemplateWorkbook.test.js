import ExcelJS from "exceljs";
import { downloadAccrualTemplateWorkbook } from "./accrualTemplateWorkbook";
import { ACCRUAL_UPLOAD_COLUMNS } from "./accrualBulkUpload";

async function readWorkbook(blob) {
  const buffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

test("blank accrual template has headers and no sample entries", async () => {
  const createObjectURL = jest.fn(() => "blob:template");
  const revokeObjectURL = jest.fn();
  Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  try {
    await downloadAccrualTemplateWorkbook({ companies: ["Example Company"] });
    const workbook = await readWorkbook(createObjectURL.mock.calls[0][0]);
    const sheet = workbook.getWorksheet("Accrual Upload");
    expect(sheet.getRow(1).values.slice(1)).toEqual(ACCRUAL_UPLOAD_COLUMNS);
    expect(sheet.getRow(2).getCell(1).value).toBeNull();
    expect(sheet.getRow(2).getCell(8).value).toBeNull();

    await downloadAccrualTemplateWorkbook({
      companies: ["Example Company"],
      includeSampleRows: true,
      filename: "accrual-upload-guide.xlsx",
    });
    const guide = await readWorkbook(createObjectURL.mock.calls[1][0]);
    const guideSheet = guide.getWorksheet("Accrual Upload");
    expect(guideSheet.getRow(2).getCell(1).value).toBe("1");
    expect(guideSheet.getRow(2).getCell(8).value).toBe("1000.00");
  } finally {
    click.mockRestore();
  }
});
