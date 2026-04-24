import { supabase } from "./supabase";

function withTimeout(promise, message, timeoutMs = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export async function getSession() {
  const { data, error } = await withTimeout(
    supabase.auth.getSession(),
    "Session request timed out. Please refresh and try again."
  );
  if (error) {
    throw error;
  }
  return data.session;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        hd: "bounty.com.ph",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentAppUser() {
  const { data, error } = await withTimeout(
    supabase.rpc("get_current_app_user"),
    "User profile lookup timed out. Please refresh and try again."
  );
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data[0] || null : data || null;
}

export async function ensureUserProfile(displayName) {
  const { data, error } = await withTimeout(
    supabase.rpc("ensure_user_profile", {
      p_display_name: displayName,
    }),
    "Saving your user profile timed out. Please try again."
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data[0] || null : data || null;
}

export async function fetchUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, display_name, usergroup, can_update_control_number, created_at, updated_at, last_login_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateUser(id, payload) {
  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select("id, auth_user_id, email, display_name, usergroup, can_update_control_number, created_at, updated_at, last_login_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
