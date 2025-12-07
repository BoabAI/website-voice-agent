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
 * Crawl an entire website up to a page limit
 */
export async function crawlWebsite(
  url: string,
  pageLimit: number = 10
): Promise<FirecrawlPageData[]> {
  try {
    console.log(
      "[Firecrawl] Starting crawl job for:",
      url,
      "limit:",
      pageLimit
    );

    const crawlResponse = await firecrawl.startCrawl(url, {
      limit: pageLimit,
      scrapeOptions: {
        formats: ["markdown", "html"],
      },
    });

    console.log("[Firecrawl] Start crawl response:", crawlResponse);

    if (!crawlResponse.id) {
      throw new Error(
        `Failed to start crawl: ${
          (crawlResponse as any).error || "No ID returned"
        }`
      );
    }

    const crawlId = crawlResponse.id;
    console.log("[Firecrawl] Crawl job started:", crawlId);

    // Poll for completion
    let isCompleted = false;
    let attempts = 0;
    // Poll every 2 seconds for up to 5 minutes (150 attempts)
    const maxAttempts = 150;

    while (!isCompleted && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s

      try {
        const status = await firecrawl.getCrawlStatus(crawlId);
        console.log(
          `[Firecrawl] Poll attempt ${attempts + 1}: Status ${
            status.status
          }, Completed ${status.completed}/${status.total}`
        );

        if (status.status === "completed") {
          isCompleted = true;
          const data = status.data || [];
          console.log("[Firecrawl] Crawl completed. Pages found:", data.length);

          return data.map((page: any) => ({
            url: page.metadata?.sourceURL || page.url,
            title: page.metadata?.title || null,
            content: page.html || page.markdown || "",
            markdown: page.markdown
              ? cleanFirecrawlPromotion(page.markdown)
              : undefined,
            metadata: page.metadata || {},
          }));
        } else if (
          status.status === "failed" ||
          status.status === "cancelled"
        ) {
          // Try to get partial data if available
          if (status.data && status.data.length > 0) {
            console.warn(
              `[Firecrawl] Crawl ${status.status} but returned ${status.data.length} pages. Returning partial data.`
            );
            return status.data.map((page: any) => ({
              url: page.metadata?.sourceURL || page.url,
              title: page.metadata?.title || null,
              content: page.html || page.markdown || "",
              markdown: page.markdown
                ? cleanFirecrawlPromotion(page.markdown)
                : undefined,
              metadata: page.metadata || {},
            }));
          }
          throw new Error(`Crawl failed with status: ${status.status}`);
        }
      } catch (statusError) {
        console.error(
          `[Firecrawl] Error checking status on attempt ${attempts + 1}:`,
          statusError
        );
        // Continue polling even if one status check fails
      }

      attempts++;
    }

    throw new Error("Crawl timed out after 5 minutes");
  } catch (error) {
    console.error("[Firecrawl] Crawl error:", error);
    throw new Error(
      `Failed to crawl website: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
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
