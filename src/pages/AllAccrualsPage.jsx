import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MaintenanceSkeleton from "../components/MaintenanceSkeleton";
import MaintenanceTable from "../components/MaintenanceTable";
import DraftAccrualEditor from "../DraftAccrualEditor";
import AccrualNotesDialog from "../components/AccrualNotesDialog";
import { cancelAccrual, confirmAccrualSubmission, fetchAccrualSubmissions } from "../lib/AccrualSubmissions";
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

function formatTableDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSupplierName(value) {
  const cleaned = String(value || "").trim().replace(/^[\s_-]+/, "").trim();
  return cleaned || "—";
}

function formatAmount(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRangeDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRangeLabel(dateFrom, dateTo) {
  const startDate = parseDateValue(dateFrom);
  const endDate = parseDateValue(dateTo);

  if (startDate && endDate) {
    return `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}`;
  }

  if (startDate) {
    return `${formatRangeDate(startDate)} - ...`;
  }

  return "Pick a date range";
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDay(first, second) {
  return Boolean(
    first &&
      second &&
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
  );
}

function isBetween(day, startDate, endDate) {
  if (!startDate || !endDate) {
    return false;
  }

  const time = day.getTime();
  return time > startDate.getTime() && time < endDate.getTime();
}

function buildMonthDays(monthDate) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.75" y="5.5" width="16.5" height="14.75" rx="2.25" />
      <path d="M7.5 3.75v3.5" />
      <path d="M16.5 3.75v3.5" />
      <path d="M3.75 9.5h16.5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 12h4" />
      <path d="M12 12h8" />
      <path d="M4 17h8" />
      <path d="M16 17h4" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="14" cy="17" r="2" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0 2 5.5" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function DateRangeField({ dateFrom, dateTo, onRangeChange }) {
  const containerRef = useRef(null);
  const startDate = useMemo(() => parseDateValue(dateFrom), [dateFrom]);
  const endDate = useMemo(() => parseDateValue(dateTo), [dateTo]);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(startDate || new Date()));
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (startDate) {
      setViewMonth(startOfMonth(startDate));
    }
  }, [startDate]);

  const selectDay = (day) => {
    const selectedValue = formatDateValue(day);

    if (!startDate || (startDate && endDate)) {
      onRangeChange(selectedValue, "");
      return;
    }

    if (day.getTime() < startDate.getTime()) {
      onRangeChange(selectedValue, dateFrom);
      setOpen(false);
      return;
    }

    onRangeChange(dateFrom, selectedValue);
    setOpen(false);
  };

  const renderMonth = (monthDate) => {
    const days = buildMonthDays(monthDate);

    return (
      <div className="dateRangeMonth" key={monthDate.toISOString()}>
        <div className="dateRangeMonthTitle">
          {monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div className="dateRangeWeekdays">
          {weekdays.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="dateRangeDays">
          {days.map((day) => {
            const isOutsideMonth = day.getMonth() !== monthDate.getMonth();
            const selectedStart = isSameDay(day, startDate);
            const selectedEnd = isSameDay(day, endDate);
            const inRange = isBetween(day, startDate, endDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`dateRangeDay${isOutsideMonth ? " outside" : ""}${selectedStart ? " rangeStart" : ""}${selectedEnd ? " rangeEnd" : ""}${inRange ? " inRange" : ""}`}
                onClick={() => selectDay(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="headerFieldGroup dateRangeFieldGroup" ref={containerRef}>
      <span className="headerFieldLabel">Date Range</span>
      <button
        type="button"
        className={`dateRangeTrigger${open ? " open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label="Open date range picker"
        aria-expanded={open}
      >
        <span className="dateRangeTriggerIcon">
          <CalendarIcon />
        </span>
        <span className={`dateRangeTriggerText${dateFrom ? "" : " placeholder"}`}>{getRangeLabel(dateFrom, dateTo)}</span>
      </button>
      {open ? (
        <div className="dateRangePopover">
          <div className="dateRangePopoverHeader">
            <button type="button" className="dateRangeNavBtn" onClick={() => setViewMonth((current) => addMonths(current, -1))}>
              {"<"}
            </button>
            <button type="button" className="dateRangeClearBtn" onClick={() => onRangeChange("", "")}>
              Clear
            </button>
            <button type="button" className="dateRangeNavBtn" onClick={() => setViewMonth((current) => addMonths(current, 1))}>
              {">"}
            </button>
          </div>
          <div className="dateRangeMonths">
            {renderMonth(viewMonth)}
            {renderMonth(addMonths(viewMonth, 1))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FiltersMenu({ dateFrom, dateTo, statusFilter, onRangeChange, onStatusChange, onClear }) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const activeCount = Number(Boolean(dateFrom || dateTo)) + Number(Boolean(statusFilter));

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div className="filtersMenu" ref={containerRef}>
      <button
        type="button"
        className={`filtersMenuButton${open ? " open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Open filters"
      >
        <span className="filtersMenuButtonIcon">
          <FilterIcon />
        </span>
        <span>Filters</span>
        {activeCount ? <span className="filtersMenuCount">{activeCount}</span> : null}
        <span className="filtersMenuCaret">
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <div className="filtersMenuPopover">
          <div className="filtersMenuHeader">
            <div className="filtersMenuTitle">Filters</div>
            <button type="button" className="filtersMenuClearBtn" onClick={onClear}>
              Clear all
            </button>
          </div>

          <DateRangeField dateFrom={dateFrom} dateTo={dateTo} onRangeChange={onRangeChange} />

          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Status</span>
            <select
              className="input headerDateInput filtersStatusSelect"
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value)}
              aria-label="Filter accruals by status"
            >
              <option value="">All</option>
              <option value="for confirmation">For Confirmation</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}

function getAccrualStatusMeta(status) {
  if (Number(status) === 2) return { label: "For Confirmation", className: "warning" };
  if (Number(status) === 1) {
    return {
      label: "Cancelled",
      className: "danger",
    };
  }

  return {
    label: "Confirmed",
    className: "confirmed",
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

export default function AllAccrualsPage({ currentUser, onEditAccrual }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState("for confirmation");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [infoSubmission, setInfoSubmission] = useState(null);
  const [notesSubmission, setNotesSubmission] = useState(null);
  const [cancelDialogSubmission, setCancelDialogSubmission] = useState(null);
  const [cancellationRemarks, setCancellationRemarks] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [confirmingAccrual, setConfirmingAccrual] = useState(false);
  const detailDialogStyle = {
    width: "min(1760px, calc(100vw - 20px))",
    maxWidth: "min(1760px, calc(100vw - 20px))",
  };

  const updateNotesCount = useCallback((submissionId, count) => {
    const updateCount = (submission) => submission?.id === submissionId
      ? { ...submission, notesCount: count }
      : submission;
    setSubmissions((current) => current.map(updateCount));
    setSelectedSubmission(updateCount);
    setNotesSubmission(updateCount);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const rows = await fetchAccrualSubmissions({ currentUser });
      setSubmissions(rows);
      return rows;
    } catch (error) {
      setErrorMessage(error.message || "Failed to load accrual submissions.");
      showToast(error.message || "Failed to load accrual submissions.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enrichedSubmissions = useMemo(() => (
    submissions.map((submission) => {
      const lines = submission.accrual_submission_lines || [];
      const totalGrossAmount = lines.reduce((sum, line) => sum + Number(line.gross_amount || 0), 0);

      return {
        ...submission,
        lineCount: lines.length,
        totalGrossAmount,
        notesCount: Number(submission.notesCount ?? submission.accrual_notes?.[0]?.count ?? 0),
      };
    })
  ), [submissions]);

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return enrichedSubmissions
      .filter((submission) => {
        const submittedDate = submission.created_at ? new Date(submission.created_at) : null;
        const submittedDateKey =
          submittedDate && !Number.isNaN(submittedDate.getTime())
            ? submittedDate.toLocaleDateString("en-CA")
            : "";
        const submissionStatus = getAccrualStatusMeta(submission.status).label.toLowerCase();

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
  }, [dateFrom, dateTo, enrichedSubmissions, search, statusFilter]);

  const submissionTotals = enrichedSubmissions.reduce(
    (totals, submission) => {
      totals.all += 1;
      if (Number(submission.status) === 0) totals.confirmed += 1;
      if (Number(submission.status) === 1) totals.cancelled += 1;
      if (Number(submission.status) === 2) totals.forConfirmation += 1;
      return totals;
    },
    { all: 0, confirmed: 0, cancelled: 0, forConfirmation: 0 }
  );

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
        formatDateTime(submission.created_at),
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

  const canEditForConfirmation = (submission) => Number(submission?.status) === 2 && canCancelSubmission(submission);

  const handleConfirmAccrual = async (submission) => {
    if (confirmingAccrual) return;
    setConfirmingAccrual(true);
    try {
      await confirmAccrualSubmission(submission.id);
      const refreshedRows = await loadData();
      const refreshedSubmission = refreshedRows?.find((row) => row.id === submission.id);
      setSelectedSubmission((current) => current?.id === submission.id
        ? (refreshedSubmission || { ...current, status: 0 })
        : current);
      showToast("Accrual confirmed successfully.", "success");
    } catch (error) {
      showToast(error.message || "Unable to confirm accrual.", "error");
    } finally {
      setConfirmingAccrual(false);
    }
  };
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
      const refreshedRows = await loadData();
      const refreshedSubmission = refreshedRows?.find((row) => row.id === cancelDialogSubmission.id);
      setSelectedSubmission((current) => current?.id === cancelDialogSubmission.id
        ? (refreshedSubmission || { ...current, status: 1, cancellation_remarks: trimmedRemarks })
        : current);
    } catch (error) {
      showToast(error.message || "Unable to cancel the accrual entry.", "error");
    } finally {
      setCancelSaving(false);
    }
  };

  return (
    <div className="contentPage managementPage allAccrualsPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">All Accruals</h1>
        </div>
        <div className="headerActions">
          <label className={`headerFieldGroup searchFieldGroup${searchFocused ? " focused" : ""}`}>
            <input
              className="input headerSearch"
              placeholder="Search control no., email, supplier..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label="Search accrual submissions"
            />
          </label>
          <div className="headerButtonGroup">
            <FiltersMenu
              dateFrom={dateFrom}
              dateTo={dateTo}
              statusFilter={statusFilter}
              onRangeChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              onStatusChange={setStatusFilter}
              onClear={() => {
                setDateFrom("");
                setDateTo("");
                setStatusFilter("");
              }}
            />
            <button type="button" className="tableActionBtn actionIconBtn" onClick={loadData}>
              <span className="actionBtnIcon" aria-hidden="true">
                <RefreshIcon />
              </span>
              Refresh
            </button>
            <button type="button" className="submitBtn actionIconBtn" onClick={handleExport}>
              <span className="actionBtnIcon" aria-hidden="true">
                <DownloadIcon />
              </span>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="accrualSummaryChips" role="group" aria-label="Filter accruals by status">
        <button type="button" className={`accrualSummaryChip total${!statusFilter ? " active" : ""}`} aria-pressed={!statusFilter} onClick={() => setStatusFilter("")}>
          <span>All</span><strong>{submissionTotals.all.toLocaleString()}</strong>
        </button>
        <button type="button" className={`accrualSummaryChip forConfirmation${statusFilter === "for confirmation" ? " active" : ""}`} aria-pressed={statusFilter === "for confirmation"} onClick={() => setStatusFilter("for confirmation")}>
          <span>For Confirmation</span><strong>{submissionTotals.forConfirmation.toLocaleString()}</strong>
        </button>
        <button type="button" className={`accrualSummaryChip confirmed${statusFilter === "confirmed" ? " active" : ""}`} aria-pressed={statusFilter === "confirmed"} onClick={() => setStatusFilter("confirmed")}>
          <span>Confirmed</span><strong>{submissionTotals.confirmed.toLocaleString()}</strong>
        </button>
        <button type="button" className={`accrualSummaryChip cancelled${statusFilter === "cancelled" ? " active" : ""}`} aria-pressed={statusFilter === "cancelled"} onClick={() => setStatusFilter("cancelled")}>
          <span>Cancelled</span><strong>{submissionTotals.cancelled.toLocaleString()}</strong>
        </button>
      </div>

      <div className="managementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={8} rows={8} />
        ) : (
          <MaintenanceTable
            columns={[
              {
                key: "notes",
                label: "Notes",
                sortable: false,
                hideHeader: true,
                className: "accrualNotesColumn",
                render: (row) => (
                  <button
                    type="button"
                    className="accrualNotesIconButton"
                    onClick={(event) => { event.stopPropagation(); setNotesSubmission(row); }}
                    onDoubleClick={(event) => event.stopPropagation()}
                    aria-label={`Notes for ${row.control_number}${row.notesCount ? `, ${row.notesCount} ${row.notesCount === 1 ? "note" : "notes"}` : ""}`}
                    title={`${row.notesCount || 0} ${row.notesCount === 1 ? "note" : "notes"}`}
                  >
                    <span className="accrualNotesIconWrap">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 4.5h14v15H5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <path d="M8 8h8M8 11h8M8 14h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                      {row.notesCount > 0 ? <span className="accrualNotesTableBadge" aria-hidden="true">{row.notesCount > 99 ? "99+" : row.notesCount}</span> : null}
                    </span>
                  </button>
                ),
              },
              { key: "control_number", label: "Control No." },
              { key: "created_at", label: "Timestamp", render: (row) => formatTableDateTime(row.created_at) },
              {
                key: "status",
                label: "Status",
                render: (row) => {
                  const statusMeta = getAccrualStatusMeta(row.status);
                  return <span className={`statusPill ${statusMeta.className}`}>{statusMeta.label}</span>;
                },
                sortValue: (row) => getAccrualStatusMeta(row.status).label,
              },
              { key: "company", label: "Company", className: "accrualCompanyColumn", render: (row) => row.company || "—" },
              { key: "supplier_name", label: "Supplier", className: "accrualSupplierColumn", render: (row) => formatSupplierName(row.supplier_name) },
              { key: "invoice_no", label: "Invoice No.", className: "accrualInvoiceColumn", render: (row) => row.invoice_no || "—" },
              { key: "totalGrossAmount", label: "Gross Amount", className: "accrualAmountColumn", render: (row) => formatAmount(row.totalGrossAmount) },
            ]}
            rows={filteredSubmissions}
            initialSort={{ key: "created_at", direction: "desc" }}
            showRowCount
            emptyText="No accrual submissions found."
            emptyHelperText="New and uploaded accruals appear as For Confirmation. Review the details, then confirm them individually."
            onRowClick={(row) => setSelectedSubmission(row)}
            onRowDoubleClick={(row) => setSelectedSubmission(row)}
            rowActions={(row) => (
              <div className="accrualRowActionGroup">
                {canEditForConfirmation(row) ? (
                  <>
                    <button type="button" className="tableActionBtn" disabled={confirmingAccrual} onClick={(event) => { event.stopPropagation(); if (onEditAccrual) onEditAccrual(row); else setEditingDraft(row); }} onDoubleClick={(event) => event.stopPropagation()}>
                      Edit
                    </button>
                    <button type="button" className="tableActionBtn" disabled={confirmingAccrual} onClick={(event) => { event.stopPropagation(); handleConfirmAccrual(row); }} onDoubleClick={(event) => event.stopPropagation()}>
                      {confirmingAccrual ? "Confirming..." : "Confirm"}
                    </button>
                  </>
                ) : null}
                {canCancelSubmission(row) ? (
                  <button type="button" className="tableActionBtn danger" onClick={() => openCancelDialog(row)} onDoubleClick={(event) => event.stopPropagation()}>
                    Cancel
                  </button>
                ) : null}
              </div>
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
              <div className="accrualDetailHeaderActions">
                <button
                  type="button"
                  className="tableActionBtn accrualInfoAction"
                  onClick={() => setInfoSubmission(selectedSubmission)}
                >
                  Info
                </button>
                <button
                  type="button"
                  className="tableActionBtn accrualNotesAction"
                  onClick={() => setNotesSubmission(selectedSubmission)}
                >
                  Notes{selectedSubmission.notesCount > 0 ? <span className="accrualNotesActionBadge">{selectedSubmission.notesCount > 99 ? "99+" : selectedSubmission.notesCount}</span> : null}
                </button>
                <button
                  type="button"
                  className="dialogClose"
                  onClick={() => setSelectedSubmission(null)}
                  aria-label="Close accrual details"
                >
                  x
                </button>
              </div>
            </div>

            <div className="dialogForm">
              <div className="accrualDetailGrid">
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Control Number</div>
                  <div className="accrualDetailValue">{selectedSubmission.control_number}</div>
                </div>
                <div className="accrualDetailCard">
                  <div className="summaryLabel">Submitted</div>
                  <div className="accrualDetailValue">{formatDateTime(selectedSubmission.created_at)}</div>
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
                {canEditForConfirmation(selectedSubmission) ? <>
                  <button type="button" className="tableActionBtn" disabled={confirmingAccrual} onClick={() => { if (onEditAccrual) onEditAccrual(selectedSubmission); else setEditingDraft(selectedSubmission); }}>Edit</button>
                  <button type="button" className="submitBtn" disabled={confirmingAccrual} onClick={() => handleConfirmAccrual(selectedSubmission)}>{confirmingAccrual ? "Confirming..." : "Confirm"}</button>
                </> : null}
                {canCancelSubmission(selectedSubmission) ? (
                  <button
                    type="button"
                    className="tableActionBtn danger"
                    onClick={() => openCancelDialog(selectedSubmission)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {editingDraft ? <DraftAccrualEditor
        key={editingDraft.id}
        submission={editingDraft}
        onClose={() => setEditingDraft(null)}
        onSaved={async () => {
          setEditingDraft(null);
          const refreshedRows = await loadData();
          const refreshedSubmission = refreshedRows?.find((row) => row.id === editingDraft.id);
          if (refreshedSubmission) setSelectedSubmission(refreshedSubmission);
          showToast("Accrual updated successfully.", "success");
        }}
      /> : null}
      {notesSubmission ? (
        <AccrualNotesDialog
          key={notesSubmission.id}
          submission={notesSubmission}
          onClose={() => setNotesSubmission(null)}
          onCountChange={updateNotesCount}
        />
      ) : null}

      {infoSubmission ? (
        <div className="modalOverlay maintenanceOverlay accrualInfoOverlay">
          <section className="modalContent maintenanceDialog accrualInfoDialog" role="dialog" aria-modal="true" aria-labelledby="accrualInfoTitle">
            <div className="dialogHeader">
              <div>
                <h2 className="modalTitle" id="accrualInfoTitle">Accrual Info</h2>
                <p className="dialogDescription">Activity dates for {infoSubmission.control_number}</p>
              </div>
              <button type="button" className="dialogClose" onClick={() => setInfoSubmission(null)} aria-label="Close accrual info">×</button>
            </div>
            <dl className="accrualInfoList">
              <div><dt>Submitted</dt><dd>{formatDateTime(infoSubmission.created_at)}</dd></div>
              <div><dt>Last updated</dt><dd>{infoSubmission.updated_at ? <>{formatDateTime(infoSubmission.updated_at)}<br />{infoSubmission.updated_by || "Unknown"}</> : "Not updated"}</dd></div>
              <div><dt>Confirmed</dt><dd>{Number(infoSubmission.status) === 0 ? <>{formatDateTime(infoSubmission.confirmed_at)}<br />{infoSubmission.confirmed_by || "Unknown"}</> : "Not confirmed"}</dd></div>
              <div><dt>Cancelled</dt><dd>{Number(infoSubmission.status) === 1 ? <>{formatDateTime(infoSubmission.cancelled_at)}<br />{infoSubmission.cancelled_by || "Unknown"}</> : "Not cancelled"}</dd></div>
            </dl>
          </section>
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
                  className="accrualCancelSecondaryBtn"
                  onClick={closeCancelDialog}
                  disabled={cancelSaving}
                >
                  Close
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
