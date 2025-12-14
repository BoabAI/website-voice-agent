-- Migration: Add page_id to scrape_embeddings
-- Description: Links embeddings to specific scraped pages for selective updates

-- Add page_id column to scrape_embeddings
ALTER TABLE scrape_embeddings 
ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES scraped_pages(id) ON DELETE CASCADE;

-- Create index for faster lookups and deletions by page_id
CREATE INDEX IF NOT EXISTS idx_scrape_embeddings_page_id ON scrape_embeddings(page_id);

