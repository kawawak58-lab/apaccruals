import React from "react";

function getDialogBadge(title) {
  const words = String(title || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "MD";
  }

  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

export default function MaintenanceDialog({
  open,
  title,
  description,
  fields,
  values,
  onChange,
  onClose,
  onSubmit,
  submitLabel = "Save",
  saving = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modalOverlay maintenanceOverlay">
      <div className="modalContent maintenanceDialog">
        <div className="dialogHeader maintenanceDialogHeader">
          <div className="dialogHeaderLead">
            <div className="dialogHeaderBadge">{getDialogBadge(title)}</div>
            <div className="dialogHeaderCopy">
              <h2 className="modalTitle">{title}</h2>
              {description ? <p className="dialogDescription">{description}</p> : null}
            </div>
          </div>
          <button type="button" className="dialogClose" onClick={onClose} aria-label="Close dialog">
            x
          </button>
        </div>

        <form
          className="dialogForm"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="dialogBodySection">
            <div className="dialogGrid">
              {fields.map((field) => {
                const value = values[field.name] ?? "";
                const commonProps = {
                  id: field.name,
                  value,
                  onChange: (event) => onChange(field.name, event.target.value),
                  placeholder: field.placeholder || "",
                  required: field.required,
                };

                return (
                  <label key={field.name} className={`dialogField${field.span === 2 ? " spanTwo" : ""}`}>
                    <span className="label">
                      {field.label}
                      {field.required ? <span className="required"> *</span> : null}
                    </span>

                    {field.type === "select" ? (
                      <select className="select" {...commonProps}>
                        <option value="">{field.emptyLabel || "Choose"}</option>
                        {(field.options || []).map((option) => (
                          <option
                            key={typeof option === "string" ? option : option.value}
                            value={typeof option === "string" ? option : option.value}
                          >
                            {typeof option === "string" ? option : option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea className="input" rows={4} {...commonProps} />
                    ) : (
                      <input className="input" type={field.type || "text"} {...commonProps} />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="dialogActions maintenanceDialogActions">
            <button type="button" className="removeBtn mutedBtn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submitBtn" disabled={saving}>
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
