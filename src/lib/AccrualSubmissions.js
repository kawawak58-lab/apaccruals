import { supabase } from "./supabase";

export async function fetchAccrualSubmissions(options = {}) {
  const { currentUser } = options;
  const isSysadmin = currentUser?.usergroup === "sysadmin";

  let query = supabase
    .from("accrual_submissions")
    .select(
      `
        id,
        control_number,
        requester_email,
        maker,
        expense_class,
        company,
        supplier_code,
        supplier_name,
        invoice_no,
        status,
        cancellation_remarks,
        submitted_at,
        created_at,
        updated_at,
        updated_by,
        confirmed_at,
        confirmed_by,
        cancelled_at,
        cancelled_by,
        accrual_notes(count),
        accrual_submission_lines (
          id,
          line_number,
          gross_amount,
          glaccount_code,
          glaccount_name,
          profitcenter_code,
          profitcenter_name,
          transaction_type,
          vat,
          tax_code,
          remarks
        )
      `
    )
    .order("submitted_at", { ascending: false });

  if (!isSysadmin && currentUser?.email) {
    query = query.eq("maker", currentUser.email);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function submitAccrual({ header, lineItems }) {
  const { data, error } = await supabase.rpc("submit_accrual", {
    p_header: { ...header, status: 2 },
    p_line_items: lineItems,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function cancelAccrual(submissionId, cancellationRemarks) {
  const { data, error } = await supabase.rpc("cancel_accrual", {
    p_submission_id: submissionId,
    p_cancellation_remarks: cancellationRemarks,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAccrualDraft(submissionId, header, lineItems) {
  const { data, error } = await supabase.rpc("update_accrual_draft", {
    p_submission_id: submissionId,
    p_header: header,
    p_line_items: lineItems,
  });
  if (error) throw error;
  return data;
}

export async function confirmAccrualSubmission(submissionId) {
  const { data, error } = await supabase.rpc("confirm_accrual_submission", {
    p_submission_id: submissionId,
  });
  if (error) throw error;
  return data;
}

export async function fetchAccrualNotes(submissionId) {
  const { data, error } = await supabase
    .from("accrual_notes")
    .select("id, submission_id, author_id, author_name, author_email, body, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addAccrualNote(submissionId, body) {
  const { data, error } = await supabase.rpc("add_accrual_note", {
    p_submission_id: submissionId,
    p_body: body,
  });
  if (error) throw error;
  return data;
}
