import Link from "next/link";

import { getUser } from "@/lib/dal";
import { getQuestionSetsForUser } from "@/lib/data/question-sets";

export default async function DashboardPage() {
  const user = await getUser();
  const questionSets = await getQuestionSetsForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Welcome, {user.name || user.email}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Your question sets.
          </p>
        </div>
        <Link
          href="/question-sets/new"
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          New question set
        </Link>
      </div>

      {questionSets.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No question sets yet. Upload your first one to get started.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/[.08] rounded-md border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
          {questionSets.map((set) => (
            <li key={set.id}>
              <Link
                href={
                  set.status === "READY"
                    ? `/question-sets/${set.id}/quiz`
                    : `/question-sets/${set.id}/review`
                }
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                    {set.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {set.examType ? `${set.examType} · ` : ""}
                    {set._count.questions} question{set._count.questions === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-500">
                  {set.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
