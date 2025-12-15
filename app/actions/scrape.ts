"use server";

import {
  startCrawlJob,
  scrapeSingleUrl,
  batchScrapeUrls,
  asyncBatchScrape,
  mapWebsite,
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
  getMappedUrls,
  getScrapedUrls,
  insertMappedUrls,
  markMappedUrlsAsScraped,
  deleteScrape,
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
  GetMappablePagesResult,
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
      const errorMessage =
        crawlError instanceof Error ? crawlError.message : String(crawlError);
      
      // Handle credits issue specifically
      if (
        errorMessage.toLowerCase().includes("credits") ||
        errorMessage.toLowerCase().includes("plan") ||
        errorMessage.toLowerCase().includes("payment") || 
        errorMessage.toLowerCase().includes("subscription")
      ) {
        console.error("🔥 CREDIT ISSUE DETECTED:", errorMessage);
        
        // Delete the scrape record so it doesn't show up in the list
        try {
          await deleteScrape(scrape.id);
          console.log(`   🗑️ Deleted scrape ${scrape.id} due to credit issue`);
        } catch (delError) {
          console.error("   ❌ Failed to delete scrape after credit error:", delError);
        }

        // Throw generic error for the UI
        throw new Error("Something went wrong, please try again later or contact support");
      }

      console.error(`   ❌ Crawl failed:`, errorMessage);

      await updateScrape(scrape.id, {
        status: "failed",
        error_message: errorMessage,
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
 * Scrape more pages from an existing scrape (using map and select)
 */
export async function getMappablePagesAction(
  scrapeId: string,
  page: number = 1,
  search?: string
): Promise<{ success: boolean; data?: GetMappablePagesResult; error?: string }> {
  try {
    const userId = await ensureAnonymousSession();
    const scrape = await getScrapeById(scrapeId);

    if (!scrape) {
      return { success: false, error: "Scrape not found" };
    }

    // 1. Check existing mapped pages in DB
    const { data: existingMapped, count } = await getMappedUrls(
      scrapeId,
      page,
      100, // Limit per page
      search
    );

    // 2. If no pages mapped yet (and it's the first page/load), fetch from Firecrawl
    if (page === 1 && existingMapped.length === 0 && !search) {
      console.log(`Mapping website for scrape ${scrapeId}: ${scrape.url}`);
      try {
        const links = await mapWebsite(scrape.url, { limit: 2000 });
        
        // Filter out already scraped pages
        const scrapedUrls = await getScrapedUrls(scrapeId);
        const newLinks = links.filter((url) => !scrapedUrls.includes(url));

        if (newLinks.length > 0) {
          await insertMappedUrls(scrapeId, newLinks);
          
          // Re-fetch from DB
          const result = await getMappedUrls(scrapeId, 1, 100, search);
          return {
            success: true,
            data: {
              pages: result.data,
              total: result.count,
              hasMore: result.count > 100,
            },
          };
        }
      } catch (mapError) {
        console.error("Error mapping website:", mapError);
        // Continue to return empty result if map fails
      }
    }

    return {
      success: true,
      data: {
        pages: existingMapped,
        total: count,
        hasMore: existingMapped.length === 100, // Roughly check if there might be more
      },
    };
  } catch (error) {
    console.error("Error getting mappable pages:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get pages",
    };
  }
}

/**
 * Scrape selected mapped pages
 */
export async function scrapeSelectedPagesAction(
  scrapeId: string,
  urls: string[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const userId = await ensureAnonymousSession();
    const scrape = await getScrapeById(scrapeId);

    if (!scrape) {
      return { success: false, error: "Scrape not found" };
    }

    if (urls.length === 0) {
      return { success: true, count: 0 };
    }

    console.log(`Scraping ${urls.length} selected pages for ${scrapeId}`);

    // Update status
    await updateScrape(scrapeId, {
      status: "processing",
      metadata: {
        ...scrape.metadata,
        is_scraping_selected: true,
        selected_pages_count: urls.length,
      },
    });

    const baseUrl = await getBaseUrl();
    const webhookUrl = `${baseUrl}/api/webhooks/firecrawl?scrapeId=${scrapeId}&type=batch`;

    // Start async batch scrape
    await asyncBatchScrape(urls, webhookUrl);

    // Mark as scraped in mapped_urls table so they don't show up again
    await markMappedUrlsAsScraped(scrapeId, urls);

    return { success: true, count: urls.length };
  } catch (error) {
    console.error("Error scraping selected pages:", error);
    // Restore status
    await updateScrape(scrapeId, { status: "completed" });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scrape pages",
    };
  }
}

/**
 * Scrape more pages from an existing scrape
 * @deprecated Use getMappablePagesAction and scrapeSelectedPagesAction instead
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

    // Get the pages to refresh with their details
    const pagesToRefresh = scrape.scraped_pages
      .filter((p) => pageIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        title: p.title || undefined,
        url: p.url,
      }));

    console.log(`Refreshing ${pageIds.length} pages for scrape ${scrapeId}`);

    // Update status to processing and store refreshing pages info
    await updateScrape(scrapeId, {
      status: "processing",
      metadata: {
        ...scrape.metadata,
        is_refreshing: true,
        refreshing_pages: pagesToRefresh,
      },
    });

    const client = supabaseAdmin || supabase;
    const processedPages: any[] = [];
    let successCount = 0;

    // 1. Delete existing pages (cascade deletes embeddings)
    const { error: deleteError } = await client
      .from("scraped_pages")
      .delete()
      .in("id", pageIds);

    if (deleteError) {
      console.error("Error deleting old pages:", deleteError);
      // Continue anyway, worst case we have duplicates
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

      // Return the number of pages we're starting to refresh
      return { success: true, count: urlsToScrape.length };
    } catch (err) {
      console.error("Batch scraping failed:", err);
      // Fallback or just report error
      return {
        success: false,
        error: err instanceof Error ? err.message : "Batch scraping failed",
      };
    }
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
