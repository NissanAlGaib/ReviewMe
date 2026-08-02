import "server-only";

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?.!,;:]+$/g, "");
}

/** Drops questions whose text exact-matches (after normalizing whitespace/case/trailing
 * punctuation) one already seen — either an existing question in the set, or an earlier
 * question in this same AI batch. AI extraction/generation runs across multiple files or
 * batches can otherwise surface the same question twice (e.g. it appears on two slides). */
export function dedupeQuestions<T extends { questionText: string }>(
  newQuestions: T[],
  existingQuestionTexts: Iterable<string> = []
): T[] {
  const seen = new Set(Array.from(existingQuestionTexts, normalize));
  const deduped: T[] = [];

  for (const question of newQuestions) {
    const key = normalize(question.questionText);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(question);
  }

  return deduped;
}
