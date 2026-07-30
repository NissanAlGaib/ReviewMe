import "server-only";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

export async function getAttemptsForUser(userId: string) {
  return prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { takenAt: "desc" },
    include: { questionSet: { select: { title: true } } },
  });
}

export async function getAttemptDetail(attemptId: string, userId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      questionSet: { select: { id: true, title: true } },
      answers: {
        include: { question: true },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    notFound();
  }

  return attempt;
}
