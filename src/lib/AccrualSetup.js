import { supabase } from "./supabase";

function normalizeSetupRow(row) {
  return {
    id: row?.id || null,
    name: row?.name || '',
    is_active: Boolean(row?.is_active),
    is_archived: Boolean(row?.is_archived),
    is_locked: Boolean(row?.is_locked),
    start_date: row?.start_date || "",
    cutoff_date: row?.cutoff_date || "",
    updated_at: row?.updated_at || null,
  };
}

export async function getAccrualSetup() {
  const { data, error } = await supabase
    .from("accrual_filing_setups")
    .select("*")
    .eq("is_active", true)
    .eq("is_archived", false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeSetupRow(data);
}

export async function saveAccrualSetup(payload) {
  const normalizedPayload = {
    name: payload?.name?.trim() || 'Accrual filing window',
    start_date: payload?.start_date || null,
    cutoff_date: payload?.cutoff_date || null,
  };

  const { data, error } = await supabase.rpc(payload?.id ? 'update_accrual_filing_setup' : 'create_accrual_filing_setup', {
    ...(payload?.id ? { p_setup_id: payload.id } : {}),
    p_name: normalizedPayload.name, p_start_date: normalizedPayload.start_date,
    p_cutoff_date: normalizedPayload.cutoff_date,
  });

  if (error) {
    throw error;
  }

  return normalizeSetupRow(Array.isArray(data) ? data[0] : data);
}

export async function listAccrualSetups() {
  const { data, error } = await supabase.from('accrual_filing_setups').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setAccrualSetupActive(id, active) {
  const { error } = await supabase.rpc('set_accrual_filing_setup_active', { p_setup_id: id, p_active: active });
  if (error) throw error;
}

export async function archiveAccrualSetup(id) {
  const { data, error } = await supabase.rpc('archive_accrual_filing_setup', { p_setup_id: id });
  if (error) throw error;
  return data;
}

export async function deleteAccrualSetup(id) {
  const { error } = await supabase.rpc('delete_accrual_filing_setup', { p_setup_id: id });
  if (error) throw error;
}

export async function setAccrualSetupLocked(id, locked) {
  const { error } = await supabase.rpc('set_accrual_filing_setup_locked', { p_setup_id: id, p_locked: locked });
  if (error) throw error;
}

export async function unarchiveAccrualSetup(id) {
  const { data, error } = await supabase.rpc('unarchive_accrual_filing_setup', { p_setup_id: id });
  if (error) throw error;
  return data;
}

export function getAccrualWindowStatus(setup, today = new Date()) {
  const startDate = setup?.start_date || "";
  const cutoffDate = setup?.cutoff_date || "";

  if (!startDate || !cutoffDate || setup?.is_active === false || setup?.is_archived || setup?.is_locked) {
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

export function getDaysUntilAccrualCutoff(cutoffDate, now = new Date()) {
  if (!cutoffDate) return null;

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const parseDate = (value) => {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return year && month && day ? Date.UTC(year, month - 1, day) : NaN;
  };
  const today = parseDate(todayKey);
  const cutoff = parseDate(cutoffDate);
  if (!Number.isFinite(today) || !Number.isFinite(cutoff)) return null;
  return Math.round((cutoff - today) / 86400000);
}

export function formatDateInputValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
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
