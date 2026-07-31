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
    <div className="flex flex-col gap-[22px]">
      <div>
        <div className="font-sans text-2xl font-extrabold tracking-tight text-ink">
          {questionSet.title}
        </div>
        <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
          {questionSet.sourceUploads.length} file
          {questionSet.sourceUploads.length === 1 ? "" : "s"} uploaded · status:{" "}
          {questionSet.status}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {questionSet.sourceUploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center justify-between rounded-[10px] border-[1.5px] border-ink px-4 py-2.5 font-sans text-[13px] font-semibold text-ink"
          >
            <span>{upload.originalName}</span>
            <span className="font-mono text-[10px] font-bold tracking-[.06em] text-muted">
              {upload.kind === "QUESTION_SOURCE" ? "QUESTION SOURCE" : "ANSWER KEY"}
            </span>
          </div>
        ))}
      </div>

      <ExtractButton questionSetId={questionSet.id} />

      {questionSet.questions.length > 0 && (
        <div className="flex flex-col gap-[14px]">
          <div className="font-sans text-sm font-bold text-ink">Review extracted questions</div>
          <QuestionEditor
            questionSetId={questionSet.id}
            initialQuestions={questionSet.questions}
          />
        </div>
      )}
    </div>
  );
}
