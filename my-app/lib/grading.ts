type GradableQuestion = {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "IDENTIFICATION";
  correctAnswer: string;
};

/**
 * Exact match for MC/TF; case-insensitive trimmed match for identification.
 * Deliberately not fuzzy/semantic — a typo on an identification answer is marked wrong.
 */
export function gradeAnswer(question: GradableQuestion, userAnswer: string | null): boolean {
  if (userAnswer == null || userAnswer.trim() === "") return false;

  if (question.type === "IDENTIFICATION") {
    return userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }

  return userAnswer === question.correctAnswer;
}
