"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import { createQuestionSetFromUploads } from "@/actions/question-sets";

export default function NewQuestionSetPage() {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("");
  const [questionFiles, setQuestionFiles] = useState<FileList | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<FileList | null>(null);
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

      if (answerKeyFile && answerKeyFile.length > 0) {
        const file = answerKeyFile[0];
        setProgress("Uploading answer key…");
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          New question set
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload photos or PDFs of exam questions, optionally with a separate answer key.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. LET Professional Education - Set 1"
            className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.145] dark:focus:border-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="examType" className="text-sm font-medium">
            Exam type (optional)
          </label>
          <input
            id="examType"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            placeholder="e.g. LET, BAR"
            className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.145] dark:focus:border-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="questionFiles" className="text-sm font-medium">
            Question images / PDFs
          </label>
          <input
            id="questionFiles"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={(e) => setQuestionFiles(e.target.files)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="answerKeyFile" className="text-sm font-medium">
            Answer key (optional)
          </label>
          <input
            id="answerKeyFile"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={(e) => setAnswerKeyFile(e.target.files)}
            className="text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {progress && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{progress}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-fit"
        >
          {isSubmitting ? "Uploading…" : "Upload and continue"}
        </button>
      </form>
    </div>
  );
}
