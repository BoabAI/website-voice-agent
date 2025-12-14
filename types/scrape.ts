export type CrawlType = "single" | "full";
export type ScrapeStatus = "pending" | "processing" | "completed" | "failed";
export type ScrapeStep =
  | "analyzing"
  | "crawling"
  | "processing_pages"
  | "generating_embeddings"
  | "completed";

export interface Scrape {
  id: string;
  url: string;
  crawl_type: CrawlType;
  page_limit: number | null;
  pages_scraped: number;
  status: ScrapeStatus;
  current_step: ScrapeStep | null;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any> | null;
}

export interface ScrapedPage {
  id: string;
  scrape_id: string;
  url: string;
  title: string | null;
  content: string;
  markdown: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
}

export interface ScrapeWithPages extends Scrape {
  scraped_pages: ScrapedPage[];
}

export interface FirecrawlMapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

export interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    content?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      [key: string]: any;
    };
  };
  error?: string;
}

export interface FirecrawlCrawlResponse {
  success: boolean;
  data?: Array<{
    markdown?: string;
    content?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      [key: string]: any;
    };
  }>;
  error?: string;
}

export interface ScrapeFormData {
  url: string;
  crawlType: CrawlType;
  pageLimit: number;
}

export interface StartScrapeResult {
  success: boolean;
  scrapeId?: string;
  existingScrapeId?: string;
  error?: string;
}
