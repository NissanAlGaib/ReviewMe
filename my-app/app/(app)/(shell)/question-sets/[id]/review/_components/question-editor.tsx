"use client";

import { useState } from "react";

import { saveReviewedQuestions } from "@/actions/question-sets";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";

type Choice = { label: string; text: string };

type EditableQuestion = {
  key: string;
  type: QuestionType;
  questionText: string;
  topic: string;
  choices: Choice[] | null;
  correctAnswer: string;
  explanation: string;
  aiConfidence: string | null;
};

type InitialQuestion = {
  id: string;
  type: QuestionType;
  questionText: string;
  topic: string | null;
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
    topic: q.topic ?? "",
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
    topic: "",
    choices: [
      { label: "A", text: "" },
      { label: "B", text: "" },
    ],
    correctAnswer: "",
    explanation: "",
    aiConfidence: null,
  };
}

const selectClass =
  "inline-block w-fit rounded-lg border-[1.5px] border-ink/30 bg-transparent px-3 py-1.5 font-sans text-[13px] font-semibold text-ink outline-none";
const textInputClass =
  "w-full rounded-[10px] border-[1.5px] border-ink/20 bg-transparent px-3.5 py-2.5 font-sans text-sm leading-relaxed text-ink outline-none focus:border-ink";

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
          topic: q.topic.trim() || null,
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
    <>
      <div className="flex flex-col gap-[14px]">
      {questions.map((q, i) => (
        <div
          key={q.key}
          className="flex flex-col gap-[14px] rounded-[14px] border-[1.5px] border-ink p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold tracking-[.06em] text-faint">
              QUESTION {i + 1}
            </span>
            <div className="flex items-center gap-3">
              {q.aiConfidence === "low" && (
                <span className="rounded-full bg-[#fef3c7] px-2.5 py-[3px] font-sans text-[11px] font-bold text-[#92400e]">
                  Low confidence — double-check
                </span>
              )}
              <button
                type="button"
                onClick={() => removeQuestion(q.key)}
                className="font-sans text-xs font-semibold text-[#b91c1c] hover:underline"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <div>
              <div className="field-label">Type</div>
              <select
                value={q.type}
                onChange={(e) => changeType(q.key, e.target.value as QuestionType)}
                className={selectClass}
              >
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="IDENTIFICATION">Identification</option>
              </select>
            </div>

            <div>
              <div className="field-label">Topic (optional)</div>
              <input
                value={q.topic}
                onChange={(e) => updateQuestion(q.key, { topic: e.target.value })}
                placeholder="e.g. Assessment"
                className={selectClass}
              />
            </div>
          </div>

          <div>
            <div className="field-label">Question text</div>
            <textarea
              value={q.questionText}
              onChange={(e) => updateQuestion(q.key, { questionText: e.target.value })}
              rows={2}
              className={textInputClass}
            />
          </div>

          {q.type === "MULTIPLE_CHOICE" && q.choices && (
            <div>
              <div className="field-label">Choices</div>
              <div className="flex flex-col gap-2">
                {q.choices.map((choice, index) => {
                  const isCorrect = choice.label !== "" && choice.label === q.correctAnswer;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={choice.label}
                        onChange={(e) => updateChoice(q.key, index, { label: e.target.value })}
                        className={`w-9 rounded-lg border-[1.5px] py-1.5 text-center font-mono text-[13px] font-bold ${
                          isCorrect
                            ? "border-ink bg-ink text-cream"
                            : "border-ink/20 bg-transparent text-ink"
                        }`}
                      />
                      <input
                        value={choice.text}
                        onChange={(e) => updateChoice(q.key, index, { text: e.target.value })}
                        className={`flex-1 rounded-lg border-[1.5px] px-3 py-1.5 font-sans text-[13px] outline-none focus:border-ink ${
                          isCorrect ? "border-ink bg-[#faf6e9] font-semibold" : "border-ink/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => removeChoice(q.key, index)}
                        className="font-sans text-xs font-semibold text-[#b91c1c] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addChoice(q.key)}
                  className="w-fit font-sans text-xs font-semibold text-amber hover:underline"
                >
                  + Add choice
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="field-label">Correct answer</div>
            {q.type === "MULTIPLE_CHOICE" && q.choices ? (
              <select
                value={q.correctAnswer}
                onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                className={selectClass}
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
                className={selectClass}
              >
                <option value="">Select…</option>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            ) : (
              <input
                value={q.correctAnswer}
                onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                className={textInputClass}
              />
            )}
          </div>

          <div>
            <div className="field-label">Explanation (optional)</div>
            <textarea
              value={q.explanation}
              onChange={(e) => updateQuestion(q.key, { explanation: e.target.value })}
              rows={2}
              className={textInputClass}
            />
          </div>
        </div>
      ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-7 mt-[14px] flex flex-col gap-3 border-t-[1.5px] border-ink bg-paper px-7 py-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addQuestion}
            className="flex h-[42px] w-fit items-center rounded-[10px] border-[1.5px] border-ink px-[18px] font-sans text-[13px] font-bold text-ink"
          >
            + Add question
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-[46px] w-fit items-center rounded-xl bg-ink px-5 font-sans text-sm font-bold text-cream disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save and mark ready"}
          </button>
        </div>
      </div>
    </>
  );
}
