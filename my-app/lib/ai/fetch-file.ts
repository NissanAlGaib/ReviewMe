import "server-only";

export async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch uploaded file (${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
