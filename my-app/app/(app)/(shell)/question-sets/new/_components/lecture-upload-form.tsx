"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import { createQuestionSetFromLecture } from "@/actions/question-sets";
import {
  DEFAULT_GENERATED_QUESTIONS,
  MAX_FILES_PER_UPLOAD,
  MAX_GENERATED_QUESTIONS,
  MIN_GENERATED_QUESTIONS,
} from "@/lib/validation/question-set";

const LECTURE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
].join(",");

export function LectureUploadForm() {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("");
  const [questionCount, setQuestionCount] = useState(DEFAULT_GENERATED_QUESTIONS);
  const [lectureFiles, setLectureFiles] = useState<FileList | null>(null);
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
    if (!lectureFiles || lectureFiles.length === 0) {
      setError("Please upload at least one lecture file.");
      return;
    }
    if (lectureFiles.length > MAX_FILES_PER_UPLOAD) {
      setError(
        `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time. You can add more files to this set afterward from the review page.`
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
      }[] = [];

      const lectureFileArray = Array.from(lectureFiles);
      for (let i = 0; i < lectureFileArray.length; i++) {
        const file = lectureFileArray[i];
        setProgress(`Uploading file ${i + 1} of ${lectureFileArray.length}…`);
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
        });
      }

      setProgress("Creating question set…");
      await createQuestionSetFromLecture({
        title: title.trim(),
        examType: examType.trim() || undefined,
        questionCount,
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
      <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
        Upload lecture slides, notes, or documents — handwritten photos, PDFs, PPTX, or DOCX. The
        AI reads the material and writes a brand-new quiz from it (it doesn&apos;t need to already
        contain questions). Up to {MAX_FILES_PER_UPLOAD} files at a time — you can add more later
        from the review page.
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <div className="field-label">Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Educational Psychology - Chapter 3"
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label">Exam type (optional)</div>
          <input
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            placeholder="e.g. LET, BAR"
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label">Questions to generate</div>
          <input
            type="number"
            min={MIN_GENERATED_QUESTIONS}
            max={MAX_GENERATED_QUESTIONS}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label">Lecture material</div>
          <label className="relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/30 px-[18px] py-[18px] text-center font-sans text-[13px] font-semibold text-muted">
            <input
              type="file"
              multiple
              accept={LECTURE_ACCEPT}
              onChange={(e) => setLectureFiles(e.target.files)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {lectureFiles && lectureFiles.length > 0 ? (
              <span>
                {lectureFiles.length} file{lectureFiles.length === 1 ? "" : "s"} selected
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
