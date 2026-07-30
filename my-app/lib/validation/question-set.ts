import { z } from "zod";

export const UploadKindSchema = z.enum(["QUESTION_SOURCE", "ANSWER_KEY"]);

export const CreateQuestionSetSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  examType: z.string().trim().max(50).optional(),
  uploads: z
    .array(
      z.object({
        blobUrl: z.url(),
        blobPathname: z.string().min(1),
        mimeType: z.string().min(1),
        originalName: z.string().min(1),
        sizeBytes: z.number().int().positive(),
        kind: UploadKindSchema,
      })
    )
    .min(1, "Upload at least one question source file."),
});

export const QuestionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "IDENTIFICATION"]);

export const ReviewedQuestionSchema = z.object({
  order: z.number().int().nonnegative(),
  type: QuestionTypeSchema,
  questionText: z.string().trim().min(1, "Question text is required."),
  choices: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        text: z.string().trim().min(1),
      })
    )
    .nullable(),
  correctAnswer: z.string().trim().min(1, "Correct answer is required."),
  explanation: z.string().trim().nullable(),
});

export const SaveReviewedQuestionsSchema = z.object({
  questionSetId: z.string().min(1),
  questions: z.array(ReviewedQuestionSchema).min(1, "Add at least one question."),
});
