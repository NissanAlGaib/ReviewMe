import "server-only";
import { GoogleGenAI, Type, type Schema } from "@google/genai";

import { ExtractionResultSchema, type ExtractionResult } from "@/lib/ai/schema";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/** Vision-capable, handles PDFs natively, highest free-tier request caps. Rolling alias
 * (not a pinned version) since pinned model IDs get sunset for new API keys over time —
 * confirmed "gemini-2.5-flash-lite" itself was already rejected as "no longer available
 * to new users". Swap to "gemini-flash-latest" or "gemini-pro-latest" for a specific set
 * if quality on messy scans/handwriting turns out to be poor (lower free-tier quota). */
export const MODEL = "gemini-flash-lite-latest";

export type GenerationPart = { text: string } | { inlineData: { mimeType: string; data: string } };

// Shared by both AI-extraction (from existing exam questions) and AI-generation (from
// lecture material) — both ultimately produce the same shape of question rows.
export const QUESTION_RESPONSE_SCHEMA: Schema = {
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

export async function runQuestionGeneration(parts: GenerationPart[]): Promise<ExtractionResult> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: QUESTION_RESPONSE_SCHEMA,
      maxOutputTokens: 65536,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return a parseable result.");
  }

  // A response cut off mid-JSON (too many files/questions for the output budget) fails
  // JSON.parse with an opaque "Unexpected end of JSON input" — check finishReason first
  // so that case gets a message pointing at the actual cause instead.
  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "The AI's response was too long to finish (too many files or questions in one batch). Try a smaller batch."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned a malformed result. Please try again.");
  }

  // Structured output constrains the model but doesn't replace validating the result ourselves.
  return ExtractionResultSchema.parse(parsed);
}
