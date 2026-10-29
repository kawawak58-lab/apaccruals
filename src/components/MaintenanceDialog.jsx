import React from "react";

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
      <div className="modalContent maintenanceDialog maintenanceEntryDialog">
        <div className="dialogHeader maintenanceDialogHeader">
          <div className="dialogHeaderLead">
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
                const FieldWrapper = field.type === "checkboxGroup" ? "div" : "label";
                const commonProps = {
                  id: field.name,
                  value: field.type === "checkbox" ? undefined : value,
                  checked: field.type === "checkbox" ? Boolean(value) : undefined,
                  onChange: (event) => onChange(field.name, field.type === "checkbox" ? event.target.checked : event.target.value),
                  placeholder: field.placeholder || "",
                  required: field.required,
                };

                return (
                  <FieldWrapper key={field.name} className={`dialogField${field.span === 2 ? " spanTwo" : ""}`}>
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
                    ) : field.type === "checkboxGroup" ? (
                      <div className="maintenanceCheckboxGroup">
                        {(field.options || []).map((option) => (
                          <label key={option.value} className="maintenanceCheckboxOption">
                            <input
                              type="checkbox"
                              checked={(Array.isArray(value) ? value : []).includes(option.value)}
                              onChange={(event) => {
                                const selected = new Set(Array.isArray(value) ? value : []);
                                if (event.target.checked) selected.add(option.value);
                                else selected.delete(option.value);
                                onChange(field.name, Array.from(selected));
                              }}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    ) : field.type === "checkbox" ? (
                      <input type="checkbox" {...commonProps} />
                    ) : field.type === "textarea" ? (
                      <textarea className="input" rows={4} {...commonProps} />
                    ) : (
                      <input className="input" type={field.type || "text"} {...commonProps} />
                    )}
                  </FieldWrapper>
                );
              })}
            </div>
          </div>

          <div className="dialogActions maintenanceDialogActions">
            <button type="button" className="tableActionBtn mutedBtn" onClick={onClose}>
              Close
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
