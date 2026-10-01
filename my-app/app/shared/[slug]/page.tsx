import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { getSharedQuestionSet } from "@/lib/data/question-sets";
import { copySharedQuestionSet } from "@/actions/question-sets";

export default async function SharedQuestionSetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const questionSet = await getSharedQuestionSet(slug);

  if (!questionSet) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const isOwner = session?.user?.id === questionSet.userId;
  const total = questionSet.questions.length;

  return (
    <div className="ticket flex flex-col">
      <div className="rounded-t-[18px] bg-chrome px-6 pt-7 pb-6 text-chrome-foreground">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[.09em] opacity-70">
          Shared question set
        </div>
        <div className="mt-1.5 font-sans text-xl font-extrabold tracking-tight">
          {questionSet.title}
        </div>
        <div className="mt-2 font-sans text-[13px] opacity-80">
          {questionSet.examType ? `${questionSet.examType} · ` : ""}
          {total} question{total === 1 ? "" : "s"}
        </div>
      </div>
      <div className="perf" />

      <div className="flex flex-col gap-5 px-6 py-7">
        <Link
          href={`/shared/${slug}/quiz`}
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-chrome font-sans text-[15px] font-bold text-chrome-foreground no-underline"
        >
          Take this quiz
        </Link>

        {isOwner ? (
          <div className="flex flex-col gap-2 text-center">
            <p className="font-sans text-[13px] font-medium text-muted">
              This is your own question set.
            </p>
            <Link
              href={`/question-sets/${questionSet.id}/review`}
              className="font-sans text-[13px] font-bold text-amber underline"
            >
              Manage sharing →
            </Link>
          </div>
        ) : session?.user ? (
          <form action={copySharedQuestionSet.bind(null, slug)}>
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-ink font-sans text-[13px] font-bold text-ink"
            >
              Copy to my sets
            </button>
          </form>
        ) : (
          <p className="text-center font-sans text-[13px] font-medium text-muted">
            <Link href="/login" className="font-bold text-amber underline">
              Log in
            </Link>{" "}
            to save a copy to your own account.
          </p>
        )}
      </div>
    </div>
  );
}
