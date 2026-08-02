import "server-only";
import mammoth from "mammoth";
import JSZip from "jszip";

export const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export const PPTX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

export const OFFICE_DOCUMENT_MIME_TYPES = new Set([...DOCX_MIME_TYPES, ...PPTX_MIME_TYPES]);

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// .pptx is a zip of per-slide XML files; slide text lives in <a:t> runs. A full XML
// parse isn't needed just to pull plain text out for the AI prompt — a regex over the
// well-formed XML that Office itself produces is enough and keeps this dependency-light.
async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const numOf = (p: string) => Number(p.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return numOf(a) - numOf(b);
    });

  if (slidePaths.length === 0) {
    throw new Error("no slides found");
  }

  const slideTexts = await Promise.all(
    slidePaths.map(async (path, i) => {
      const xml = await zip.files[path].async("text");
      const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
      return `Slide ${i + 1}:\n${runs.join(" ")}`;
    })
  );

  return slideTexts.join("\n\n");
}

/** Pulls plain text out of a docx/pptx file so it can be sent to Gemini as a text part —
 * these office formats aren't among Gemini's vision-supported mime types, unlike images/PDF. */
export async function extractOfficeDocumentText(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  try {
    const text = DOCX_MIME_TYPES.has(mimeType)
      ? await extractDocxText(buffer)
      : await extractPptxText(buffer);

    if (!text.trim()) {
      throw new Error("empty");
    }
    return text;
  } catch {
    throw new Error(
      `Could not read text from "${originalName}". It may be corrupted, password-protected, or in an unsupported format.`
    );
  }
}
