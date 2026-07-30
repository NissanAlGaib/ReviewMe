import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { ExtractionResultSchema, type ExtractionResult } from "@/lib/ai/schema";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Vision-capable, handles PDFs natively. Swap to "claude-opus-5" for a specific
 * set if extraction quality on messy scans/handwriting turns out to be poor. */
const MODEL = "claude-sonnet-5";

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
- The correct answer: for MULTIPLE_CHOICE, use the choice label; for TRUE_FALSE, "True" or "False"; for IDENTIFICATION, the expected answer text. If no answer key was provided, use your own best-informed answer.
- Match answers to questions using the visible question number in both files (do not attempt semantic matching of question text).
- A short explanation if the source material provides one, otherwise null.
- Your confidence ("high", "medium", "low") in the extraction accuracy for that specific question — mark "low" whenever the source is hard to read, the answer-key match is ambiguous, or you are guessing at the answer.

Number questions in "order" starting from 0, following the order they appear in the question source file(s). Extract every question you can find, even ones you're unsure about — never skip a question, just mark it with lower confidence.`;

function toContentBlock(file: ExtractionFile): Anthropic.ContentBlockParam {
  if (file.mimeType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: file.base64 },
    };
  }

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: file.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: file.base64,
    },
  };
}

export async function extractQuestions(files: ExtractionFile[]): Promise<ExtractionResult> {
  const questionFiles = files.filter((f) => f.kind === "QUESTION_SOURCE");
  const answerKeyFiles = files.filter((f) => f.kind === "ANSWER_KEY");

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "QUESTION SOURCE:" },
    ...questionFiles.map(toContentBlock),
  ];

  if (answerKeyFiles.length > 0) {
    content.push({ type: "text", text: "ANSWER KEY:" }, ...answerKeyFiles.map(toContentBlock));
  }

  content.push({ type: "text", text: EXTRACTION_INSTRUCTIONS });

  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content }],
    output_config: {
      format: zodOutputFormat(ExtractionResultSchema),
    },
  });

  if (!message.parsed_output) {
    throw new Error("Claude did not return a parseable extraction result.");
  }

  // Structured output constrains the model but doesn't replace validating the result ourselves.
  return ExtractionResultSchema.parse(message.parsed_output);
}
