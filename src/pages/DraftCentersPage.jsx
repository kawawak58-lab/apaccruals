import React, { useCallback, useEffect, useState } from "react";
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

const emptyForm = { id: null, profitcentercode: "", profitcentername: "", company: "" };

export default function DraftCentersPage() {
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
          table: "profitcenters",
          orderBy: "profitcentername",
          search,
          searchColumns: ["profitcentercode", "profitcentername", "company"],
          filters: { company: companyFilter },
        }),
      ]);

      setCompanyOptions(companies.map((company) => company.name));
      setRows(data);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load profit centers.");
      showToast(error.message || "Failed to load profit centers.", "error");
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
        profitcentercode: formValues.profitcentercode.trim(),
        profitcentername: formValues.profitcentername.trim(),
        company: formValues.company,
      };

      if (formValues.id) {
        await updateRecord("profitcenters", formValues.id, payload);
      } else {
        await insertRecord("profitcenters", payload);
      }

      setDialogOpen(false);
      setFormValues(emptyForm);
      showToast(formValues.id ? "Profit center updated successfully." : "Profit center created successfully.", "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save profit center.");
      showToast(error.message || "Unable to save profit center.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    try {
      await deleteRecord("profitcenters", row.id);
      showToast(`Profit center ${row.profitcentercode} deleted.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete profit center.");
      showToast(error.message || "Unable to delete profit center.", "error");
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
        profitcentercode: (row.profitcentercode || "").trim(),
        profitcentername: (row.profitcentername || "").trim(),
        company: (row.company || "").trim(),
      }));

      const invalidRowIndex = payloads.findIndex(
        (row) => !row.profitcentercode || !row.profitcentername || !row.company
      );
      if (invalidRowIndex >= 0) {
        throw new Error(`Row ${invalidRowIndex + 2} has blank required values.`);
      }

      await bulkInsertRecords("profitcenters", payloads, {
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
          `${String(row.company || "").trim().toLowerCase()}::${String(row.profitcentercode || "").trim().toLowerCase()}::${String(row.profitcentername || "").trim().toLowerCase()}`
      )
    );
    const fileKeys = new Set();

    return uploadedRows.map((row) => {
      const nextRow = { ...row, __errors: [...(row.__errors || [])] };
      const company = String(row.company || "").trim();
      const code = String(row.profitcentercode || "").trim();
      const name = String(row.profitcentername || "").trim();
      const compoundKey = `${company.toLowerCase()}::${code.toLowerCase()}::${name.toLowerCase()}`;

      if (!code) {
        nextRow.__errors.push("Missing profit center code");
      }
      if (!name) {
        nextRow.__errors.push("Missing profit center name");
      }
      if (!company) {
        nextRow.__errors.push("Missing company");
      } else if (!companySet.has(company.toLowerCase())) {
        nextRow.__errors.push("Company does not exist");
      }
      if (code && company) {
        if (fileKeys.has(compoundKey)) {
          nextRow.__errors.push("Duplicate profit center in file");
        }
        if (existingKeys.has(compoundKey)) {
          nextRow.__errors.push("Profit center already exists");
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
          <h1 className="pageTitle">Profit Centers</h1>
        </div>
        <div className="headerActions">
          <input
            className="input headerSearch"
            placeholder="Search profit center code, name, or company"
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
            + Add Profit Center
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
              { key: "profitcentercode", label: "Profit Center Code" },
              { key: "profitcentername", label: "Profit Center Name" },
              { key: "company", label: "Company" },
            ]}
            rows={rows}
            emptyText="No profit centers found."
            deleteMessage={(row) => `Delete profit center ${row.profitcentercode}?`}
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
        title={formValues.id ? "Edit Profit Center" : "Add Profit Center"}
        description="This updates the profit center lookup used in line items."
        fields={[
          { name: "profitcentercode", label: "Profit Center Code", required: true },
          { name: "profitcentername", label: "Profit Center Name", required: true },
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
        submitLabel={formValues.id ? "Update Profit Center" : "Create Profit Center"}
        saving={saving}
      />

      <UploadDataDialog
        open={uploadOpen}
        title="Upload Profit Centers"
        description="Upload profit center master data in bulk using a CSV file."
        templateColumns={["profitcentercode", "profitcentername", "company"]}
        templateSampleRow={{
          profitcentercode: "PC-001",
          profitcentername: "Operations",
          company: companyOptions[0] || "Example Company",
        }}
        templateFileName="profit-centers-template.csv"
        expectedLabel="profit centers"
        validateRows={validateUploadRows}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadRows}
        saving={saving}
      />
    </div>
  );
}
