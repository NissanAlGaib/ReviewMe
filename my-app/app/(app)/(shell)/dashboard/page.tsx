import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getQuestionSetsForUser } from "@/lib/data/question-sets";
import { Stamp } from "../_components/stamp";

export default async function DashboardPage() {
  const user = await getUser();
  const questionSets = await getQuestionSetsForUser(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <div className="font-sans text-2xl font-extrabold tracking-tight text-ink">
            Welcome, {user.name || user.email}
          </div>
          <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
            Your question sets
          </div>
        </div>
        <Link
          href="/question-sets/new"
          className="flex h-[46px] items-center rounded-xl bg-ink px-5 font-sans text-sm font-bold text-cream no-underline"
        >
          + New question set
        </Link>
      </div>

      {questionSets.length === 0 ? (
        <p className="font-sans text-sm font-medium text-muted">
          No question sets yet. Upload your first one to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {questionSets.map((set) => (
            <Link
              key={set.id}
              href={
                set.status === "READY"
                  ? `/question-sets/${set.id}/quiz`
                  : `/question-sets/${set.id}/review`
              }
              className="ticket-row flex overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-paper no-underline"
            >
              <div className="flex w-[84px] flex-none flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-cream/40 bg-ink text-cream">
                <span className="font-mono text-xl font-bold">{set._count.questions}</span>
                <span className="font-mono text-[9px] font-semibold tracking-[.06em] opacity-70">
                  ITEMS
                </span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <div className="font-sans text-sm font-bold text-ink">{set.title}</div>
                  <div className="mt-0.5 font-sans text-xs font-medium text-muted">
                    {set.examType ? `${set.examType} · ` : ""}
                    {set._count.questions} question{set._count.questions === 1 ? "" : "s"}
                  </div>
                </div>
                <Stamp label={set.status} color={set.status === "READY" ? "green" : "amber"} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
