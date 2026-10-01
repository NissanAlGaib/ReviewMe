import { redirect } from "next/navigation";

import { getUser } from "@/lib/dal";
import { getQuestionsForQuiz } from "@/lib/data/question-sets";
import { checkQuestionAnswer, submitQuizAttempt } from "@/actions/quiz";
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
    <QuizForm
      title={questionSet.title}
      questions={questionSet.questions}
      onCheckAnswer={checkQuestionAnswer.bind(null, questionSet.id)}
      onSubmit={submitQuizAttempt.bind(null, questionSet.id)}
      exitHref="/dashboard"
      retakeHref={`/question-sets/${questionSet.id}/quiz`}
    />
  );
}
