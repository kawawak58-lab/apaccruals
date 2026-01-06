import { supabase } from "./supabase";

/**
 * Fetch all expense class names from the expense_classes table
 * @returns {Promise<string[]>} Array of expense class names
 */
export async function getTaxCodeNames() {
  const { data, error } = await supabase
    .from("tax_codes")
    .select("description"); // only select the "name" column

  if (error) {
    console.error("Failed to fetch tax code names:", error);
    throw error;
  }

  // Return an array of names
  return data.map(item => item.description);
}
