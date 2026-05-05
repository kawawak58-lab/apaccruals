import React, { useCallback, useEffect, useMemo, useState } from "react";
import MaintenanceDialog from "../components/MaintenanceDialog";
import MaintenanceSkeleton from "../components/MaintenanceSkeleton";
import MaintenanceTable from "../components/MaintenanceTable";
import UploadDataDialog from "../components/UploadDataDialog";
import { useToast } from "../lib/toast";
import {
  bulkInsertRecords,
  deleteRecord,
  fetchCollection,
  insertRecord,
  rollbackInsertedRecords,
  updateRecord,
} from "../lib/adminCrud";

export const categoryConfigs = {
  companies: {
    title: "Companies",
    singular: "Company",
    table: "companies",
    orderBy: "name",
    searchColumns: ["name"],
    fields: [{ name: "name", label: "Company Name", required: true }],
    columns: [{ key: "name", label: "Company Name" }],
    uploadColumns: ["name"],
    uploadFileName: "companies-template.csv",
    uploadSampleRow: { name: "Example Company" },
  },
  expense_classes: {
    title: "Expense Classifications",
    singular: "Expense Classification",
    table: "expense_classes",
    orderBy: "name",
    searchColumns: ["name"],
    fields: [{ name: "name", label: "Expense Classification", required: true }],
    columns: [{ key: "name", label: "Expense Classification" }],
    uploadColumns: ["name"],
    uploadFileName: "expense-classifications-template.csv",
    uploadSampleRow: { name: "Travel" },
  },
  transaction_types: {
    title: "Transaction Types",
    singular: "Transaction Type",
    table: "transaction_types",
    orderBy: "name",
    searchColumns: ["name"],
    fields: [{ name: "name", label: "Transaction Type", required: true }],
    columns: [{ key: "name", label: "Transaction Type" }],
    uploadColumns: ["name"],
    uploadFileName: "transaction-types-template.csv",
    uploadSampleRow: { name: "Invoice" },
  },
  tax_codes: {
    title: "Tax Codes",
    singular: "Tax Code",
    table: "tax_codes",
    orderBy: "description",
    searchColumns: ["description"],
    fields: [{ name: "description", label: "Tax Code Description", required: true }],
    columns: [{ key: "description", label: "Tax Code Description" }],
    uploadColumns: ["description"],
    uploadFileName: "tax-codes-template.csv",
    uploadSampleRow: { description: "Input VAT" },
  },
};

export default function CategoriesPage({ categoryKey = "companies" }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({ id: null });
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const config = useMemo(() => categoryConfigs[categoryKey] || categoryConfigs.companies, [categoryKey]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchCollection({
        table: config.table,
        orderBy: config.orderBy,
        search,
        searchColumns: config.searchColumns,
      });

      setRows(data);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load category data.");
      showToast(error.message || "Failed to load category data.", "error");
    } finally {
      setLoading(false);
    }
  }, [config, search, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitDialog = async () => {
    setSaving(true);
    setErrorMessage("");

    try {
      const payload = config.fields.reduce((next, field) => {
        next[field.name] = (formValues[field.name] || "").trim();
        return next;
      }, {});

      if (formValues.id) {
        await updateRecord(config.table, formValues.id, payload);
      } else {
        await insertRecord(config.table, payload);
      }

      setDialogOpen(false);
      setFormValues({ id: null });
      showToast(formValues.id ? `${config.singular} updated successfully.` : `${config.singular} created successfully.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save record.");
      showToast(error.message || "Unable to save record.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    try {
      await deleteRecord(config.table, row.id);
      showToast(`${config.singular} deleted successfully.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete record.");
      showToast(error.message || "Unable to delete record.", "error");
    }
  };

  const uploadRows = async (uploadedRows, options = {}) => {
    setSaving(true);
    setErrorMessage("");

    try {
      if (options.recoveryAction === "rollback") {
        const rollbackCount = await rollbackInsertedRecords(
          options.rollbackState?.table,
          options.rollbackState?.ids || []
        );
        await loadData();
        return { rollbackCount };
      }

      const payloads = uploadedRows.map((row) =>
        config.uploadColumns.reduce((next, column) => {
          next[column] = (row[column] || "").trim();
          return next;
        }, {})
      );

      const invalidRowIndex = payloads.findIndex((row) => config.uploadColumns.some((column) => !row[column]));
      if (invalidRowIndex >= 0) {
        throw new Error(`Row ${invalidRowIndex + 2} has blank required values.`);
      }

      await bulkInsertRecords(config.table, payloads, {
        onProgress: options.onProgress,
        startIndex: options.startIndex || 0,
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const validateUploadRows = async (uploadedRows) => {
    const keyColumn = config.uploadColumns[0];
    const existingKeys = new Set(rows.map((row) => String(row[keyColumn] || "").trim().toLowerCase()));
    const fileKeys = new Set();

    return uploadedRows.map((row) => {
      const nextRow = { ...row, __errors: [...(row.__errors || [])] };
      const key = String(row[keyColumn] || "").trim().toLowerCase();

      if (!key) {
        nextRow.__errors.push("Missing required value");
      } else {
        if (fileKeys.has(key)) {
          nextRow.__errors.push("Duplicate row in file");
        }
        if (existingKeys.has(key)) {
          nextRow.__errors.push("Already exists");
        }
      }

      fileKeys.add(key);
      return nextRow;
    });
  };

  return (
    <div className="contentPage managementPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">{config.title}</h1>
        </div>
        <div className="headerActions maintenanceHeaderActions">
          <input
            className="input headerSearch"
            placeholder={`Search ${config.title.toLowerCase()}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className="tableActionBtn"
            onClick={() => setUploadOpen(true)}
          >
            Upload Data
          </button>
          <button
            type="button"
            className="submitBtn"
            onClick={() => {
              setFormValues({ id: null });
              setDialogOpen(true);
            }}
          >
            + Add {config.singular}
          </button>
        </div>
      </div>

      <div className="managementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={2} rows={8} />
        ) : (
          <MaintenanceTable
            columns={config.columns}
            rows={rows}
            emptyText={`No ${config.title.toLowerCase()} found.`}
            deleteMessage={(row) => `Delete ${row.name || row.description || "this record"}?`}
            onEdit={(row) => {
              setFormValues(row);
              setDialogOpen(true);
            }}
            onDelete={deleteRow}
          />
        )}
      </div>

      <MaintenanceDialog
        open={dialogOpen}
        title={formValues.id ? `Edit ${config.singular}` : `Add ${config.singular}`}
        fields={config.fields}
        values={formValues}
        onChange={(name, value) => setFormValues((current) => ({ ...current, [name]: value }))}
        onClose={() => {
          setDialogOpen(false);
          setFormValues({ id: null });
        }}
        onSubmit={submitDialog}
        submitLabel={formValues.id ? "Update" : "Create"}
        saving={saving}
      />

      <UploadDataDialog
        open={uploadOpen}
        title={`Upload ${config.title}`}
        description={`Upload ${config.title.toLowerCase()} in bulk using a CSV file.`}
        templateColumns={config.uploadColumns}
        templateSampleRow={config.uploadSampleRow}
        templateFileName={config.uploadFileName}
        expectedLabel={config.title.toLowerCase()}
        validateRows={validateUploadRows}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadRows}
        saving={saving}
      />
    </div>
  );
}
