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
                className="ticket-row flex overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-paper no-underline"
              >
                <div className="flex w-[84px] flex-none flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-cream/40 bg-ink text-cream">
                  <span className="font-mono text-base font-bold">
                    {attempt.score}/{attempt.totalQuestions}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <div className="font-sans text-sm font-bold text-ink">
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
