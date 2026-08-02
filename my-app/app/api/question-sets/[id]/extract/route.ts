import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractQuestions, type ExtractionFile } from "@/lib/ai/extract-questions";
import { fetchAsBase64 } from "@/lib/ai/fetch-file";
import { dedupeQuestions } from "@/lib/ai/dedupe-questions";

// Runs synchronously inside the request (no queue/background job) — acceptable for a
// small number of users, but bounded by this duration limit.
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const questionSet = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      sourceUploads: true,
      questions: { select: { order: true, questionText: true }, orderBy: { order: "desc" } },
    },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (questionSet.mode !== "EXTRACTED") {
    return NextResponse.json(
      { error: "This question set is generated from lecture material, not extracted." },
      { status: 400 }
    );
  }

  // Extraction is incremental: only files uploaded since the last run get sent
  // to the AI, and the resulting questions are appended (not a wipe-and-redo)
  // — this keeps each run's file count (and therefore duration) small, and
  // lets a set be built up over several smaller upload batches.
  const pendingUploads = questionSet.sourceUploads.filter(
    (upload): upload is typeof upload & { kind: "QUESTION_SOURCE" | "ANSWER_KEY" } =>
      !upload.processedAt && upload.kind !== "LECTURE"
  );

  if (pendingUploads.length === 0) {
    return NextResponse.json(
      { error: "No new files to extract from. Upload more files first." },
      { status: 400 }
    );
  }

  const orderOffset = (questionSet.questions[0]?.order ?? -1) + 1;

  try {
    const files: ExtractionFile[] = await Promise.all(
      pendingUploads.map(async (upload) => ({
        mimeType: upload.mimeType,
        base64: await fetchAsBase64(upload.blobUrl),
        kind: upload.kind,
      }))
    );

    const result = await extractQuestions(files);
    const newQuestions = dedupeQuestions(
      result.questions,
      questionSet.questions.map((q) => q.questionText)
    );

    await prisma.$transaction([
      prisma.question.createMany({
        data: newQuestions.map((q, i) => ({
          questionSetId: questionSet.id,
          order: orderOffset + i,
          type: q.type,
          questionText: q.questionText,
          topic: q.topic,
          choices: q.choices ?? undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          aiConfidence: q.confidence,
        })),
      }),
      prisma.sourceUpload.updateMany({
        where: { id: { in: pendingUploads.map((upload) => upload.id) } },
        data: { processedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ questionCount: newQuestions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
