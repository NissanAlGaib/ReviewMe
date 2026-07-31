"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { submitQuizAttempt } from "@/actions/quiz";

type Choice = { label: string; text: string };

type QuizQuestion = {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";
  questionText: string;
  topic: string | null;
  choices: unknown;
};

const TRUE_FALSE_CHOICES: Choice[] = [
  { label: "True", text: "True" },
  { label: "False", text: "False" },
];

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function QuizForm({
  questionSetId,
  questions,
}: {
  questionSetId: string;
  questions: QuizQuestion[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(300, questions.length * 120));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The countdown's interval is created once on mount; it must always see the
  // latest answers when it auto-submits, so state is mirrored into a ref
  // rather than read from the (stale) closure captured at mount time.
  const answersRef = useRef<Record<string, string>>({});
  const submittedRef = useRef(false);

  const total = questions.length;
  const question = questions[index];
  const choices =
    question.type === "TRUE_FALSE"
      ? TRUE_FALSE_CHOICES
      : Array.isArray(question.choices)
        ? (question.choices as Choice[])
        : null;
  const answeredCount = Object.values(answers).filter((v) => v.trim() !== "").length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    try {
      await submitQuizAttempt({
        questionSetId,
        answers: questions.map((q) => ({
          questionId: q.id,
          userAnswer: answersRef.current[q.id] ?? null,
        })),
      });
    } catch (err) {
      submittedRef.current = false;
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : "Something went wrong submitting.");
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // Intentionally runs once: `submit` reads live values via refs, so it
    // doesn't need to be in the dependency array (and adding it would reset
    // the interval — and the countdown — on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAnswer(value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [question.id]: value };
      answersRef.current = next;
      return next;
    });
  }

  function goNext() {
    if (index >= total - 1) {
      submit();
      return;
    }
    setIndex((i) => i + 1);
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function handleBack() {
    if (index > 0) {
      goPrev();
      return;
    }
    if (window.confirm("Exit this quiz? Your progress won't be saved.")) {
      router.push("/dashboard");
    }
  }

  function toggleFlag() {
    setFlagged((prev) => ({ ...prev, [question.id]: !prev[question.id] }));
  }

  const isFlagged = !!flagged[question.id];
  const lowTime = secondsLeft < 60;

  return (
    <div className="ticket flex flex-col">
      <div className="rounded-t-[18px] bg-ink px-[22px] pt-[18px] pb-4 text-cream">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label={index === 0 ? "Exit quiz" : "Previous question"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/35 font-sans text-[17px] font-semibold"
          >
            {index === 0 ? "×" : "‹"}
          </button>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[.09em] opacity-75">
            {question.topic || "General"}
          </div>
          <div
            className={`font-mono text-base font-bold ${lowTime ? "text-red-400" : "text-cream"}`}
          >
            {formatTime(secondsLeft)}
          </div>
        </div>
        <div className="mt-4 flex gap-[5px]">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`h-[5px] flex-1 rounded-[3px] ${
                i < index ? "bg-cream" : i === index ? "bg-amber" : "bg-cream/15"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="perf" />

      <div key={question.id} className="flex-1 px-6 pt-[26px]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[13px] font-bold text-amber">
            Q{String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-xs font-medium text-faint">
            / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="ticket-pop mt-1 font-sans text-[23px] leading-[1.35] font-bold tracking-[-.015em] text-ink">
          {question.questionText}
        </div>

        {question.type !== "IDENTIFICATION" && choices && (
          <div className="mt-[22px] flex flex-col border-t border-ink/10">
            {choices.map((choice, i) => {
              const selected = answers[question.id] === choice.label;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => setAnswer(choice.label)}
                  className={`flex items-center gap-3 border-b border-ink/10 py-3.5 text-left ${
                    selected ? "bg-[#faf6e9]" : ""
                  }`}
                >
                  <span
                    className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-[1.5px] font-mono text-xs font-bold ${
                      selected ? "border-ink bg-ink text-cream" : "border-ink/30 text-ink"
                    }`}
                  >
                    {choice.label}
                  </span>
                  <span
                    className={`font-sans text-[15px] text-ink ${selected ? "font-bold" : "font-medium"}`}
                  >
                    {choice.text}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === "IDENTIFICATION" && (
          <div className="mt-[22px] border-t border-ink/10 pt-[18px]">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-faint">
              Write your answer
            </div>
            <input
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="…"
              className="w-full border-0 border-b-2 border-ink bg-transparent py-2 font-sans text-lg font-semibold text-ink outline-none"
            />
          </div>
        )}
      </div>

      <div className="px-6 pt-[18px] pb-6">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex h-[52px] w-[52px] flex-none items-center justify-center rounded-xl border-[1.5px] text-[17px] text-amber ${
              isFlagged ? "border-amber bg-[#fef3c7]" : "border-ink"
            }`}
          >
            ⚑
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="flex h-[52px] flex-none items-center rounded-xl border-[1.5px] border-ink px-[18px] font-sans text-sm font-semibold text-ink disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="flex h-[52px] flex-1 items-center justify-center rounded-xl bg-ink px-2 text-center font-sans text-[15px] font-bold tracking-[-.01em] text-cream disabled:opacity-50"
          >
            {isSubmitting
              ? "Submitting…"
              : index >= total - 1
                ? "Finish & see results →"
                : "Next question →"}
          </button>
        </div>
        <div className="mt-3 text-center font-mono text-[11px] font-medium tracking-[.02em] text-faint">
          {answeredCount} ANSWERED · {flaggedCount} FLAGGED
        </div>
      </div>
    </div>
  );
}
