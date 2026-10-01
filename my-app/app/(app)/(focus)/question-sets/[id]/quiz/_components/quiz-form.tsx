"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { checkQuestionAnswer, submitQuizAttempt } from "@/actions/quiz";
import { Switch } from "@/app/_components/switch";

type Choice = { label: string; text: string };

type QuizQuestion = {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";
  questionText: string;
  topic: string | null;
  choices: unknown;
};

type Feedback = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
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
  title,
  questions,
}: {
  questionSetId: string;
  title: string;
  questions: QuizQuestion[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"start" | "question">("start");
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [feedbackByQuestionId, setFeedbackByQuestionId] = useState<Record<string, Feedback>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(300, questions.length * 120));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The countdown's interval must always see the latest answers when it
  // auto-submits, so state is mirrored into a ref rather than read from the
  // (stale) closure captured when the interval was created.
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
  const feedback = feedbackByQuestionId[question.id] ?? null;

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

  // Only arms once the quiz actually begins — the start screen shouldn't
  // consume time off the clock.
  useEffect(() => {
    if (step !== "question") return;

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
    // Intentionally only depends on `step`: `submit` reads live values via
    // refs, so it doesn't need to be in the dependency array (and adding it
    // would reset the interval — and the countdown — on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function setAnswer(value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [question.id]: value };
      answersRef.current = next;
      return next;
    });
  }

  async function checkCurrentAnswer() {
    setError(null);
    setIsChecking(true);
    try {
      const result = await checkQuestionAnswer({
        questionSetId,
        questionId: question.id,
        userAnswer: answers[question.id] ?? null,
      });
      setFeedbackByQuestionId((prev) => ({ ...prev, [question.id]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check that answer.");
    } finally {
      setIsChecking(false);
    }
  }

  function selectChoice(label: string) {
    if (feedback) return; // locked once this question has been checked
    setAnswer(label);
    if (instantFeedback) {
      void checkCurrentAnswer();
    }
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
  const needsCheck = instantFeedback && question.type === "IDENTIFICATION" && !feedback;

  if (step === "start") {
    const estimatedMinutes = Math.ceil(Math.max(300, total * 120) / 60);
    return (
      <div className="ticket flex flex-col">
        <div className="rounded-t-[18px] bg-chrome px-6 pt-7 pb-6 text-chrome-foreground">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[.09em] opacity-70">
            Quiz
          </div>
          <div className="mt-1.5 font-sans text-xl font-extrabold tracking-tight">{title}</div>
          <div className="mt-2 font-sans text-[13px] opacity-80">
            {total} question{total === 1 ? "" : "s"} · about {estimatedMinutes} min
          </div>
        </div>
        <div className="perf" />
        <div className="flex flex-col gap-6 px-6 py-7">
          <Switch
            checked={instantFeedback}
            onChange={setInstantFeedback}
            label="Reveal correct answers immediately"
            description="See right after each question whether you got it, instead of only at the end."
          />
          <button
            type="button"
            onClick={() => setStep("question")}
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-chrome font-sans text-[15px] font-bold text-chrome-foreground"
          >
            Start quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket flex flex-col">
      <div className="rounded-t-[18px] bg-chrome px-[22px] pt-[18px] pb-4 text-chrome-foreground">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label={index === 0 ? "Exit quiz" : "Previous question"}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-chrome-foreground/35 font-sans text-[17px] font-semibold"
          >
            {index === 0 ? "×" : "‹"}
          </button>
          <div className="min-w-0 flex-1 truncate px-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[.09em] opacity-75">
            {question.topic || "General"}
          </div>
          <div
            className={`flex-none font-mono text-base font-bold ${lowTime ? "text-red-400" : "text-chrome-foreground"}`}
          >
            {formatTime(secondsLeft)}
          </div>
        </div>
        <div className="mt-4 flex gap-[5px]">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`h-[5px] flex-1 rounded-[3px] ${
                i < index
                  ? "bg-chrome-foreground"
                  : i === index
                    ? "bg-amber"
                    : "bg-chrome-foreground/15"
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
              const isCorrectChoice = feedback && choice.label === feedback.correctAnswer;
              const isWrongSelected = feedback && selected && !feedback.isCorrect;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => selectChoice(choice.label)}
                  disabled={!!feedback || isChecking}
                  className={`flex items-center gap-3 border-b border-ink/10 py-3.5 text-left disabled:cursor-default ${
                    isCorrectChoice ? "bg-success-bg" : isWrongSelected ? "bg-danger-bg" : selected ? "bg-highlight" : ""
                  }`}
                >
                  <span
                    className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-[1.5px] font-mono text-xs font-bold ${
                      isCorrectChoice
                        ? "border-success bg-success text-chrome-foreground"
                        : isWrongSelected
                          ? "border-danger bg-danger text-chrome-foreground"
                          : selected
                            ? "border-chrome bg-chrome text-chrome-foreground"
                            : "border-ink/30 text-ink"
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
              disabled={!!feedback}
              className="w-full border-0 border-b-2 border-ink bg-transparent py-2 font-sans text-lg font-semibold text-ink outline-none disabled:opacity-70"
            />
          </div>
        )}

        {feedback && (
          <div
            className={`mt-[18px] flex flex-col gap-1 rounded-[10px] border-[1.5px] px-3.5 py-3 ${
              feedback.isCorrect ? "border-success/40 bg-success-bg" : "border-danger/40 bg-danger-bg"
            }`}
          >
            <span
              className={`font-sans text-[13px] font-bold ${feedback.isCorrect ? "text-success" : "text-danger"}`}
            >
              {feedback.isCorrect ? "Correct" : `Incorrect — correct answer: ${feedback.correctAnswer}`}
            </span>
            {feedback.explanation && (
              <span className="font-sans text-[13px] text-ink">{feedback.explanation}</span>
            )}
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
              isFlagged ? "border-amber bg-warning-bg" : "border-ink"
            }`}
          >
            ⚑
          </button>
          {!needsCheck && (
            <button
              type="button"
              onClick={goNext}
              disabled={isSubmitting || isChecking}
              className="flex h-[52px] flex-none items-center rounded-xl border-[1.5px] border-ink px-[18px] font-sans text-sm font-semibold text-ink disabled:opacity-50"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={needsCheck ? checkCurrentAnswer : goNext}
            disabled={isSubmitting || isChecking}
            className="flex h-[52px] flex-1 items-center justify-center rounded-xl bg-chrome px-2 text-center font-sans text-[15px] font-bold tracking-[-.01em] text-chrome-foreground disabled:opacity-50"
          >
            {isSubmitting
              ? "Submitting…"
              : isChecking
                ? "Checking…"
                : needsCheck
                  ? "Check answer"
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
