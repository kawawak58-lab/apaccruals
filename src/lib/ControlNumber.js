import { supabase } from "./supabase";

export async function getNextControlNumber() {
  const { data, error } = await supabase.rpc("get_next_control_number");

  if (error) throw error;

  return data; // already like ACT000601
}
