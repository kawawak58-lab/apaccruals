import { supabase } from "./supabase";

/**
 * Fetch all expense class names from the expense_classes table
 * @returns {Promise<string[]>} Array of expense class names
 */
export async function getExpenseClassNames() {
  const { data, error } = await supabase
    .from("expense_classes")
    .select("name"); // only select the "name" column

  if (error) {
    console.error("Failed to fetch expense class names:", error);
    throw error;
  }

  // Return an array of names
  return data.map(item => item.name);
}
