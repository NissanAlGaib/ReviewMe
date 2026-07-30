import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getAttemptDetail } from "@/lib/data/attempts";

type Choice = { label: string; text: string };

export default async function AttemptResultsPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await getUser();
  const attempt = await getAttemptDetail(attemptId, user.id);

  const answers = [...attempt.answers].sort((a, b) => a.question.order - b.question.order);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {attempt.questionSet.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Score: {attempt.score} / {attempt.totalQuestions}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {answers.map((answer, i) => {
          const choices = Array.isArray(answer.question.choices)
            ? (answer.question.choices as Choice[])
            : null;

          return (
            <div
              key={answer.id}
              className={`flex flex-col gap-2 rounded-md border p-4 text-sm ${
                answer.isCorrect
                  ? "border-green-200 dark:border-green-900"
                  : "border-red-200 dark:border-red-900"
              }`}
            >
              <p className="font-medium text-zinc-950 dark:text-zinc-50">
                {i + 1}. {answer.question.questionText}
              </p>
              {choices && (
                <ul className="flex flex-col gap-0.5 text-zinc-600 dark:text-zinc-400">
                  {choices.map((choice, index) => (
                    <li key={index}>
                      {choice.label}. {choice.text}
                    </li>
                  ))}
                </ul>
              )}
              <p>
                <span className="font-medium">Your answer:</span>{" "}
                {answer.userAnswer || <em>no answer</em>}
              </p>
              {!answer.isCorrect && (
                <p>
                  <span className="font-medium">Correct answer:</span>{" "}
                  {answer.question.correctAnswer}
                </p>
              )}
              {answer.question.explanation && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  {answer.question.explanation}
                </p>
              )}
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                  answer.isCorrect
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {answer.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>
          );
        })}
      </div>

      <Link href="/dashboard" className="w-fit text-sm font-medium underline">
        Back to dashboard
      </Link>
    </div>
  );
}
