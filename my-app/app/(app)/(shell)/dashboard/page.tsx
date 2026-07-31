import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getQuestionSetsForUser } from "@/lib/data/question-sets";
import { SetRow } from "./_components/set-row";

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
            <SetRow
              key={set.id}
              set={{
                id: set.id,
                title: set.title,
                examType: set.examType,
                status: set.status,
                questionCount: set._count.questions,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
