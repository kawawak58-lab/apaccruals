import { supabase } from "./supabase";

/**
 * Fetch GL accounts filtered by company and optional search term.
 * Supports pagination and returns total count.
 *
 * @param {string} company - Company name to filter GL accounts
 * @param {string} search - Optional search string for GL account code or name
 * @param {number} page - Pagination page number (starts from 1)
 * @param {number} limit - Number of rows per page
 * @returns {Promise<{glAccounts: {code: string, name: string}[], total: number}>}
 */
export async function getGLAccounts(company, search = "", page = 1, limit = 50) {
  if (!company) {
    console.log("No company provided");
    return { glAccounts: [], total: 0 };
  }

//   console.log("Searching GL accounts for company:", company);
//   console.log("Search term:", search);
//   console.log("Page:", page, "Limit:", limit);

  let query = supabase
    .from("glaccounts")
    .select("glaccountcode, glaccountname", { count: "exact" })
    .eq("company", company);

  if (search && search.length >= 2) {
    query = query.or(
      `glaccountname.ilike.%${search}%,glaccountcode.ilike.%${search}%`
    );
  }

  query = query
    .order("glaccountname", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch GL accounts:", error);
    throw error;
  }

//   console.log("GL accounts data returned:", data);
//   console.log("Total count:", count);

  return {
    glAccounts: (data || []).map((gl) => ({
      code: gl.glaccountcode,
      name: gl.glaccountname,
    })),
    total: count || 0,
  };
}

/**
 * Add a new GL account
 */
export async function addGLAccount(glaccountcode, glaccountname, company) {
  const { data, error } = await supabase
    .from("glaccounts")
    .insert([
      {
        glaccountcode,
        glaccountname,
        company,
      },
    ])
    .select();

  if (error) {
    console.error("Failed to add GL account:", error);
    throw error;
  }

  return data[0];
}

/**
 * Update an existing GL account
 */
export async function updateGLAccount(id, glaccountcode, glaccountname, company) {
  const { data, error } = await supabase
    .from("glaccounts")
    .update({
      glaccountcode,
      glaccountname,
      company,
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Failed to update GL account:", error);
    throw error;
  }

  return data[0];
}

/**
 * Delete a GL account
 */
export async function deleteGLAccount(id) {
  const { error } = await supabase
    .from("glaccounts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete GL account:", error);
    throw error;
  }

  return true;
}