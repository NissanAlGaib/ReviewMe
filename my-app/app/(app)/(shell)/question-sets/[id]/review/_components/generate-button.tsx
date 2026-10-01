"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_DIFFICULTY,
  DEFAULT_GENERATED_QUESTIONS,
  DIFFICULTIES,
  MAX_GENERATED_QUESTIONS,
  MIN_GENERATED_QUESTIONS,
  QUESTION_TYPE_LABELS,
} from "@/lib/validation/question-set";

type QuestionType = keyof typeof QUESTION_TYPE_LABELS;
type Difficulty = (typeof DIFFICULTIES)[number];

const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[];
const DEFAULT_TYPES: Record<QuestionType, boolean> = {
  MULTIPLE_CHOICE: true,
  TRUE_FALSE: true,
  IDENTIFICATION: false,
};

export function GenerateButton({
  questionSetId,
  hasPending,
}: {
  questionSetId: string;
  hasPending: boolean;
}) {
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState(DEFAULT_GENERATED_QUESTIONS);
  const [selectedTypes, setSelectedTypes] = useState(DEFAULT_TYPES);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleType(type: QuestionType) {
    setSelectedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  async function handleClick() {
    setError(null);

    const questionTypes = QUESTION_TYPES.filter((t) => selectedTypes[t]);
    if (questionTypes.length === 0) {
      setError("Select at least one question type.");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch(`/api/question-sets/${questionSetId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount, questionTypes, difficulty }),
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

  const disabled = !hasPending || isGenerating;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-sans text-[13px] font-semibold text-ink">
          Questions to generate
          <input
            type="number"
            min={MIN_GENERATED_QUESTIONS}
            max={MAX_GENERATED_QUESTIONS}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            disabled={disabled}
            className="field-input h-9 w-[80px]"
          />
        </label>
      </div>

      <div>
        <div className="field-label">Question types</div>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              disabled={disabled}
              className={`rounded-full border-[1.5px] border-ink px-3.5 py-1.5 font-sans text-xs font-semibold disabled:opacity-50 ${
                selectedTypes[type] ? "bg-ink text-cream" : "text-ink"
              }`}
            >
              {QUESTION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="field-label">Difficulty</div>
        <div className="flex w-fit gap-1 rounded-[10px] border-[1.5px] border-ink p-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              disabled={disabled}
              className={`rounded-[7px] px-4 py-2 font-sans text-[13px] font-bold disabled:opacity-50 ${
                difficulty === d ? "bg-ink text-cream" : "text-ink"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
