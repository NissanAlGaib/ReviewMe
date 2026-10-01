import { z } from "zod";

export const QuizSubmissionSchema = z.object({
  questionSetId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      userAnswer: z.string().nullable(),
    })
  ),
});

export const CheckAnswerSchema = z.object({
  questionSetId: z.string().min(1),
  questionId: z.string().min(1),
  userAnswer: z.string().nullable(),
});
