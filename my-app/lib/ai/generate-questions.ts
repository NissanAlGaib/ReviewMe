import "server-only";
import { Type } from "@google/genai";
import { z } from "zod";

import { ai, MODEL, runQuestionGeneration, type GenerationPart } from "@/lib/ai/gemini-client";
import { extractOfficeDocumentText, OFFICE_DOCUMENT_MIME_TYPES } from "@/lib/ai/lecture-text";
import { QUESTION_TYPE_LABELS, type QuestionTypeSchema, type DifficultySchema } from "@/lib/validation/question-set";
import type { ExtractionResult } from "@/lib/ai/schema";

export type LectureFile = {
  mimeType: string;
  base64: string;
  originalName: string;
};

type QuestionType = z.infer<typeof QuestionTypeSchema>;
type Difficulty = z.infer<typeof DifficultySchema>;

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  Easy: "Favor straightforward recall and recognition of terms, definitions, and basic facts stated directly in the material.",
  Medium: "Favor questions that require understanding and applying concepts, not just recalling them verbatim.",
  Hard: "Favor challenging questions that require analysis, comparing/contrasting ideas, or applying concepts to a new scenario not explicitly spelled out in the material.",
};

function generationInstructions(opts: {
  questionCount: number;
  examType: string | null;
  questionTypes: QuestionType[];
  difficulty: Difficulty;
}): string {
  const typeList = opts.questionTypes.map((t) => QUESTION_TYPE_LABELS[t]).join(", ");

  return `You are writing a brand-new practice quiz from uploaded lecture material (slides, handwritten or typed notes, or documents) for a study app${
    opts.examType ? ` preparing for the ${opts.examType} exam` : ""
  }.

The material does not already contain quiz questions — read it for its concepts, facts, and arguments, and author original questions that test understanding of that content. Do not invent facts not supported by the material.

Generate exactly ${opts.questionCount} questions in total, covering the material's most important and testable points (favor breadth across topics over depth on any single one). Only use these question types: ${typeList}. Do not use any other question type. If more than one type is allowed, mix them naturally across the set.

Target difficulty: ${opts.difficulty}. ${DIFFICULTY_GUIDANCE[opts.difficulty]}

For each question, determine:
- Its type (one of: ${typeList}).
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
  opts: {
    questionCount: number;
    examType: string | null;
    questionTypes?: QuestionType[];
    difficulty?: Difficulty;
  }
): Promise<ExtractionResult> {
  const parts = await Promise.all(files.map(toPart));
  parts.push({
    text: generationInstructions({
      questionCount: opts.questionCount,
      examType: opts.examType,
      questionTypes: opts.questionTypes?.length
        ? opts.questionTypes
        : ["MULTIPLE_CHOICE", "TRUE_FALSE", "IDENTIFICATION"],
      difficulty: opts.difficulty ?? "Medium",
    }),
  });

  return runQuestionGeneration(parts);
}

const TOPICS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topics: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["topics"],
};

const TopicsResultSchema = z.object({
  topics: z.array(z.string().min(1)).min(1),
});

/** A quick first pass over the lecture material to surface what it actually covers,
 * shown to the user before they commit to a full (slower, costlier) generation run. */
export async function detectLectureTopics(files: LectureFile[]): Promise<string[]> {
  const parts = await Promise.all(files.map(toPart));
  parts.push({
    text: "Identify the 4 to 8 most important topics/subjects covered in this lecture material, for use as review categories in a study app. Keep each topic short (2-4 words). List them ordered by how central they are to the material.",
  });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: TOPICS_RESPONSE_SCHEMA,
      maxOutputTokens: 2048,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return a parseable result.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned a malformed result. Please try again.");
  }

  return TopicsResultSchema.parse(parsed).topics;
}
