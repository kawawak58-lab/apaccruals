import { supabase } from "./supabase";

const ACCRUAL_SETUP_SINGLETON_ID = true;

function normalizeSetupRow(row) {
  return {
    id: ACCRUAL_SETUP_SINGLETON_ID,
    start_date: row?.start_date || "",
    cutoff_date: row?.cutoff_date || "",
    updated_at: row?.updated_at || null,
  };
}

export async function getAccrualSetup() {
  const { data, error } = await supabase
    .from("accrual_setup")
    .select("id, start_date, cutoff_date, updated_at")
    .eq("id", ACCRUAL_SETUP_SINGLETON_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeSetupRow(data);
}

export async function saveAccrualSetup(payload) {
  const normalizedPayload = {
    start_date: payload?.start_date || null,
    cutoff_date: payload?.cutoff_date || null,
  };

  const { data, error } = await supabase
    .from("accrual_setup")
    .update(normalizedPayload)
    .eq("id", ACCRUAL_SETUP_SINGLETON_ID)
    .select("id, start_date, cutoff_date, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return normalizeSetupRow(data);
}

export function getAccrualWindowStatus(setup, today = new Date()) {
  const startDate = setup?.start_date || "";
  const cutoffDate = setup?.cutoff_date || "";

  if (!startDate || !cutoffDate) {
    return {
      isConfigured: false,
      isOpen: false,
      reason: "Accrual period is not configured.",
    };
  }

  const todayKey = formatDateInputValue(today);
  const isOpen = startDate <= todayKey && todayKey <= cutoffDate;

  return {
    isConfigured: true,
    isOpen,
    reason: isOpen
      ? `Accrual filing is available from ${formatDisplayDate(startDate)} to ${formatDisplayDate(cutoffDate)}.`
      : `Accrual filing is only available from ${formatDisplayDate(startDate)} to ${formatDisplayDate(cutoffDate)}.`,
  };
}

export function formatDateInputValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value) {
  if (!value) {
    return "Not set";
  }

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}
