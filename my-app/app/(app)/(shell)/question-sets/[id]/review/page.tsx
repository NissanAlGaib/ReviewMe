import { getUser } from "@/lib/dal";
import { getQuestionSetOwned } from "@/lib/data/question-sets";
import { AddFilesForm } from "./_components/add-files-form";
import { ExtractButton } from "./_components/extract-button";
import { GenerateButton } from "./_components/generate-button";
import { QuestionEditor } from "./_components/question-editor";
import { SetInfoHeader } from "./_components/set-info-header";

const UPLOAD_KIND_LABELS: Record<string, string> = {
  QUESTION_SOURCE: "QUESTION SOURCE",
  ANSWER_KEY: "ANSWER KEY",
  LECTURE: "LECTURE MATERIAL",
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  const questionSet = await getQuestionSetOwned(id, user.id);
  const hasPending = questionSet.sourceUploads.some((upload) => !upload.processedAt);

  return (
    <div className="flex flex-col gap-[22px]">
      <SetInfoHeader
        questionSetId={questionSet.id}
        title={questionSet.title}
        examType={questionSet.examType}
        status={questionSet.status}
        fileCount={questionSet.sourceUploads.length}
      />

      <div className="flex flex-col gap-2">
        {questionSet.sourceUploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center justify-between rounded-[10px] border-[1.5px] border-ink px-4 py-2.5 font-sans text-[13px] font-semibold text-ink"
          >
            <span>{upload.originalName}</span>
            <div className="flex items-center gap-2.5">
              <span
                className={`font-mono text-[10px] font-bold tracking-[.06em] ${
                  upload.processedAt ? "text-[#166534]" : "text-amber"
                }`}
              >
                {upload.processedAt ? "PROCESSED" : "PENDING"}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-[.06em] text-muted">
                {UPLOAD_KIND_LABELS[upload.kind] ?? upload.kind}
              </span>
            </div>
          </div>
        ))}
        <AddFilesForm questionSetId={questionSet.id} mode={questionSet.mode} />
      </div>

      {questionSet.mode === "GENERATED" ? (
        <GenerateButton questionSetId={questionSet.id} hasPending={hasPending} />
      ) : (
        <ExtractButton questionSetId={questionSet.id} hasPending={hasPending} />
      )}

      {questionSet.questions.length > 0 && (
        <div className="flex flex-col gap-[14px]">
          <div className="font-sans text-sm font-bold text-ink">
            {questionSet.mode === "GENERATED" ? "Review generated questions" : "Review extracted questions"}
          </div>
          <QuestionEditor
            key={questionSet.questions.length}
            questionSetId={questionSet.id}
            initialQuestions={questionSet.questions}
          />
        </div>
      )}
    </div>
  );
}
