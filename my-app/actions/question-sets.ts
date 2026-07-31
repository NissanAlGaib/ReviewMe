"use server";

import { redirect } from "next/navigation";
import { del } from "@vercel/blob";

import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import {
  AddUploadsSchema,
  CreateQuestionSetSchema,
  SaveReviewedQuestionsSchema,
  UpdateQuestionSetSchema,
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

export type AddUploadsInput = {
  questionSetId: string;
  uploads: {
    blobUrl: string;
    blobPathname: string;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
    kind: "QUESTION_SOURCE" | "ANSWER_KEY";
  }[];
};

/** Appends more source files to an existing set — Questions are untouched;
 * the new uploads start out unprocessed so the next extraction run picks
 * them up (see app/api/question-sets/[id]/extract/route.ts). */
export async function addUploadsToQuestionSet(input: AddUploadsInput) {
  const session = await verifySession();

  const validated = AddUploadsSchema.parse(input);

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: validated.questionSetId },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  await prisma.sourceUpload.createMany({
    data: validated.uploads.map((upload) => ({
      questionSetId: questionSet.id,
      kind: upload.kind,
      blobUrl: upload.blobUrl,
      blobPathname: upload.blobPathname,
      mimeType: upload.mimeType,
      originalName: upload.originalName,
      sizeBytes: upload.sizeBytes,
    })),
  });
}

export type UpdateQuestionSetInput = {
  questionSetId: string;
  title: string;
  examType?: string;
};

export async function updateQuestionSetInfo(input: UpdateQuestionSetInput) {
  const session = await verifySession();

  const validated = UpdateQuestionSetSchema.parse(input);

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: validated.questionSetId },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  await prisma.questionSet.update({
    where: { id: questionSet.id },
    data: { title: validated.title, examType: validated.examType || null },
  });
}

/** Deletes a question set and everything under it. DB rows cascade via the
 * Prisma schema's onDelete: Cascade relations; the blob files don't, so
 * they're removed from storage explicitly first. */
export async function deleteQuestionSet(questionSetId: string) {
  const session = await verifySession();

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: questionSetId },
    include: { sourceUploads: true },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  const blobUrls = questionSet.sourceUploads.map((upload) => upload.blobUrl);
  if (blobUrls.length > 0) {
    await del(blobUrls);
  }

  await prisma.questionSet.delete({ where: { id: questionSet.id } });
}

export type ReviewedQuestionInput = {
  order: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";
  questionText: string;
  topic: string | null;
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
        topic: q.topic,
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
