import { supabase } from "./supabase";

const CONTROL_NUMBER_PATTERN = /^[A-Z]+\d+$/;

export function normalizeControlNumber(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function isValidControlNumber(value) {
  return CONTROL_NUMBER_PATTERN.test(normalizeControlNumber(value));
}

export function parseControlNumber(value) {
  const normalized = normalizeControlNumber(value);
  if (!CONTROL_NUMBER_PATTERN.test(normalized)) {
    return null;
  }

  const prefix = normalized.match(/^[A-Z]+/)?.[0] || "";
  const numeric = normalized.slice(prefix.length);

  return {
    prefix,
    lastValue: Number.parseInt(numeric, 10),
    padding: numeric.length,
  };
}

export function formatControlNumber(prefix, lastValue, padding) {
  if (!prefix || !Number.isFinite(lastValue) || !Number.isFinite(padding) || padding <= 0) {
    return "";
  }

  return `${String(prefix).toUpperCase()}${String(Math.max(0, lastValue)).padStart(padding, "0")}`;
}

export function getNextControlNumberPreview(value) {
  const parsed = parseControlNumber(value);
  if (!parsed) {
    return "";
  }

  return formatControlNumber(parsed.prefix, parsed.lastValue + 1, parsed.padding);
}

export async function getCurrentControlNumber() {
  const { data, error } = await supabase
    .from("control_number_sequence")
    .select("prefix,last_value,padding,updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No control number sequence row was found. Check the seed row and table access policy.");
  }

  return formatControlNumber(data.prefix, data.last_value, data.padding);
}

export async function updateCurrentControlNumber(value) {
  const parsed = parseControlNumber(value);
  if (!parsed) {
    throw new Error("Invalid control number format.");
  }

  const { data, error } = await supabase
    .from("control_number_sequence")
    .update({
      prefix: parsed.prefix,
      last_value: parsed.lastValue,
      padding: parsed.padding,
    })
    .eq("id", true)
    .select("prefix,last_value,padding")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Control number sequence row was not updated. Check that the singleton row exists and update access is allowed.");
  }

  return formatControlNumber(data.prefix, data.last_value, data.padding);
}
