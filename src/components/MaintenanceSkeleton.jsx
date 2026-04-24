import React from "react";

export default function MaintenanceSkeleton({ columns = 4, rows = 8, showPagination = true }) {
  return (
    <div className="maintenanceTableShell maintenanceSkeleton">
      <div className="maintenanceTableWrap">
        <table className="maintenanceTable">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={`head-${index}`}>
                  <div className="skeletonHeaderRow">
                    <span className="skeletonBlock skeletonHeaderCell" />
                    <span className="skeletonBlock skeletonSortCell" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {Array.from({ length: columns }).map((__, columnIndex) => (
                  <td key={`cell-${rowIndex}-${columnIndex}`}>
                    <div className="skeletonCellWrap">
                      <span
                        className={`skeletonBlock skeletonCell${columnIndex === 0 ? " short" : columnIndex === 1 ? " long" : ""}`}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="tablePagination">
          <div className="tablePaginationMeta">
            <span className="skeletonBlock skeletonMetaText" />
            <div className="skeletonMetaGroup">
              <span className="skeletonBlock skeletonMetaLabel" />
              <span className="skeletonBlock skeletonMetaSelect" />
            </div>
          </div>
          <div className="tablePaginationControls">
            <span className="skeletonBlock skeletonPageBtn" />
            <span className="skeletonBlock skeletonPageBtn" />
            <span className="skeletonBlock skeletonPageStatus" />
            <span className="skeletonBlock skeletonPageBtn" />
            <span className="skeletonBlock skeletonPageBtn" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
