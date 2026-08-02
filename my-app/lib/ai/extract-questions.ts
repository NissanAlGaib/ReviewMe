import "server-only";

import { runQuestionGeneration, type GenerationPart } from "@/lib/ai/gemini-client";
import type { ExtractionResult } from "@/lib/ai/schema";

export type ExtractionFile = {
  mimeType: string;
  base64: string;
  kind: "QUESTION_SOURCE" | "ANSWER_KEY";
};

const EXTRACTION_INSTRUCTIONS = `You are extracting exam review questions from uploaded files for a study app.

Files labeled "QUESTION SOURCE" contain the questions (and possibly choices). Files labeled "ANSWER KEY", if present, contain the correct answers, matched to questions by their visible question number.

For each question you find, determine:
- Its type: MULTIPLE_CHOICE (has lettered/numbered choices), TRUE_FALSE, or IDENTIFICATION (free-text/short-answer, no choices).
- The question text, and choices if any (with their original label, e.g. "A", "B").
- A short topic/subject label (2-4 words, e.g. "Teaching & Learning", "Assessment", "Political Law") categorizing what the question is actually about, for grouping performance later. Keep the set of topics small and consistent across questions in the same file rather than inventing a new topic per question.
- The correct answer: for MULTIPLE_CHOICE, use the choice label; for TRUE_FALSE, "True" or "False"; for IDENTIFICATION, the expected answer text. If no answer key was provided, use your own best-informed answer.
- Match answers to questions using the visible question number in both files (do not attempt semantic matching of question text).
- A short explanation if the source material provides one, otherwise null.
- Your confidence ("high", "medium", "low") in the extraction accuracy for that specific question — mark "low" whenever the source is hard to read, the answer-key match is ambiguous, or you are guessing at the answer.

Number questions in "order" starting from 0, following the order they appear in the question source file(s). Extract every question you can find, even ones you're unsure about — never skip a question, just mark it with lower confidence.`;

function toPart(file: ExtractionFile): GenerationPart {
  return { inlineData: { mimeType: file.mimeType, data: file.base64 } };
}

export async function extractQuestions(files: ExtractionFile[]): Promise<ExtractionResult> {
  const questionFiles = files.filter((f) => f.kind === "QUESTION_SOURCE");
  const answerKeyFiles = files.filter((f) => f.kind === "ANSWER_KEY");

  const parts: GenerationPart[] = [{ text: "QUESTION SOURCE:" }, ...questionFiles.map(toPart)];

  if (answerKeyFiles.length > 0) {
    parts.push({ text: "ANSWER KEY:" }, ...answerKeyFiles.map(toPart));
  }

  parts.push({ text: EXTRACTION_INSTRUCTIONS });

  return runQuestionGeneration(parts);
}
