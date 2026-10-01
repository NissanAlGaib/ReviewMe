"use server";

import { redirect } from "next/navigation";
import { del } from "@vercel/blob";

import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import {
  AddUploadsSchema,
  CopySharedQuestionSetSchema,
  CreateQuestionSetFromLectureSchema,
  CreateQuestionSetSchema,
  RegenerateShareLinkSchema,
  SaveReviewedQuestionsSchema,
  ToggleSharingSchema,
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

export type CreateQuestionSetFromLectureInput = {
  title: string;
  examType?: string;
  uploads: {
    blobUrl: string;
    blobPathname: string;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
  }[];
};

/** Creates a set from lecture material rather than existing exam questions — the AI
 * authors brand-new questions from the content instead of extracting pre-written ones.
 * Unlike createQuestionSetFromUploads, this doesn't redirect: the caller still needs to
 * kick off the actual generation run (question count/types/difficulty, chosen on the
 * "New question set" configure step) via the /generate route before navigating. */
export async function createQuestionSetFromLecture(
  input: CreateQuestionSetFromLectureInput
): Promise<{ questionSetId: string }> {
  const session = await verifySession();

  const validated = CreateQuestionSetFromLectureSchema.parse(input);

  const questionSet = await prisma.questionSet.create({
    data: {
      userId: session.user.id,
      title: validated.title,
      examType: validated.examType || null,
      mode: "GENERATED",
      sourceUploads: {
        create: validated.uploads.map((upload) => ({
          kind: "LECTURE" as const,
          blobUrl: upload.blobUrl,
          blobPathname: upload.blobPathname,
          mimeType: upload.mimeType,
          originalName: upload.originalName,
          sizeBytes: upload.sizeBytes,
        })),
      },
    },
  });

  return { questionSetId: questionSet.id };
}

export type AddUploadsInput = {
  questionSetId: string;
  uploads: {
    blobUrl: string;
    blobPathname: string;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
    kind: "QUESTION_SOURCE" | "ANSWER_KEY" | "LECTURE";
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

export type ToggleSharingInput = {
  questionSetId: string;
  enabled: boolean;
};

/** Turning sharing off deliberately keeps the existing shareSlug (rather than
 * clearing it) so re-enabling restores the same link — use
 * regenerateShareLink to actually invalidate a previously-shared URL. */
export async function toggleSharing(input: ToggleSharingInput) {
  const session = await verifySession();

  const validated = ToggleSharingSchema.parse(input);

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: validated.questionSetId },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  if (validated.enabled && questionSet.status !== "READY") {
    throw new Error("Finish reviewing this set before sharing it.");
  }

  await prisma.questionSet.update({
    where: { id: questionSet.id },
    data: {
      isShared: validated.enabled,
      shareSlug: questionSet.shareSlug ?? (validated.enabled ? crypto.randomUUID() : null),
    },
  });
}

export async function regenerateShareLink(questionSetId: string) {
  const session = await verifySession();

  const validated = RegenerateShareLinkSchema.parse({ questionSetId });

  const questionSet = await prisma.questionSet.findUnique({
    where: { id: validated.questionSetId },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    throw new Error("Question set not found.");
  }

  const shareSlug = crypto.randomUUID();
  await prisma.questionSet.update({
    where: { id: questionSet.id },
    data: { shareSlug, isShared: true },
  });

  return { shareSlug };
}

/** Creates an independent, fully-editable copy of a shared question set
 * owned by the caller. Source uploads aren't carried over — those blobs
 * belong to the original owner — so the copy starts with just the
 * finalized questions, already READY. */
export async function copySharedQuestionSet(shareSlug: string) {
  const session = await verifySession();

  const validated = CopySharedQuestionSetSchema.parse({ shareSlug });

  const source = await prisma.questionSet.findUnique({
    where: { shareSlug: validated.shareSlug, isShared: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!source) {
    throw new Error("This shared question set is no longer available.");
  }

  const copy = await prisma.questionSet.create({
    data: {
      userId: session.user.id,
      title: `Copy of ${source.title}`,
      examType: source.examType,
      mode: source.mode,
      status: "READY",
      questions: {
        create: source.questions.map((q) => ({
          order: q.order,
          type: q.type,
          questionText: q.questionText,
          topic: q.topic,
          choices: q.choices ?? undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          aiConfidence: null,
        })),
      },
    },
  });

  redirect(`/question-sets/${copy.id}/review`);
}
