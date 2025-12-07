import { supabase } from "@/lib/supabase";
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
  console.log("[DB] Inserting scrape:", data);

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

  console.log("[DB] Scrape inserted successfully:", scrape.id);
  return scrape;
}

/**
 * Update scrape status and metadata
 */
export async function updateScrape(
  scrapeId: string,
  updates: {
    status?: ScrapeStatus;
    current_step?: ScrapeStep | null;
    pages_scraped?: number;
    error_message?: string | null;
    metadata?: Record<string, any> | null;
  }
): Promise<Scrape> {
  console.log("[DB] Updating scrape:", scrapeId, updates);

  const { data: scrape, error } = await supabase
    .from("scrapes")
    .update(updates)
    .eq("id", scrapeId)
    .select()
    .single();

  if (error) {
    console.error("[DB] Update scrape error:", error);
    throw new Error(`Failed to update scrape: ${error.message}`);
  }

  console.log(
    "[DB] Scrape updated successfully:",
    scrapeId,
    "status:",
    scrape.status
  );
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
 */
export async function insertScrapedPages(
  pages: Array<{
    scrape_id: string;
    url: string;
    title: string | null;
    content: string;
    markdown: string | null;
    metadata: Record<string, any> | null;
  }>
): Promise<ScrapedPage[]> {
  if (pages.length === 0) {
    console.log("[DB] No pages to insert");
    return [];
  }

  console.log("[DB] Inserting", pages.length, "scraped pages");

  const { data, error } = await supabase
    .from("scraped_pages")
    .insert(pages)
    .select();

  if (error) {
    console.error("[DB] Insert scraped pages error:", error);
    throw new Error(`Failed to insert scraped pages: ${error.message}`);
  }

  console.log("[DB] Scraped pages inserted successfully:", data?.length || 0);
  return data || [];
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
