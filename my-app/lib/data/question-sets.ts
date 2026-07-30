import "server-only";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

export async function getQuestionSetsForUser(userId: string) {
  return prisma.questionSet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
}

export async function getQuestionSetOwned(id: string, userId: string) {
  const questionSet = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      sourceUploads: true,
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!questionSet || questionSet.userId !== userId) {
    notFound();
  }

  return questionSet;
}

/** DTO for quiz-taking: strips correctAnswer/explanation so they never reach the client. */
export async function getQuestionsForQuiz(id: string, userId: string) {
  const questionSet = await getQuestionSetOwned(id, userId);

  return {
    id: questionSet.id,
    title: questionSet.title,
    status: questionSet.status,
    questions: questionSet.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      questionText: q.questionText,
      choices: q.choices,
    })),
  };
}
