import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractQuestions, type ExtractionFile } from "@/lib/ai/extract-questions";

// Runs synchronously inside the request (no queue/background job) — acceptable for a
// small number of users, but bounded by this duration limit.
export const maxDuration = 60;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch uploaded file (${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const questionSet = await prisma.questionSet.findUnique({
    where: { id },
    include: { sourceUploads: true },
  });

  if (!questionSet || questionSet.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (questionSet.sourceUploads.length === 0) {
    return NextResponse.json({ error: "No uploaded files to extract from" }, { status: 400 });
  }

  try {
    const files: ExtractionFile[] = await Promise.all(
      questionSet.sourceUploads.map(async (upload) => ({
        mimeType: upload.mimeType,
        base64: await fetchAsBase64(upload.blobUrl),
        kind: upload.kind,
      }))
    );

    const result = await extractQuestions(files);

    await prisma.$transaction([
      prisma.question.deleteMany({ where: { questionSetId: questionSet.id } }),
      prisma.question.createMany({
        data: result.questions.map((q) => ({
          questionSetId: questionSet.id,
          order: q.order,
          type: q.type,
          questionText: q.questionText,
          choices: q.choices ?? undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          aiConfidence: q.confidence,
        })),
      }),
    ]);

    return NextResponse.json({ questionCount: result.questions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
