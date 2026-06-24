/**
 * Split cleaned page text into overlapping chunks suitable for embedding.
 * Tries to break on paragraph / sentence boundaries to keep chunks coherent.
 */

const DEFAULT_CHUNK_SIZE = 1000; // characters
const DEFAULT_OVERLAP = 150; // characters carried into the next chunk

export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): string[] {
  const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  if (!clean) return [];

  // Break into sentence-ish units first so we rarely cut mid-sentence.
  const units = clean
    .split(/(?<=[.!?。．！？])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const unit of units) {
    // A single very long unit: hard-split it by length.
    if (unit.length > chunkSize) {
      pushCurrent();
      current = "";
      for (let i = 0; i < unit.length; i += chunkSize - overlap) {
        chunks.push(unit.slice(i, i + chunkSize).trim());
      }
      continue;
    }

    if ((current + " " + unit).trim().length > chunkSize) {
      pushCurrent();
      // Start the next chunk with an overlap tail from the previous one.
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = (tail + " " + unit).trim();
    } else {
      current = current ? `${current} ${unit}` : unit;
    }
  }
  pushCurrent();

  // Drop tiny fragments that carry no real signal.
  return chunks.filter((c) => c.length > 20);
}
