import { z } from "zod";

export const ExtractedQuestionSchema = z.object({
  order: z.number().int().nonnegative(),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "IDENTIFICATION"]),
  questionText: z.string().min(1),
  choices: z
    .array(
      z.object({
        label: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .nullable(),
  correctAnswer: z.string().min(1),
  explanation: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ExtractionResultSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
});

export type ExtractedQuestion = z.infer<typeof ExtractedQuestionSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
