"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import { createQuestionSetFromUploads } from "@/actions/question-sets";
import { MAX_FILES_PER_UPLOAD } from "@/lib/validation/question-set";

export default function NewQuestionSetPage() {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("");
  const [questionFiles, setQuestionFiles] = useState<FileList | null>(null);
  const [answerKeyFiles, setAnswerKeyFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!questionFiles || questionFiles.length === 0) {
      setError("Please upload at least one question file.");
      return;
    }
    const totalFiles = questionFiles.length + (answerKeyFiles?.length ?? 0);
    if (totalFiles > MAX_FILES_PER_UPLOAD) {
      setError(
        `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time (question source + answer key combined). You can add more files to this set afterward from the review page.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const uploads: {
        blobUrl: string;
        blobPathname: string;
        mimeType: string;
        originalName: string;
        sizeBytes: number;
        kind: "QUESTION_SOURCE" | "ANSWER_KEY";
      }[] = [];

      const questionFileArray = Array.from(questionFiles);
      for (let i = 0; i < questionFileArray.length; i++) {
        const file = questionFileArray[i];
        setProgress(`Uploading question file ${i + 1} of ${questionFileArray.length}…`);
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        uploads.push({
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          mimeType: blob.contentType,
          originalName: file.name,
          sizeBytes: file.size,
          kind: "QUESTION_SOURCE",
        });
      }

      const answerKeyFileArray = answerKeyFiles ? Array.from(answerKeyFiles) : [];
      for (let i = 0; i < answerKeyFileArray.length; i++) {
        const file = answerKeyFileArray[i];
        setProgress(`Uploading answer key ${i + 1} of ${answerKeyFileArray.length}…`);
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        uploads.push({
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          mimeType: blob.contentType,
          originalName: file.name,
          sizeBytes: file.size,
          kind: "ANSWER_KEY",
        });
      }

      setProgress("Creating question set…");
      await createQuestionSetFromUploads({
        title: title.trim(),
        examType: examType.trim() || undefined,
        uploads,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <div>
        <div className="font-sans text-2xl font-extrabold tracking-tight text-ink">
          New question set
        </div>
        <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
          Upload photos or PDFs of exam questions, optionally with a separate answer key. Up to{" "}
          {MAX_FILES_PER_UPLOAD} files at a time — you can add more to this set later from the
          review page.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <div className="field-label">Title</div>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. LET Professional Education - Set 1"
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label">Exam type (optional)</div>
          <input
            id="examType"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            placeholder="e.g. LET, BAR"
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label">Question images / PDFs</div>
          <label className="relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/30 px-[18px] py-[18px] text-center font-sans text-[13px] font-semibold text-muted">
            <input
              id="questionFiles"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={(e) => setQuestionFiles(e.target.files)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {questionFiles && questionFiles.length > 0 ? (
              <span>
                {questionFiles.length} file{questionFiles.length === 1 ? "" : "s"} selected
              </span>
            ) : (
              <span>
                Drop files here or <span className="text-amber underline">browse</span>
              </span>
            )}
          </label>
        </div>

        <div>
          <div className="field-label">Answer key(s) (optional)</div>
          <label className="relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/30 px-[18px] py-[18px] text-center font-sans text-[13px] font-semibold text-muted">
            <input
              id="answerKeyFiles"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={(e) => setAnswerKeyFiles(e.target.files)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {answerKeyFiles && answerKeyFiles.length > 0 ? (
              <span>
                {answerKeyFiles.length} file{answerKeyFiles.length === 1 ? "" : "s"} selected
              </span>
            ) : (
              <span>
                Drop files here or <span className="text-amber underline">browse</span>
              </span>
            )}
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {progress && <p className="font-sans text-[13px] font-medium text-muted">{progress}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-fit items-center rounded-xl bg-ink px-[22px] font-sans text-sm font-bold text-cream disabled:opacity-50"
        >
          {isSubmitting ? "Uploading…" : "Upload and continue"}
        </button>
      </form>
    </div>
  );
}
