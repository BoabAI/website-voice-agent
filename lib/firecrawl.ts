import { Firecrawl } from "@mendable/firecrawl-js";

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error("FIRECRAWL_API_KEY is not set");
}

/**
 * Clean Firecrawl promotional text from markdown content
 */
export function cleanFirecrawlPromotion(content: string): string {
  if (!content) return content;

  // Remove the specific promotional text that Firecrawl adds
  const promotionText =
    "Introducing Firecrawl v2.5 - The world's best web data API. [Read the blog.](https://www.firecrawl.dev/blog/the-worlds-best-web-data-api-v25)";

  // Use regex to match the text with possible variations in whitespace
  const cleaned = content
    .replace(
      new RegExp(promotionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      ""
    )
    .trim();

  return cleaned;
}

// Use the v2 API client (Firecrawl instead of FirecrawlApp)
const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export interface FirecrawlPageData {
  url: string;
  title?: string;
  content: string;
  markdown?: string;
  metadata?: Record<string, any>;
}

/**
 * Scrape a single URL
 */
export async function scrapeSingleUrl(url: string): Promise<FirecrawlPageData> {
  try {
    console.log("[Firecrawl] Scraping single URL:", url);

    // The SDK returns the scraped data directly
    const result = await firecrawl.scrape(url, {
      formats: ["markdown", "html"],
    });

    console.log("[Firecrawl] Result type:", typeof result);
    console.log("[Firecrawl] Result keys:", Object.keys(result || {}));

    // The SDK returns data directly: {markdown, html, metadata}
    const data = result as any;

    if (!data || (!data.markdown && !data.html)) {
      console.error("[Firecrawl] Invalid response - no content:", data);
      throw new Error("No content returned from Firecrawl");
    }

    console.log("[Firecrawl] Successfully scraped:", {
      hasHtml: !!data.html,
      hasMarkdown: !!data.markdown,
      hasMetadata: !!data.metadata,
      title: data.metadata?.title,
      contentLength: (data.html || data.markdown || "").length,
    });

    return {
      url: data.metadata?.sourceURL || url,
      title: data.metadata?.title || null,
      content: data.html || data.markdown || "",
      markdown: data.markdown
        ? cleanFirecrawlPromotion(data.markdown)
        : undefined,
      metadata: data.metadata || {},
    };
  } catch (error) {
    console.error("[Firecrawl] Error:", error);
    throw new Error(
      `Failed to scrape URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Start a crawl job and return the ID (async)
 */
export async function startCrawlJob(
  url: string,
  pageLimit: number = 10,
  webhook?: string
): Promise<string> {
  try {
    const params: any = {
      limit: pageLimit,
      scrapeOptions: {
        formats: ["markdown", "html"],
      },
    };

    if (webhook) {
      params.webhook = webhook;
    }

    const crawlResponse = await firecrawl.startCrawl(url, params);

    if (!crawlResponse.id) {
      throw new Error(
        `Failed to start crawl: ${
          (crawlResponse as any).error || "No ID returned"
        }`
      );
    }

    return crawlResponse.id;
  } catch (error) {
    console.error("[Firecrawl] Start crawl error:", error);
    throw new Error(
      `Failed to start crawl: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Check the status of a crawl job
 */
export async function checkCrawlJob(crawlId: string): Promise<{
  status: string;
  completed: number;
  total: number;
  data: FirecrawlPageData[];
  error?: string;
}> {
  try {
    const status = await firecrawl.getCrawlStatus(crawlId);
    console.log(
      `[Firecrawl] Status check for ${crawlId}: ${status.status}, ${status.completed}/${status.total}`
    );

    const data = (status.data || []).map((page: any) => ({
      url: page.metadata?.sourceURL || page.url,
      title: page.metadata?.title || null,
      content: page.html || page.markdown || "",
      markdown: page.markdown
        ? cleanFirecrawlPromotion(page.markdown)
        : undefined,
      metadata: page.metadata || {},
    }));

    return {
      status: status.status,
      completed: status.completed || 0,
      total: status.total || 0,
      data,
      error: (status as any).error,
    };
  } catch (error) {
    console.error("[Firecrawl] Check status error:", error);
    throw new Error(
      `Failed to check crawl status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Crawl an entire website up to a page limit
 * @deprecated Use startCrawlJob + checkCrawlJob for better reliability on Vercel
 */
export async function crawlWebsite(
  url: string,
  pageLimit: number = 10
): Promise<FirecrawlPageData[]> {
  // Legacy implementation using the new functions
  const crawlId = await startCrawlJob(url, pageLimit);

  // Poll for completion
  let isCompleted = false;
  let attempts = 0;
  // Poll every 2 seconds for up to 5 minutes (150 attempts)
  const maxAttempts = 150;

  while (!isCompleted && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s

    const status = await checkCrawlJob(crawlId);

    if (status.status === "completed") {
      return status.data;
    } else if (status.status === "failed" || status.status === "cancelled") {
      if (status.data.length > 0) return status.data;
      throw new Error(
        status.error || `Crawl failed with status: ${status.status}`
      );
    }

    attempts++;
  }

  throw new Error("Crawl timed out after 5 minutes");
}

/**
 * Map a website to get all available URLs (useful for showing how many pages can be scraped)
 */
export async function mapWebsite(url: string): Promise<string[]> {
  try {
    console.log("[Firecrawl] Mapping website:", url);

    const result = await firecrawl.map(url);

    console.log("[Firecrawl] Map result type:", typeof result);
    console.log("[Firecrawl] Map result keys:", Object.keys(result || {}));

    // Check if result is an array (links) or has a links property
    const links = Array.isArray(result) ? result : (result as any).links || [];

    console.log("[Firecrawl] Links count:", links.length);

    return links;
  } catch (error) {
    console.error("[Firecrawl] Map error:", error);
    throw new Error(
      `Failed to map website: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export { firecrawl };
