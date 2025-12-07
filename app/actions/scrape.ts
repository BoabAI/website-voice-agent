"use server";

import { scrapeSingleUrl, crawlWebsite } from "@/lib/firecrawl";
import {
  insertScrape,
  updateScrape,
  getScrapeByUrl,
  getScrapeById,
  getScrapeWithPages,
  getAllScrapes,
  insertScrapedPages,
  getUserScrapes,
} from "@/lib/db/scrapes";
import {
  ensureAnonymousSession,
  getCurrentUserId,
  supabase,
} from "@/lib/supabase";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkMarkdown, safeSplit } from "@/lib/chunking";
import type {
  StartScrapeResult,
  ScrapeFormData,
  Scrape,
  ScrapeWithPages,
} from "@/types/scrape";

/**
 * Check if a URL has already been scraped
 */
export async function checkExistingScrape(
  url: string
): Promise<{ exists: boolean; scrape?: Scrape }> {
  try {
    const scrape = await getScrapeByUrl(url);

    if (scrape) {
      return { exists: true, scrape };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking existing scrape:", error);
    return { exists: false };
  }
}

/**
 * Start a new scraping job
 */
export async function startScraping(
  data: ScrapeFormData
): Promise<StartScrapeResult> {
  console.log("[StartScraping] Initiating scrape request", {
    url: data.url,
    crawlType: data.crawlType,
    pageLimit: data.pageLimit,
  });

  try {
    // Ensure user is authenticated (anonymous)
    console.log("[StartScraping] Ensuring anonymous session...");
    const userId = await ensureAnonymousSession();
    console.log("[StartScraping] User ID:", userId);

    // Check if URL already exists
    console.log("[StartScraping] Checking for existing scrape...");
    const existing = await checkExistingScrape(data.url);
    if (existing.exists && existing.scrape) {
      console.log("[StartScraping] Found existing scrape:", existing.scrape.id);
      return {
        success: true,
        existingScrapeId: existing.scrape.id,
      };
    }
    console.log("[StartScraping] No existing scrape found");

    // Create scrape record
    console.log("[StartScraping] Creating scrape record...");
    const scrape = await insertScrape({
      url: data.url,
      crawlType: data.crawlType,
      pageLimit: data.crawlType === "full" ? data.pageLimit : null,
      userId,
    });
    console.log("[StartScraping] Scrape record created:", scrape.id);

    // Start scraping in background (async)
    console.log("[StartScraping] Starting background scraping task...");
    performScraping(scrape.id, data).catch((error) => {
      console.error("[StartScraping] Background scraping error:", error);
      console.error("[StartScraping] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      updateScrape(scrape.id, {
        status: "failed",
        error_message: error.message,
      }).catch((updateErr) => {
        console.error(
          "[StartScraping] Failed to update error status:",
          updateErr
        );
      });
    });
    console.log("[StartScraping] Background task initiated");

    return {
      success: true,
      scrapeId: scrape.id,
    };
  } catch (error) {
    console.error("[StartScraping] ERROR:", error);
    console.error("[StartScraping] Error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : "No stack",
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to start scraping",
    };
  }
}

/**
 * Process and store embeddings for a scrape
 */
