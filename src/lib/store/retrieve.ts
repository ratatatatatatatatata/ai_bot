// Lightweight retrieval helpers used by the demo store (and as a keyword
// fallback when no embedding provider is configured).

export function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are",
  "what", "how", "do", "does", "can", "i", "you", "it", "this", "that", "with",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(
    (t) => t.length > 1 && !STOP.has(t)
  );
}

/**
 * Term-overlap score (BM25-lite). Returns 0..~1 relevance of `text` for the
 * query terms. Used when embeddings are unavailable so chat still works.
 */
export function keywordScore(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 0;
  const docTokens = tokenize(text);
  if (docTokens.length === 0) return 0;
  const docSet = new Map<string, number>();
  for (const t of docTokens) docSet.set(t, (docSet.get(t) || 0) + 1);

  let hits = 0;
  let matched = 0;
  for (const q of queryTokens) {
    const tf = docSet.get(q) || 0;
    if (tf > 0) {
      matched += 1;
      hits += tf / (tf + 1.5); // saturating term frequency
    }
  }
  const coverage = matched / queryTokens.length;
  const lengthNorm = Math.min(1, 60 / docTokens.length + 0.5);
  return coverage * (hits / queryTokens.length) * lengthNorm;
}
