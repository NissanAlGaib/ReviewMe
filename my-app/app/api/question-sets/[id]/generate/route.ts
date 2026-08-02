import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateQuestionsFromLecture, type LectureFile } from "@/lib/ai/generate-questions";
import { fetchAsBase64 } from "@/lib/ai/fetch-file";
import { GenerateQuestionsBodySchema } from "@/lib/validation/question-set";

// Runs synchronously inside the request (no queue/background job) — acceptable for a
// small number of users, but bounded by this duration limit.
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = GenerateQuestionsBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { id } = await params;

  const questionSet = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      sourceUploads: true,
      questions: { select: { order: true }, orderBy: { order: "desc" }, take: 1 },
    },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (questionSet.mode !== "GENERATED") {
    return NextResponse.json(
      { error: "This question set extracts from existing exam questions, not lecture material." },
      { status: 400 }
    );
  }

  // Generation is incremental, same as extraction: only lecture files uploaded since
  // the last run are sent to the AI, and the resulting questions are appended.
  const pendingUploads = questionSet.sourceUploads.filter((upload) => !upload.processedAt);

  if (pendingUploads.length === 0) {
    return NextResponse.json(
      { error: "No new lecture files to generate from. Upload more files first." },
      { status: 400 }
    );
  }

  const orderOffset = (questionSet.questions[0]?.order ?? -1) + 1;

  try {
    const files: LectureFile[] = await Promise.all(
      pendingUploads.map(async (upload) => ({
        mimeType: upload.mimeType,
        base64: await fetchAsBase64(upload.blobUrl),
        originalName: upload.originalName,
      }))
    );

    const result = await generateQuestionsFromLecture(files, {
      questionCount: parsedBody.data.questionCount,
      examType: questionSet.examType,
    });

    await prisma.$transaction([
      prisma.question.createMany({
        data: result.questions.map((q) => ({
          questionSetId: questionSet.id,
          order: orderOffset + q.order,
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

    return NextResponse.json({ questionCount: result.questions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
