"use client";

import { useState } from "react";

import { ExamUploadForm } from "./_components/exam-upload-form";
import { LectureUploadForm } from "./_components/lecture-upload-form";

type Mode = "exam" | "lecture";

export default function NewQuestionSetPage() {
  const [mode, setMode] = useState<Mode>("exam");

  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <div>
        <div className="font-sans text-2xl font-extrabold tracking-tight text-ink">
          New question set
        </div>
      </div>

      <div className="flex w-fit gap-1 rounded-[10px] border-[1.5px] border-ink bg-paper p-1">
        <button
          type="button"
          onClick={() => setMode("exam")}
          className={`rounded-[7px] px-4 py-2 font-sans text-[13px] font-bold transition-colors ${
            mode === "exam" ? "bg-ink text-cream" : "text-ink"
          }`}
        >
          From exam questions
        </button>
        <button
          type="button"
          onClick={() => setMode("lecture")}
          className={`rounded-[7px] px-4 py-2 font-sans text-[13px] font-bold transition-colors ${
            mode === "lecture" ? "bg-ink text-cream" : "text-ink"
          }`}
        >
          From lecture material
        </button>
      </div>

      {mode === "exam" ? <ExamUploadForm /> : <LectureUploadForm />}
    </div>
  );
}
