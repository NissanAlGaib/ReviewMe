import { notFound } from "next/navigation";

import { getSharedQuestionSet } from "@/lib/data/question-sets";
import { checkSharedAnswer, submitSharedQuizAttempt } from "@/actions/quiz";
import { QuizForm } from "@/app/(app)/(focus)/question-sets/[id]/quiz/_components/quiz-form";

export default async function SharedQuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const questionSet = await getSharedQuestionSet(slug);

  if (!questionSet) {
    notFound();
  }

  return (
    <QuizForm
      title={questionSet.title}
      questions={questionSet.questions}
      onCheckAnswer={checkSharedAnswer.bind(null, slug)}
      onSubmit={submitSharedQuizAttempt.bind(null, slug)}
      exitHref={`/shared/${slug}`}
      retakeHref={`/shared/${slug}/quiz`}
    />
  );
}
