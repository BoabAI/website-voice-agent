import { NextRequest, NextResponse } from "next/server";
import {
  updateScrape,
  insertScrapedPages,
  getScrapeById,
  getScrapedPagesCount,
} from "@/lib/db/scrapes";
import { processEmbeddings } from "@/lib/processing";
import { cleanFirecrawlPromotion } from "@/lib/firecrawl";

// Increase max duration to 5 minutes (300 seconds) for embedding generation
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Debug mode - set DEBUG_WEBHOOKS=true in .env for full logs
const DEBUG = process.env.DEBUG_WEBHOOKS === "true";

// Helper to create short ID for logs
const shortId = (id: string) => id.slice(0, 8);

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { type, data, error } = body;

    // Extract scrape ID from query param
    const searchParams = req.nextUrl.searchParams;
    const scrapeId = searchParams.get("scrapeId") || body.metadata?.scrapeId;
    const sid = scrapeId ? shortId(scrapeId) : "unknown";

    if (!scrapeId) {
      console.error(`❌ [unknown] No scrapeId provided`);
      return NextResponse.json(
        { error: "No scrapeId provided" },
        { status: 400 }
      );
    }

    // Determine event type
    const eventType = type || "unknown";
    console.log(`📥 [${sid}] Webhook event: ${eventType}`);

    const isStarted =
      eventType === "crawl.started" ||
      eventType === "batch.scrape.job.started" ||
      eventType === "batch_scrape.started";
    const isPage =
      eventType === "crawl.page" ||
      eventType === "batch.scrape.page" ||
      eventType === "batch_scrape.page";
    const isCompleted =
      eventType === "crawl.completed" ||
      eventType === "batch.scrape.job.completed" ||
      eventType === "batch_scrape.completed" ||
      body.status === "completed";

    // Handle failure events
    if (
      body.success === false ||
      error ||
      type === "crawl.failed" ||
      type === "batch.scrape.job.failed" ||
      type === "batch_scrape.failed"
    ) {
      console.log(`❌ [${sid}] Scrape/Crawl failed:`, error);
      await updateScrape(scrapeId, {
        status: "failed",
        error_message:
          typeof error === "string" ? error : JSON.stringify(error),
      });
      return NextResponse.json({ received: true });
    }

    // Verify scrape exists
    const scrape = await getScrapeById(scrapeId);
    if (!scrape) {
      console.error(`❌ [${sid}] Scrape not found`);
      return NextResponse.json({ error: "Scrape not found" }, { status: 404 });
    }

    // Skip if already completed (prevent race conditions)
    // Note: We allow processing if it's a batch completion containing data,
    // even if we thought it was done, to ensure we catch all pages.
    if (scrape.status === "completed" && !isCompleted) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Handle started - just update status to crawling
    if (isStarted) {
      console.log(`🔄 [${sid}] Job started`);
      await updateScrape(
        scrapeId,
        {
          status: "processing",
          current_step: "crawling",
        },
        true
      );
      return NextResponse.json({ success: true });
    }

    // Extract and normalize pages
    let pages = data?.data || data;
    if (!Array.isArray(pages)) {
      pages = pages && typeof pages === "object" ? [pages] : [];
    }
    pages = pages.filter(
      (page: any) => page && (page.markdown || page.html || page.content)
    );

    // Handle page processing
    // We process pages if it's a page event OR if it's a completion event with data
    if ((isPage || (isCompleted && pages.length > 0)) && pages.length > 0) {
      const pageUrl =
        pages[0]?.metadata?.sourceURL || pages[0]?.url || "unknown";
      const displayUrl = DEBUG
        ? pageUrl
        : pageUrl.length > 60
        ? pageUrl.slice(0, 57) + "..."
        : pageUrl;

      // For batch/refresh operations, don't update status during page processing
      // to avoid race conditions with the completed event
      const isBatchOperation = searchParams.get("type") === "batch";

      // Only update status for non-batch (crawl) operations
      if (!isBatchOperation) {
        // Update step to processing_pages and log current URL
        await updateScrape(
          scrapeId,
          {
            status: "processing",
            current_step: "processing_pages",
            metadata: {
              ...scrape.metadata,
              current_processing_url: pageUrl,
            },
          },
          !DEBUG
        );
      }

      // Prepare and insert pages
      const scrapedPages = pages.map((page: any) => ({
        scrape_id: scrapeId,
        url: page.metadata?.sourceURL || page.url,
        title: page.metadata?.title || null,
        content: page.html || page.content,
        markdown: page.markdown ? cleanFirecrawlPromotion(page.markdown) : null,
        metadata: page.metadata || null,
      }));

      await insertScrapedPages(scrapedPages, !DEBUG);

      // Get updated page count
      const totalPages = await getScrapedPagesCount(scrapeId);

      // Only update step for non-batch operations
      if (!isBatchOperation) {
        // Update step to generating_embeddings and update page count
        await updateScrape(
          scrapeId,
          {
            current_step: "generating_embeddings",
            pages_scraped: totalPages,
          },
          !DEBUG
        );
      }

      // Generate embeddings
      const result = await processEmbeddings(scrapeId, scrapedPages, !DEBUG);

      console.log(
        `📄 [${sid}] +1 page: ${displayUrl} (${result.chunksProcessed} vectors)`
      );

      if (DEBUG) {
        console.log(`   Title: ${pages[0]?.metadata?.title || "N/A"}`);
        console.log(
          `   Chunks: ${result.totalChunks}, Stored: ${result.chunksProcessed}`
        );
      }
    }

    // Handle completion - finalize
    if (isCompleted) {
      const totalPages = await getScrapedPagesCount(scrapeId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Clear refresh-related metadata and mark as completed
      const cleanMetadata = { ...scrape.metadata };
      delete cleanMetadata.is_refreshing;
      delete cleanMetadata.refreshing_pages;

      await updateScrape(
        scrapeId,
        {
          status: "completed",
          current_step: "completed",
          pages_scraped: totalPages,
          metadata: cleanMetadata,
        },
        !DEBUG
      );

      console.log(`✅ [${sid}] Complete! ${totalPages} pages (${duration}s)`);

      if (DEBUG) {
        console.log(`   Full scrapeId: ${scrapeId}`);
        console.log(`   Original URL: ${scrape.url}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
