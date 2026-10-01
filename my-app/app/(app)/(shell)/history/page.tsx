import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getAttemptsForUser } from "@/lib/data/attempts";
import { Stamp } from "../_components/stamp";

export default async function HistoryPage() {
  const user = await getUser();
  const attempts = await getAttemptsForUser(user.id);

  return (
    <>
      <div className="font-sans text-2xl font-extrabold tracking-tight text-ink">History</div>

      {attempts.length === 0 ? (
        <p className="font-sans text-sm font-medium text-muted">
          No quiz attempts yet. Take a quiz to see your history here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {attempts.map((attempt) => {
            const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
            return (
              <Link
                key={attempt.id}
                href={`/question-sets/${attempt.questionSetId}/attempts/${attempt.id}`}
                className="ticket-row flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-paper no-underline sm:flex-row"
              >
                <div className="flex w-full flex-none flex-col items-center justify-center gap-0.5 border-b-2 border-dashed border-chrome-foreground/40 bg-chrome py-2 text-chrome-foreground sm:w-[84px] sm:border-b-0 sm:border-r-2 sm:py-0">
                  <span className="font-mono text-base font-bold">
                    {attempt.score}/{attempt.totalQuestions}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
                  <div className="min-w-0">
                    <div className="truncate font-sans text-sm font-bold text-ink">
                      {attempt.questionSet.title}
                    </div>
                    <div className="mt-0.5 font-sans text-xs font-medium text-muted">
                      {new Date(attempt.takenAt).toLocaleString()}
                    </div>
                  </div>
                  <Stamp label={`${pct}%`} color={pct >= 80 ? "green" : "amber"} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
