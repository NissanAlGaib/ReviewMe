"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { gradeAnswer } from "@/lib/grading";
import { CheckAnswerSchema, QuizSubmissionSchema } from "@/lib/validation/quiz";

export type SubmitQuizAttemptInput = {
  questionSetId: string;
  answers: { questionId: string; userAnswer: string | null }[];
};

export type CheckQuestionAnswerInput = {
  questionSetId: string;
  questionId: string;
  userAnswer: string | null;
};

/** Instant-feedback mode: grades a single question server-side so the correct
 * answer/explanation only ever reach the client for a question the user has
 * actually just answered — never bundled into the initial quiz payload. */
export async function checkQuestionAnswer(input: CheckQuestionAnswerInput) {
  const session = await verifySession();

  const validated = CheckAnswerSchema.parse(input);

  const question = await prisma.question.findUnique({
    where: { id: validated.questionId },
    include: { questionSet: { select: { id: true, userId: true } } },
  });

  if (
    !question ||
    question.questionSet.id !== validated.questionSetId ||
    question.questionSet.userId !== session.user.id
  ) {
    throw new Error("Question not found.");
  }

  return {
    isCorrect: gradeAnswer(question, validated.userAnswer),
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  };
}

export async function submitQuizAttempt(input: SubmitQuizAttemptInput) {
  const session = await verifySession();

  const validated = QuizSubmissionSchema.parse(input);

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: validated.questionSetId },
    include: { questions: true },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  const questionById = new Map(questionSet.questions.map((q) => [q.id, q]));

  // Grade server-side against the full question rows (with correctAnswer) — never
  // trust anything about correctness from the client.
  const gradedAnswers = validated.answers
    .filter((a) => questionById.has(a.questionId))
    .map((a) => {
      const question = questionById.get(a.questionId)!;
      return {
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect: gradeAnswer(question, a.userAnswer),
      };
    });

  const score = gradedAnswers.filter((a) => a.isCorrect).length;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      questionSetId: questionSet.id,
      score,
      totalQuestions: questionSet.questions.length,
      answers: {
        create: gradedAnswers,
      },
    },
  });

  redirect(`/question-sets/${questionSet.id}/attempts/${attempt.id}`);
}
