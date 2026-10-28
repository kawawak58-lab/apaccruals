import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AllAccrualsPage from "./pages/AllAccrualsPage";
import DraftAccrualEditor from "./DraftAccrualEditor";
import { fetchAccrualSubmissions, openAccrualDraft, updateAccrualDraft } from "./lib/AccrualSubmissions";
import { supabase } from "./lib/supabase";
import { buildAccrualUploadPayloads } from "./lib/accrualBulkUpload";

jest.mock("./lib/supabase", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("./lib/AccrualSubmissions", () => ({
  fetchAccrualSubmissions: jest.fn(), openAccrualDraft: jest.fn(),
  updateAccrualDraft: jest.fn(), cancelAccrual: jest.fn(),
}));
const mockToast = jest.fn();
jest.mock("./lib/toast", () => ({ useToast: () => ({ showToast: mockToast }) }));
const user = { email: "maker@example.com", usergroup: "accrual_user" };
const draft = {
  id: 42, control_number: "ACT000042", maker: user.email, requester_email: user.email,
  expense_class: "Travel", company: "Example", supplier_code: "S1", supplier_name: "Supplier",
  invoice_no: "INV1", status: 2, submitted_at: "2026-10-28T08:00:00Z",
  accrual_submission_lines: [{ id: 1, line_number: 1, gross_amount: 250, glaccount_code: "G1", profitcenter_code: "P1", transaction_type: "Invoice", remarks: "Travel" }],
};
beforeEach(() => {
  jest.clearAllMocks();
  fetchAccrualSubmissions.mockResolvedValue([draft]);
  openAccrualDraft.mockResolvedValue(true);
  updateAccrualDraft.mockResolvedValue(true);
});

test("Add changes a draft to Open and removes edit actions", async () => {
  render(<AllAccrualsPage currentUser={user} />);
  fireEvent.click(await screen.findByRole("button", { name: "View" }));
  fetchAccrualSubmissions.mockResolvedValue([{ ...draft, status: 0 }]);
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await waitFor(() => expect(openAccrualDraft).toHaveBeenCalledWith(42));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
});

test("failed Add keeps the entry editable as a draft", async () => {
  openAccrualDraft.mockRejectedValue(new Error("Filing period is closed"));
  render(<AllAccrualsPage currentUser={user} />);
  fireEvent.click(await screen.findByRole("button", { name: "View" }));
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith("Filing period is closed", "error"));
  expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
});

test("Open and Cancelled entries do not offer Edit or Add", async () => {
  fetchAccrualSubmissions.mockResolvedValue([{ ...draft, status: 0 }, { ...draft, id: 43, status: 1, control_number: "ACT000043" }]);
  render(<AllAccrualsPage currentUser={user} />);
  const viewButtons = await screen.findAllByRole("button", { name: "View" });
  fireEvent.click(viewButtons[0]);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
});

test("editing preserves the draft identity and saves header and line changes", async () => {
  const onSaved = jest.fn();
  render(<DraftAccrualEditor submission={draft} onClose={jest.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("Invoice number"), { target: { value: "INV2" } });
  fireEvent.change(screen.getByLabelText("Gross amount *"), { target: { value: "350.50" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
  await waitFor(() => expect(updateAccrualDraft).toHaveBeenCalledWith(42, expect.objectContaining({ invoice_no: "INV2" }), [expect.objectContaining({ gross_amount: 350.5, line_number: 1 })]));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(openAccrualDraft).not.toHaveBeenCalled();
});

test("failed draft save leaves the editor and changes available", async () => {
  updateAccrualDraft.mockRejectedValue(new Error("Only drafts can be edited"));
  const onSaved = jest.fn();
  render(<DraftAccrualEditor submission={draft} onClose={jest.fn()} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Only drafts can be edited");
  expect(onSaved).not.toHaveBeenCalled();
});

test("creation forces Draft even if an old caller supplies Open", async () => {
  supabase.rpc.mockResolvedValue({ data: "ACT000042", error: null });
  const { submitAccrual } = jest.requireActual("./lib/AccrualSubmissions");
  await submitAccrual({ header: { status: 0 }, lineItems: [] });
  expect(supabase.rpc).toHaveBeenCalledWith("submit_accrual", expect.objectContaining({ p_header: { status: 2 } }));
});

test("each uploaded accrual group starts as Draft", () => {
  const groups = buildAccrualUploadPayloads([
    { sequence: 1, requester_email: user.email, gross_amount: "100" },
    { sequence: 1, requester_email: user.email, gross_amount: "200" },
    { sequence: 2, requester_email: user.email, gross_amount: "300" },
  ]);
  expect(groups).toHaveLength(2);
  expect(groups.every((group) => group.header.status === 2)).toBe(true);
  expect(groups[0].lineItems).toHaveLength(2);
});
test("explicit Add sends Open while ordinary saves remain Draft", async () => {
  supabase.rpc.mockResolvedValue({ data: "ACT000042", error: null });
  const { submitAccrual } = jest.requireActual("./lib/AccrualSubmissions");
  await submitAccrual({ header: { status: 2 }, lineItems: [], open: true });
  expect(supabase.rpc).toHaveBeenCalledWith("submit_accrual", expect.objectContaining({ p_header: { status: 0 } }));
});