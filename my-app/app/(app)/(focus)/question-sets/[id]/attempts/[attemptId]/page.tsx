import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getAttemptDetail } from "@/lib/data/attempts";

type Choice = { label: string; text: string };

type TopicStat = {
  name: string;
  got: number;
  of: number;
  ratio: number;
};

function computeTopics(
  answers: { isCorrect: boolean; question: { topic: string | null } }[]
): (TopicStat & { weak: boolean })[] {
  const byTopic = new Map<string, { got: number; of: number }>();

  for (const answer of answers) {
    const name = answer.question.topic || "General";
    const entry = byTopic.get(name) ?? { got: 0, of: 0 };
    entry.of += 1;
    if (answer.isCorrect) entry.got += 1;
    byTopic.set(name, entry);
  }

  const entries: TopicStat[] = Array.from(byTopic.entries()).map(([name, v]) => ({
    name,
    ...v,
    ratio: v.got / v.of,
  }));
  const sorted = entries.slice().sort((a, b) => b.ratio - a.ratio);
  const weakestName =
    sorted.length && sorted[sorted.length - 1].ratio < 1
      ? sorted[sorted.length - 1].name
      : null;

  return sorted.map((t) => ({ ...t, weak: t.name === weakestName }));
}

export default async function AttemptResultsPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await getUser();
  const attempt = await getAttemptDetail(attemptId, user.id);

  const answers = [...attempt.answers].sort((a, b) => a.question.order - b.question.order);
  const topics = computeTopics(answers);
  const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
  const message =
    pct >= 75
      ? "Above the 75% passing mark — strong work. Keep the momentum going."
      : "Below the 75% line — the topic breakdown shows exactly where to push next.";

  return (
    <div className="ticket flex flex-col">
      <div className="bg-ink px-6 pt-7 pb-5 text-cream">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[.09em] opacity-70">
          {attempt.questionSet.title}
        </div>
        <div className="mt-4 flex items-center gap-5">
          <div
            className="flex h-[100px] w-[100px] flex-none items-center justify-center rounded-full ticket-pop"
            style={{
              background: `conic-gradient(#f4f0e6 0 ${pct}%, rgba(244,240,230,.22) ${pct}% 100%)`,
            }}
          >
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-ink">
              <span className="font-mono text-2xl font-bold text-cream">{pct}%</span>
            </div>
          </div>
          <div>
            <div className="font-sans text-xl font-bold">
              {attempt.score} / {attempt.totalQuestions} correct
            </div>
            <div className="mt-[5px] font-sans text-[13px] leading-relaxed opacity-80">
              {message}
            </div>
          </div>
        </div>
      </div>
      <div className="perf" />

      <div className="px-6 pt-[22px]">
        <div className="mb-3.5 font-mono text-[11px] font-bold uppercase tracking-[.08em] text-faint">
          Performance by topic
        </div>
        <div className="flex flex-col gap-3.5">
          {topics.map((t) => {
            const barColor = t.ratio >= 0.85 ? "#166534" : t.ratio >= 0.6 ? "#b45309" : "#b91c1c";
            return (
              <div
                key={t.name}
                className={
                  t.weak
                    ? "rounded-[10px] border-[1.5px] border-[#f0c775] bg-[#fef8e8] px-3.5 py-3"
                    : ""
                }
              >
                <div
                  className="mb-1.5 flex justify-between font-sans text-[13px] font-semibold"
                  style={{ color: t.weak ? "#92400e" : "#18172f" }}
                >
                  <span>{t.name}</span>
                  <span className="font-mono" style={{ color: barColor }}>
                    {t.got}/{t.of}
                  </span>
                </div>
                <div
                  className="h-[7px] rounded"
                  style={{ background: t.weak ? "#fef3c7" : "#efe9d8" }}
                >
                  <div
                    className="h-full rounded"
                    style={{ width: `${Math.round(t.ratio * 100)}%`, background: barColor }}
                  />
                </div>
                {t.weak && (
                  <div className="mt-2 font-mono text-[10.5px] font-semibold tracking-[.02em] text-[#92400e]">
                    WEAKEST AREA — FOCUS HERE NEXT
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-6 pt-7">
        <div className="font-sans text-sm font-bold text-ink">Question breakdown</div>
        {answers.map((answer, i) => {
          const choices = Array.isArray(answer.question.choices)
            ? (answer.question.choices as Choice[])
            : null;

          return (
            <div
              key={answer.id}
              className={`flex flex-col gap-2 rounded-[10px] border-[1.5px] p-3.5 text-sm ${
                answer.isCorrect ? "border-[#166534]/30" : "border-[#b91c1c]/40"
              }`}
            >
              <p className="font-sans font-semibold text-ink">
                {i + 1}. {answer.question.questionText}
              </p>
              {choices && (
                <ul className="flex flex-col gap-0.5 font-sans text-[13px] text-muted">
                  {choices.map((choice, index) => (
                    <li key={index}>
                      {choice.label}. {choice.text}
                    </li>
                  ))}
                </ul>
              )}
              <p className="font-sans text-[13px] text-ink">
                <span className="font-semibold">Your answer:</span>{" "}
                {answer.userAnswer || <em>no answer</em>}
              </p>
              {!answer.isCorrect && (
                <p className="font-sans text-[13px] text-ink">
                  <span className="font-semibold">Correct answer:</span>{" "}
                  {answer.question.correctAnswer}
                </p>
              )}
              {answer.question.explanation && (
                <p className="font-sans text-[13px] text-muted">{answer.question.explanation}</p>
              )}
              <span
                className="w-fit rounded-full px-2.5 py-[3px] font-sans text-xs font-bold"
                style={
                  answer.isCorrect
                    ? { background: "#dcfce7", color: "#166534" }
                    : { background: "#fee2e2", color: "#b91c1c" }
                }
              >
                {answer.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2.5 px-6 py-6">
        <Link
          href="/dashboard"
          className="flex h-[50px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-ink font-sans text-sm font-semibold text-ink no-underline"
        >
          Back to dashboard
        </Link>
        <Link
          href={`/question-sets/${attempt.questionSet.id}/quiz`}
          className="flex h-[50px] flex-1 items-center justify-center rounded-xl bg-ink font-sans text-sm font-bold text-cream no-underline"
        >
          Retake
        </Link>
      </div>
    </div>
  );
}
