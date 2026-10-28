import { findExactLookup } from "./accrualLookup";
import { supabase } from "./lib/supabase";
jest.mock("./lib/supabase", () => ({ supabase: { from: jest.fn() } }));
const options = { company: "Company A", table: "glaccounts", codeColumn: "glaccountcode", nameColumn: "glaccountname", search: "12600030" };
beforeEach(() => jest.clearAllMocks());
test("a pasted full code fills the matching name", async () => {
  expect(await findExactLookup({ ...options, rows: [{ code: "12600030", name: "Receivable" }], total: 1 })).toEqual({ code: "12600030", name: "Receivable" });
  expect(supabase.from).not.toHaveBeenCalled();
});
test("partial codes are not selected even with only one result", async () => {
  expect(await findExactLookup({ ...options, search: "1260", rows: [{ code: "12600030", name: "Receivable" }], total: 1 })).toBeNull();
});
test("ambiguous codes require manual selection", async () => {
  expect(await findExactLookup({ ...options, rows: [{ code: "12600030", name: "A" }, { code: "12600030", name: "B" }], total: 2 })).toBeNull();
});
test("supplier codes and pasted whitespace are supported", async () => {
  expect(await findExactLookup({ ...options, search: " 1009710 ", codeKey: "supplier", rows: [{ supplier: "1009710", name: "Supplier" }], total: 1 })).toEqual({ code: "1009710", name: "Supplier" });
});
test("exact matches beyond the first search page are checked by company and code", async () => {
  const query = { select: jest.fn(), eq: jest.fn(), limit: jest.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [{ glaccountcode: "12600030", glaccountname: "Receivable" }], error: null });
  supabase.from.mockReturnValue(query);
  expect(await findExactLookup({ ...options, rows: [], total: 100 })).toEqual({ code: "12600030", name: "Receivable" });
  expect(query.eq).toHaveBeenCalledWith("company", "Company A");
  expect(query.eq).toHaveBeenCalledWith("glaccountcode", "12600030");
});
test("cleared input cannot auto-select a result", async () => {
  expect(await findExactLookup({ ...options, search: "", rows: [{ code: "12600030", name: "A" }], total: 1 })).toBeNull();
});