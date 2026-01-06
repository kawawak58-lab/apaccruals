import { supabase } from "./supabase";

/**
 * Fetch all expense class names from the expense_classes table
 * @returns {Promise<string[]>} Array of expense class names
 */
export async function getTransactionTypeNames() {
  const { data, error } = await supabase
    .from("transaction_types")
    .select("name"); // only select the "name" column

  if (error) {
    console.error("Failed to fetch transaction_types:", error);
    throw error;
  }

  // Return an array of names
  return data.map(item => item.name);
}
