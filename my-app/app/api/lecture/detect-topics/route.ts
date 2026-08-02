import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { detectLectureTopics, type LectureFile } from "@/lib/ai/generate-questions";
import { fetchAsBase64 } from "@/lib/ai/fetch-file";
import { DetectTopicsSchema } from "@/lib/validation/question-set";

// Runs before any QuestionSet/SourceUpload rows exist — the files are already in Blob
// storage (from the "Analyze lecture with AI" step) but not yet persisted anywhere.
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = DetectTopicsSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  try {
    const files: LectureFile[] = await Promise.all(
      parsedBody.data.uploads.map(async (upload) => ({
        mimeType: upload.mimeType,
        base64: await fetchAsBase64(upload.blobUrl),
        originalName: upload.originalName,
      }))
    );

    const topics = await detectLectureTopics(files);

    return NextResponse.json({ topics });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Topic detection failed" },
      { status: 500 }
    );
  }
}
