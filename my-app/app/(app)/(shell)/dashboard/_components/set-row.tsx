"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteQuestionSet } from "@/actions/question-sets";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <Link
            href={`/question-sets/${set.id}/review`}
            className="font-sans text-xs font-semibold text-muted no-underline hover:text-ink hover:underline"
          >
            Edit
          </Link>
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
