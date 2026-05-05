import React, { useCallback, useEffect, useState } from "react";
import MaintenanceDialog from "../components/MaintenanceDialog";
import MaintenanceMobileFilters from "../components/MaintenanceMobileFilters";
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

const emptyForm = { id: null, glaccountcode: "", glaccountname: "", company: "" };

export default function GLAccountsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyOptions, setCompanyOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formValues, setFormValues] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [companies, data] = await Promise.all([
        fetchCollection({ table: "companies", select: "id, name", orderBy: "name" }),
        fetchCollection({
          table: "glaccounts",
          orderBy: "glaccountname",
          search,
          searchColumns: ["glaccountcode", "glaccountname", "company"],
          filters: { company: companyFilter },
        }),
      ]);

      setCompanyOptions(companies.map((company) => company.name));
      setRows(data);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load GL accounts.");
      showToast(error.message || "Failed to load GL accounts.", "error");
    } finally {
      setLoading(false);
    }
  }, [companyFilter, search, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitDialog = async () => {
    setSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        glaccountcode: formValues.glaccountcode.trim(),
        glaccountname: formValues.glaccountname.trim(),
        company: formValues.company,
      };

      if (formValues.id) {
        await updateRecord("glaccounts", formValues.id, payload);
      } else {
        await insertRecord("glaccounts", payload);
      }

      setDialogOpen(false);
      setFormValues(emptyForm);
      showToast(formValues.id ? "GL account updated successfully." : "GL account created successfully.", "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save GL account.");
      showToast(error.message || "Unable to save GL account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    try {
      await deleteRecord("glaccounts", row.id);
      showToast(`GL account ${row.glaccountcode} deleted.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete GL account.");
      showToast(error.message || "Unable to delete GL account.", "error");
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

      const payloads = uploadedRows.map((row) => ({
        glaccountcode: (row.glaccountcode || "").trim(),
        glaccountname: (row.glaccountname || "").trim(),
        company: (row.company || "").trim(),
      }));

      const invalidRowIndex = payloads.findIndex(
        (row) => !row.glaccountcode || !row.glaccountname || !row.company
      );
      if (invalidRowIndex >= 0) {
        throw new Error(`Row ${invalidRowIndex + 2} has blank required values.`);
      }

      await bulkInsertRecords("glaccounts", payloads, {
        onProgress: options.onProgress,
        startIndex: options.startIndex || 0,
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const validateUploadRows = async (uploadedRows) => {
    const companySet = new Set(companyOptions.map((option) => option.trim().toLowerCase()));
    const existingKeys = new Set(
      rows.map(
        (row) =>
          `${String(row.company || "").trim().toLowerCase()}::${String(row.glaccountcode || "").trim().toLowerCase()}::${String(row.glaccountname || "").trim().toLowerCase()}`
      )
    );
    const fileKeys = new Set();

    return uploadedRows.map((row) => {
      const nextRow = { ...row, __errors: [...(row.__errors || [])] };
      const company = String(row.company || "").trim();
      const code = String(row.glaccountcode || "").trim();
      const name = String(row.glaccountname || "").trim();
      const compoundKey = `${company.toLowerCase()}::${code.toLowerCase()}::${name.toLowerCase()}`;

      if (!code) {
        nextRow.__errors.push("Missing GL code");
      }
      if (!name) {
        nextRow.__errors.push("Missing GL account name");
      }
      if (!company) {
        nextRow.__errors.push("Missing company");
      } else if (!companySet.has(company.toLowerCase())) {
        nextRow.__errors.push("Company does not exist");
      }
      if (code && company) {
        if (fileKeys.has(compoundKey)) {
          nextRow.__errors.push("Duplicate GL account in file");
        }
        if (existingKeys.has(compoundKey)) {
          nextRow.__errors.push("GL account already exists");
        }
      }

      fileKeys.add(compoundKey);
      return nextRow;
    });
  };

  return (
    <div className="contentPage managementPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">GL Accounts</h1>
        </div>
        <div className="headerActions maintenanceHeaderActions">
          <MaintenanceMobileFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search GL code, name, or company"
            searchAriaLabel="Search GL accounts"
            companyFilter={companyFilter}
            onCompanyFilterChange={setCompanyFilter}
            companyOptions={companyOptions}
            companyAriaLabel="Filter GL accounts by company"
          />
          <input
            className="input headerSearch"
            placeholder="Search GL code, name, or company"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="select headerSelect"
            value={companyFilter}
            onChange={(event) => setCompanyFilter(event.target.value)}
          >
            <option value="">All Companies</option>
            {companyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button type="button" className="tableActionBtn" onClick={() => setUploadOpen(true)}>
            Upload Data
          </button>
          <button type="button" className="submitBtn" onClick={() => setDialogOpen(true)}>
            + Add GL Account
          </button>
        </div>
      </div>

      <div className="managementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={4} rows={8} />
        ) : (
          <MaintenanceTable
            columns={[
              { key: "glaccountcode", label: "GL Code" },
              { key: "glaccountname", label: "GL Account Name" },
              { key: "company", label: "Company" },
            ]}
            rows={rows}
            emptyText="No GL accounts found."
            deleteMessage={(row) => `Delete GL account ${row.glaccountcode}?`}
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
        title={formValues.id ? "Edit GL Account" : "Add GL Account"}
        description="This updates the shared GL account master used in the accrual form."
        fields={[
          { name: "glaccountcode", label: "GL Code", required: true },
          { name: "glaccountname", label: "GL Account Name", required: true },
          {
            name: "company",
            label: "Company",
            type: "select",
            required: true,
            options: companyOptions,
            span: 2,
          },
        ]}
        values={formValues}
        onChange={(name, value) => setFormValues((current) => ({ ...current, [name]: value }))}
        onClose={() => {
          setDialogOpen(false);
          setFormValues(emptyForm);
        }}
        onSubmit={submitDialog}
        submitLabel={formValues.id ? "Update GL Account" : "Create GL Account"}
        saving={saving}
      />

      <UploadDataDialog
        open={uploadOpen}
        title="Upload GL Accounts"
        description="Upload GL account master data in bulk using a CSV file."
        templateColumns={["glaccountcode", "glaccountname", "company"]}
        templateSampleRow={{
          glaccountcode: "500100",
          glaccountname: "Office Supplies",
          company: companyOptions[0] || "Example Company",
        }}
        templateFileName="gl-accounts-template.csv"
        expectedLabel="gl accounts"
        validateRows={validateUploadRows}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadRows}
        saving={saving}
      />
    </div>
  );
}
