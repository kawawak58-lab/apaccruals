import React, { useCallback, useEffect, useMemo, useState } from "react";
import MaintenanceSkeleton from "../components/MaintenanceSkeleton";
import MaintenanceTable from "../components/MaintenanceTable";
import { cancelAccrual, fetchAccrualSubmissions } from "../lib/AccrualSubmissions";
import { useToast } from "../lib/toast";

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatAmount(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAccrualStatusMeta(status) {
  if (Number(status) === 1) {
    return {
      label: "Cancelled",
      className: "danger",
    };
  }

  return {
    label: "Open",
    className: "success",
  };
}

function escapeSpreadsheetValue(value) {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadExcelFile(filename, rows) {
  const content = rows.map((row) => row.map(escapeSpreadsheetValue).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AllAccrualsPage({ currentUser }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [cancelDialogSubmission, setCancelDialogSubmission] = useState(null);
  const [cancellationRemarks, setCancellationRemarks] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const detailDialogStyle = {
    width: "min(1760px, calc(100vw - 20px))",
    maxWidth: "min(1760px, calc(100vw - 20px))",
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const rows = await fetchAccrualSubmissions({ currentUser });
      setSubmissions(rows);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load accrual submissions.");
      showToast(error.message || "Failed to load accrual submissions.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return submissions
      .map((submission) => {
        const lines = submission.accrual_submission_lines || [];
        const totalGrossAmount = lines.reduce((sum, line) => sum + Number(line.gross_amount || 0), 0);

        return {
          ...submission,
          lineCount: lines.length,
          totalGrossAmount,
        };
      })
      .filter((submission) => {
        const submittedDate = submission.submitted_at ? new Date(submission.submitted_at) : null;
        const submittedDateKey =
          submittedDate && !Number.isNaN(submittedDate.getTime())
            ? submittedDate.toLocaleDateString("en-CA")
            : "";
        const submissionStatus = Number(submission.status) === 1 ? "cancelled" : "open";

        if (dateFrom && submittedDateKey && submittedDateKey < dateFrom) {
          return false;
        }

        if (dateTo && submittedDateKey && submittedDateKey > dateTo) {
          return false;
        }

        if (statusFilter && submissionStatus !== statusFilter) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        const haystack = [
          submission.control_number,
          submission.requester_email,
          submission.expense_class,
          submission.company,
          submission.supplier_code,
          submission.supplier_name,
          submission.invoice_no,
          submissionStatus,
          submission.cancellation_remarks,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });
  }, [dateFrom, dateTo, search, statusFilter, submissions]);

  const totalSubmissions = filteredSubmissions.length;

  const exportRows = useMemo(() => {
    const headerRow = [
      "Control Number",
      "Timestamp",
      "Email",
      "Expense Classifications",
      "Company",
      "Supplier Code",
      "Supplier Name",
      "Invoice No",
      "Status",
      "Cancellation Remarks",
      "Gross Amount",
      "GL Account Code",
      "GL Account Name",
      "Profit Center Code",
      "Profit Center Name",
      "Transaction Type",
      "VAT Type",
      "Tax Code",
      "Remarks",
    ];

    const sortedSubmissions = [...filteredSubmissions].sort((left, right) =>
      String(left.control_number || "").localeCompare(String(right.control_number || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    const dataRows = sortedSubmissions.flatMap((submission) => {
      const lines = submission.accrual_submission_lines || [];

      return lines.map((line) => [
        submission.control_number,
        formatDateTime(submission.submitted_at),
        submission.requester_email,
        submission.expense_class,
        submission.company,
        submission.supplier_code,
        submission.supplier_name,
        submission.invoice_no || "",
        getAccrualStatusMeta(submission.status).label,
        submission.cancellation_remarks || "",
        Number(line.gross_amount || 0).toFixed(2),
        line.glaccount_code,
        line.glaccount_name || "",
        line.profitcenter_code,
        line.profitcenter_name || "",
        line.transaction_type,
        line.vat || "",
        line.tax_code || "",
        line.remarks || "",
      ]);
    });

    return [headerRow, ...dataRows];
  }, [filteredSubmissions]);

  const handleExport = () => {
    if (exportRows.length <= 1) {
      showToast("No accrual rows available to export.", "error");
      return;
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadExcelFile(`all-accruals-${dateStamp}.csv`, exportRows);
    showToast("Accrual export generated successfully.", "success");
  };

  const canCancelSubmission = useCallback(
    (submission) => {
      if (!submission || Number(submission.status) === 1) {
        return false;
      }

      if (currentUser?.usergroup === "sysadmin") {
        return true;
      }

      return (
        Boolean(currentUser?.email) &&
        String(submission.maker || "").toLowerCase() === String(currentUser.email || "").toLowerCase()
      );
    },
    [currentUser]
  );

  const openCancelDialog = (submission) => {
    setCancelDialogSubmission(submission);
    setCancellationRemarks("");
  };

  const closeCancelDialog = () => {
    if (cancelSaving) {
      return;
    }

    setCancelDialogSubmission(null);
    setCancellationRemarks("");
  };

  const handleCancelSubmission = async () => {
    const trimmedRemarks = cancellationRemarks.trim();

    if (!cancelDialogSubmission) {
      return;
    }

    if (!trimmedRemarks) {
      showToast("Cancellation remarks are required.", "error");
      return;
    }

    try {
      setCancelSaving(true);
      await cancelAccrual(cancelDialogSubmission.id, trimmedRemarks);
      showToast("Accrual entry cancelled successfully.", "success");
      closeCancelDialog();
      await loadData();
      setSelectedSubmission((current) =>
        current && current.id === cancelDialogSubmission.id
          ? {
              ...current,
              status: 1,
              cancellation_remarks: trimmedRemarks,
            }
          : current
      );
    } catch (error) {
      showToast(error.message || "Unable to cancel the accrual entry.", "error");
    } finally {
      setCancelSaving(false);
    }
  };

  return (
    <div className="contentPage managementPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">All Accruals</h1>
          <p className="pageSubtitle">Track submitted entries, control numbers, and line-item details from Supabase.</p>
        </div>
        <div className="headerActions">
          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Search</span>
            <input
              className="input headerSearch"
              placeholder="Search by control no., email, supplier, company..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search accrual submissions"
            />
          </label>
          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Date From</span>
            <input
              className="input headerDateInput"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              aria-label="Filter accruals from date"
            />
          </label>
          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Date To</span>
            <input
              className="input headerDateInput"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              aria-label="Filter accruals to date"
            />
          </label>
          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Status</span>
            <select
              className="input headerDateInput"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter accruals by status"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="headerButtonGroup">
            <button type="button" className="tableActionBtn" onClick={loadData}>
              Refresh
            </button>
            <button type="button" className="submitBtn" onClick={handleExport}>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="summaryGrid">
        <div className="summaryCard">
          <div className="summaryLabel">Total Submissions</div>
          <div className="summaryValue">{totalSubmissions.toLocaleString()}</div>
        </div>
      </div>

      <div className="managementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={7} rows={8} />
        ) : (
          <MaintenanceTable
            columns={[
              { key: "control_number", label: "Control No." },
              { key: "submitted_at", label: "Timestamp", render: (row) => formatDateTime(row.submitted_at) },
              { key: "requester_email", label: "Email" },
              {
                key: "status",
                label: "Status",
                render: (row) => {
                  const statusMeta = getAccrualStatusMeta(row.status);
                  return <span className={`statusPill ${statusMeta.className}`}>{statusMeta.label}</span>;
                },
                sortValue: (row) => getAccrualStatusMeta(row.status).label,
              },
              { key: "company", label: "Company" },
              { key: "supplier_name", label: "Supplier" },
              { key: "totalGrossAmount", label: "Gross Amount", render: (row) => formatAmount(row.totalGrossAmount) },
            ]}
            rows={filteredSubmissions}
            emptyText="No accrual submissions found."
            emptyHelperText="Submit a new accrual form and it will appear here once it is written to Supabase."
            onRowDoubleClick={(row) => setSelectedSubmission(row)}
            rowActions={(row) => (
              <>
                <button type="button" className="tableActionBtn" onClick={() => setSelectedSubmission(row)}>
                  View
                </button>
                {canCancelSubmission(row) ? (
                  <button type="button" className="tableActionBtn danger" onClick={() => openCancelDialog(row)}>
                    Cancel
                  </button>
                ) : null}
              </>
            )}
          />
        )}
      </div>

      {selectedSubmission ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog accrualDetailDialog" style={detailDialogStyle}>
            {Number(selectedSubmission.status) === 1 ? (
              <div className="accrualCancelledStamp" aria-hidden="true">
                Cancelled
              </div>
            ) : null}
            <div className="dialogHeader">
              <div className="uploadDialogHeaderCopy">
                <h2 className="modalTitle">Accrual Details</h2>
                <p className="uploadDialogHeaderText">
                  Review the submitted header and line items for control number {selectedSubmission.control_number}.
                </p>
              </div>
              <button
                type="button"
                className="dialogClose"
                onClick={() => setSelectedSubmission(null)}
                aria-label="Close accrual details"
              >
                x
              </button>
            </div>

            <div className="dialogForm">
              <div className="accrualDetailGrid">
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Control Number</div>
                  <div className="accrualDetailValue">{selectedSubmission.control_number}</div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Submitted</div>
                  <div className="accrualDetailValue">{formatDateTime(selectedSubmission.submitted_at)}</div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Requester</div>
                  <div className="accrualDetailValue">{selectedSubmission.requester_email}</div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Status</div>
                  <div className="accrualDetailValue">
                    <span className={`statusPill ${getAccrualStatusMeta(selectedSubmission.status).className}`}>
                      {getAccrualStatusMeta(selectedSubmission.status).label}
                    </span>
                  </div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Expense Class</div>
                  <div className="accrualDetailValue">{selectedSubmission.expense_class}</div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Company</div>
                  <div className="accrualDetailValue">{selectedSubmission.company}</div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Supplier</div>
                  <div className="accrualDetailValue">
                    {selectedSubmission.supplier_code} - {selectedSubmission.supplier_name}
                  </div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Invoice No.</div>
                  <div className="accrualDetailValue">{selectedSubmission.invoice_no || "-"}</div>
                </div>
                {Number(selectedSubmission.status) === 1 ? (
                  <div className="accrualDetailCard">
                    <div className="summaryLabel">Cancellation Remarks</div>
                    <div className="accrualDetailValue">{selectedSubmission.cancellation_remarks || "-"}</div>
                  </div>
                ) : null}
              </div>

              <div className="uploadPreviewMeta accrualLinesHeader">
                <div className="uploadPreviewTitle">Submitted Line Items</div>
                <span className="uploadPreviewBadge">
                  {(selectedSubmission.accrual_submission_lines || []).length} line(s)
                </span>
              </div>

              <div className="accrualLinesTableWrap">
                <table className="uploadPreviewTable accrualLinesTable">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Gross Amount</th>
                      <th>GL Account</th>
                      <th>GL Account Name</th>
                      <th>Profit Center</th>
                      <th>Profit Center Name</th>
                      <th>Transaction Type</th>
                      <th>VAT</th>
                      <th>Tax Code</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                    <tbody>
                      {(selectedSubmission.accrual_submission_lines || []).map((line) => (
                        <tr key={line.id}>
                        <td data-label="Line">{line.line_number}</td>
                        <td data-label="Gross Amount">{formatAmount(line.gross_amount)}</td>
                        <td data-label="GL Account">{line.glaccount_code}</td>
                        <td data-label="GL Account Name">{line.glaccount_name || "-"}</td>
                        <td data-label="Profit Center">{line.profitcenter_code}</td>
                        <td data-label="Profit Center Name">{line.profitcenter_name || "-"}</td>
                        <td data-label="Transaction Type">{line.transaction_type}</td>
                        <td data-label="VAT">{line.vat || "-"}</td>
                        <td data-label="Tax Code">{line.tax_code || "-"}</td>
                        <td data-label="Remarks">{line.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                </table>
              </div>

              <div className="dialogActions">
                {canCancelSubmission(selectedSubmission) ? (
                  <button
                    type="button"
                    className="tableActionBtn danger"
                    onClick={() => openCancelDialog(selectedSubmission)}
                  >
                    Cancel Entry
                  </button>
                ) : null}
                <button type="button" className="submitBtn" onClick={() => setSelectedSubmission(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cancelDialogSubmission ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog confirmDialog accrualCancelDialog">
            <div className="dialogHeader accrualCancelHeader">
              <div className="accrualCancelHeaderCopy">
                <div className="accrualCancelBadge">
                  <span className="accrualCancelBadgeIcon" aria-hidden="true">!</span>
                  <span>Destructive Action</span>
                </div>
                <h2 className="modalTitle">Cancel Accrual Entry</h2>
                <p className="uploadDialogHeaderText accrualCancelHeaderText">
                  Cancelling this accrual entry will mark it as cancelled in the system.
                </p>
                <div className="accrualCancelWarning">This action cannot be undone.</div>
              </div>
              <button
                type="button"
                className="dialogClose"
                onClick={closeCancelDialog}
                aria-label="Close cancellation dialog"
              >
                x
              </button>
            </div>
            <div className="dialogForm accrualCancelBody">
              <div className="accrualCancelSummary">
                <div className="accrualCancelSummaryLabel">Control Number</div>
                <div className="accrualCancelSummaryValue">{cancelDialogSubmission.control_number}</div>
              </div>
              <label className="dialogField accrualCancelField">
                <span className="label">
                  Cancellation Remarks <span className="required">*</span>
                </span>
                <textarea
                  className="input accrualCancelTextarea"
                  rows={5}
                  value={cancellationRemarks}
                  onChange={(event) => setCancellationRemarks(event.target.value)}
                  placeholder="Enter the business reason for cancelling this accrual entry"
                  disabled={cancelSaving}
                />
                <div className="accrualCancelHint">Required before confirming cancellation.</div>
              </label>
              <div className="dialogActions accrualCancelActions">
                <button
                  type="button"
                  className="removeBtn mutedBtn accrualCancelSecondaryBtn"
                  onClick={closeCancelDialog}
                  disabled={cancelSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submitBtn dangerBtn accrualCancelPrimaryBtn"
                  onClick={handleCancelSubmission}
                  disabled={cancelSaving}
                >
                  {cancelSaving ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
