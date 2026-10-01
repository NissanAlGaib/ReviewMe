import { getUser } from "@/lib/dal";
import { getAttemptDetail } from "@/lib/data/attempts";
import { AttemptResults } from "@/app/_components/attempt-results";

export default async function AttemptResultsPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await getUser();
  const attempt = await getAttemptDetail(attemptId, user.id);

  return (
    <AttemptResults
      title={attempt.questionSet.title}
      score={attempt.score}
      totalQuestions={attempt.totalQuestions}
      answers={attempt.answers}
      backHref="/dashboard"
      backLabel="Back to dashboard"
      retakeHref={`/question-sets/${attempt.questionSet.id}/quiz`}
    />
  );
}
