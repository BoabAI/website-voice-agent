-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY, -- Matches client-side IDs from Vercel AI SDK
  scrape_id UUID NOT NULL REFERENCES scrapes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Anonymous user ID
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'data')),
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_scrape_id ON chat_messages(scrape_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow users to read their own messages for a specific scrape
CREATE POLICY "Allow read own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Allow users to insert their own messages
CREATE POLICY "Allow insert own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Allow users to delete their own messages (for clearing history)
CREATE POLICY "Allow delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
  );









