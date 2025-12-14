"use server";

import {
  startCrawlJob,
  scrapeSingleUrl,
  batchScrapeUrls,
  asyncBatchScrape,
} from "@/lib/firecrawl";
import {
  insertScrape,
  updateScrape,
  getScrapeByUrl,
  getScrapeById,
  getScrapeWithPages,
  getAllScrapes,
  getUserScrapes,
  updateScrapedPage,
} from "@/lib/db/scrapes";
import {
  ensureAnonymousSession,
  getCurrentUserId,
  supabase,
  supabaseAdmin,
} from "@/lib/supabase";
import { headers } from "next/headers";
import type {
  StartScrapeResult,
  ScrapeFormData,
  Scrape,
  ScrapeWithPages,
} from "@/types/scrape";
import { processEmbeddings } from "@/lib/processing";

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
 * Helper to get the base URL for webhooks
 */
async function getBaseUrl() {
  // Prefer NEXT_PUBLIC_APP_URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fallback to current site URL
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol =
      headersList.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");

    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // Ignore errors and continue to other fallbacks
  }

  // Fallback check (though we asked user to set it)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Hardcoded for dev environment if env var fails
  if (process.env.NODE_ENV === "development") {
    return "https://d6349e48bd5f.ngrok-free.app";
  }

  // Localhost fallback
  return "http://localhost:3000";
}

/**
 * Start a new scraping job
 */
export async function startScraping(
  data: ScrapeFormData
): Promise<StartScrapeResult> {
  const shortUrl =
    data.url.length > 40 ? data.url.slice(0, 37) + "..." : data.url;
  console.log(
    `\n🚀 Starting scrape: ${shortUrl} (${data.crawlType}, ${
      data.pageLimit || 1
    } pages)`
  );

  try {
    const userId = await ensureAnonymousSession();

    // Check if URL already exists
    const existing = await checkExistingScrape(data.url);
    if (existing.exists && existing.scrape) {
      console.log(
        `   ↩️  Found existing agent: ${existing.scrape.id.slice(0, 8)}`
      );
      return {
        success: true,
        existingScrapeId: existing.scrape.id,
      };
    }

    // Create scrape record
    const scrape = await insertScrape({
      url: data.url,
      crawlType: data.crawlType,
      pageLimit: data.crawlType === "full" ? data.pageLimit : null,
      userId,
    });
    const sid = scrape.id.slice(0, 8);
    console.log(`   📝 Created agent: ${sid}`);

    // Prepare webhook URL
    const baseUrl = await getBaseUrl();
    const webhookUrl = `${baseUrl}/api/webhooks/firecrawl?scrapeId=${scrape.id}`;

    // Determine limit (1 for single, or user defined for full)
    const limit = data.crawlType === "single" ? 1 : data.pageLimit || 10;

    // Start crawl with webhook
    try {
      await startCrawlJob(data.url, limit, webhookUrl);

      await updateScrape(
        scrape.id,
        {
          status: "pending",
          current_step: "crawling",
        },
        true
      );

      console.log(`   ✓ Crawl started → waiting for webhooks`);
    } catch (crawlError) {
      console.error(
        `   ❌ Crawl failed:`,
        crawlError instanceof Error ? crawlError.message : crawlError
      );
      await updateScrape(scrape.id, {
        status: "failed",
        error_message:
          crawlError instanceof Error
            ? crawlError.message
            : "Failed to start crawl",
      });
      throw crawlError;
    }

    return {
      success: true,
      scrapeId: scrape.id,
    };
  } catch (error) {
    console.error(
      `   ❌ Error:`,
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to start scraping",
    };
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

    // Permission check removed as per request
    // if (scrape.user_id !== userId) ...

    // Create a new scrape with the same URL
    const newScrape = await insertScrape({
      url: scrape.url,
      crawlType: scrape.crawl_type,
      pageLimit: scrape.page_limit,
      userId,
    });

    const baseUrl = await getBaseUrl();
    const webhookUrl = `${baseUrl}/api/webhooks/firecrawl?scrapeId=${newScrape.id}`;
    const limit = scrape.page_limit || 10;

    await startCrawlJob(scrape.url, limit, webhookUrl);

    await updateScrape(newScrape.id, {
      status: "pending",
      current_step: "crawling",
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

    // Permission check removed as per request
    // if (scrape.user_id !== userId) ...

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

    const baseUrl = await getBaseUrl();
    const webhookUrl = `${baseUrl}/api/webhooks/firecrawl?scrapeId=${newScrape.id}`;

    await startCrawlJob(scrape.url, newPageLimit, webhookUrl);

    await updateScrape(newScrape.id, {
      status: "pending",
      current_step: "crawling",
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

/**
 * Refresh selected pages for an existing scrape
 */
export async function refreshSelectedPages(
  scrapeId: string,
  pageIds: string[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const userId = await ensureAnonymousSession();
    const scrape = await getScrapeWithPages(scrapeId);

    if (!scrape) {
      return { success: false, error: "Scrape not found" };
    }

    // Permission check removed as per request
    // if (scrape.user_id !== userId) ...

    console.log(`Refreshing ${pageIds.length} pages for scrape ${scrapeId}`);

    // Update status to processing
    await updateScrape(scrapeId, { status: "processing" });

    const client = supabaseAdmin || supabase;
    const processedPages: any[] = [];
    let successCount = 0;

    // 1. Delete existing embeddings for these pages
    const { error: deleteError } = await client
      .from("scrape_embeddings")
      .delete()
      .in("page_id", pageIds);

    if (deleteError) {
      console.error("Error deleting old embeddings:", deleteError);
      // Continue anyway, worst case we have duplicates (though page_id check in processing helps)
    }

    // 1.5 Delete the actual page records to prevent duplicates
    // We do this BEFORE starting the scrape, so when new pages come in via webhook,
    // they are the only versions of these URLs.
    const { error: deletePagesError } = await client
      .from("scraped_pages")
      .delete()
      .in("id", pageIds);

    if (deletePagesError) {
      console.error("Error deleting old pages:", deletePagesError);
      // Not critical to stop, but good to know
    } else {
      console.log(`[DB] Deleted ${pageIds.length} old pages before refresh`);
    }

    // 2. Process pages in batch (Async with Webhook)
    try {
      const urlsToScrape = pageIds
        .map((id) => scrape.scraped_pages.find((p) => p.id === id)?.url)
        .filter((url): url is string => !!url);

      if (urlsToScrape.length > 0) {
        const baseUrl = await getBaseUrl();
        // Append type=batch to distinguish handling in webhook
        const webhookUrl = `${baseUrl}/api/webhooks/firecrawl?scrapeId=${scrapeId}&type=batch`;

        await asyncBatchScrape(urlsToScrape, webhookUrl);
      }
    } catch (err) {
      console.error("Batch scraping failed:", err);
      // Fallback or just report error
      return {
        success: false,
        error: err instanceof Error ? err.message : "Batch scraping failed",
      };
    }

    // 3. Status remains "processing" until webhook completes
    // We do NOT call processEmbeddings here anymore

    return { success: true, count: pageIds.length };
  } catch (error) {
    console.error("Error refreshing pages:", error);
    // Restore status on error
    await updateScrape(scrapeId, { status: "completed" });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh pages",
    };
  }
}
