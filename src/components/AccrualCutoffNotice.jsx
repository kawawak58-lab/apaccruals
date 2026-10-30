import React, { useEffect, useState } from "react";
import { formatDisplayDate, getAccrualSetup, getDaysUntilAccrualCutoff } from "../lib/AccrualSetup";

export default function AccrualCutoffNotice({ cutoffDate: providedCutoffDate }) {
  const [loadedCutoffDate, setLoadedCutoffDate] = useState("");
  useEffect(() => {
    if (providedCutoffDate !== undefined) return undefined;
    let active = true;
    getAccrualSetup()
      .then((setup) => { if (active) setLoadedCutoffDate(setup.cutoff_date || ""); })
      .catch(() => { if (active) setLoadedCutoffDate(""); });
    return () => { active = false; };
  }, [providedCutoffDate]);

  const cutoffDate = providedCutoffDate === undefined ? loadedCutoffDate : providedCutoffDate;
  const daysRemaining = getDaysUntilAccrualCutoff(cutoffDate);
  if (daysRemaining === null || daysRemaining < 0 || daysRemaining > 3) return null;

  return (
    <div className="deadlineReminder deadlineReminderPlain deadlineReminderTop authCutoffNotice" role="note">
      <svg className="deadlineReminderWarningIcon" aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none">
        <path d="M10 2.75 18 17H2L10 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 7v4.5m0 2.5h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="deadlineReminderLabel">
        {daysRemaining === 0 ? "Final cutoff notice." : `Accrual cutoff in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`}
      </div>
      <p className="deadlineReminderText">
        {daysRemaining === 0
          ? `Today is the last day to submit accruals before the cutoff on ${formatDisplayDate(cutoffDate)}.`
          : `Submit accruals by ${formatDisplayDate(cutoffDate)}.`}
      </p>
    </div>
  );
}
