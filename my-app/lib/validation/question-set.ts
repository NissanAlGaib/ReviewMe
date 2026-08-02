import { z } from "zod";

// Keeps each extraction run's file count (and therefore the AI call's duration)
// small enough to comfortably finish within the extract route's time limit —
// upload more files in a later batch to add to the same question set instead.
export const MAX_FILES_PER_UPLOAD = 6;

export const UploadKindSchema = z.enum(["QUESTION_SOURCE", "ANSWER_KEY", "LECTURE"]);

const UploadSchema = z.object({
  blobUrl: z.url(),
  blobPathname: z.string().min(1),
  mimeType: z.string().min(1),
  originalName: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  kind: UploadKindSchema,
});

const LectureUploadSchema = UploadSchema.omit({ kind: true });

export const CreateQuestionSetSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  examType: z.string().trim().max(50).optional(),
  uploads: z
    .array(UploadSchema)
    .min(1, "Upload at least one question source file.")
    .max(MAX_FILES_PER_UPLOAD, `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`),
});

export const QuestionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "IDENTIFICATION"]);

export const QUESTION_TYPE_LABELS: Record<z.infer<typeof QuestionTypeSchema>, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True/False",
  IDENTIFICATION: "Identification",
};

export const DifficultySchema = z.enum(["Easy", "Medium", "Hard"]);
export const DIFFICULTIES = DifficultySchema.options;
export const DEFAULT_DIFFICULTY: z.infer<typeof DifficultySchema> = "Medium";

export const MIN_GENERATED_QUESTIONS = 5;
export const MAX_GENERATED_QUESTIONS = 60;
export const QUESTION_COUNT_STEP = 5;
export const DEFAULT_GENERATED_QUESTIONS = 20;

export const QuestionCountSchema = z
  .number()
  .int()
  .min(MIN_GENERATED_QUESTIONS, `Generate at least ${MIN_GENERATED_QUESTIONS} questions.`)
  .max(MAX_GENERATED_QUESTIONS, `Generate at most ${MAX_GENERATED_QUESTIONS} questions at a time.`);

export const DetectTopicsSchema = z.object({
  uploads: z
    .array(LectureUploadSchema)
    .min(1, "Upload at least one lecture file.")
    .max(MAX_FILES_PER_UPLOAD, `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`),
});

export const CreateQuestionSetFromLectureSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  examType: z.string().trim().max(50).optional(),
  uploads: z
    .array(LectureUploadSchema)
    .min(1, "Upload at least one lecture file.")
    .max(MAX_FILES_PER_UPLOAD, `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`),
});

export const GenerateQuestionsBodySchema = z.object({
  questionCount: QuestionCountSchema,
  questionTypes: z.array(QuestionTypeSchema).min(1, "Select at least one question type.").optional(),
  difficulty: DifficultySchema.optional(),
});

export const UpdateQuestionSetSchema = z.object({
  questionSetId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required.").max(200),
  examType: z.string().trim().max(50).optional(),
});

export const AddUploadsSchema = z.object({
  questionSetId: z.string().min(1),
  uploads: z
    .array(UploadSchema)
    .min(1, "Select at least one file.")
    .max(MAX_FILES_PER_UPLOAD, `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`),
});

export const ReviewedQuestionSchema = z.object({
  order: z.number().int().nonnegative(),
  type: QuestionTypeSchema,
  questionText: z.string().trim().min(1, "Question text is required."),
  topic: z.string().trim().min(1).nullable(),
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
