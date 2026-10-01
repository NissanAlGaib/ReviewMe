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
      topic: q.topic,
      choices: q.choices,
    })),
  };
}

/** Public counterpart of getQuestionsForQuiz — looked up by share slug with
 * no owner check, and only returns data while the set is actively shared.
 * Same correctAnswer/explanation-stripping DTO shape: a question's answer
 * must never reach the client until it's actually been checked. Returns
 * null (callers should 404) when the slug doesn't match a currently-shared
 * set, including when sharing has been turned off but the slug still
 * exists on the row. */
export async function getSharedQuestionSet(shareSlug: string) {
  const questionSet = await prisma.questionSet.findUnique({
    where: { shareSlug, isShared: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!questionSet) return null;

  return {
    id: questionSet.id,
    userId: questionSet.userId,
    title: questionSet.title,
    examType: questionSet.examType,
    questions: questionSet.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      questionText: q.questionText,
      topic: q.topic,
      choices: q.choices,
    })),
  };
}
