import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccrualNotesDialog from "./AccrualNotesDialog";
import { addAccrualNote, fetchAccrualNotes } from "../lib/AccrualSubmissions";

jest.mock("@tiptap/extension-link", () => ({ __esModule: true, default: { configure: () => ({}) } }));
jest.mock("@tiptap/starter-kit", () => ({ __esModule: true, default: {} }));
jest.mock("@tiptap/react", () => {
  const React = require("react");
  return {
    useEditor: (config) => {
      const [html, setHtml] = React.useState(config.content || "");
      const editorRef = React.useRef(null);
      if (!editorRef.current) {
        const editor = {
          html,
          config,
          setHtml,
          getHTML: () => editor.html,
          get isEmpty() { return !editor.html || editor.html === "<p></p>"; },
          commands: {
            setContent: (content) => { editor.html = content; setHtml(content); },
            clearContent: () => { editor.html = ""; setHtml(""); config.onUpdate?.({ editor }); },
          },
          chain: () => {
            const chain = {
              focus: () => chain,
              run: () => true,
            };
            return chain;
          },
        };
        editorRef.current = editor;
      }
      editorRef.current.html = html;
      editorRef.current.config = config;
      editorRef.current.setHtml = setHtml;
      return editorRef.current;
    },
    EditorContent: ({ editor }) => (
      <div
        role={editor.config.editorProps?.attributes?.role}
        aria-label={editor.config.editorProps?.attributes?.["aria-label"]}
        onChange={(event) => {
          editor.html = `<p>${event.target.value}</p>`;
          editor.setHtml(editor.html);
          editor.config.onUpdate?.({ editor });
        }}
      >
        {editor.config.editorProps?.attributes?.role
          ? <input aria-label="Note text" onChange={(event) => {
            editor.html = `<p>${event.target.value}</p>`;
            editor.setHtml(editor.html);
            editor.config.onUpdate?.({ editor });
          }} />
          : <span>{editor.html.replace(/<[^>]*>/g, "")}</span>}
      </div>
    ),
  };
});
jest.mock("../lib/AccrualSubmissions", () => ({
  fetchAccrualNotes: jest.fn(),
  addAccrualNote: jest.fn(),
}));

test("shows the conversation and saves formatted note content", async () => {
  fetchAccrualNotes.mockResolvedValue([{
    id: 1, author_name: "Alex", body: "Please review the invoice.", created_at: "2026-10-28T08:00:00Z",
  }]);
  addAccrualNote.mockResolvedValue({
    id: 2, author_name: "Sam", body: "<p>Invoice reviewed.</p>", created_at: "2026-10-28T09:00:00Z",
  });

  const onCountChange = jest.fn();
  render(<AccrualNotesDialog submission={{ id: 42, control_number: "ACT000042" }} onClose={jest.fn()} onCountChange={onCountChange} />);
  expect(await screen.findByText("Please review the invoice.")).toBeInTheDocument();
  expect(screen.getByLabelText("1 note")).toHaveTextContent("1");
  expect(onCountChange).toHaveBeenCalledWith(42, 1);
  fireEvent.change(screen.getByLabelText("Note text"), { target: { value: "Invoice reviewed." } });
  fireEvent.click(screen.getByRole("button", { name: "Add note" }));
  await waitFor(() => expect(addAccrualNote).toHaveBeenCalledWith(42, "<p>Invoice reviewed.</p>"));
  expect(await screen.findByText("Invoice reviewed.")).toBeInTheDocument();
  expect(screen.getByLabelText("2 notes")).toHaveTextContent("2");
  expect(onCountChange).toHaveBeenLastCalledWith(42, 2);
});

test('archived conversations can be read but have no note composer', async () => {
  fetchAccrualNotes.mockResolvedValue([{ id: 1, author_name: 'Alex', body: 'Archived note', created_at: '2026-10-28T08:00:00Z' }]);
  render(<AccrualNotesDialog submission={{ id: 42, control_number: 'ACT000042' }} onClose={jest.fn()} readOnly />);
  expect(await screen.findByText('Archived note')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Note text')).not.toBeInTheDocument();
});
