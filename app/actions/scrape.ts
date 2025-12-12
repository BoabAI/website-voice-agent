"use server";

import { startCrawlJob } from "@/lib/firecrawl";
import {
  insertScrape,
  updateScrape,
  getScrapeByUrl,
  getScrapeById,
  getScrapeWithPages,
  getAllScrapes,
  getUserScrapes,
} from "@/lib/db/scrapes";
import { ensureAnonymousSession, getCurrentUserId } from "@/lib/supabase";
import { headers } from "next/headers";
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
