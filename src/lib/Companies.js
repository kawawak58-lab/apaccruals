import { supabase } from "./supabase";

/**
 * Fetch all expense class names from the expense_classes table
 * @returns {Promise<string[]>} Array of expense class names
 */
export async function getCompanyNames() {
  const { data, error } = await supabase
    .from("companies")
    .select("name"); // only select the "name" column

  if (error) {
    console.error("Failed to fetchcompanynames:", error);
    throw error;
  }

  // Return an array of names
  return data.map(item => item.name);
}
