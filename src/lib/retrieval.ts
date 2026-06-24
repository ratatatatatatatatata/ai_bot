import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchedChunk } from "@/lib/types";

/**
 * Run the pgvector similarity search RPC and return matched chunks.
 * `queryEmbedding` is the raw number[] from the embeddings API.
 */
export async function matchChunks(
  supabase: SupabaseClient,
  params: {
    websiteId: string;
    queryEmbedding: number[];
    matchCount?: number;
    similarityThreshold?: number;
  }
): Promise<MatchedChunk[]> {
  const {
    websiteId,
    queryEmbedding,
    matchCount = 5,
    similarityThreshold = 0.3,
  } = params;

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_website_id: websiteId,
    match_count: matchCount,
    similarity_threshold: similarityThreshold,
  });

  if (error) {
    throw new Error(`match_chunks failed: ${error.message}`);
  }

  return (data ?? []) as MatchedChunk[];
}
