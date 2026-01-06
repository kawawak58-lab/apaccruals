import { supabase } from "./supabase";

/**
 * Fetch all company names from the companies table, ordered by id
 * @returns {Promise<string[]>} Array of company names
 */
export async function getCompanyNames() {
  const { data, error } = await supabase
    .from("companies")
    .select("name")       // only select the "name" column
    .order("id", { ascending: true }); // order by id ascending

  if (error) {
    console.error("Failed to fetch company names:", error);
    throw error;
  }

  // Return an array of names
  return data.map(item => item.name);
}
