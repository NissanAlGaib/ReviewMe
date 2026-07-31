"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteQuestionSet, updateQuestionSetInfo } from "@/actions/question-sets";
import { Stamp } from "../../_components/stamp";

type SetRowData = {
  id: string;
  title: string;
  examType: string | null;
  status: "DRAFT" | "READY";
  questionCount: number;
};

export function SetRow({ set }: { set: SetRowData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(set.title);
  const [examType, setExamType] = useState(set.examType ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateQuestionSetInfo({
        questionSetId: set.id,
        title: title.trim(),
        examType: examType.trim() || undefined,
      });
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setTitle(set.title);
    setExamType(set.examType ?? "");
    setError(null);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${set.title}"? This removes all its questions and quiz history and can't be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteQuestionSet(set.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-dashed border-ink/40 bg-paper p-4"
      >
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[160px] flex-1">
            <div className="field-label">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field-input"
            />
          </div>
          <div className="min-w-[120px] flex-1">
            <div className="field-label">Exam type</div>
            <input
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="field-input"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-9 w-fit items-center rounded-[8px] bg-ink px-4 font-sans text-xs font-bold text-cream disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSaving}
            className="font-sans text-xs font-semibold text-muted hover:underline"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="ticket-row flex overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-paper">
        <Link
          href={
            set.status === "READY"
              ? `/question-sets/${set.id}/quiz`
              : `/question-sets/${set.id}/review`
          }
          className="flex flex-1 items-stretch no-underline"
        >
          <div className="flex w-[84px] flex-none flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-cream/40 bg-ink text-cream">
            <span className="font-mono text-xl font-bold">{set.questionCount}</span>
            <span className="font-mono text-[9px] font-semibold tracking-[.06em] opacity-70">
              ITEMS
            </span>
          </div>
          <div className="flex flex-1 items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <div className="font-sans text-sm font-bold text-ink">{set.title}</div>
              <div className="mt-0.5 font-sans text-xs font-medium text-muted">
                {set.examType ? `${set.examType} · ` : ""}
                {set.questionCount} question{set.questionCount === 1 ? "" : "s"}
              </div>
            </div>
            <Stamp label={set.status} color={set.status === "READY" ? "green" : "amber"} />
          </div>
        </Link>
        <div className="flex flex-none items-center gap-3 border-l border-ink/10 px-4">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="font-sans text-xs font-semibold text-muted hover:text-ink hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-sans text-xs font-semibold text-[#b91c1c] hover:underline disabled:opacity-50"
          >
            {isDeleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
