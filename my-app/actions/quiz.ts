"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { auth } from "@/lib/auth";
import { gradeAnswer } from "@/lib/grading";
import {
  CheckAnswerSchema,
  CheckSharedAnswerSchema,
  QuizSubmissionSchema,
  SharedQuizSubmissionSchema,
} from "@/lib/validation/quiz";

export type QuizAnswerInput = { questionId: string; userAnswer: string | null };

// Positional parameters (rather than a single input object) so the first
// argument — the question set's id — can be partially applied with
// Function.prototype.bind before passing these down as props to the
// (client) QuizForm component, per Next's documented pattern for passing
// extra arguments to a Server Function across the server/client boundary.

/** Instant-feedback mode: grades a single question server-side so the correct
 * answer/explanation only ever reach the client for a question the user has
 * actually just answered — never bundled into the initial quiz payload. */
export async function checkQuestionAnswer(
  questionSetId: string,
  questionId: string,
  userAnswer: string | null
) {
  const session = await verifySession();

  const validated = CheckAnswerSchema.parse({ questionSetId, questionId, userAnswer });

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

export async function submitQuizAttempt(questionSetId: string, answers: QuizAnswerInput[]) {
  const session = await verifySession();

  const validated = QuizSubmissionSchema.parse({ questionSetId, answers });

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

/** Public counterpart of checkQuestionAnswer — no session required, scoped
 * by share slug instead of an owner-checked questionSetId. Only grades
 * questions belonging to a currently-shared set. */
export async function checkSharedAnswer(
  shareSlug: string,
  questionId: string,
  userAnswer: string | null
) {
  const validated = CheckSharedAnswerSchema.parse({ shareSlug, questionId, userAnswer });

  const question = await prisma.question.findUnique({
    where: { id: validated.questionId },
    include: { questionSet: { select: { shareSlug: true, isShared: true } } },
  });

  if (
    !question ||
    !question.questionSet.isShared ||
    question.questionSet.shareSlug !== validated.shareSlug
  ) {
    throw new Error("Question not found.");
  }

  return {
    isCorrect: gradeAnswer(question, validated.userAnswer),
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  };
}

/** Public counterpart of submitQuizAttempt. When the caller has a session,
 * behaves exactly like the owner flow — persists a real QuizAttempt owned by
 * them (against someone else's question set) and redirects to the normal
 * results page, which already authorizes by attempt.userId rather than the
 * question set's owner. Anonymous callers get the graded results back
 * directly instead — there's no user to attach a QuizAttempt to, so nothing
 * is persisted. */
export async function submitSharedQuizAttempt(shareSlug: string, answers: QuizAnswerInput[]) {
  const validated = SharedQuizSubmissionSchema.parse({ shareSlug, answers });

  const questionSet = await prisma.questionSet.findUnique({
    where: { shareSlug: validated.shareSlug, isShared: true },
    include: { questions: true },
  });

  if (!questionSet) {
    throw new Error("This shared question set is no longer available.");
  }

  const questionById = new Map(questionSet.questions.map((q) => [q.id, q]));

  const gradedAnswers = validated.answers
    .filter((a) => questionById.has(a.questionId))
    .map((a) => {
      const question = questionById.get(a.questionId)!;
      return {
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect: gradeAnswer(question, a.userAnswer),
        question,
      };
    });

  const score = gradedAnswers.filter((a) => a.isCorrect).length;

  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        questionSetId: questionSet.id,
        score,
        totalQuestions: questionSet.questions.length,
        answers: {
          create: gradedAnswers.map(({ questionId, userAnswer, isCorrect }) => ({
            questionId,
            userAnswer,
            isCorrect,
          })),
        },
      },
    });

    redirect(`/question-sets/${questionSet.id}/attempts/${attempt.id}`);
  }

  return {
    title: questionSet.title,
    score,
    totalQuestions: questionSet.questions.length,
    answers: gradedAnswers.map((a, i) => ({
      id: `${a.questionId}-${i}`,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      question: {
        order: a.question.order,
        questionText: a.question.questionText,
        topic: a.question.topic,
        choices: a.question.choices,
        correctAnswer: a.question.correctAnswer,
        explanation: a.question.explanation,
      },
    })),
  };
}
