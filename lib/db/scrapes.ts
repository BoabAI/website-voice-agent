import { supabase, supabaseAdmin } from "@/lib/supabase";
import type {
  Scrape,
  ScrapedPage,
  ScrapeWithPages,
  CrawlType,
  ScrapeStatus,
  ScrapeStep,
} from "@/types/scrape";

/**
 * Insert a new scrape record
 */
export async function insertScrape(data: {
  url: string;
  crawlType: CrawlType;
  pageLimit: number | null;
  userId: string;
}): Promise<Scrape> {
  const { data: scrape, error } = await supabase
    .from("scrapes")
    .insert({
      url: data.url,
      crawl_type: data.crawlType,
      page_limit: data.pageLimit,
      user_id: data.userId,
      status: "pending",
      current_step: "analyzing",
      pages_scraped: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] Insert scrape error:", error);
    throw new Error(`Failed to insert scrape: ${error.message}`);
  }

  return scrape;
}

/**
 * Update scrape status and metadata
 * @param silent - If true, suppress console logs (useful for frequent webhook updates)
 */
export async function updateScrape(
  scrapeId: string,
  updates: {
    status?: ScrapeStatus;
    current_step?: ScrapeStep | null;
    pages_scraped?: number;
    error_message?: string | null;
    metadata?: Record<string, any> | null;
  },
  silent: boolean = false
): Promise<Scrape> {
  // Try to use admin client if available (server-side) to bypass RLS
  const client = supabaseAdmin || supabase;

  const { data: scrape, error } = await client
    .from("scrapes")
    .update(updates)
    .eq("id", scrapeId)
    .select()
    .single();

  if (error) {
    console.error("[DB] Update scrape error:", error);
    throw new Error(`Failed to update scrape: ${error.message}`);
  }

  if (!silent) {
    console.log(
      "[DB] Scrape updated:",
      scrapeId.slice(0, 8),
      "→",
      updates.status || updates.current_step
    );
  }
  return scrape;
}

/**
 * Get scrape by URL
 */
export async function getScrapeByUrl(url: string): Promise<Scrape | null> {
  const { data, error } = await supabase
    .from("scrapes")
    .select("*")
    .eq("url", url)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get scrape by URL: ${error.message}`);
  }

  return data;
}

/**
 * Get scrape by ID
 */
export async function getScrapeById(scrapeId: string): Promise<Scrape | null> {
  const { data, error } = await supabase
    .from("scrapes")
    .select("*")
    .eq("id", scrapeId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get scrape by ID: ${error.message}`);
  }

  return data;
}

/**
 * Get scrape with all its pages
 */
export async function getScrapeWithPages(
  scrapeId: string
): Promise<ScrapeWithPages | null> {
  const { data: scrape, error: scrapeError } = await supabase
    .from("scrapes")
    .select("*")
    .eq("id", scrapeId)
    .single();

  if (scrapeError) {
    if (scrapeError.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get scrape: ${scrapeError.message}`);
  }

  const { data: pages, error: pagesError } = await supabase
    .from("scraped_pages")
    .select("*")
    .eq("scrape_id", scrapeId)
    .order("created_at", { ascending: true });

  if (pagesError) {
    throw new Error(`Failed to get scraped pages: ${pagesError.message}`);
  }

  return {
    ...scrape,
    scraped_pages: pages || [],
  };
}

/**
 * Get all scrapes for a user (with global scrapes visible)
 */
export async function getAllScrapes(userId?: string | null): Promise<Scrape[]> {
  let query = supabase
    .from("scrapes")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get scrapes: ${error.message}`);
  }

  return data || [];
}

/**
 * Get user's own scrapes only
 */
export async function getUserScrapes(userId: string): Promise<Scrape[]> {
  const { data, error } = await supabase
    .from("scrapes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get user scrapes: ${error.message}`);
  }

  return data || [];
}

/**
 * Insert scraped pages in batch
 * @param silent - If true, suppress console logs
 */
export async function insertScrapedPages(
  pages: Array<{
    scrape_id: string;
    url: string;
    title: string | null;
    content: string;
    markdown: string | null;
    metadata: Record<string, any> | null;
  }>,
  silent: boolean = false
): Promise<ScrapedPage[]> {
  if (pages.length === 0) {
    return [];
  }

  // Try to use admin client if available (server-side) to bypass RLS
  const client = supabaseAdmin || supabase;

  const { data, error } = await client
    .from("scraped_pages")
    .insert(pages)
    .select();

  if (error) {
    console.error("[DB] Insert scraped pages error:", error);
    throw new Error(`Failed to insert scraped pages: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a specific scraped page
 */
export async function updateScrapedPage(
  pageId: string,
  updates: {
    content?: string;
    markdown?: string | null;
    title?: string | null;
    metadata?: Record<string, any> | null;
    updated_at?: string;
  }
): Promise<void> {
  // Use admin client if available
  const client = supabaseAdmin || supabase;

  // Add updated_at if not provided
  const updatesWithTimestamp = {
    ...updates,
    updated_at: updates.updated_at || new Date().toISOString(),
  };

  const { error } = await client
    .from("scraped_pages")
    .update(updatesWithTimestamp)
    .eq("id", pageId);

  if (error) {
    console.error("[DB] Update scraped page error:", error);
    throw new Error(`Failed to update scraped page: ${error.message}`);
  }
}

/**
 * Get pages by scrape ID
 */
export async function getPagesByScrapeId(
  scrapeId: string
): Promise<ScrapedPage[]> {
  const { data, error } = await supabase
    .from("scraped_pages")
    .select("*")
    .eq("scrape_id", scrapeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to get scraped pages: ${error.message}`);
  }

  return data || [];
}

/**
 * Get count of scraped pages for a scrape
 */
export async function getScrapedPagesCount(scrapeId: string): Promise<number> {
  const client = supabaseAdmin || supabase;

  const { count, error } = await client
    .from("scraped_pages")
    .select("*", { count: "exact", head: true })
    .eq("scrape_id", scrapeId);

  if (error) {
    console.error("[DB] Get scraped pages count error:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Delete a scrape and all its pages (cascade)
 */
export async function deleteScrape(scrapeId: string): Promise<void> {
  const { error } = await supabase.from("scrapes").delete().eq("id", scrapeId);

  if (error) {
    throw new Error(`Failed to delete scrape: ${error.message}`);
  }
}

/**
 * Get scrape statistics
 */
export async function getScrapeStats(scrapeId: string): Promise<{
  totalPages: number;
  completedPages: number;
  status: ScrapeStatus;
}> {
  const scrape = await getScrapeById(scrapeId);
  if (!scrape) {
    throw new Error("Scrape not found");
  }

  const { count } = await supabase
    .from("scraped_pages")
    .select("*", { count: "exact", head: true })
    .eq("scrape_id", scrapeId);

  return {
    totalPages: count || 0,
    completedPages: scrape.pages_scraped,
    status: scrape.status,
  };
}
