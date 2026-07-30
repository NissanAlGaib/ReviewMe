"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import {
  CreateQuestionSetSchema,
  SaveReviewedQuestionsSchema,
} from "@/lib/validation/question-set";

export type CreateQuestionSetInput = {
  title: string;
  examType?: string;
  uploads: {
    blobUrl: string;
    blobPathname: string;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
    kind: "QUESTION_SOURCE" | "ANSWER_KEY";
  }[];
};

export async function createQuestionSetFromUploads(input: CreateQuestionSetInput) {
  const session = await verifySession();

  const validated = CreateQuestionSetSchema.parse(input);

  const questionSet = await prisma.questionSet.create({
    data: {
      userId: session.user.id,
      title: validated.title,
      examType: validated.examType || null,
      sourceUploads: {
        create: validated.uploads.map((upload) => ({
          kind: upload.kind,
          blobUrl: upload.blobUrl,
          blobPathname: upload.blobPathname,
          mimeType: upload.mimeType,
          originalName: upload.originalName,
          sizeBytes: upload.sizeBytes,
        })),
      },
    },
  });

  redirect(`/question-sets/${questionSet.id}/review`);
}

export type ReviewedQuestionInput = {
  order: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";
  questionText: string;
  choices: { label: string; text: string }[] | null;
  correctAnswer: string;
  explanation: string | null;
};

export type SaveReviewedQuestionsInput = {
  questionSetId: string;
  questions: ReviewedQuestionInput[];
};

export async function saveReviewedQuestions(input: SaveReviewedQuestionsInput) {
  const session = await verifySession();

  const validated = SaveReviewedQuestionsSchema.parse(input);

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: validated.questionSetId },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  await prisma.$transaction([
    prisma.question.deleteMany({ where: { questionSetId: questionSet.id } }),
    prisma.question.createMany({
      data: validated.questions.map((q) => ({
        questionSetId: questionSet.id,
        order: q.order,
        type: q.type,
        questionText: q.questionText,
        choices: q.choices ?? undefined,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        aiConfidence: null,
      })),
    }),
    prisma.questionSet.update({
      where: { id: questionSet.id },
      data: { status: "READY" },
    }),
  ]);

  redirect("/dashboard");
}
