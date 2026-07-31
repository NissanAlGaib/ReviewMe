"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

import { addUploadsToQuestionSet } from "@/actions/question-sets";
import { MAX_FILES_PER_UPLOAD } from "@/lib/validation/question-set";

type Kind = "QUESTION_SOURCE" | "ANSWER_KEY";

export function AddFilesForm({ questionSetId }: { questionSetId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("QUESTION_SOURCE");
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    const fileArray = files ? Array.from(files) : [];
    if (fileArray.length === 0) {
      setError("Select at least one file.");
      return;
    }
    if (fileArray.length > MAX_FILES_PER_UPLOAD) {
      setError(`Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`);
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
        kind: Kind;
      }[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setProgress(`Uploading file ${i + 1} of ${fileArray.length}…`);
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
          kind,
        });
      }

      await addUploadsToQuestionSet({ questionSetId, uploads });
      setFiles(null);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-[42px] w-fit items-center rounded-[10px] border-[1.5px] border-dashed border-ink/40 px-[18px] font-sans text-[13px] font-bold text-ink"
      >
        + Add more files
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-dashed border-ink/40 p-4"
    >
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-ink">
          <input
            type="radio"
            name="kind"
            checked={kind === "QUESTION_SOURCE"}
            onChange={() => setKind("QUESTION_SOURCE")}
          />
          Question source
        </label>
        <label className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-ink">
          <input
            type="radio"
            name="kind"
            checked={kind === "ANSWER_KEY"}
            onChange={() => setKind("ANSWER_KEY")}
          />
          Answer key
        </label>
      </div>

      <label className="relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/30 px-[18px] py-[14px] text-center font-sans text-[13px] font-semibold text-muted">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={(e) => setFiles(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {files && files.length > 0 ? (
          <span>
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </span>
        ) : (
          <span>
            Drop files here or <span className="text-amber underline">browse</span> (up to{" "}
            {MAX_FILES_PER_UPLOAD})
          </span>
        )}
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && <p className="font-sans text-[13px] font-medium text-muted">{progress}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[42px] w-fit items-center rounded-[10px] bg-ink px-[18px] font-sans text-[13px] font-bold text-cream disabled:opacity-50"
        >
          {isSubmitting ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
            setFiles(null);
          }}
          disabled={isSubmitting}
          className="font-sans text-[13px] font-semibold text-muted hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
