"use client";

import { useState } from "react";

import { saveReviewedQuestions } from "@/actions/question-sets";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";

type Choice = { label: string; text: string };

type EditableQuestion = {
  key: string;
  type: QuestionType;
  questionText: string;
  choices: Choice[] | null;
  correctAnswer: string;
  explanation: string;
  aiConfidence: string | null;
};

type InitialQuestion = {
  id: string;
  type: QuestionType;
  questionText: string;
  choices: unknown;
  correctAnswer: string;
  explanation: string | null;
  aiConfidence: string | null;
};

function toEditable(q: InitialQuestion): EditableQuestion {
  return {
    key: q.id,
    type: q.type,
    questionText: q.questionText,
    choices: Array.isArray(q.choices) ? (q.choices as Choice[]) : null,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? "",
    aiConfidence: q.aiConfidence,
  };
}

function blankQuestion(): EditableQuestion {
  return {
    key: crypto.randomUUID(),
    type: "MULTIPLE_CHOICE",
    questionText: "",
    choices: [
      { label: "A", text: "" },
      { label: "B", text: "" },
    ],
    correctAnswer: "",
    explanation: "",
    aiConfidence: null,
  };
}

export function QuestionEditor({
  questionSetId,
  initialQuestions,
}: {
  questionSetId: string;
  initialQuestions: InitialQuestion[];
}) {
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    initialQuestions.map(toEditable)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(key: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function removeQuestion(key: string) {
    setQuestions((prev) => prev.filter((q) => q.key !== key));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
  }

  function changeType(key: string, type: QuestionType) {
    updateQuestion(key, {
      type,
      choices:
        type === "MULTIPLE_CHOICE"
          ? [
              { label: "A", text: "" },
              { label: "B", text: "" },
            ]
          : null,
      correctAnswer: "",
    });
  }

  function updateChoice(key: string, index: number, patch: Partial<Choice>) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key || !q.choices) return q;
        const choices = q.choices.map((c, i) => (i === index ? { ...c, ...patch } : c));
        return { ...q, choices };
      })
    );
  }

  function addChoice(key: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key || !q.choices) return q;
        const nextLabel = String.fromCharCode(65 + q.choices.length);
        return { ...q, choices: [...q.choices, { label: nextLabel, text: "" }] };
      })
    );
  }

  function removeChoice(key: string, index: number) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key || !q.choices) return q;
        return { ...q, choices: q.choices.filter((_, i) => i !== index) };
      })
    );
  }

  async function handleSave() {
    setError(null);

    if (questions.length === 0) {
      setError("Add at least one question before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await saveReviewedQuestions({
        questionSetId,
        questions: questions.map((q, index) => ({
          order: index,
          type: q.type,
          questionText: q.questionText,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong saving.");
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q, i) => (
        <div
          key={q.key}
          className="flex flex-col gap-3 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">Question {i + 1}</span>
            <div className="flex items-center gap-3">
              {q.aiConfidence === "low" && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                  Low confidence — double-check
                </span>
              )}
              <button
                type="button"
                onClick={() => removeQuestion(q.key)}
                className="text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Type</label>
            <select
              value={q.type}
              onChange={(e) => changeType(q.key, e.target.value as QuestionType)}
              className="w-fit rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
            >
              <option value="MULTIPLE_CHOICE">Multiple choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="IDENTIFICATION">Identification</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Question text
            </label>
            <textarea
              value={q.questionText}
              onChange={(e) => updateQuestion(q.key, { questionText: e.target.value })}
              rows={2}
              className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.145] dark:focus:border-zinc-50"
            />
          </div>

          {q.type === "MULTIPLE_CHOICE" && q.choices && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Choices
              </label>
              {q.choices.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={choice.label}
                    onChange={(e) => updateChoice(q.key, index, { label: e.target.value })}
                    className="w-12 rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
                  />
                  <input
                    value={choice.text}
                    onChange={(e) => updateChoice(q.key, index, { text: e.target.value })}
                    className="flex-1 rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(q.key, index)}
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChoice(q.key)}
                className="w-fit text-xs text-zinc-600 hover:underline dark:text-zinc-400"
              >
                + Add choice
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Correct answer
            </label>
            {q.type === "MULTIPLE_CHOICE" && q.choices ? (
              <select
                value={q.correctAnswer}
                onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                className="w-fit rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
              >
                <option value="">Select the correct choice…</option>
                {q.choices.map((choice, index) => (
                  <option key={index} value={choice.label}>
                    {choice.label}
                  </option>
                ))}
              </select>
            ) : q.type === "TRUE_FALSE" ? (
              <select
                value={q.correctAnswer}
                onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                className="w-fit rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm dark:border-white/[.145]"
              >
                <option value="">Select…</option>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            ) : (
              <input
                value={q.correctAnswer}
                onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Explanation (optional)
            </label>
            <textarea
              value={q.explanation}
              onChange={(e) => updateQuestion(q.key, { explanation: e.target.value })}
              rows={2}
              className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.145] dark:focus:border-zinc-50"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-fit rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/[.145] dark:hover:bg-zinc-900"
      >
        + Add question
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-fit rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isSaving ? "Saving…" : "Save and mark ready"}
      </button>
    </div>
  );
}
