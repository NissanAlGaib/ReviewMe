"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

import { createQuestionSetFromLecture } from "@/actions/question-sets";
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_GENERATED_QUESTIONS,
  DIFFICULTIES,
  MAX_FILES_PER_UPLOAD,
  MAX_GENERATED_QUESTIONS,
  MIN_GENERATED_QUESTIONS,
  QUESTION_COUNT_STEP,
  QUESTION_TYPE_LABELS,
} from "@/lib/validation/question-set";
import { FilePicker } from "../../../_components/file-picker";

type QuestionType = keyof typeof QUESTION_TYPE_LABELS;
type Difficulty = (typeof DIFFICULTIES)[number];

const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[];
const DEFAULT_TYPES: Record<QuestionType, boolean> = {
  MULTIPLE_CHOICE: true,
  TRUE_FALSE: true,
  IDENTIFICATION: false,
};

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

type UploadedRef = {
  blobUrl: string;
  blobPathname: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

export function LectureUploadForm() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "configure">("upload");

  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedRefs, setUploadedRefs] = useState<UploadedRef[]>([]);
  const [detectedTopics, setDetectedTopics] = useState<string[]>([]);

  const [questionCount, setQuestionCount] = useState(DEFAULT_GENERATED_QUESTIONS);
  const [selectedTypes, setSelectedTypes] = useState(DEFAULT_TYPES);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);

  const [createdSetId, setCreatedSetId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleAnalyze(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one lecture file.");
      return;
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      setError(`Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`);
      return;
    }

    setIsAnalyzing(true);

    try {
      const refs: UploadedRef[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading file ${i + 1} of ${files.length}…`);
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        refs.push({
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          mimeType: blob.contentType,
          originalName: file.name,
          sizeBytes: file.size,
        });
      }

      setProgress("Analyzing lecture material…");
      const res = await fetch("/api/lecture/detect-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploads: refs }),
      });

      let data: { error?: string; topics?: string[] } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response, handled by the !res.ok branch below
      }
      if (!res.ok) {
        throw new Error(data.error || `Analysis failed (${res.status}). Please try again.`);
      }

      setUploadedRefs(refs);
      setDetectedTopics(data.topics ?? []);
      setStep("configure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  }

  function toggleType(type: QuestionType) {
    setSelectedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  async function handleGenerate() {
    setError(null);

    const questionTypes = QUESTION_TYPES.filter((t) => selectedTypes[t]);
    if (questionTypes.length === 0) {
      setError("Select at least one question type.");
      return;
    }

    setIsGenerating(true);

    try {
      const { questionSetId } = await createQuestionSetFromLecture({
        title: title.trim(),
        uploads: uploadedRefs,
      });
      setCreatedSetId(questionSetId);

      setProgress("Generating questions… this can take a minute");
      const res = await fetch(`/api/question-sets/${questionSetId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount, questionTypes, difficulty }),
      });

      let data: { error?: string; questionCount?: number } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response, handled by the !res.ok branch below
      }
      if (!res.ok) {
        throw new Error(
          data.error ||
            `Generation failed (${res.status}). If you uploaded a lot of material, try a smaller batch — the request may have timed out.`
        );
      }

      router.push(`/question-sets/${questionSetId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }

  if (step === "configure") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="field-label">Topics detected</div>
          <div className="flex flex-wrap gap-2">
            {detectedTopics.map((topic) => (
              <div
                key={topic}
                className="rounded-full border-[1.5px] border-ink px-3 py-1.5 font-sans text-xs font-semibold text-ink"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <div className="field-label !mb-0">Number of questions</div>
            <span className="font-mono text-[13px] font-bold text-amber">{questionCount}</span>
          </div>
          <input
            type="range"
            className="tickslider mt-2.5"
            min={MIN_GENERATED_QUESTIONS}
            max={MAX_GENERATED_QUESTIONS}
            step={QUESTION_COUNT_STEP}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            disabled={isGenerating}
          />
        </div>

        <div>
          <div className="field-label">Question types</div>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                disabled={isGenerating}
                className={`rounded-full border-[1.5px] border-ink px-3.5 py-1.5 font-sans text-xs font-semibold disabled:opacity-50 ${
                  selectedTypes[type] ? "bg-ink text-cream" : "text-ink"
                }`}
              >
                {QUESTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">Difficulty</div>
          <div className="flex w-fit gap-1 rounded-[10px] border-[1.5px] border-ink p-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                disabled={isGenerating}
                className={`rounded-[7px] px-4 py-2 font-sans text-[13px] font-bold disabled:opacity-50 ${
                  difficulty === d ? "bg-ink text-cream" : "text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-red-600">{error}</p>
            {createdSetId && (
              <a
                href={`/question-sets/${createdSetId}/review`}
                className="w-fit font-sans text-xs font-semibold text-amber underline"
              >
                Question set was created — go to review page →
              </a>
            )}
          </div>
        )}
        {progress && <p className="font-sans text-[13px] font-medium text-muted">{progress}</p>}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setStep("upload")}
            disabled={isGenerating}
            className="flex h-[46px] items-center rounded-xl border-[1.5px] border-ink px-[18px] font-sans text-[13px] font-semibold text-ink disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex h-[46px] flex-1 items-center justify-center rounded-xl bg-ink px-5 font-sans text-sm font-bold text-cream disabled:opacity-50"
          >
            {isGenerating ? "Generating…" : `Generate ${questionCount} questions`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
        Upload lecture slides, notes, or documents — handwritten photos, PDFs, PPTX, or DOCX. The
        AI reads the material and writes a brand-new quiz from it (it doesn&apos;t need to already
        contain questions). Up to {MAX_FILES_PER_UPLOAD} files at a time.
      </div>

      <form onSubmit={handleAnalyze} className="flex flex-col gap-5">
        <div>
          <div className="field-label">Lecture title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Educational Psychology — Week 4"
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label">Lecture material</div>
          <FilePicker
            files={files}
            setFiles={setFiles}
            accept={LECTURE_ACCEPT}
            hint="JPG · PNG · PDF · PPT · PPTX · DOCX"
            allowCamera
            disabled={isAnalyzing}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {progress && <p className="font-sans text-[13px] font-medium text-muted">{progress}</p>}

        <button
          type="submit"
          disabled={isAnalyzing}
          className="flex h-12 w-fit items-center rounded-xl bg-ink px-[22px] font-sans text-sm font-bold text-cream disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing…" : "Analyze lecture with AI"}
        </button>
      </form>
    </div>
  );
}