async function processEmbeddings(
  scrapeId: string,
  pages: any[]
): Promise<void> {
  console.log(
    `[ProcessEmbeddings] Starting embedding generation for scrape ${scrapeId}`
  );

  let processedCount = 0;
  let totalApiRequests = 0;
  let batchSuccesses = 0;
  let fallbackItems = 0;

  // Configuration for optimization
  const MAX_BATCH_TOKENS = 200000; // Safe limit under 300k
  const MAX_BATCH_ITEMS = 100; // Safe item limit per request
  const CONCURRENCY_LIMIT = 5; // Number of parallel requests

  // 1. Collect all chunks first
  const allChunks: { content: string }[] = [];

  for (const page of pages) {
    const content = page.markdown || page.content;
    if (!content) continue;

    const chunks = chunkMarkdown(content);
    console.log(
      `[ProcessEmbeddings] Page ${page.url} split into ${chunks.length} chunks`
    );

    chunks.forEach((chunk) => {
      // Rough token estimation: ~4 characters per token
      if (chunk && chunk.trim().length > 0) {
        // Enforce a hard length limit to avoid token limits per input
        // Reduced from 25000 to 12000 to be safe with token limits (text-embedding-3-small has 8191 token limit)
        // 25000 chars could be > 8191 tokens for dense text (urls, base64, code)
        if (chunk.length > 12000) {
          console.warn(
            `[ProcessEmbeddings] Chunk too large (${chunk.length} chars), truncating...`
          );
          const subChunks = safeSplit(chunk, 12000);
          subChunks.forEach((sc) => allChunks.push({ content: sc }));
        } else {
          allChunks.push({ content: chunk });
        }
      }
    });
  }

  console.log(
    `[ProcessEmbeddings] Total chunks to process: ${allChunks.length}`
  );

  // Rough token estimation: ~4 characters per token for English text
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  // 2. Group chunks into dynamic batches
  const batches: { content: string }[][] = [];
  let currentBatch: { content: string }[] = [];
  let currentBatchTokens = 0;

  for (const chunk of allChunks) {
    const tokenCount = estimateTokens(chunk.content);

    // Check if adding this chunk would exceed limits
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
  // Add remaining items
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  console.log(
    `[ProcessEmbeddings] Created ${batches.length} optimized batches from ${allChunks.length} chunks`
  );

  // 3. Process batches in parallel groups
  for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
    const batchGroup = batches.slice(i, i + CONCURRENCY_LIMIT);
    const groupStartIndex = i;

    console.log(
      `[ProcessEmbeddings] Processing batch group ${
        Math.floor(i / CONCURRENCY_LIMIT) + 1
      }/${Math.ceil(batches.length / CONCURRENCY_LIMIT)} (Batches ${
        groupStartIndex + 1
      }-${groupStartIndex + batchGroup.length})`
    );

    await Promise.all(
      batchGroup.map(async (batch, indexInGroup) => {
        const batchIndex = groupStartIndex + indexInGroup;
        const batchTexts = batch.map((b) => b.content);
        const batchTokens = batchTexts.reduce(
          (sum, text) => sum + estimateTokens(text),
          0
        );

        console.log(
          `[ProcessEmbeddings] Processing Batch ${batchIndex + 1}: ${
            batch.length
          } items, ~${batchTokens} tokens`
        );

        // Safety check to ensure we don't accidentally exceed OpenAI's 300,000 token limit per request
        if (batchTokens > 250000) {
          console.warn(
            `[ProcessEmbeddings] Batch ${
              batchIndex + 1
            } exceeds 250k tokens (${batchTokens}). This is close to the 300k limit.`
          );
        }

        try {
          // Generate embeddings for the batch
          const result = await generateEmbeddings(batchTexts);
          totalApiRequests += result.attempts;
          batchSuccesses++;

          // Prepare rows for insertion
          const rows = batch.map((item, index) => ({
            scrape_id: scrapeId,
            content: item.content,
            embedding: result.data[index],
          }));

          // Bulk insert
          const { error } = await supabase
            .from("scrape_embeddings")
            .insert(rows);

          if (error) {
            console.error(
              `[ProcessEmbeddings] Error saving batch ${batchIndex + 1}:`,
              error
            );
          } else {
            processedCount += rows.length;
            console.log(
              `[ProcessEmbeddings] ✅ Batch ${batchIndex + 1} done (${
                rows.length
              } items)`
            );
          }
        } catch (err) {
          console.error(
            `[ProcessEmbeddings] ❌ Batch ${
              batchIndex + 1
            } FAILED (~${batchTokens} tokens):`,
            err
          );
          console.log(
            `[ProcessEmbeddings] Falling back to serial processing for Batch ${
              batchIndex + 1
            }...`
          );

          // Fallback: Process items one by one
          for (const item of batch) {
            try {
              const result = await generateEmbeddings(item.content);
              totalApiRequests += result.attempts;
              fallbackItems++;

              const { error } = await supabase
                .from("scrape_embeddings")
                .insert({
                  scrape_id: scrapeId,
                  content: item.content,
                  embedding: result.data,
                });

              if (!error) processedCount++;
            } catch (innerErr) {
              console.error(
                `[ProcessEmbeddings] Failed to process individual item in fallback (Batch ${
                  batchIndex + 1
                }):`,
                innerErr
              );
              totalApiRequests += 3; // All 3 retries failed
            }
          }
          console.log(
            `[ProcessEmbeddings] Fallback complete for Batch ${batchIndex + 1}.`
          );
        }
      })
    );
  }

  console.log(`[ProcessEmbeddings] ✅ Completed!`);
  console.log(`[ProcessEmbeddings] Summary:`);
  console.log(`  - Vectors stored: ${processedCount}/${allChunks.length}`);
  console.log(`  - Total API requests: ${totalApiRequests}`);
  console.log(`  - Batch successes: ${batchSuccesses}/${batches.length}`);
  console.log(`  - Fallback items: ${fallbackItems}`);
}

