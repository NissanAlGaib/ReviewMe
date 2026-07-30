"use client";

import { useState } from "react";

import { submitQuizAttempt } from "@/actions/quiz";

type Choice = { label: string; text: string };

type QuizQuestion = {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";
  questionText: string;
  choices: unknown;
};

export function QuizForm({
  questionSetId,
  questions,
}: {
  questionSetId: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitQuizAttempt({
        questionSetId,
        answers: questions.map((q) => ({
          questionId: q.id,
          userAnswer: answers[q.id] ?? null,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {questions.map((q, i) => {
        const choices = Array.isArray(q.choices) ? (q.choices as Choice[]) : null;

        return (
          <div
            key={q.id}
            className="flex flex-col gap-3 rounded-md border border-black/[.08] p-4 dark:border-white/[.145]"
          >
            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
              {i + 1}. {q.questionText}
            </p>

            {q.type === "MULTIPLE_CHOICE" && choices && (
              <div className="flex flex-col gap-2">
                {choices.map((choice, index) => (
                  <label key={index} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      value={choice.label}
                      checked={answers[q.id] === choice.label}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <span>
                      {choice.label}. {choice.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "TRUE_FALSE" && (
              <div className="flex gap-4">
                {["True", "False"].map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "IDENTIFICATION" && (
              <input
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.145] dark:focus:border-zinc-50"
              />
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? "Submitting…" : "Submit answers"}
      </button>
    </form>
  );
}
