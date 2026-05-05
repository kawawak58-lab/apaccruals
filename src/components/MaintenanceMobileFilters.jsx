import React, { useEffect, useRef, useState } from "react";

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

export default function MaintenanceMobileFilters({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  companyFilter,
  onCompanyFilterChange,
  companyOptions = [],
  companyAriaLabel = "Filter by company",
  companyAllLabel = "All Companies",
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const activeCount = Number(Boolean(search.trim())) + Number(Boolean(companyFilter));

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
    <div className="maintenanceMobileFilters filtersMenu" ref={containerRef}>
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
            <button
              type="button"
              className="filtersMenuClearBtn"
              onClick={() => {
                onSearchChange("");
                if (onCompanyFilterChange) {
                  onCompanyFilterChange("");
                }
              }}
            >
              Clear all
            </button>
          </div>

          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Search</span>
            <input
              className="input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label={searchAriaLabel}
            />
          </label>

          {onCompanyFilterChange ? (
            <label className="headerFieldGroup">
              <span className="headerFieldLabel">Company</span>
              <select
                className="select"
                value={companyFilter}
                onChange={(event) => onCompanyFilterChange(event.target.value)}
                aria-label={companyAriaLabel}
              >
                <option value="">{companyAllLabel}</option>
                {companyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