/**
 * Perform the actual scraping (runs in background)
 */
async function performScraping(
  scrapeId: string,
  data: ScrapeFormData
): Promise<void> {
  console.log(`[PerformScraping] Starting scrape ${scrapeId}`, {
    url: data.url,
    crawlType: data.crawlType,
    pageLimit: data.pageLimit,
  });

  try {
    // Update status to processing
    console.log(
      `[PerformScraping] Updating status to processing for ${scrapeId}`
    );
    await updateScrape(scrapeId, {
      status: "processing",
      current_step: "crawling",
    });
    console.log(`[PerformScraping] Status updated to processing`);

    let pages;
    if (data.crawlType === "single") {
      console.log(`[PerformScraping] Scraping single URL: ${data.url}`);
      const pageData = await scrapeSingleUrl(data.url);
      pages = [pageData];
      console.log(`[PerformScraping] Single page scraped successfully`);
    } else {
      console.log(
        `[PerformScraping] Crawling website: ${data.url} with limit ${data.pageLimit}`
      );
      pages = await crawlWebsite(data.url, data.pageLimit);
      console.log(`[PerformScraping] Crawled ${pages.length} pages`);
    }

    console.log(
      `[PerformScraping] Preparing to insert ${pages.length} pages into database`
    );

    // Update step to processing_pages
    await updateScrape(scrapeId, { current_step: "processing_pages" });

    // Insert scraped pages
    const scrapedPages = pages.map((page: any) => ({
      scrape_id: scrapeId,
      url: page.url,
      title: page.title || null,
      content: page.content,
      markdown: page.markdown || null,
      metadata: page.metadata || null,
    }));

    console.log(`[PerformScraping] Inserting scraped pages...`);
    await insertScrapedPages(scrapedPages);
    console.log(`[PerformScraping] Pages inserted successfully`);

    // Process Embeddings
    console.log(`[PerformScraping] Generating embeddings...`);
    // Update step to generating_embeddings
    await updateScrape(scrapeId, { current_step: "generating_embeddings" });

    await processEmbeddings(scrapeId, pages);

    // Update scrape status
    console.log(`[PerformScraping] Updating scrape status to completed`);
    await updateScrape(scrapeId, {
      status: "completed",
      current_step: "completed",
      pages_scraped: pages.length,
    });
    console.log(
      `[PerformScraping] Scrape completed successfully for ${scrapeId}`
    );

    // Note: No need to revalidate paths - the sidebar polls for updates every 5s
  } catch (error) {
    console.error(`[PerformScraping] ERROR in scrape ${scrapeId}:`, error);
    console.error(
      `[PerformScraping] Error stack:`,
      error instanceof Error ? error.stack : "No stack"
    );

    const errorMessage =
      error instanceof Error ? error.message : "Scraping failed";
    console.log(
      `[PerformScraping] Updating scrape status to failed with message: ${errorMessage}`
    );

    try {
      await updateScrape(scrapeId, {
        status: "failed",
        error_message: errorMessage,
      });
      console.log(`[PerformScraping] Status updated to failed`);
    } catch (updateError) {
      console.error(
        `[PerformScraping] Failed to update error status:`,
        updateError
      );
    }

    throw error;
  }
}

