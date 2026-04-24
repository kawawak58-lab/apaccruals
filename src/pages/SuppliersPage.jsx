import React, { useCallback, useEffect, useMemo, useState } from "react";
import MaintenanceDialog from "../components/MaintenanceDialog";
import MaintenanceSkeleton from "../components/MaintenanceSkeleton";
import MaintenanceTable from "../components/MaintenanceTable";
import UploadDataDialog from "../components/UploadDataDialog";
import { useToast } from "../lib/toast";
import {
  approveSupplierEnrollment,
  bulkInsertRecords,
  deleteRecord,
  fetchCollection,
  insertRecord,
  rollbackInsertedRecords,
  updateRecord,
} from "../lib/adminCrud";

const supplierFields = (companyOptions) => [
  { name: "suppliercode", label: "Supplier Code", required: true },
  { name: "suppliername", label: "Supplier Name", required: true, span: 2 },
  {
    name: "company",
    label: "Company",
    type: "select",
    required: true,
    options: companyOptions,
    span: 2,
  },
];

const emptyForm = { id: null, suppliercode: "", suppliername: "", company: "" };

function normalizeSupplierValue(value) {
  return String(value || "").trim().toLowerCase();
}

export default function SuppliersPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("master");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyOptions, setCompanyOptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formValues, setFormValues] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [companies, supplierRows, enrollmentRows] = await Promise.all([
        fetchCollection({ table: "companies", select: "id, name", orderBy: "name" }),
        fetchCollection({
          table: "suppliers",
          orderBy: "suppliername",
          search,
          searchColumns: ["suppliercode", "suppliername", "company"],
          filters: { company: companyFilter },
        }),
        fetchCollection({
          table: "suppliernenroll",
          orderBy: "id",
          ascending: false,
          search,
          searchColumns: ["suppliercode", "suppliername", "company"],
        }),
      ]);

      setCompanyOptions(companies.map((company) => company.name));
      setSuppliers(supplierRows);
      setEnrollments(enrollmentRows);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load supplier data.");
      showToast(error.message || "Failed to load supplier data.", "error");
    } finally {
      setLoading(false);
    }
  }, [companyFilter, search, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setFormValues(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setFormValues({
      id: row.id,
      suppliercode: row.suppliercode,
      suppliername: row.suppliername,
      company: row.company,
    });
    setDialogOpen(true);
  };

  const getDuplicateSupplierError = (payload, excludeId = null) => {
    const companyKey = normalizeSupplierValue(payload.company);
    const codeKey = normalizeSupplierValue(payload.suppliercode);
    const nameKey = normalizeSupplierValue(payload.suppliername);

    const duplicateSupplier = suppliers.find(
      (row) =>
        row.id !== excludeId &&
        normalizeSupplierValue(row.company) === companyKey &&
        normalizeSupplierValue(row.suppliercode) === codeKey &&
        normalizeSupplierValue(row.suppliername) === nameKey
    );

    if (duplicateSupplier) {
      return "Supplier already exists for this company.";
    }

    return "";
  };

  const submitDialog = async () => {
    setSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        suppliercode: formValues.suppliercode.trim(),
        suppliername: formValues.suppliername.trim(),
        company: formValues.company,
      };

      const duplicateError = getDuplicateSupplierError(payload, formValues.id);
      if (duplicateError) {
        throw new Error(duplicateError);
      }

      if (formValues.id) {
        await updateRecord("suppliers", formValues.id, payload);
      } else {
        await insertRecord("suppliers", payload);
      }

      setDialogOpen(false);
      setFormValues(emptyForm);
      showToast(formValues.id ? "Supplier updated successfully." : "Supplier created successfully.", "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save supplier.");
      showToast(error.message || "Unable to save supplier.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeSupplier = async (row) => {
    try {
      await deleteRecord("suppliers", row.id);
      showToast(`Supplier ${row.suppliercode} deleted.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete supplier.");
      showToast(error.message || "Unable to delete supplier.", "error");
    }
  };

  const approveEnrollment = async (row) => {
    try {
      const duplicateError = getDuplicateSupplierError(
        {
          suppliercode: row.suppliercode,
          suppliername: row.suppliername,
          company: row.company,
        },
        null
      );

      if (duplicateError) {
        throw new Error(duplicateError);
      }

      await approveSupplierEnrollment(row);
      showToast(`Enrollment ${row.suppliercode} approved.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to approve enrollment.");
      showToast(error.message || "Unable to approve enrollment.", "error");
    }
  };

  const uploadSuppliers = async (uploadedRows, options = {}) => {
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
        suppliercode: (row.suppliercode || "").trim(),
        suppliername: (row.suppliername || "").trim(),
        company: (row.company || "").trim(),
      }));

      const invalidRowIndex = payloads.findIndex(
        (row) => !row.suppliercode || !row.suppliername || !row.company
      );
      if (invalidRowIndex >= 0) {
        throw new Error(`Row ${invalidRowIndex + 2} has blank required values.`);
      }

      await bulkInsertRecords("suppliers", payloads, {
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
    const existingSupplierKeys = new Set(
      suppliers.map(
        (row) =>
          `${String(row.company || "").trim().toLowerCase()}::${String(row.suppliercode || "").trim().toLowerCase()}::${String(row.suppliername || "").trim().toLowerCase()}`
      )
    );
    const fileSupplierKeys = new Set();

    return uploadedRows.map((row) => {
      const nextRow = { ...row, __errors: [...(row.__errors || [])] };
      const company = String(row.company || "").trim();
      const code = String(row.suppliercode || "").trim();
      const name = String(row.suppliername || "").trim();
      const supplierKey = `${company.toLowerCase()}::${code.toLowerCase()}::${name.toLowerCase()}`;

      if (!code) {
        nextRow.__errors.push("Missing supplier code");
      }
      if (!name) {
        nextRow.__errors.push("Missing supplier name");
      }
      if (!company) {
        nextRow.__errors.push("Missing company");
      } else if (!companySet.has(company.toLowerCase())) {
        nextRow.__errors.push("Company does not exist");
      }
      if (code && name && company) {
        if (fileSupplierKeys.has(supplierKey)) {
          nextRow.__errors.push("Duplicate supplier in file for this company");
        }
        if (existingSupplierKeys.has(supplierKey)) {
          nextRow.__errors.push("Supplier already exists for this company");
        }
      }

      fileSupplierKeys.add(supplierKey);
      return nextRow;
    });
  };

  const deleteEnrollment = async (row) => {
    try {
      await deleteRecord("suppliernenroll", row.id);
      showToast(`Enrollment ${row.suppliercode} deleted.`, "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete enrollment.");
      showToast(error.message || "Unable to delete enrollment.", "error");
    }
  };

  const pendingCount = useMemo(
    () => enrollments.filter((row) => !row.isapproved).length,
    [enrollments]
  );

  const visibleEnrollments = useMemo(() => {
    if (activeTab === "queue") {
      return enrollments.filter((row) => !row.isapproved);
    }

    return enrollments;
  }, [activeTab, enrollments]);

  return (
    <div className="contentPage managementPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">Suppliers</h1>
        </div>
        <div className="headerActions">
          <input
            className="input headerSearch"
            placeholder="Search by code, name, or company..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search suppliers"
          />
          {activeTab === "master" ? (
            <select
              className="select headerSelect"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              aria-label="Filter suppliers by company"
            >
              <option value="">All Companies</option>
              {companyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : null}
          {activeTab === "master" ? (
            <button type="button" className="tableActionBtn" onClick={() => setUploadOpen(true)}>
              Upload Data
            </button>
          ) : null}
          {activeTab === "master" ? (
            <button type="button" className="submitBtn" onClick={openCreate}>
              + Add Supplier
            </button>
          ) : null}
        </div>
      </div>

      <div className="managementTabs">
        <button
          type="button"
          className={`managementTab${activeTab === "master" ? " active" : ""}`}
          onClick={() => setActiveTab("master")}
        >
          Master Suppliers
        </button>
        <button
          type="button"
          className={`managementTab${activeTab === "queue" ? " active" : ""}`}
          onClick={() => setActiveTab("queue")}
        >
          Pending Enrollments
          {pendingCount > 0 ? <span className="tabBadge">{pendingCount}</span> : null}
        </button>
      </div>

      <div className="managementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={activeTab === "master" ? 4 : 5} rows={8} />
        ) : activeTab === "master" ? (
          <MaintenanceTable
            columns={[
              { key: "suppliercode", label: "Supplier Code" },
              { key: "suppliername", label: "Supplier Name" },
              { key: "company", label: "Company" },
            ]}
            rows={suppliers}
            emptyText="No suppliers found."
            emptyHelperText="Try the sample rows SUP-001 / ABC Trading / Test Company or test / testname / Test Company."
            onEdit={openEdit}
            onDelete={removeSupplier}
            deleteMessage={(row) => `Delete supplier ${row.suppliercode} - ${row.suppliername}?`}
          />
        ) : (
          <MaintenanceTable
            columns={[
              { key: "suppliercode", label: "Supplier Code" },
              { key: "suppliername", label: "Supplier Name" },
              { key: "company", label: "Company" },
              {
                key: "isapproved",
                label: "Status",
                render: (row) => (
                  <span className={`statusPill${row.isapproved ? " success" : " warning"}`}>
                    {row.isapproved ? "Approved" : "Pending"}
                  </span>
                ),
              },
            ]}
            rows={visibleEnrollments}
            emptyText="No enrollment requests found."
            emptyHelperText="Once someone submits a new supplier enrollment, it will appear here for review."
            onRowDoubleClick={(row) => {
              if (!row.isapproved) {
                approveEnrollment(row);
              }
            }}
            onDelete={deleteEnrollment}
            deleteMessage={(row) => `Delete pending enrollment ${row.suppliercode} - ${row.suppliername}?`}
            rowActions={(row) =>
              !row.isapproved ? (
                <button type="button" className="tableActionBtn approve" onClick={() => approveEnrollment(row)}>
                  Approve
                </button>
              ) : null
            }
          />
        )}
      </div>

      <MaintenanceDialog
        open={dialogOpen}
        title={formValues.id ? "Edit Supplier" : "Add Supplier"}
        description="Save a supplier directly to the master table."
        fields={supplierFields(companyOptions)}
        values={formValues}
        onChange={(name, value) => setFormValues((current) => ({ ...current, [name]: value }))}
        onClose={() => setDialogOpen(false)}
        onSubmit={submitDialog}
        submitLabel={formValues.id ? "Update Supplier" : "Create Supplier"}
        saving={saving}
      />

      <UploadDataDialog
        open={uploadOpen}
        title="Upload Suppliers"
        description="Upload supplier master data in bulk using a CSV file."
        templateColumns={["suppliercode", "suppliername", "company"]}
        templateSampleRow={{
          suppliercode: "SUP-001",
          suppliername: "ABC Trading",
          company: companyOptions[0] || "Example Company",
        }}
        templateFileName="suppliers-template.csv"
        expectedLabel="suppliers"
        validateRows={validateUploadRows}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadSuppliers}
        saving={saving}
      />
    </div>
  );
}
