import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getAttemptsForUser } from "@/lib/data/attempts";

export default async function HistoryPage() {
  const user = await getUser();
  const attempts = await getAttemptsForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">History</h1>

      {attempts.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No quiz attempts yet. Take a quiz to see your history here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/[.08] rounded-md border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/question-sets/${attempt.questionSetId}/attempts/${attempt.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                    {attempt.questionSet.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {new Date(attempt.takenAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {attempt.score} / {attempt.totalQuestions}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
