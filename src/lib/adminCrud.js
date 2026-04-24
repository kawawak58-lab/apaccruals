import { supabase } from "./supabase";

function applyFilters(query, filters = {}) {
  return Object.entries(filters).reduce((nextQuery, [column, value]) => {
    if (value === "" || value === null || value === undefined) {
      return nextQuery;
    }

    return nextQuery.eq(column, value);
  }, query);
}

export async function fetchCollection({
  table,
  select = "*",
  orderBy = "id",
  ascending = true,
  search = "",
  searchColumns = [],
  filters = {},
}) {
  let query = supabase.from(table).select(select);
  query = applyFilters(query, filters);

  if (search && searchColumns.length > 0) {
    const expression = searchColumns
      .map((column) => `${column}.ilike.%${search}%`)
      .join(",");
    query = query.or(expression);
  }

  const { data, error } = await query.order(orderBy, { ascending });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function insertRecord(table, payload) {
  const { data, error } = await supabase.from(table).insert([payload]).select().single();

  if (error) {
    throw error;
  }

  return data;
}

function waitForNextTick() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function createUploadRecoveryError(message, recovery) {
  const error = new Error(message);
  error.uploadRecovery = recovery;
  return error;
}

export async function bulkInsertRecords(table, payloads, options = {}) {
  const { batchSize = 1000, onProgress, startIndex = 0 } = options;

  if (!Array.isArray(payloads) || payloads.length === 0) {
    return [];
  }

  const safeStartIndex = Math.max(0, Math.min(startIndex, payloads.length));
  const insertedRows = [];
  const insertedIds = [];

  for (let start = safeStartIndex; start < payloads.length; start += batchSize) {
    const batch = payloads.slice(start, start + batchSize);
    const { data, error } = await supabase.from(table).insert(batch).select("id");

    if (error) {
      throw createUploadRecoveryError(error.message || "Upload failed.", {
        mode: "bulk-insert",
        canResume: start < payloads.length,
        resumeFrom: start,
        insertedCount: start,
        totalCount: payloads.length,
        remainingCount: Math.max(payloads.length - start, 0),
        rollbackSupported: insertedIds.length > 0,
        rollbackState:
          insertedIds.length > 0
            ? {
                table,
                ids: insertedIds.slice(),
              }
            : null,
      });
    }

    if (data) {
      insertedRows.push(...data);
      insertedIds.push(
        ...data
          .map((row) => row?.id)
          .filter((value) => value !== null && value !== undefined)
      );
    }

    if (onProgress) {
      onProgress({
        inserted: Math.min(start + batch.length, payloads.length),
        total: payloads.length,
      });
    }

    await waitForNextTick();
  }

  return insertedRows;
}

export async function rollbackInsertedRecords(table, ids, options = {}) {
  const { batchSize = 1000 } = options;

  if (!table || !Array.isArray(ids) || ids.length === 0) {
    return 0;
  }

  let deletedCount = 0;

  for (let start = 0; start < ids.length; start += batchSize) {
    const batch = ids.slice(start, start + batchSize);
    const { error } = await supabase.from(table).delete().in("id", batch);

    if (error) {
      throw error;
    }

    deletedCount += batch.length;
    await waitForNextTick();
  }

  return deletedCount;
}

export async function updateRecord(table, id, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function approveSupplierEnrollment(enrollment) {
  const { error: updateError } = await supabase
    .from("suppliernenroll")
    .update({ isapproved: true })
    .eq("id", enrollment.id);

  if (updateError) {
    throw updateError;
  }

  const { error: insertError } = await supabase.from("suppliers").insert([
    {
      suppliercode: enrollment.suppliercode,
      suppliername: enrollment.suppliername,
      company: enrollment.company,
    },
  ]);

  if (insertError) {
    throw insertError;
  }
}
