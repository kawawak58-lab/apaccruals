import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { addAccrualNote, fetchAccrualNotes } from "../lib/AccrualSubmissions";

const extensions = [StarterKit, Link.configure({ openOnClick: false, autolink: true })];

function noteHtml(body) {
  const value = String(body || "");
  if (/^\s*<(?:p|h[1-6]|ul|ol|blockquote|div)\b/i.test(value)) return value;
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
}

function NoteBody({ body }) {
  const editor = useEditor({ immediatelyRender: false, editable: false, extensions, content: "" });

  useEffect(() => {
    if (editor) editor.commands.setContent(noteHtml(body), false);
  }, [editor, body]);

  return <div className="accrualNoteBody"><EditorContent editor={editor} /></div>;
}

function authorInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

export default function AccrualNotesDialog({ submission, onClose, onCountChange }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loadedNotes = await fetchAccrualNotes(submission.id);
      setNotes(loadedNotes);
      onCountChange?.(submission.id, loadedNotes.length);
    } catch (loadError) {
      setError(loadError.message || "Unable to load notes.");
    } finally {
      setLoading(false);
    }
  }, [submission.id, onCountChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: "",
    editorProps: {
      attributes: { role: "textbox", "aria-label": "Add a note", "data-placeholder": "Write a note..." },
    },
    onUpdate: ({ editor: nextEditor }) => setBody(nextEditor.getHTML()),
  });

  useEffect(() => { void loadNotes(); }, [loadNotes]);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [notes]);

  const runCommand = (command) => { if (editor) command(editor.chain().focus()).run(); };
  const addLink = () => {
    if (!editor) return;
    const input = window.prompt("Enter a link URL");
    if (input === null) return;
    if (!input.trim()) { editor.chain().focus().unsetLink().run(); return; }
    const url = input.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      setError("Links must start with https://, http://, or mailto:.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!editor || editor.isEmpty || saving) return;
    const message = editor.getHTML();
    if (message.length > 20000) {
      setError("This note is too long. Remove some content before adding it.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const savedNote = await addAccrualNote(submission.id, message);
      setNotes((current) => [...current, savedNote]);
      onCountChange?.(submission.id, notes.length + 1);
      editor.commands.clearContent();
      setBody("");
    } catch (saveError) {
      setError(saveError.message || "Unable to add the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modalOverlay maintenanceOverlay">
      <div className="modalContent maintenanceDialog accrualNotesDialog" role="dialog" aria-modal="true" aria-labelledby="accrualNotesTitle">
        <div className="dialogHeader accrualNotesHeader">
          <div>
            <div className="accrualNotesTitleRow">
              <h2 className="modalTitle" id="accrualNotesTitle">Accrual notes</h2>
              <span className="accrualNotesCount" aria-label={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`} aria-live="polite">{notes.length}</span>
            </div>
            <p className="accrualNotesSubtitle"><span>Control</span><strong>{submission.control_number}</strong></p>
          </div>
          <button type="button" className="dialogClose" onClick={onClose} aria-label="Close notes" disabled={saving}>×</button>
        </div>
        <div className="accrualNotesToolbar">
          <div className="accrualNotesConversationLabel">
            <strong>Team conversation</strong>
            <span>{loading ? "Updating notes…" : "Shared notes for this accrual"}</span>
          </div>
          <button type="button" className="tableActionBtn" onClick={loadNotes} disabled={loading || saving}>Refresh notes</button>
        </div>
        <div className="accrualNotesList" ref={listRef} aria-live="polite">
          {loading && notes.length === 0 ? <p className="accrualNotesEmpty">Loading notes...</p> : null}
          {!loading && notes.length === 0 ? (
            <div className="accrualNotesEmptyState">
              <span className="accrualNotesEmptyIcon" aria-hidden="true">✎</span>
              <strong>No notes yet</strong>
              <p>Add a note below to start the conversation about this accrual.</p>
            </div>
          ) : null}
          {notes.map((note) => (
            <article className="accrualNote" key={note.id}>
              <div className="accrualNoteAvatar" aria-hidden="true">{authorInitials(note.author_name || note.author_email)}</div>
              <div className="accrualNoteMeta">
                <div><strong>{note.author_name || note.author_email}</strong><time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString()}</time></div>
                <NoteBody body={note.body} />
              </div>
            </article>
          ))}
        </div>
        <form className="accrualNotesComposer" onSubmit={handleAddNote}>
          {error ? <div className="inlineError" role="alert">{error}</div> : null}
          <div className="accrualNotesComposerHeading">
            <label>Add a note</label>
            <span>Share an update or context with your team.</span>
          </div>
          <div className="accrualNoteEditorShell">
            <div className="accrualNoteEditorToolbar" aria-label="Note formatting">
              <button type="button" onClick={() => runCommand((chain) => chain.toggleBold())} aria-label="Bold" title="Bold"><strong>B</strong></button>
              <button type="button" onClick={() => runCommand((chain) => chain.toggleItalic())} aria-label="Italic" title="Italic"><em>I</em></button>
              <button type="button" onClick={() => runCommand((chain) => chain.toggleBulletList())}>Bullets</button>
              <button type="button" onClick={() => runCommand((chain) => chain.toggleOrderedList())}>Numbered</button>
              <button type="button" onClick={addLink}>Link</button>
              <button type="button" onClick={() => runCommand((chain) => chain.undo())} aria-label="Undo">↶</button>
              <button type="button" onClick={() => runCommand((chain) => chain.redo())} aria-label="Redo">↷</button>
            </div>
            <EditorContent editor={editor} className="accrualNoteEditor" />
          </div>
          <div className="accrualNotesActions">
            <span>Paste text or use the formatting toolbar.</span>
            <button type="submit" className="submitBtn" disabled={!body || editor?.isEmpty || saving}>
              {saving ? "Adding..." : "Add note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
