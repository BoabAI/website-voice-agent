import { supabase, supabaseAdmin } from "@/lib/supabase";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkMarkdown, safeSplit } from "@/lib/chunking";

/**
 * Process and store embeddings for a scrape
 * @param quiet - If true, suppress verbose logs (for webhook processing)
 */
export async function processEmbeddings(
  scrapeId: string,
  pages: any[],
  quiet: boolean = false
): Promise<{ chunksProcessed: number; totalChunks: number }> {
  const sid = scrapeId.slice(0, 8);

  let processedCount = 0;
  let totalApiRequests = 0;
  let batchSuccesses = 0;
  let fallbackItems = 0;

  // Use admin client if available to bypass RLS during bulk inserts
  const client = supabaseAdmin || supabase;

  // Configuration for optimization
  const MAX_BATCH_TOKENS = 200000;
  const MAX_BATCH_ITEMS = 100;
  const CONCURRENCY_LIMIT = 5;

  // 1. Collect all chunks first
  const allChunks: { content: string; pageId?: string }[] = [];

  for (const page of pages) {
    const content = page.markdown || page.content;
    if (!content) continue;

    const chunks = chunkMarkdown(content);
    // Use page.id if available (from DB), otherwise null
    const pageId = page.id || null;

    chunks.forEach((chunk) => {
      if (chunk && chunk.trim().length > 0) {
        if (chunk.length > 12000) {
          const subChunks = safeSplit(chunk, 12000);
          subChunks.forEach((sc) =>
            allChunks.push({ content: sc, pageId: pageId })
          );
        } else {
          allChunks.push({ content: chunk, pageId: pageId });
        }
      }
    });
  }

  if (allChunks.length === 0) {
    return { chunksProcessed: 0, totalChunks: 0 };
  }

  // Rough token estimation
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  // 2. Group chunks into dynamic batches
  const batches: { content: string; pageId?: string }[][] = [];
  let currentBatch: { content: string; pageId?: string }[] = [];
  let currentBatchTokens = 0;

  for (const chunk of allChunks) {
    const tokenCount = estimateTokens(chunk.content);

    if (
      currentBatch.length >= MAX_BATCH_ITEMS ||
      currentBatchTokens + tokenCount > MAX_BATCH_TOKENS
    ) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [];
      currentBatchTokens = 0;
    }

    currentBatch.push(chunk);
    currentBatchTokens += tokenCount;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // 3. Process batches in parallel groups
  for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
    const batchGroup = batches.slice(i, i + CONCURRENCY_LIMIT);
    const groupStartIndex = i;

    await Promise.all(
      batchGroup.map(async (batch, indexInGroup) => {
        const batchIndex = groupStartIndex + indexInGroup;
        const batchTexts = batch.map((b) => b.content);
        const batchTokens = batchTexts.reduce(
          (sum, text) => sum + estimateTokens(text),
          0
        );

        try {
          const result = await generateEmbeddings(batchTexts);
          totalApiRequests += result.attempts;
          batchSuccesses++;

          const rows = batch.map((item, index) => ({
            scrape_id: scrapeId,
            content: item.content,
            embedding: result.data[index],
            // Include page_id if available
            page_id: item.pageId || null,
          }));

          const { error } = await client.from("scrape_embeddings").insert(rows);

          if (error) {
            console.error(
              `[${sid}] ❌ Embed batch ${batchIndex + 1} save failed:`,
              error.message
            );
          } else {
            processedCount += rows.length;
          }
        } catch (err) {
          if (!quiet) {
            console.error(
              `[${sid}] ❌ Embed batch ${batchIndex + 1} failed, using fallback`
            );
          }

          // Fallback: Process items one by one
          for (const item of batch) {
            try {
              const result = await generateEmbeddings(item.content);
              totalApiRequests += result.attempts;
              fallbackItems++;

              const { error } = await client.from("scrape_embeddings").insert({
                scrape_id: scrapeId,
                content: item.content,
                embedding: result.data,
                // Include page_id if available
                page_id: item.pageId || null,
              });

              if (!error) processedCount++;
            } catch (innerErr) {
              totalApiRequests += 3;
            }
          }
        }
      })
    );
  }

  if (!quiet) {
    console.log(
      `   🧠 Embeddings: ${processedCount}/${allChunks.length} vectors`
    );
  }

  return { chunksProcessed: processedCount, totalChunks: allChunks.length };
}



