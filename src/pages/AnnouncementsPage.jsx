import React, { useCallback, useEffect, useState } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import MaintenanceSkeleton from "../components/MaintenanceSkeleton";
import { deleteRecord, fetchCollection, insertRecord, updateRecord } from "../lib/adminCrud";
import { useToast } from "../lib/toast";

const announcementTypes = [
  "System Update",
  "Maintenance",
  "Reminder",
  "Policy Change",
];

const emptyForm = {
  id: null,
  title: "",
  detail: "",
  image: "",
  type: "System Update",
  expires: "",
  active: true,
};

function formatDate(value, emptyLabel = "-") {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function sanitizeAnnouncementHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function stripHtml(detail) {
  return String(detail || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function getAnnouncementSummary(detail) {
  return stripHtml(detail)
    .split(/\n+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

function formatAnnouncementHtml(detail) {
  const sanitized = sanitizeAnnouncementHtml(detail);
  if (/<[a-z][\s\S]*>/i.test(sanitized)) {
    return sanitized;
  }

  return String(detail || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function normalizeAnnouncementEditorHtml(detail) {
  return formatAnnouncementHtml(detail).replace(/<(\/?)h[1-6]\b/gi, "<$1p");
}

function AnnouncementActions({ onEdit, onDelete }) {
  return (
    <div className="announcementActions">
      <button type="button" className="announcementIconBtn" onClick={onEdit} aria-label="Edit announcement">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button type="button" className="announcementIconBtn danger" onClick={onDelete} aria-label="Delete announcement">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}

function AnnouncementModal({ open, mode, form, saving, onChange, onClose, onSubmit, onUpload }) {
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "data-placeholder": "Write the announcement details here...",
      },
    },
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image,
    ],
    content: normalizeAnnouncementEditorHtml(form.detail),
    onUpdate: ({ editor: nextEditor }) => {
      onChange("detail", sanitizeAnnouncementHtml(nextEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextHtml = normalizeAnnouncementEditorHtml(form.detail);
    const currentHtml = sanitizeAnnouncementHtml(editor.getHTML());
    if (sanitizeAnnouncementHtml(nextHtml) === currentHtml) {
      return;
    }

    editor.commands.setContent(nextHtml, false);
  }, [editor, form.detail]);

  if (!open) {
    return null;
  }

  const runEditorCommand = (callback) => {
    if (!editor) {
      return;
    }

    callback(editor.chain().focus()).run();
  };

  const toolbarButtons = [
    {
      label: "H2",
      isActive: editor?.isActive("heading", { level: 2 }),
      onClick: () => runEditorCommand((chain) => chain.toggleHeading({ level: 2 })),
    },
    {
      label: "H3",
      isActive: editor?.isActive("heading", { level: 3 }),
      onClick: () => runEditorCommand((chain) => chain.toggleHeading({ level: 3 })),
    },
    {
      label: "Bold",
      isActive: editor?.isActive("bold"),
      onClick: () => runEditorCommand((chain) => chain.toggleBold()),
    },
    {
      label: "Italic",
      isActive: editor?.isActive("italic"),
      onClick: () => runEditorCommand((chain) => chain.toggleItalic()),
    },
    {
      label: "Bullets",
      isActive: editor?.isActive("bulletList"),
      onClick: () => runEditorCommand((chain) => chain.toggleBulletList()),
    },
    {
      label: "Numbered",
      isActive: editor?.isActive("orderedList"),
      onClick: () => runEditorCommand((chain) => chain.toggleOrderedList()),
    },
    {
      label: "Link",
      isActive: editor?.isActive("link"),
      onClick: () => {
        if (!editor) {
          return;
        }
        const url = window.prompt("Enter the link URL");
        if (url === null) {
          return;
        }

        if (!url.trim()) {
          editor.chain().focus().unsetLink().run();
          return;
        }

        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      },
    },
    {
      label: "Embed Image",
      onClick: () => {
        const url = window.prompt("Enter the image URL");
        if (!url) {
          return;
        }
        runEditorCommand((chain) => chain.setImage({ src: url.trim() }));
      },
    },
    {
      label: "Undo",
      disabled: !editor?.can().chain().focus().undo().run(),
      onClick: () => runEditorCommand((chain) => chain.undo()),
    },
    {
      label: "Redo",
      disabled: !editor?.can().chain().focus().redo().run(),
      onClick: () => runEditorCommand((chain) => chain.redo()),
    },
    {
      label: "Clear",
      onClick: () => {
        if (!editor) {
          return;
        }

        editor.chain().focus().clearNodes().unsetAllMarks().run();
      },
    },
  ];

  return (
    <div className="announcementModalBackdrop" role="presentation">
      <div
        className="announcementModal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit Announcement" : "Add Announcement"}
      >
        {saving ? (
          <div className="announcementSavingOverlay" aria-live="polite">
            <div className="announcementSavingOverlayCard">
              <div className="announcementLoader" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path d="M64 32C28.7 32 0 60.7 0 96v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V352c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm56 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z" />
                </svg>
                <span />
              </div>
              <div className="announcementSavingOverlayText">Saving announcement...</div>
            </div>
          </div>
        ) : null}
        <div className="announcementModalHeader">
          <h2>{mode === "edit" ? "Edit Announcement" : "Add Announcement"}</h2>
          <button type="button" className="announcementModalClose" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className="announcementModalBody">
          <label className="announcementField">
            <span>Title</span>
            <input
              className="announcementInput"
              value={form.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="Enter announcement title"
            />
          </label>

          <div className="announcementEditorGrid">
            <label className="announcementField">
              <span>Detail</span>
              <div className="announcementEditorShell">
                <div className="announcementEditorToolbar">
                  {toolbarButtons.map((button) => (
                    <button
                      key={button.label}
                      type="button"
                      className={`announcementToolbarBtn${button.isActive ? " isActive" : ""}`}
                      onClick={button.onClick}
                      disabled={button.disabled}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
                <EditorContent editor={editor} className="announcementRichEditor" />
              </div>
            </label>

            <div className="announcementField">
              <span>Announcement Image (optional)</span>
              <div className="announcementUploadActions">
                <label className="announcementUploadBtn">
                  Upload
                  <input type="file" accept="image/*" onChange={onUpload} hidden />
                </label>
                <button type="button" className="announcementRemoveBtn" onClick={() => onChange("image", "")}>
                  Remove
                </button>
              </div>
              <p className="announcementHelper">You can also paste an image URL below.</p>
              <input
                className="announcementInput"
                value={form.image}
                onChange={(event) => onChange("image", event.target.value)}
                placeholder="https://example.com/announcement-image.png"
              />
              <div className="announcementImagePreview">
                {form.image ? <img src={form.image} alt="Announcement preview" /> : <span>No image selected</span>}
              </div>
            </div>
          </div>

          <div className="announcementMetaGrid">
            <label className="announcementField">
              <span>Type</span>
              <select className="announcementInput" value={form.type} onChange={(event) => onChange("type", event.target.value)}>
                {announcementTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <div className="announcementField">
              <span>Status</span>
              <label className="announcementCheckbox">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => onChange("active", event.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>

            <label className="announcementField">
              <span>Expiry Date (optional)</span>
              <input
                type="date"
                className="announcementInput"
                value={form.expires}
                onChange={(event) => onChange("expires", event.target.value)}
              />
            </label>
          </div>

          <p className="announcementHelper">Expired announcements are hidden from login/public view.</p>
        </div>

        <div className="announcementModalFooter">
          <button type="button" className="announcementSecondaryBtn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="announcementPrimaryBtn" onClick={onSubmit} disabled={saving}>
            {saving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const rows = await fetchCollection({
        table: "announcements",
        orderBy: "published_at",
        ascending: false,
        search: debouncedSearch.trim(),
        searchColumns: ["title", "detail", "announcement_type"],
      });
      setAnnouncements(rows);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load announcements.");
      showToast(error.message || "Failed to load announcements.", "error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setModalMode("create");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (announcement) => {
    setModalMode("edit");
    setForm({
      id: announcement.id,
      title: announcement.title || "",
      detail: announcement.detail || "",
      image: announcement.image_url || "",
      type: announcement.announcement_type || "System Update",
      expires: announcement.expires_at || "",
      active: Boolean(announcement.is_active),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setForm(emptyForm);
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleUpload = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: reader.result || "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    const detail = form.detail.trim();

    if (!title || !detail) {
      setErrorMessage("Title and detail are required.");
      showToast("Title and detail are required.", "error");
      return;
    }

    const payload = {
      title,
      detail,
      image_url: form.image.trim() || null,
      announcement_type: form.type,
      expires_at: form.expires || null,
      is_active: form.active,
    };

    setSaving(true);
    setErrorMessage("");

    try {
      if (form.id) {
        await updateRecord("announcements", form.id, payload);
        showToast("Announcement updated successfully.", "success");
      } else {
        await insertRecord("announcements", payload);
        showToast("Announcement created successfully.", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save announcement.");
      showToast(error.message || "Unable to save announcement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setErrorMessage("");

    try {
      await deleteRecord("announcements", id);
      showToast("Announcement deleted successfully.", "success");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete announcement.");
      showToast(error.message || "Unable to delete announcement.", "error");
    }
  };

  return (
    <div className="contentPage managementPage">
      <div className="pageIntro">
        <div>
          <h1 className="pageTitle">Announcement</h1>
          <p className="pageSubtitle">Publish internal notices and updates for accrual users in a richer admin layout.</p>
        </div>
        <div className="headerActions">
          <label className="headerFieldGroup">
            <span className="headerFieldLabel">Search</span>
            <input
              className="input headerSearch"
              placeholder="Search announcements..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search announcements"
            />
          </label>
          <button type="button" className="submitBtn" onClick={openCreate}>
            Add Announcement
          </button>
        </div>
      </div>

      <div className="managementPanel announcementPanel">
        {errorMessage ? <div className="inlineError">{errorMessage}</div> : null}

        {loading ? (
          <MaintenanceSkeleton columns={6} rows={4} />
        ) : (
          <div className="announcementTableShell">
            <table className="announcementTable">
              <thead>
                <tr>
                  <th className="announcementTitleCol">Title</th>
                  <th>Type</th>
                  <th>Published</th>
                  <th>Expires</th>
                  <th>Active</th>
                  <th className="announcementActionsCol">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.length ? (
                  announcements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className="announcementRow"
                      onDoubleClick={() => openEdit(announcement)}
                      title="Double-click to edit announcement"
                    >
                      <td>
                        <div className="announcementTitleCell">
                          {announcement.image_url ? (
                            <div className="announcementThumb">
                              <img src={announcement.image_url} alt={announcement.title} />
                            </div>
                          ) : (
                            <div className="announcementThumb placeholder">
                              <span>{announcement.title.slice(0, 1).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="announcementTitleContent">
                            <h3>{announcement.title}</h3>
                            <p className="announcementSummary">{getAnnouncementSummary(announcement.detail)}</p>
                            <div
                              className="announcementBodyPreview"
                              dangerouslySetInnerHTML={{ __html: formatAnnouncementHtml(announcement.detail) }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="announcementPill">{announcement.announcement_type}</span>
                      </td>
                      <td>
                        <span className="announcementDateText">{formatDate(announcement.published_at)}</span>
                      </td>
                      <td>
                        <span className="announcementDateText subtle">{formatDate(announcement.expires_at, "No expiry")}</span>
                      </td>
                      <td>
                        <span className={`announcementPill status${announcement.is_active ? " active" : ""}`}>
                          {announcement.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <AnnouncementActions
                          onEdit={() => openEdit(announcement)}
                          onDelete={() => handleDelete(announcement.id)}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="emptyTableCell">
                      <div className="emptyStateBlock">
                        <strong>No announcements found.</strong>
                        <span className="emptyStateHelper">Create a new announcement or adjust your search keyword.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnnouncementModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        saving={saving}
        onChange={handleChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onUpload={handleUpload}
      />
    </div>
  );
}
