import { getUser } from "@/lib/dal";
import { getQuestionSetOwned } from "@/lib/data/question-sets";
import { ExtractButton } from "./_components/extract-button";
import { QuestionEditor } from "./_components/question-editor";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  const questionSet = await getQuestionSetOwned(id, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {questionSet.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {questionSet.sourceUploads.length} file
          {questionSet.sourceUploads.length === 1 ? "" : "s"} uploaded · status:{" "}
          {questionSet.status}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {questionSet.sourceUploads.map((upload) => (
          <li
            key={upload.id}
            className="flex items-center justify-between rounded-md border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
          >
            <span>{upload.originalName}</span>
            <span className="text-xs uppercase text-zinc-500">{upload.kind}</span>
          </li>
        ))}
      </ul>

      <ExtractButton questionSetId={questionSet.id} />

      {questionSet.questions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Review extracted questions
          </h2>
          <QuestionEditor
            questionSetId={questionSet.id}
            initialQuestions={questionSet.questions}
          />
        </div>
      )}
    </div>
  );
}
