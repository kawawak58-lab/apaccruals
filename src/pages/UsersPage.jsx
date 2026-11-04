import React, { useCallback, useEffect, useState } from "react";
import MaintenanceDialog from "../components/MaintenanceDialog";
import MaintenanceSkeleton from "../components/MaintenanceSkeleton";
import MaintenanceTable from "../components/MaintenanceTable";
import { fetchUsers, updateUser } from "../lib/auth";
import { useToast } from "../lib/toast";

const userFields = [
  { name: "display_name", label: "Display Name", required: true, span: 2 },
  { name: "email", label: "Email", required: true, disabled: true, span: 2 },
  {
    name: "usergroup",
    label: "User Group",
    type: "select",
    required: true,
    options: ["accrual_user", "accrual_admin", "sysadmin"],
  },
  {
    name: "can_update_control_number",
    label: "Control Number Access",
    type: "select",
    required: true,
    options: [
      { value: "false", label: "No Access" },
      { value: "true", label: "Can Update" },
    ],
  },
  {
    name: "can_update_setup",
    label: "Setup Access",
    type: "select",
    required: true,
    options: [
      { value: "false", label: "No Access" },
      { value: "true", label: "Can Update" },
    ],
  },
];

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function UsersPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    id: null,
    display_name: "",
    email: "",
    usergroup: "accrual_user",
    can_update_control_number: "false",
    can_update_setup: "false",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const rows = await fetchUsers();
      setUsers(rows);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load users.");
      showToast(error.message || "Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleUsers = users.filter((user) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return [
      user.display_name,
      user.email,
      user.usergroup,
      user.can_update_control_number ? "control access" : "no control access",
      user.can_update_setup ? "setup access" : "no setup access",
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  const openEdit = (row) => {
    setFormValues({
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      usergroup: row.usergroup,
      can_update_control_number: String(Boolean(row.can_update_control_number)),
      can_update_setup: String(Boolean(row.can_update_setup)),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const updatedUser = await updateUser(formValues.id, {
        display_name: formValues.display_name.trim(),
        usergroup: formValues.usergroup,
        can_update_control_number: formValues.usergroup !== 'accrual_admin' && formValues.can_update_control_number === "true",
        can_update_setup: formValues.usergroup !== 'accrual_admin' && formValues.can_update_setup === "true",
      });
      window.dispatchEvent(
        new CustomEvent("app-user-updated", {
          detail: {
            id: updatedUser.id,
            auth_user_id: updatedUser.auth_user_id || null,
            email: updatedUser.email || "",
          },
        })
      );
      setDialogOpen(false);
      showToast("User updated successfully.", "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to update user.");
      showToast(error.message || "Unable to update user.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="contentPage managementPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">Users</h1>
          <p className="pageSubtitle">Review Google-authenticated users and assign the right access group.</p>
        </div>
        <div className="headerActions">
          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Search</span>
            <input
              className="input headerSearch"
              placeholder="Search by name, email, or group..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search users"
            />
          </label>
          <button type="button" className="tableActionBtn" onClick={loadData}>
            Refresh
          </button>
        </div>
      </div>
      <div className="managementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={6} rows={8} />
        ) : (
          <MaintenanceTable
            columns={[
              { key: "display_name", label: "Display Name" },
              { key: "email", label: "Email" },
              {
                key: "usergroup",
                label: "User Group",
                render: (row) => (
                  <span className={`statusPill${row.usergroup === "sysadmin" ? " success" : " warning"}`}>
                    {row.usergroup}
                  </span>
                ),
              },
              {
                key: "can_update_control_number",
                label: "Control Number Access",
                render: (row) => (
                  <span className={`statusPill${row.can_update_control_number ? " success" : " warning"}`}>
                    {row.can_update_control_number ? "Allowed" : "Not Allowed"}
                  </span>
                ),
              },
              {
                key: "can_update_setup",
                label: "Setup Access",
                render: (row) => (
                  <span className={`statusPill${row.can_update_setup ? " success" : " warning"}`}>
                    {row.can_update_setup ? "Allowed" : "Not Allowed"}
                  </span>
                ),
              },
              { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
              { key: "last_login_at", label: "Last Login", render: (row) => formatDateTime(row.last_login_at) },
            ]}
            rows={visibleUsers}
            emptyText="No users found."
            emptyHelperText="Users are created the first time they sign in with Google and complete their profile."
            onEdit={openEdit}
            deleteMessage=""
          />
        )}
      </div>

      <MaintenanceDialog
        open={dialogOpen}
        title="Edit User"
        description="Update the display name or assign the right access group."
        fields={userFields}
        values={formValues}
        onChange={(name, value) => setFormValues((current) => ({ ...current, [name]: value }))}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        submitLabel="Save User"
        saving={saving}
      />
    </div>
  );
}
