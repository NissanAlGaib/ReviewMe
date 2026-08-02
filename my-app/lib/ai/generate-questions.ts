import "server-only";

import { runQuestionGeneration, type GenerationPart } from "@/lib/ai/gemini-client";
import { extractOfficeDocumentText, OFFICE_DOCUMENT_MIME_TYPES } from "@/lib/ai/lecture-text";
import type { ExtractionResult } from "@/lib/ai/schema";

export type LectureFile = {
  mimeType: string;
  base64: string;
  originalName: string;
};

function generationInstructions(questionCount: number, examType: string | null): string {
  return `You are writing a brand-new practice quiz from uploaded lecture material (slides, handwritten or typed notes, or documents) for a study app${
    examType ? ` preparing for the ${examType} exam` : ""
  }.

The material does not already contain quiz questions — read it for its concepts, facts, and arguments, and author original questions that test understanding of that content. Do not invent facts not supported by the material.

Generate exactly ${questionCount} questions in total, covering the material's most important and testable points (favor breadth across topics over depth on any single one). Mix question types naturally: mostly MULTIPLE_CHOICE (4 choices, one correct), with some TRUE_FALSE and IDENTIFICATION (free-text/short-answer) where they fit the content better than multiple choice.

For each question, determine:
- Its type: MULTIPLE_CHOICE, TRUE_FALSE, or IDENTIFICATION.
- The question text, and choices if MULTIPLE_CHOICE (label them "A", "B", "C", "D").
- A short topic/subject label (2-4 words) categorizing what the question is about, for grouping performance later. Keep the set of topics small and consistent rather than inventing a new topic per question.
- The correct answer: for MULTIPLE_CHOICE, the choice label; for TRUE_FALSE, "True" or "False"; for IDENTIFICATION, the expected answer text.
- A short explanation of why that answer is correct, grounded in the source material.
- Your confidence ("high", "medium", "low") that the question is well-formed and clearly supported by the material — mark "low" for anything you had to infer beyond what the material states.

Number questions in "order" starting from 0.`;
}

async function toPart(file: LectureFile): Promise<GenerationPart> {
  if (OFFICE_DOCUMENT_MIME_TYPES.has(file.mimeType)) {
    const text = await extractOfficeDocumentText(
      Buffer.from(file.base64, "base64"),
      file.mimeType,
      file.originalName
    );
    return { text: `--- ${file.originalName} ---\n${text}` };
  }
  return { inlineData: { mimeType: file.mimeType, data: file.base64 } };
}

export async function generateQuestionsFromLecture(
  files: LectureFile[],
  opts: { questionCount: number; examType: string | null }
): Promise<ExtractionResult> {
  const parts = await Promise.all(files.map(toPart));
  parts.push({ text: generationInstructions(opts.questionCount, opts.examType) });

  return runQuestionGeneration(parts);
}
