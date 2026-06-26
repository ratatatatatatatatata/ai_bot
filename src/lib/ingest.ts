import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/ai";
import type { Store } from "@/lib/store";
import type { SourceType } from "@/lib/types";

/** True when an embedding provider key is configured for the active provider. */
export function embeddingsAvailable(): boolean {
  const p = (process.env.AI_PROVIDER || "openai").toLowerCase();
  return p === "gemini" ? !!process.env.GEMINI_API_KEY : !!process.env.OPENAI_API_KEY;
}

export interface IngestInput {
  url: string;
  title: string;
  content: string;
  source: SourceType;
}

/**
 * Chunk + (optionally) embed a set of pages and persist them via the store.
 * If no embedding key is configured, chunks are stored with null vectors and
 * retrieval falls back to keyword search — so the demo works with zero keys.
 */
export async function ingestPages(
  store: Store,
  websiteId: string,
  pages: IngestInput[]
): Promise<{ pages: number; chunks: number }> {
  const useEmb = embeddingsAvailable();
  let totalChunks = 0;

  for (const p of pages) {
    const page = await store.createPage({
      website_id: websiteId,
      url: p.url,
      title: p.title,
      content: p.content,
      source: p.source,
    });

    const chunks = chunkText(p.content);
    if (chunks.length === 0) continue;

    const batchSize = 96;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      let embeddings: (number[] | null)[];
      if (useEmb) {
        try {
          embeddings = await embedTexts(batch);
        } catch {
          embeddings = batch.map(() => null);
        }
      } else {
        embeddings = batch.map(() => null);
      }

      await store.insertChunks(
        batch.map((text, j) => ({
          website_id: websiteId,
          page_id: page.id,
          page_url: p.url,
          page_title: p.title,
          chunk_text: text,
          embedding: embeddings[j] ?? null,
        }))
      );
      totalChunks += batch.length;
    }
  }

  return { pages: pages.length, chunks: totalChunks };
}
