import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../lib/toast";
import {
  getCurrentControlNumber,
  getNextControlNumberPreview,
  parseControlNumber,
  updateCurrentControlNumber,
} from "../lib/controlNumberSetup";

export default function ControlNumberSetupPage({ currentUser }) {
  const { showToast } = useToast();
  const [currentControlNumber, setCurrentControlNumber] = useState("");
  const [draftSequenceValue, setDraftSequenceValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const hasAccess = Boolean(currentUser?.can_update_control_number);

  const loadCurrentControlNumber = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const value = await getCurrentControlNumber();
      const parsed = parseControlNumber(value);
      setCurrentControlNumber(value);
      setDraftSequenceValue(parsed ? String(parsed.lastValue).padStart(parsed.padding, "0") : "");
      setUpdatedAt(new Date().toISOString());
    } catch (error) {
      setErrorMessage(error.message || "Unable to load current control number.");
      showToast(error.message || "Unable to load current control number.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    loadCurrentControlNumber();
  }, [hasAccess, loadCurrentControlNumber]);

  const currentParsed = useMemo(() => parseControlNumber(currentControlNumber), [currentControlNumber]);
  const normalizedSequenceValue = useMemo(
    () => String(draftSequenceValue || "").replace(/\D/g, ""),
    [draftSequenceValue]
  );
  const draftControlNumber = useMemo(() => {
    if (!currentParsed || !normalizedSequenceValue) {
      return "";
    }
    return `${currentParsed.prefix}${normalizedSequenceValue}`;
  }, [currentParsed, normalizedSequenceValue]);
  const nextPreview = useMemo(() => getNextControlNumberPreview(draftControlNumber), [draftControlNumber]);
  const hasChanges = useMemo(() => {
    if (!currentParsed) {
      return false;
    }
    return normalizedSequenceValue !== String(currentParsed.lastValue).padStart(currentParsed.padding, "0");
  }, [currentParsed, normalizedSequenceValue]);

  const handleSave = async () => {
    if (!hasAccess) {
      showToast("You do not have access to update the control number.", "error");
      return;
    }

    if (!currentParsed) {
      showToast("Current control number is invalid.", "error");
      return;
    }

    if (!normalizedSequenceValue) {
      showToast("Control number value is required.", "error");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const savedValue = await updateCurrentControlNumber(`${currentParsed.prefix}${normalizedSequenceValue}`);
      const savedParsed = parseControlNumber(savedValue);
      setCurrentControlNumber(savedValue);
      setDraftSequenceValue(savedParsed ? String(savedParsed.lastValue).padStart(savedParsed.padding, "0") : "");
      setUpdatedAt(new Date().toISOString());
      setSuccessMessage("Control number updated successfully.");
      showToast("Control number updated successfully.", "success");
    } catch (error) {
      setErrorMessage(error.message || "Unable to update control number.");
      showToast(error.message || "Unable to update control number.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && hasAccess) {
    return (
      <div className="contentPage">
        <div className="pageIntro">
          <div>
            <h1 className="pageTitle">Control Number Setup</h1>
            <p className="pageSubtitle">
              Update the current control number used as the source value for the next generated accrual control number.
            </p>
          </div>
        </div>

        <div className="accrualSetupLayout">
          <section className="accrualSetupCard controlNumberSkeletonCard">
            <div className="accrualSetupCardHeader">
              <div className="controlNumberSkeletonHeader">
                <span className="skeletonBlock controlNumberSkeletonTitle" />
                <span className="skeletonBlock controlNumberSkeletonSubtitle" />
              </div>
              <span className="skeletonBlock controlNumberSkeletonBadge" />
            </div>

            <div className="accrualSetupGrid">
              <div className="controlNumberSkeletonField">
                <span className="skeletonBlock controlNumberSkeletonLabel" />
                <span className="skeletonBlock controlNumberSkeletonInput" />
              </div>
              <div className="controlNumberSkeletonField">
                <span className="skeletonBlock controlNumberSkeletonLabel" />
                <span className="skeletonBlock controlNumberSkeletonInput" />
              </div>
            </div>

            <div className="accrualSetupCallout">
              <span className="skeletonBlock controlNumberSkeletonCalloutLabel" />
              <span className="skeletonBlock controlNumberSkeletonCalloutText" />
            </div>

            <div className="accrualSetupMeta">
              <span className="skeletonBlock controlNumberSkeletonMeta" />
              <span className="skeletonBlock controlNumberSkeletonMeta" />
            </div>

            <div className="accrualSetupActions">
              <span className="skeletonBlock controlNumberSkeletonButton secondary" />
              <span className="skeletonBlock controlNumberSkeletonButton" />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="contentPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">Control Number Setup</h1>
          <p className="pageSubtitle">
            Update the current control number used as the source value for the next generated accrual control number.
          </p>
        </div>
      </div>

      <div className="accrualSetupLayout">
        <section className="accrualSetupCard">
          {!hasAccess ? (
            <div className="inlineError">You do not have access to update the control number.</div>
          ) : null}

          <div className="accrualSetupCardHeader">
            <div>
              <h2 className="panelTitle">Current Control Number</h2>
              <p className="pageSubtitle accrualSetupSubtitle">
                Set the latest saved control number. The next generation will continue from this value.
              </p>
            </div>
            <div className={`accrualSetupStatusBadge ${hasChanges ? "warning" : "neutral"}`}>
              {hasChanges ? "Unsaved Changes" : "In Sync"}
            </div>
          </div>

          {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}
          {successMessage ? <div className="inlineSuccess">{successMessage}</div> : null}

          <div className="accrualSetupGrid">
            <label className="headerFieldGroup accrualSetupField">
              <span className="headerFieldLabel">Saved Control Number</span>
              <input type="text" className="input" value={currentControlNumber} disabled />
            </label>

            <label className="headerFieldGroup accrualSetupField">
              <span className="headerFieldLabel">Update Control Number</span>
              <input
                type="text"
                className="input"
                value={normalizedSequenceValue}
                disabled={!hasAccess || loading || saving}
                onChange={(event) => setDraftSequenceValue(event.target.value)}
                placeholder="000123"
              />
            </label>
          </div>

          <div className="accrualSetupCallout">
            <div className="accrualSetupCalloutLabel">Next Generated Value</div>
            <div className="accrualSetupCalloutText">
              {nextPreview || "Enter the numeric value only, like 000123."}
            </div>
          </div>

          <div className="accrualSetupMeta">
            <span>
              Prefix: <strong>{currentParsed?.prefix || "-"}</strong>
            </span>
            <span>
              Last checked: <strong>{updatedAt ? new Date(updatedAt).toLocaleString() : "Not yet loaded"}</strong>
            </span>
          </div>

          <div className="accrualSetupActions">
            <button
              type="button"
              className="tableActionBtn"
              onClick={loadCurrentControlNumber}
              disabled={!hasAccess || loading || saving}
            >
              Refresh
            </button>
            <button
              type="button"
              className={`submitBtn${saving ? " isLoading" : ""}`}
              onClick={handleSave}
              disabled={!hasAccess || loading || saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save Control Number"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