/**
 * Get scrape by ID with all pages
 */
export async function getScrapeByIdAction(
  scrapeId: string
): Promise<{ success: boolean; data?: ScrapeWithPages; error?: string }> {
  try {
    const scrape = await getScrapeWithPages(scrapeId);

    if (!scrape) {
      return {
        success: false,
        error: "Scrape not found",
      };
    }

    return {
      success: true,
      data: scrape,
    };
  } catch (error) {
    console.error("Error fetching scrape:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch scrape",
    };
  }
}

/**
 * Get all scrapes (global + user-specific)
 */
export async function getAllScrapesAction(): Promise<{
  success: boolean;
  data?: Scrape[];
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    const scrapes = await getAllScrapes(userId);

    return {
      success: true,
      data: scrapes,
    };
  } catch (error) {
    console.error("Error fetching scrapes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch scrapes",
    };
  }
}

/**
 * Get user's own scrapes
 */
export async function getUserScrapesAction(): Promise<{
  success: boolean;
  data?: Scrape[];
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: true,
        data: [],
      };
    }

    const scrapes = await getUserScrapes(userId);

    return {
      success: true,
      data: scrapes,
    };
  } catch (error) {
    console.error("Error fetching user scrapes:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch user scrapes",
    };
  }
}

/**
 * Re-scrape an existing URL
 */
export async function reScrapeSite(
  scrapeId: string
): Promise<StartScrapeResult> {
  try {
    const userId = await ensureAnonymousSession();
    const scrape = await getScrapeById(scrapeId);

    if (!scrape) {
      return {
        success: false,
        error: "Scrape not found",
      };
    }

    // Check if user owns this scrape
    if (scrape.user_id !== userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Create a new scrape with the same URL
    const newScrape = await insertScrape({
      url: scrape.url,
      crawlType: scrape.crawl_type,
      pageLimit: scrape.page_limit,
      userId,
    });

    // Start scraping in background
    performScraping(newScrape.id, {
      url: scrape.url,
      crawlType: scrape.crawl_type,
      pageLimit: scrape.page_limit || 10,
    }).catch((error) => {
      console.error("Background scraping error:", error);
      updateScrape(newScrape.id, {
        status: "failed",
        error_message: error.message,
      });
    });

    return {
      success: true,
      scrapeId: newScrape.id,
    };
  } catch (error) {
    console.error("Error re-scraping:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to re-scrape",
    };
  }
}

/**
 * Scrape more pages from an existing scrape
 */
export async function scrapMore(
  scrapeId: string,
  additionalPages: number
): Promise<StartScrapeResult> {
  try {
    const userId = await ensureAnonymousSession();
    const scrape = await getScrapeById(scrapeId);

    if (!scrape) {
      return {
        success: false,
        error: "Scrape not found",
      };
    }

    // Check if user owns this scrape
    if (scrape.user_id !== userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (scrape.crawl_type !== "full") {
      return {
        success: false,
        error: "Can only scrape more on full platform scrapes",
      };
    }

    const newPageLimit = (scrape.page_limit || 0) + additionalPages;

    // Create a new scrape with increased limit
    const newScrape = await insertScrape({
      url: scrape.url,
      crawlType: scrape.crawl_type,
      pageLimit: newPageLimit,
      userId,
    });

    // Start scraping in background
    performScraping(newScrape.id, {
      url: scrape.url,
      crawlType: scrape.crawl_type,
      pageLimit: newPageLimit,
    }).catch((error) => {
      console.error("Background scraping error:", error);
      updateScrape(newScrape.id, {
        status: "failed",
        error_message: error.message,
      });
    });

    return {
      success: true,
      scrapeId: newScrape.id,
    };
  } catch (error) {
    console.error("Error scraping more:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scrape more",
    };
  }
}
