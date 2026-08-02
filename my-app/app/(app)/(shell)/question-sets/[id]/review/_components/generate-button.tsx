"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_GENERATED_QUESTIONS,
  MAX_GENERATED_QUESTIONS,
  MIN_GENERATED_QUESTIONS,
} from "@/lib/validation/question-set";

export function GenerateButton({
  questionSetId,
  hasPending,
}: {
  questionSetId: string;
  hasPending: boolean;
}) {
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState(DEFAULT_GENERATED_QUESTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/question-sets/${questionSetId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount }),
      });

      // A platform-level failure (e.g. the request exceeding the serverless
      // function's time limit) returns an HTML/plain-text error page instead
      // of JSON — res.json() would throw an opaque "not valid JSON" error in
      // that case, so parse defensively and fall back to a clear message.
      let data: { error?: string; questionCount?: number } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response, handled by the !res.ok branch below
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            `Generation failed (${res.status}). If you uploaded a lot of material, try a smaller batch — the request may have timed out.`
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-sans text-[13px] font-semibold text-ink">
          Questions to generate
          <input
            type="number"
            min={MIN_GENERATED_QUESTIONS}
            max={MAX_GENERATED_QUESTIONS}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            disabled={!hasPending || isGenerating}
            className="field-input h-9 w-[80px]"
          />
        </label>
        <button
          type="button"
          onClick={handleClick}
          disabled={isGenerating || !hasPending}
          className="flex h-[46px] w-fit items-center rounded-xl bg-ink px-5 font-sans text-sm font-bold text-cream disabled:opacity-50"
        >
          {isGenerating
            ? "Generating questions… this can take a minute"
            : hasPending
              ? "Generate questions from lecture"
              : "All uploaded files generated"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
