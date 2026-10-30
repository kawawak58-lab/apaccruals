import { supabase } from "./lib/supabase";

// Search results can be paginated; verify exact codes separately when incomplete.
export async function findExactLookup({ rows, total, search, company, table, codeColumn, nameColumn, codeKey = "code" }) {
  const code = String(search || "").trim();
  if (!code) return null;
  if (total <= rows.length) {
    const matches = rows.filter((row) => String(row[codeKey]).trim() === code);
    return matches.length === 1 ? { code: matches[0][codeKey], name: matches[0].name } : null;
  }
  const { data, error } = await supabase.from(table).select(`${codeColumn}, ${nameColumn}`)
    .ilike("company", String(company || "").trim()).eq(codeColumn, code).limit(2);
  if (error) throw error;
  return data?.length === 1 ? { code: data[0][codeColumn], name: data[0][nameColumn] } : null;
}
