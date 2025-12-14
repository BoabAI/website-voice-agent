-- Add updated_at column to scraped_pages table
ALTER TABLE scraped_pages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill existing rows with created_at if updated_at is null
UPDATE scraped_pages
SET updated_at = created_at
WHERE updated_at IS NULL;

