-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create scrapes table
CREATE TABLE IF NOT EXISTS scrapes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  crawl_type TEXT NOT NULL CHECK (crawl_type IN ('single', 'full')),
  page_limit INTEGER,
  pages_scraped INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scraped_pages table
CREATE TABLE IF NOT EXISTS scraped_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scrape_id UUID NOT NULL REFERENCES scrapes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  markdown TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scrapes_url ON scrapes(url);
CREATE INDEX IF NOT EXISTS idx_scrapes_user_id ON scrapes(user_id);
CREATE INDEX IF NOT EXISTS idx_scrapes_status ON scrapes(status);
CREATE INDEX IF NOT EXISTS idx_scrapes_created_at ON scrapes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_pages_scrape_id ON scraped_pages(scrape_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_scrapes_updated_at ON scrapes;
CREATE TRIGGER update_scrapes_updated_at
  BEFORE UPDATE ON scrapes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scrapes table
-- Allow all users to read all scrapes (global + user-specific visibility)
CREATE POLICY "Allow read access to all scrapes"
  ON scrapes FOR SELECT
  USING (true);

-- Allow authenticated (anonymous) users to insert scrapes
CREATE POLICY "Allow insert for authenticated users"
  ON scrapes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own scrapes
CREATE POLICY "Allow update own scrapes"
  ON scrapes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own scrapes
CREATE POLICY "Allow delete own scrapes"
  ON scrapes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for scraped_pages table
-- Allow all users to read all scraped pages
CREATE POLICY "Allow read access to all scraped pages"
  ON scraped_pages FOR SELECT
  USING (true);

-- Allow insert if user owns the parent scrape
CREATE POLICY "Allow insert scraped pages for own scrapes"
  ON scraped_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scrapes
      WHERE scrapes.id = scrape_id
      AND scrapes.user_id = auth.uid()
    )
  );

-- Allow update if user owns the parent scrape
CREATE POLICY "Allow update scraped pages for own scrapes"
  ON scraped_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scrapes
      WHERE scrapes.id = scrape_id
      AND scrapes.user_id = auth.uid()
    )
  );

-- Allow delete if user owns the parent scrape
CREATE POLICY "Allow delete scraped pages for own scrapes"
  ON scraped_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scrapes
      WHERE scrapes.id = scrape_id
      AND scrapes.user_id = auth.uid()
    )
  );

-- Create a view for scrapes with page counts
CREATE OR REPLACE VIEW scrapes_with_counts AS
SELECT 
  s.*,
  COUNT(sp.id) as total_pages
FROM scrapes s
LEFT JOIN scraped_pages sp ON s.id = sp.scrape_id
GROUP BY s.id;

