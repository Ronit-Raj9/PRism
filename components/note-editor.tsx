"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { updateNoteAction } from "@/app/actions/saved";

export function NoteEditor({
  username,
  initialNote,
}: {
  username: string;
  initialNote: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(initialNote ?? "");
  const [pending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  function commit() {
    if (draft === saved) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await updateNoteAction(username, draft);
        setSaved(draft);
        setEditing(false);
      } catch {
        // swallow — draft preserved for retry
      }
    });
  }

  function cancel() {
    setDraft(saved);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group block w-full rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-left text-xs text-neutral-500 transition hover:border-neutral-400 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-950"
        title="Click to edit your private note"
      >
        {saved ? (
          <span className="block whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
            <span className="mr-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              note
            </span>
            {saved}
          </span>
        ) : (
          <span className="text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
            + Add a private note about this person…
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-amber-400 bg-amber-50/40 p-2 dark:border-amber-600 dark:bg-amber-950/20">
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        rows={3}
        placeholder="Private note (only visible to you)…"
        className="w-full resize-y rounded border-0 bg-transparent text-xs outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
      />
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
        <span>⌘/Ctrl + Enter to save · Esc to cancel</span>
        <span className="flex gap-1">
          <button
            onClick={cancel}
            disabled={pending}
            className="rounded px-2 py-0.5 hover:bg-neutral-200 disabled:opacity-50 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={commit}
            disabled={pending}
            className="rounded bg-neutral-900 px-2 py-0.5 text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </span>
      </div>
    </div>
  );
}
