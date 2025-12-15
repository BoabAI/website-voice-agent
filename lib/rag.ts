import { generateEmbeddings } from "./embeddings";
import { supabase } from "./supabase";

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
}

/**
 * Search the knowledge base (scraped website content) for relevant information
 */
export async function searchKnowledgeBase(
  query: string,
  scrapeId: string,
  topK: number = 10
): Promise<SearchResult[]> {
  try {
    console.log(`[RAG] Searching for: "${query}" in scrapeId: ${scrapeId}`);

    if (!scrapeId) {
      console.error("[RAG] Error: scrapeId is missing");
      return [];
    }

    // 1. Convert the user query into a vector
    const queryEmbeddingResult = await generateEmbeddings(query);

    // 2. Search Supabase using the vector
    // Note: The order of parameters in the RPC call doesn't strictly matter if we use named parameters,
    // but we must ensure all required parameters are present.
    const { data, error } = await supabase.rpc("match_scrape_embeddings", {
      filter_scrape_id: scrapeId,
      match_count: topK,
      match_threshold: 0.3,
      query_embedding: queryEmbeddingResult.data,
    });

    if (error) {
      console.error("Error searching knowledge base:", error);
      return [];
    }

    return data as SearchResult[];
  } catch (error) {
    console.error("RAG Search failed:", error);
    return [];
  }
}
