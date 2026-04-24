import React, { useEffect, useMemo, useState } from "react";

export default function MaintenanceTable({
  columns,
  rows,
  rowKey = "id",
  emptyText,
  onEdit,
  onDelete,
  rowActions,
  onRowDoubleClick,
  deleteMessage,
  emptyHelperText,
  initialPageSize = 25,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [menuRowKey, setMenuRowKey] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [sortConfig, setSortConfig] = useState(() => {
    const firstSortableColumn = columns.find((column) => column.sortable !== false);
    return firstSortableColumn ? { key: firstSortableColumn.key, direction: "asc" } : null;
  });

  useEffect(() => {
    const firstSortableColumn = columns.find((column) => column.sortable !== false);
    if (!firstSortableColumn) {
      setSortConfig(null);
      return;
    }

    setSortConfig((current) => {
      if (current && columns.some((column) => column.key === current.key && column.sortable !== false)) {
        return current;
      }

      return { key: firstSortableColumn.key, direction: "asc" };
    });
  }, [columns]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) {
      return rows;
    }

    const activeColumn = columns.find((column) => column.key === sortConfig.key);
    if (!activeColumn) {
      return rows;
    }

    const getSortValue = activeColumn.sortValue || ((row) => row[activeColumn.key]);
    const directionFactor = sortConfig.direction === "asc" ? 1 : -1;

    return [...rows].sort((leftRow, rightRow) => {
      const leftValue = getSortValue(leftRow);
      const rightValue = getSortValue(rightRow);

      if (leftValue == null && rightValue == null) {
        return 0;
      }
      if (leftValue == null) {
        return 1;
      }
      if (rightValue == null) {
        return -1;
      }

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * directionFactor;
      }

      return String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" }) * directionFactor;
    });
  }, [columns, rows, sortConfig]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginationNeeded = totalRows > pageSize;

  useEffect(() => {
    setPage(1);
  }, [sortedRows, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [page, pageSize, sortedRows]);

  const rangeStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalRows === 0 ? 0 : Math.min(page * pageSize, totalRows);

  const toggleSort = (column) => {
    if (column.sortable === false) {
      return;
    }

    setSortConfig((current) => {
      if (!current || current.key !== column.key) {
        return { key: column.key, direction: "asc" };
      }

      return {
        key: column.key,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const getDeletePrompt = (row) => {
    if (typeof deleteMessage === "function") {
      return deleteMessage(row);
    }

    return deleteMessage || "Are you sure you want to delete this record?";
  };

  const confirmDelete = async () => {
    if (!confirmRow) {
      return;
    }

    const targetRow = confirmRow;
    setConfirmRow(null);
    await onDelete(targetRow);
  };

  return (
    <>
      <div className="maintenanceTableShell">
        <div className="maintenanceTableWrap">
          <table className="maintenanceTable">
            <thead>
              <tr>
                {columns.map((column) => {
                  const isSorted = sortConfig?.key === column.key;
                  const sortArrow = isSorted ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";

                  return (
                    <th key={column.key}>
                      <button
                        type="button"
                        className={`columnSortButton${column.sortable === false ? " disabled" : ""}`}
                        onClick={() => toggleSort(column)}
                        disabled={column.sortable === false}
                        aria-label={`Sort by ${column.label}`}
                      >
                        <span>{column.label}</span>
                        {column.sortable === false ? null : <span className="sortArrow">{sortArrow}</span>}
                      </button>
                    </th>
                  );
                })}
                {(onEdit || onDelete || rowActions) && <th className="actionsCol">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {totalRows === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="emptyTableCell">
                    <div className="emptyStateBlock">
                      <div>{emptyText}</div>
                      {emptyHelperText ? <div className="emptyStateHelper">{emptyHelperText}</div> : null}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIndex) => {
                  const openUpward = rowIndex >= Math.max(0, paginatedRows.length - 3);

                  return (
                  <tr
                    key={row[rowKey]}
                    className={onRowDoubleClick || onEdit ? "interactiveRow" : ""}
                    onDoubleClick={() => {
                      if (onRowDoubleClick) {
                        onRowDoubleClick(row);
                        return;
                      }

                      if (onEdit) {
                        onEdit(row);
                      }
                    }}
                  >
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "-"}</td>
                    ))}
                    {(onEdit || onDelete || rowActions) && (
                      <td className="tableActions">
                        {rowActions ? rowActions(row) : null}
                        {(onEdit || onDelete) ? (
                          <div className={`rowMenuWrap${openUpward ? " openUpward" : ""}`}>
                            <button
                              type="button"
                              className="rowMenuButton"
                              onClick={() => setMenuRowKey((current) => (current === row[rowKey] ? null : row[rowKey]))}
                              aria-label="Row actions"
                            >
                              ...
                            </button>
                            {menuRowKey === row[rowKey] ? (
                              <div className="rowMenu">
                                {onEdit ? (
                                  <button
                                    type="button"
                                    className="rowMenuItem"
                                    onClick={() => {
                                      setMenuRowKey(null);
                                      onEdit(row);
                                    }}
                                  >
                                    Edit
                                  </button>
                                ) : null}
                                {onDelete ? (
                                  <button
                                    type="button"
                                    className="rowMenuItem danger"
                                    onClick={() => {
                                      setMenuRowKey(null);
                                      setConfirmRow(row);
                                    }}
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {paginationNeeded ? (
          <div className="tablePagination">
            <div className="tablePaginationMeta">
              <span>
                Showing {rangeStart}-{rangeEnd} of {totalRows}
              </span>
              <label className="tablePaginationSize">
                <span>Rows</span>
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {[25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="tablePaginationControls">
              <button type="button" className="tablePageBtn" onClick={() => setPage(1)} disabled={page === 1}>
                First
              </button>
              <button type="button" className="tablePageBtn" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>
                Prev
              </button>
              <span className="tablePageStatus">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="tablePageBtn"
                onClick={() => setPage((current) => current + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
              <button type="button" className="tablePageBtn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                Last
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {confirmRow ? (
        <div className="modalOverlay maintenanceOverlay">
          <div className="modalContent maintenanceDialog confirmDialog">
            <div className="dialogHeader">
              <h2 className="modalTitle">Confirm Delete</h2>
              <button type="button" className="dialogClose" onClick={() => setConfirmRow(null)} aria-label="Close dialog">
                x
              </button>
            </div>
            <div className="dialogForm">
              <p className="confirmDialogText">{getDeletePrompt(confirmRow)}</p>
              <div className="dialogActions">
                <button type="button" className="removeBtn mutedBtn" onClick={() => setConfirmRow(null)}>
                  Cancel
                </button>
                <button type="button" className="submitBtn dangerBtn" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
