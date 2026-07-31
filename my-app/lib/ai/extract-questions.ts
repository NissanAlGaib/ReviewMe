import "server-only";
import { GoogleGenAI, Type, type Schema } from "@google/genai";

import { ExtractionResultSchema, type ExtractionResult } from "@/lib/ai/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/** Vision-capable, handles PDFs natively, highest free-tier request caps. Rolling alias
 * (not a pinned version) since pinned model IDs get sunset for new API keys over time —
 * confirmed "gemini-2.5-flash-lite" itself was already rejected as "no longer available
 * to new users". Swap to "gemini-flash-latest" or "gemini-pro-latest" for a specific set
 * if extraction quality on messy scans/handwriting turns out to be poor (lower free-tier quota). */
const MODEL = "gemini-flash-lite-latest";

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

// Mirrors ExtractionResultSchema (lib/ai/schema.ts) in Gemini's restricted OpenAPI-subset
// schema format, which doesn't accept a Zod/JSON-Schema object directly.
const EXTRACTION_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER },
          type: {
            type: Type.STRING,
            enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "IDENTIFICATION"],
          },
          questionText: { type: Type.STRING },
          topic: { type: Type.STRING, nullable: true },
          choices: {
            type: Type.ARRAY,
            nullable: true,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["label", "text"],
            },
          },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING, nullable: true },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
        },
        required: [
          "order",
          "type",
          "questionText",
          "topic",
          "choices",
          "correctAnswer",
          "explanation",
          "confidence",
        ],
      },
    },
  },
  required: ["questions"],
};

function toPart(file: ExtractionFile) {
  return { inlineData: { mimeType: file.mimeType, data: file.base64 } };
}

export async function extractQuestions(files: ExtractionFile[]): Promise<ExtractionResult> {
  const questionFiles = files.filter((f) => f.kind === "QUESTION_SOURCE");
  const answerKeyFiles = files.filter((f) => f.kind === "ANSWER_KEY");

  const parts = [{ text: "QUESTION SOURCE:" }, ...questionFiles.map(toPart)];

  if (answerKeyFiles.length > 0) {
    parts.push({ text: "ANSWER KEY:" }, ...answerKeyFiles.map(toPart));
  }

  parts.push({ text: EXTRACTION_INSTRUCTIONS });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_RESPONSE_SCHEMA,
      maxOutputTokens: 65536,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return a parseable extraction result.");
  }

  // A response cut off mid-JSON (too many files/questions for the output budget) fails
  // JSON.parse with an opaque "Unexpected end of JSON input" — check finishReason first
  // so that case gets a message pointing at the actual cause instead.
  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "The AI's response was too long to finish (too many files or questions in one set). Try splitting this into smaller question sets."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned a malformed extraction result. Please try again.");
  }

  // Structured output constrains the model but doesn't replace validating the result ourselves.
  return ExtractionResultSchema.parse(parsed);
}
