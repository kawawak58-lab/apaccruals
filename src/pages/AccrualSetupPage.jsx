import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../lib/toast";
import {
  formatDisplayDate,
  formatDateInputValue,
  getAccrualSetup,
  getAccrualWindowStatus,
  saveAccrualSetup,
} from "../lib/AccrualSetup";

const defaultFormValues = {
  start_date: "",
  cutoff_date: "",
};

export default function AccrualSetupPage() {
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadSetup = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const setup = await getAccrualSetup();
      setFormValues({
        start_date: setup.start_date || "",
        cutoff_date: setup.cutoff_date || "",
      });
      setUpdatedAt(setup.updated_at || null);
    } catch (error) {
      setErrorMessage(error.message || "Unable to load accrual setup.");
      showToast(error.message || "Unable to load accrual setup.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  const windowStatus = useMemo(
    () => getAccrualWindowStatus(formValues, new Date()),
    [formValues]
  );

  const statusTone = windowStatus.isConfigured
    ? windowStatus.isOpen
      ? "success"
      : "warning"
    : "neutral";

  const handleSubmit = async () => {
    if (!formValues.start_date || !formValues.cutoff_date) {
      showToast("Start date and cutoff date are required.", "error");
      return;
    }

    if (formValues.cutoff_date < formValues.start_date) {
      showToast("Cutoff date cannot be earlier than the start date.", "error");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const savedSetup = await saveAccrualSetup(formValues);
      setFormValues({
        start_date: savedSetup.start_date || "",
        cutoff_date: savedSetup.cutoff_date || "",
      });
      setUpdatedAt(savedSetup.updated_at || null);
      showToast("Accrual setup saved successfully.", "success");
    } catch (error) {
      setErrorMessage(error.message || "Unable to save accrual setup.");
      showToast(error.message || "Unable to save accrual setup.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="contentPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">Accrual Setup</h1>
          <p className="pageSubtitle">
            Define the accrual filing window. New accrual creation is only available within the configured dates.
          </p>
        </div>
      </div>

      <div className="accrualSetupLayout">
        <section className="accrualSetupCard">
          <div className="accrualSetupCardHeader">
            <div>
              <h2 className="panelTitle">Accrual Filing Window</h2>
              <p className="pageSubtitle accrualSetupSubtitle">
                Users can create new accrual entries only when the current date is within this range.
              </p>
            </div>
            <div className={`accrualSetupStatusBadge ${statusTone}`}>
              {windowStatus.isConfigured
                ? windowStatus.isOpen
                  ? "Window Open"
                  : "Window Closed"
                : "Setup Required"}
            </div>
          </div>

          {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

          <div className="accrualSetupGrid">
            <label className="headerFieldGroup accrualSetupField">
              <span className="headerFieldLabel">Start Date</span>
              <input
                type="date"
                className="input"
                value={formValues.start_date}
                disabled={loading || saving}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, start_date: event.target.value }))
                }
              />
            </label>

            <label className="headerFieldGroup accrualSetupField">
              <span className="headerFieldLabel">Cutoff Date</span>
              <input
                type="date"
                className="input"
                value={formValues.cutoff_date}
                disabled={loading || saving}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, cutoff_date: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="accrualSetupCallout">
            <div className="accrualSetupCalloutLabel">Current Rule</div>
            <div className="accrualSetupCalloutText">{windowStatus.reason}</div>
          </div>

          <div className="accrualSetupMeta">
            <span>
              Today: <strong>{formatDisplayDate(formatDateInputValue(new Date()))}</strong>
            </span>
            <span>
              Last updated: <strong>{updatedAt ? new Date(updatedAt).toLocaleString() : "Not yet saved"}</strong>
            </span>
          </div>

          <div className="accrualSetupActions">
            <button
              type="button"
              className="tableActionBtn"
              onClick={loadSetup}
              disabled={loading || saving}
            >
              Refresh
            </button>
            <button
              type="button"
              className={`submitBtn${saving ? " isLoading" : ""}`}
              onClick={handleSubmit}
              disabled={loading || saving}
            >
              {saving ? "Saving..." : "Save Setup"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
