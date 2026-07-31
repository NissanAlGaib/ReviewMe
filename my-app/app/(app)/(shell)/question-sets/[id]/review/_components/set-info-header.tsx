"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateQuestionSetInfo } from "@/actions/question-sets";

export function SetInfoHeader({
  questionSetId,
  title,
  examType,
  status,
  fileCount,
}: {
  questionSetId: string;
  title: string;
  examType: string | null;
  status: string;
  fileCount: number;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [examTypeValue, setExamTypeValue] = useState(examType ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (!titleValue.trim()) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateQuestionSetInfo({
        questionSetId,
        title: titleValue.trim(),
        examType: examTypeValue.trim() || undefined,
      });
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-dashed border-ink/40 p-4"
      >
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="field-label">Title</div>
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="field-input"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <div className="field-label">Exam type</div>
            <input
              value={examTypeValue}
              onChange={(e) => setExamTypeValue(e.target.value)}
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
            onClick={() => {
              setIsEditing(false);
              setTitleValue(title);
              setExamTypeValue(examType ?? "");
              setError(null);
            }}
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="font-sans text-2xl font-extrabold tracking-tight text-ink">{title}</div>
        <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
          {fileCount} file{fileCount === 1 ? "" : "s"} uploaded · status: {status}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="font-sans text-xs font-semibold text-muted hover:text-ink hover:underline"
      >
        Rename
      </button>
    </div>
  );
}
