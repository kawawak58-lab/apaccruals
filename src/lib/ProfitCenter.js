import { supabase } from "./supabase";

/**
 * Fetch profit centers filtered by company and optional search term.
 * Supports pagination and returns total count.
 *
 * @param {string} company - Company name to filter profit centers
 * @param {string} search - Optional search string for profit center code or name
 * @param {number} page - Pagination page number (starts from 1)
 * @param {number} limit - Number of rows per page
 * @returns {Promise<{profitCenters: {code: string, name: string}[], total: number}>}
 */
export async function getProfitCenters(company, search = "", page = 1, limit = 50) {
  if (!company) {
    console.log("No company provided");
    return { profitCenters: [], total: 0 };
  }

//   console.log("Searching profit centers for company:", company);
//   console.log("Search term:", search);
//   console.log("Page:", page, "Limit:", limit);

  let query = supabase
    .from("profitcenters")
    .select("profitcentercode, profitcentername", { count: "exact" })
    .eq("company", company);

  if (search && search.length >= 2) {
    query = query.or(
      `profitcentername.ilike.%${search}%,profitcentercode.ilike.%${search}%`
    );
  }

  query = query
    .order("profitcentername", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch profit centers:", error);
    throw error;
  }

//   console.log("Profit centers data returned:", data);
//   console.log("Total count:", count);

  return {
    profitCenters: (data || []).map((pc) => ({
      code: pc.profitcentercode,
      name: pc.profitcentername,
    })),
    total: count || 0,
  };
}

/**
 * Add a new profit center
 */
export async function addProfitCenter(profitcentercode, profitcentername, company) {
  const { data, error } = await supabase
    .from("profitcenters")
    .insert([
      {
        profitcentercode,
        profitcentername,
        company,
      },
    ])
    .select();

  if (error) {
    console.error("Failed to add profit center:", error);
    throw error;
  }

  return data[0];
}

/**
 * Update an existing profit center
 */
export async function updateProfitCenter(id, profitcentercode, profitcentername, company) {
  const { data, error } = await supabase
    .from("profitcenters")
    .update({
      profitcentercode,
      profitcentername,
      company,
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Failed to update profit center:", error);
    throw error;
  }

  return data[0];
}

/**
 * Delete a profit center
 */
export async function deleteProfitCenter(id) {
  const { error } = await supabase
    .from("profitcenters")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete profit center:", error);
    throw error;
  }

  return true;
}