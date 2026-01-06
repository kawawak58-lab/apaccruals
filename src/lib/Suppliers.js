import { supabase } from "./supabase";

/**
 * Fetch suppliers filtered by company and optional search term.
 * Supports pagination and returns total count.
 *
 * @param {string} company - Company name to filter suppliers
 * @param {string} search - Optional search string for supplier code or name
 * @param {number} page - Pagination page number (starts from 1)
 * @param {number} limit - Number of rows per page
 * @returns {Promise<{suppliers: {supplier: string, name: string}[], total: number}>}
 */
export async function getSuppliers(company, search = "", page = 1, limit = 50) {
  if (!company) {
    // console.log("No company provided");
    return { suppliers: [], total: 0 };
  }

//   console.log("Searching for company:", company);
//   console.log("Search term:", search);
//   console.log("Page:", page, "Limit:", limit);

  let query = supabase
    .from("suppliers")
    .select("suppliercode, suppliername", { count: "exact" })
    .eq("company", company);

  if (search && search.length >= 2) {
    query = query.or(
      `suppliername.ilike.%${search}%,suppliercode.ilike.%${search}%`
    );
  }

  query = query
    .order("suppliername", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch suppliers:", error);
    throw error;
  }

//   console.log("Data returned:", data);
//   console.log("Count:", count);

  return {
    suppliers: (data || []).map((s) => ({
      supplier: s.suppliercode,
      name: s.suppliername,
    })),
    total: count || 0,
  };
}