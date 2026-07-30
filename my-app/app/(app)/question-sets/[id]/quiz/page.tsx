import { redirect } from "next/navigation";

import { getUser } from "@/lib/dal";
import { getQuestionsForQuiz } from "@/lib/data/question-sets";
import { QuizForm } from "./_components/quiz-form";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  const questionSet = await getQuestionsForQuiz(id, user.id);

  if (questionSet.status !== "READY") {
    redirect(`/question-sets/${id}/review`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {questionSet.title}
      </h1>
      <QuizForm questionSetId={questionSet.id} questions={questionSet.questions} />
    </div>
  );
}
