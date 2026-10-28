import React, { useMemo, useRef, useState } from "react";
import { buildTemplateCsv, downloadTextFile, parseUploadFile } from "../lib/maintenanceUploads";
import { useToast } from "../lib/toast";

function toTitleLabel(value) {
  if (value === "requester_email") {
    return "Email";
  }

  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatCurrency(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function UploadDataDialog({
  open,
  title,
  description,
  templateColumns,
  templateSampleRow,
  templateFileName,
  templateDownloadHandler,
  templateGuideDownloadHandler,
  expectedLabel,
  validateRows,
  onClose,
  onUpload,
  saving = false,
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const errorDialogStyle = {
    width: "min(1720px, calc(100vw - 20px))",
    maxWidth: "min(1720px, calc(100vw - 20px))",
  };
  const expandedPreviewDialogStyle = {
    width: "min(1800px, calc(100vw - 16px))",
    maxWidth: "min(1800px, calc(100vw - 16px))",
  };
  const [uploadStarting, setUploadStarting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [parsedRowCount, setParsedRowCount] = useState(0);
  const [missingColumns, setMissingColumns] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [hasRowErrors, setHasRowErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [expandedPreviewPage, setExpandedPreviewPage] = useState(1);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [errorPage, setErrorPage] = useState(1);
  const [uploadRecovery, setUploadRecovery] = useState(null);
  const [uploadMode, setUploadMode] = useState("upload");

  const previewColumns = useMemo(
    () => templateColumns.map((column) => ({ key: column, label: toTitleLabel(column) })),
    [templateColumns]
  );
  const previewPageSize = 10;
  const previewPageCount = Math.max(1, Math.ceil(previewRows.length / previewPageSize));
  const paginatedPreviewRows = useMemo(() => {
    const start = (previewPage - 1) * previewPageSize;
    return previewRows.slice(start, start + previewPageSize);
  }, [previewPage, previewRows]);
  const expandedPreviewPageSize = 25;
  const expandedPreviewPageCount = Math.max(1, Math.ceil(previewRows.length / expandedPreviewPageSize));
  const paginatedExpandedPreviewRows = useMemo(() => {
    const start = (expandedPreviewPage - 1) * expandedPreviewPageSize;
    return previewRows.slice(start, start + expandedPreviewPageSize);
  }, [expandedPreviewPage, previewRows]);
  const errorRows = useMemo(
    () => previewRows.filter((row) => (row.__errors || []).length > 0),
    [previewRows]
  );
  const errorPageSize = 10;
  const errorPageCount = Math.max(1, Math.ceil(errorRows.length / errorPageSize));
  const paginatedErrorRows = useMemo(() => {
    const start = (errorPage - 1) * errorPageSize;
    return errorRows.slice(start, start + errorPageSize);
  }, [errorPage, errorRows]);
  const hasValidPreview = previewRows.length > 0 && !hasRowErrors && missingColumns.length === 0;
  const isUploading = saving || uploadStarting;

  if (!open) {
    return null;
  }

  const resetState = () => {
    setSelectedFile(null);
    setPreviewRows([]);
    setValidRows([]);
    setParsedRowCount(0);
    setMissingColumns([]);
    setParsing(false);
    setHasRowErrors(false);
    setErrorMessage("");
    setResultMessage("");
    setUploadResult(null);
    setPreviewPage(1);
    setPreviewModalOpen(false);
    setExpandedPreviewPage(1);
    setErrorModalOpen(false);
    setResultModalOpen(false);
    setErrorPage(1);
    setUploadStarting(false);
    setUploadProgress({ current: 0, total: 0 });
    setUploadRecovery(null);
    setUploadMode("upload");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTemplateDownload = () => {
    if (templateDownloadHandler) {
      templateDownloadHandler();
      return;
    }

    const csv = buildTemplateCsv(templateColumns);
    downloadTextFile(templateFileName, csv);
  };

  const handleGuideDownload = () => {
    if (templateGuideDownloadHandler) {
      templateGuideDownloadHandler();
      return;
    }

    const guideFileName = templateFileName.replace(/(\.[^.]+)$/, "-guide$1");
    const csv = buildTemplateCsv(templateColumns, templateSampleRow);
    downloadTextFile(guideFileName, csv);
  };

  const handleFileChange = async (file) => {
    setErrorMessage("");
    setResultMessage("");
    setSelectedFile(file || null);
    setPreviewRows([]);
    setValidRows([]);
    setParsedRowCount(0);
    setMissingColumns([]);
    setHasRowErrors(false);
    setPreviewPage(1);
    setPreviewModalOpen(false);
    setExpandedPreviewPage(1);
    setErrorModalOpen(false);
    setResultModalOpen(false);
    setUploadResult(null);
    setErrorPage(1);
    setUploadRecovery(null);

    if (!file) {
      return;
    }

    setParsing(true);

    try {
      const { headers, rows } = await parseUploadFile(file);

      const nextMissingColumns = templateColumns.filter((column) => !headers.includes(column));
      if (nextMissingColumns.length > 0) {
        setMissingColumns(nextMissingColumns);
        setErrorMessage(`Missing required column(s): ${nextMissingColumns.join(", ")}`);
        showToast(`Missing required column(s): ${nextMissingColumns.join(", ")}`, "error");
        return;
      }

      const sanitizedRows = rows
        .map((row) =>
          templateColumns.reduce((next, column) => {
            next[column] = (row[column] || "").trim();
            return next;
          }, {})
        )
        .filter((row) => templateColumns.some((column) => row[column]))
        .map((row, index) => ({
          ...row,
          __rowNumber: index + 2,
          __errors: [],
        }));

      setParsedRowCount(sanitizedRows.length);

      if (sanitizedRows.length === 0) {
        throw new Error("No upload rows were found after the header.");
      }

      const validatedRows = validateRows ? await validateRows(sanitizedRows) : sanitizedRows;
      const rowsWithErrors = validatedRows.filter((row) => (row.__errors || []).length > 0);
      const rowsWithoutErrors = validatedRows.filter((row) => (row.__errors || []).length === 0);

      setPreviewRows(validatedRows);
      setValidRows(rowsWithoutErrors);
      setHasRowErrors(rowsWithErrors.length > 0);
      setPreviewPage(1);
      setExpandedPreviewPage(1);
      setErrorPage(1);

      if (rowsWithErrors.length > 0) {
        setErrorMessage(`${rowsWithErrors.length} ${expectedLabel} row(s) need attention before upload.`);
        showToast(`${rowsWithErrors.length} ${expectedLabel} row(s) need attention before upload.`, "error");
      }
    } catch (error) {
      setErrorMessage(error.message || "Upload failed.");
      showToast(error.message || "Upload failed.", "error");
    } finally {
      setParsing(false);
    }
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] || null;
    await handleFileChange(file);
  };

  const runUpload = async (overrideOptions = {}) => {
    setErrorMessage("");
    setResultMessage("");

    if (!selectedFile) {
      setErrorMessage("Please select a CSV or Excel file to upload.");
      showToast("Please select a CSV or Excel file to upload.", "error");
      return;
    }

    if (previewRows.length === 0) {
      setErrorMessage("Please wait for the file preview to finish loading.");
      showToast("Please wait for the file preview to finish loading.", "error");
      return;
    }

    if (hasRowErrors || missingColumns.length > 0) {
      setErrorMessage("Fix the file errors first before uploading.");
      showToast("Fix the file errors first before uploading.", "error");
      return;
    }

    try {
      setUploadStarting(true);
      setUploadRecovery(null);
      setUploadMode(overrideOptions.recoveryAction === "rollback" ? "rollback" : "upload");
      const startIndex = overrideOptions.startIndex || 0;
      setUploadProgress({ current: startIndex, total: validRows.length });
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.setTimeout(resolve, 0);
        });
      });

      const uploadResultPayload = await onUpload(validRows, {
        onProgress: ({ inserted, total }) => {
          setUploadProgress({
            current: inserted,
            total: total || validRows.length,
          });
        },
        startIndex,
        recoveryAction: overrideOptions.recoveryAction,
        rollbackState: overrideOptions.rollbackState,
      });
      if (overrideOptions.recoveryAction === "rollback") {
        const rolledBackCount = uploadResultPayload?.rollbackCount || uploadRecovery?.rollbackState?.ids?.length || 0;
        const rollbackMessage = `${rolledBackCount} uploaded ${expectedLabel} row(s) were rolled back successfully.`;
        setResultMessage(rollbackMessage);
        setErrorMessage("");
        setUploadRecovery(null);
        showToast(rollbackMessage, "success");
        return;
      }

      const successMessage = `${validRows.length} ${expectedLabel} uploaded successfully.`;
      setResultMessage(successMessage);
      showToast(successMessage, "success");

      if (uploadResultPayload?.controlNumbers?.length) {
        setUploadResult({
          ...uploadResultPayload,
          successMessage,
        });
        setResultModalOpen(true);
      } else {
        window.setTimeout(() => {
          handleClose();
        }, 700);
      }
    } catch (error) {
      setErrorMessage(error.message || "Upload failed.");
      setUploadRecovery(error.uploadRecovery || null);
      showToast(error.message || "Upload failed.", "error");
    } finally {
      setUploadStarting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await runUpload();
  };

  return (
    <>
      {!errorModalOpen && !resultModalOpen && !previewModalOpen ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog uploadDialog">
        {isUploading ? (
          <div className="uploadMotionOverlay" aria-hidden="true">
            <div className="uploadCarLoader">
              <span>
                <span />
                <span />
                <span />
                <span />
              </span>
              <div className="uploadCarBase">
                <span />
                <div className="uploadCarFace" />
              </div>
            </div>
            <div className="uploadLongFazers">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="uploadMotionText">
              <div>{uploadMode === "rollback" ? "Rolling back saved rows..." : "Uploading data..."}</div>
              <div className="uploadMotionMeta">
                {uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()} row(s)
              </div>
            </div>
          </div>
        ) : null}

        <div className="dialogHeader">
          <div className="uploadDialogHeaderCopy">
            <h2 className="modalTitle">{title}</h2>
            <p className="uploadDialogHeaderText">{description}</p>
          </div>
          <button type="button" className="dialogClose" onClick={handleClose} aria-label="Close dialog">
            x
          </button>
        </div>

        <form className="dialogForm" onSubmit={handleSubmit}>
          <div className="uploadDialogLayout">
            <div className="uploadDialogSidebar">
              <div className="uploadStepBlock">
                <div className="uploadStepTitle">1. Download template</div>
                <button type="button" className="tableActionBtn uploadFullButton" onClick={handleTemplateDownload}>
                  Download template
                </button>
                <p className="uploadTemplateHint">Blank file, ready for your data.</p>
              </div>

              <div className="uploadStepBlock">
                <div className="uploadStepTitle">2. Guide template</div>
                <button type="button" className="tableActionBtn uploadFullButton" onClick={handleGuideDownload}>
                  Download guide template
                </button>
                <p className="uploadTemplateHint uploadGuideNotice">
                  <span className="uploadGuideNoticeIcon" aria-hidden="true">!</span>
                  <span>Example rows show how to fill each column. <strong>Do not upload the examples.</strong></span>
                </p>
              </div>

              <div className="uploadStepBlock">
                <div className="uploadStepTitle">3. Upload your file</div>
                <div
                  className={`uploadDropZone${parsing ? " isBusy" : ""}`}
                  onClick={openFilePicker}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload CSV or Excel file"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFilePicker();
                    }
                  }}
                >
                  <div className="uploadDropZoneIcon" aria-hidden="true">
                    <span>XLSX</span>
                  </div>
                  <div className="uploadDropZoneTitle">Choose file or drag here</div>
                  <div className="uploadDropZoneText">CSV or XLSX files</div>
                </div>
                <input
                  ref={fileInputRef}
                  className="uploadHiddenInput"
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                />
                {selectedFile ? (
                  <div className="uploadFileBadge">
                    <span className="uploadFileBadgeName">{selectedFile.name}</span>
                    <span className="uploadFileBadgeMeta">
                      {parsedRowCount > 0 ? `${parsedRowCount} row(s)` : missingColumns.length > 0 ? "Needs fixes" : "Checking file"}
                    </span>
                  </div>
                ) : null}
                <p className="uploadHint">Use the downloaded template, then upload the completed CSV or Excel file here.</p>
              </div>

              {missingColumns.length > 0 ? (
                <div className="inlineError">Missing required column(s): {missingColumns.join(", ")}</div>
              ) : errorMessage ? (
                hasRowErrors && errorRows.length > 0 ? (
                  <button
                    type="button"
                    className="inlineError errorSummaryButton"
                    onClick={() => setErrorModalOpen(true)}
                  >
                    {errorMessage}
                  </button>
                ) : (
                  <div className="inlineError">{errorMessage}</div>
                )
              ) : null}
              {resultMessage ? <div className="inlineSuccess">{resultMessage}</div> : null}
              {uploadRecovery ? (
                <div className="uploadRecoveryCard">
                  <div className="uploadRecoveryTitle">Upload interrupted</div>
                  <div className="uploadRecoveryText">
                    {uploadRecovery.insertedCount > 0
                      ? `${uploadRecovery.insertedCount.toLocaleString()} row(s) were already saved before the interruption.`
                      : "No rows were confirmed as saved before the interruption."}
                  </div>
                  <div className="uploadRecoveryText">
                    {uploadRecovery.remainingCount > 0
                      ? `${uploadRecovery.remainingCount.toLocaleString()} row(s) are still waiting to be uploaded.`
                      : "There are no remaining rows to resume."}
                  </div>
                  <div className="uploadRecoveryActions">
                    {uploadRecovery.canResume ? (
                      <button
                        type="button"
                        className="tableActionBtn"
                        onClick={() => runUpload({ startIndex: uploadRecovery.resumeFrom })}
                        disabled={isUploading}
                      >
                        Resume upload
                      </button>
                    ) : null}
                    {uploadRecovery.insertedCount === 0 ? (
                      <button
                        type="button"
                        className="tableActionBtn"
                        onClick={() => runUpload({ startIndex: 0 })}
                        disabled={isUploading}
                      >
                        Retry from start
                      </button>
                    ) : null}
                    {uploadRecovery.rollbackSupported && uploadRecovery.rollbackState ? (
                      <button
                        type="button"
                        className="tableActionBtn danger"
                        onClick={() =>
                          runUpload({
                            recoveryAction: "rollback",
                            rollbackState: uploadRecovery.rollbackState,
                          })
                        }
                        disabled={isUploading}
                      >
                        Roll back saved rows
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="uploadPreviewPanel">
              <div className="uploadPreviewMeta">
                <div className="uploadPreviewTitle">File preview</div>
                {previewRows.length > 0 ? (
                  <div className="uploadPreviewMetaActions">
                    <span className="uploadPreviewBadge">{previewRows.length} rows detected</span>
                    {errorRows.length > 0 ? (
                      <button
                        type="button"
                        className="uploadReviewErrorsBtn"
                        onClick={() => setErrorModalOpen(true)}
                      >
                        Review {errorRows.length} {errorRows.length === 1 ? "error" : "errors"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="uploadPreviewExpandBtn"
                      onClick={() => setPreviewModalOpen(true)}
                      aria-label="Expand file preview"
                      title="Expand preview"
                    >
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M7 3H3v4M13 3h4v4M17 13v4h-4M3 13v4h4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="uploadPreviewTableWrap">
                {parsing ? (
                  <div className="uploadPreviewLoading">
                    <div className="uploadPreviewLoadingSpinner" aria-hidden="true" />
                    <div className="uploadPreviewLoadingTitle">Checking file...</div>
                    <div className="uploadPreviewLoadingText">Parsing rows and validating required columns.</div>
                  </div>
                ) : previewRows.length > 0 ? (
                  <table className="uploadPreviewTable">
                    <thead>
                      <tr>
                        {previewColumns.map((column) => (
                          <th key={column.key}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPreviewRows.map((row) => (
                        <tr key={row.__rowNumber} className={(row.__errors || []).length > 0 ? "hasErrors" : ""}>
                          {previewColumns.map((column) => (
                            <td key={`${row.__rowNumber}-${column.key}`}>{row[column.key] || "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="uploadPreviewEmpty">
                    <div className="uploadPreviewEmptyIcon" aria-hidden="true">
                      <span>XLSX</span>
                    </div>
                    <div className="uploadPreviewEmptyTitle">No file selected yet</div>
                    <div className="uploadPreviewEmptyText">
                      Upload a CSV or Excel file on the left to preview parsed rows before uploading.
                    </div>
                  </div>
                )}
              </div>
              {previewRows.length > previewPageSize ? (
                <div className="uploadPreviewPagination">
                  <div className="uploadPreviewPaginationMeta">
                    Showing {(previewPage - 1) * previewPageSize + 1}-
                    {Math.min(previewPage * previewPageSize, previewRows.length)} of {previewRows.length}
                  </div>
                  <div className="uploadPreviewPaginationControls">
                    <button
                      type="button"
                      className="tablePageBtn"
                      disabled={previewPage === 1}
                      onClick={() => setPreviewPage((current) => Math.max(1, current - 1))}
                    >
                      Prev
                    </button>
                    <span className="tablePageStatus">
                      Page {previewPage} of {previewPageCount}
                    </span>
                    <button
                      type="button"
                      className="tablePageBtn"
                      disabled={previewPage === previewPageCount}
                      onClick={() => setPreviewPage((current) => Math.min(previewPageCount, current + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="dialogActions">
            <button type="button" className="tableActionBtn mutedBtn" onClick={handleClose} disabled={isUploading}>
              Close
            </button>
            <button type="submit" className={`submitBtn${isUploading || parsing ? " isLoading" : ""}`} disabled={isUploading || parsing || !hasValidPreview}>
              {isUploading ? (
                <>
                  <span className="buttonSpinner" aria-hidden="true" />
                  Uploading...
                </>
              ) : parsing ? (
                <>
                  <span className="buttonSpinner" aria-hidden="true" />
                  Checking File...
                </>
              ) : (
                "Upload data"
              )}
            </button>
          </div>
        </form>
          </div>
        </div>
      ) : null}

      {errorModalOpen ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog uploadErrorDialog" style={errorDialogStyle}>
          <div className="dialogHeader">
            <div className="uploadDialogHeaderCopy">
              <h2 className="modalTitle">Rows Needing Attention</h2>
              <p className="uploadDialogHeaderText">
                Review the invalid rows and their errors before uploading again.
              </p>
            </div>
            <button type="button" className="dialogClose" onClick={() => setErrorModalOpen(false)} aria-label="Close error review">
              x
            </button>
          </div>

          <div className="dialogForm">
            <div className="uploadPreviewMeta">
              <div className="uploadPreviewTitle">Invalid rows</div>
              <span className="uploadPreviewBadge">{errorRows.length} rows with errors</span>
            </div>

            <div className="uploadErrorTableWrap">
              <table className="uploadPreviewTable uploadErrorTable">
                <thead>
                  <tr>
                    <th>Row</th>
                    {previewColumns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedErrorRows.map((row) => (
                    <tr key={`error-${row.__rowNumber}`} className="hasErrors">
                      <td>{row.__rowNumber}</td>
                      {previewColumns.map((column) => (
                        <td key={`error-${row.__rowNumber}-${column.key}`}>{row[column.key] || "-"}</td>
                      ))}
                      <td>{(row.__errors || []).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorRows.length > errorPageSize ? (
              <div className="uploadPreviewPagination">
                <div className="uploadPreviewPaginationMeta">
                  Showing {(errorPage - 1) * errorPageSize + 1}-{Math.min(errorPage * errorPageSize, errorRows.length)} of {errorRows.length}
                </div>
                <div className="uploadPreviewPaginationControls">
                  <button
                    type="button"
                    className="tablePageBtn"
                    disabled={errorPage === 1}
                    onClick={() => setErrorPage((current) => Math.max(1, current - 1))}
                  >
                    Prev
                  </button>
                  <span className="tablePageStatus">
                    Page {errorPage} of {errorPageCount}
                  </span>
                  <button
                    type="button"
                    className="tablePageBtn"
                    disabled={errorPage === errorPageCount}
                    onClick={() => setErrorPage((current) => Math.min(errorPageCount, current + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            <div className="dialogActions">
              <button type="button" className="submitBtn" onClick={() => setErrorModalOpen(false)}>
                Back to Upload
              </button>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {resultModalOpen ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog uploadResultDialog">
            <div className="dialogHeader">
              <div className="uploadDialogHeaderCopy">
                <h2 className="modalTitle">Upload Complete</h2>
                <p className="uploadDialogHeaderText">
                  Review the generated control number{uploadResult?.controlNumbers?.length === 1 ? "" : "s"} for this accrual upload.
                </p>
              </div>
              <button
                type="button"
                className="dialogClose"
                onClick={handleClose}
                aria-label="Close upload result"
              >
                x
              </button>
            </div>

            <div className="dialogForm uploadResultBody">
              <div className="uploadResultHero">
                <div className="uploadResultHeroTitle">{uploadResult?.successMessage || resultMessage}</div>
                <div className="uploadResultHeroMeta">
                  {(uploadResult?.controlNumbers?.length || 0)} control number
                  {(uploadResult?.controlNumbers?.length || 0) === 1 ? "" : "s"} created.
                </div>
              </div>

              <div className="uploadResultListCard">
                <div className="uploadPreviewMeta">
                  <div className="uploadPreviewTitle">Generated control numbers</div>
                  <span className="uploadPreviewBadge">
                    {uploadResult?.controlNumbers?.length || 0} total
                  </span>
                </div>

                <div className="uploadResultTableWrap">
                  <table className="uploadResultTable">
                    <thead>
                      <tr>
                        <th>Control Number</th>
                        <th>Company</th>
                        <th>Supplier</th>
                        <th>Invoice No.</th>
                        <th>Gross Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(uploadResult?.submissions || []).map((submission) => (
                        <tr key={submission.controlNumber}>
                          <td className="uploadResultTableControl">{submission.controlNumber}</td>
                          <td>{submission.company || "-"}</td>
                          <td>{submission.supplier || "-"}</td>
                          <td>{submission.invoiceNo || "-"}</td>
                          <td className="uploadResultTableAmount">
                            {formatCurrency(submission.grossAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dialogActions">
                <button type="button" className="submitBtn" onClick={handleClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewModalOpen ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog uploadPreviewDialog" style={expandedPreviewDialogStyle}>
            <div className="dialogHeader">
              <div className="uploadDialogHeaderCopy">
                <h2 className="modalTitle">Expanded File Preview</h2>
                <p className="uploadDialogHeaderText">
                  Review more parsed rows in a larger table view before uploading.
                </p>
              </div>
              <button
                type="button"
                className="dialogClose"
                onClick={() => setPreviewModalOpen(false)}
                aria-label="Close expanded preview"
              >
                x
              </button>
            </div>

            <div className="dialogForm">
              <div className="uploadPreviewMeta">
                <div className="uploadPreviewTitle">File preview</div>
                <span className="uploadPreviewBadge">{previewRows.length} rows detected</span>
              </div>

              <div className="uploadExpandedTableWrap">
                <table className="uploadPreviewTable uploadExpandedTable">
                  <thead>
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={`expanded-${column.key}`}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpandedPreviewRows.map((row) => (
                      <tr key={`expanded-row-${row.__rowNumber}`} className={(row.__errors || []).length > 0 ? "hasErrors" : ""}>
                        {previewColumns.map((column) => (
                          <td key={`expanded-${row.__rowNumber}-${column.key}`}>{row[column.key] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > expandedPreviewPageSize ? (
                <div className="uploadPreviewPagination">
                  <div className="uploadPreviewPaginationMeta">
                    Showing {(expandedPreviewPage - 1) * expandedPreviewPageSize + 1}-
                    {Math.min(expandedPreviewPage * expandedPreviewPageSize, previewRows.length)} of {previewRows.length}
                  </div>
                  <div className="uploadPreviewPaginationControls">
                    <button
                      type="button"
                      className="tablePageBtn"
                      disabled={expandedPreviewPage === 1}
                      onClick={() => setExpandedPreviewPage((current) => Math.max(1, current - 1))}
                    >
                      Prev
                    </button>
                    <span className="tablePageStatus">
                      Page {expandedPreviewPage} of {expandedPreviewPageCount}
                    </span>
                    <button
                      type="button"
                      className="tablePageBtn"
                      disabled={expandedPreviewPage === expandedPreviewPageCount}
                      onClick={() => setExpandedPreviewPage((current) => Math.min(expandedPreviewPageCount, current + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="dialogActions">
                <button type="button" className="submitBtn" onClick={() => setPreviewModalOpen(false)}>
                  Back to Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
