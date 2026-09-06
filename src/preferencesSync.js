import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Default target size always lives in localStorage first - this is what
// keeps the compressor working with zero friction for anyone not signed in.
// When someone IS signed in, it's additionally synced to their account so
// it follows them to another device.
export const TARGET_SIZE_STORAGE_KEY = "discshrink_default_target_size";
const DEFAULT_TARGET_SIZE_KB = "20480";

export function getDefaultTargetSizeKB() {
  try {
    return window.localStorage.getItem(TARGET_SIZE_STORAGE_KEY) || DEFAULT_TARGET_SIZE_KB;
  } catch {
    return DEFAULT_TARGET_SIZE_KB;
  }
}

export function setDefaultTargetSizeKB(value) {
  try {
    window.localStorage.setItem(TARGET_SIZE_STORAGE_KEY, String(value));
  } catch {
    // Non-fatal - preference just won't persist locally this session.
  }
}

export async function fetchRemotePreferences(user) {
  if (!isSupabaseConfigured || !user) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme, default_target_size_kb")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.log("Could not load synced preferences:", error.message);
    return null;
  }

  return data;
}

export async function upsertRemotePreferences(user, patch) {
  if (!isSupabaseConfigured || !user) return;

  const { error } = await supabase.from("user_preferences").upsert({
    user_id: user.id,
    ...patch,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.log("Could not sync preferences to your account:", error.message);
  }
}
