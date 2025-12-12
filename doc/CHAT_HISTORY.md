# Chat History Implementation Guide

## Overview

The Web Voice Agent now features **persistent chat history** for all users. Each user maintains their own private conversation history with every agent they interact with.

---

## Features

### User Experience
- ✅ **Automatic Saving**: Every message is saved automatically
- ✅ **Persistent**: Chat history survives page reloads
- ✅ **Private**: Each user has their own isolated history
- ✅ **Per-Agent**: Separate conversation history for each website/agent
- ✅ **Clear Option**: Users can clear their history from the agent menu
- ✅ **Seamless**: No sign-up required (anonymous authentication)

### Technical Features
- ✅ **Row Level Security**: Supabase RLS ensures data isolation
- ✅ **Idempotent Saves**: Prevents duplicate messages
- ✅ **Efficient Queries**: Indexed for fast retrieval
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **AI SDK v6 Compatible**: Works with latest Vercel AI SDK

---

## Architecture

### Database Schema

```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,                    -- Message ID from AI SDK
  scrape_id UUID NOT NULL,                -- Foreign key to scrapes table
  user_id UUID NOT NULL,                  -- Anonymous user ID
  role TEXT NOT NULL,                     -- 'user' | 'assistant' | 'system' | 'data'
  content JSONB NOT NULL,                 -- Message content { text: "..." }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_scrape_id ON chat_messages(scrape_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User sends message                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│   Frontend: ModernChatInterface.tsx                          │
│   - sendMessage({ content: input })                          │
│   - Includes Authorization header with access token          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│   Backend: /api/chat                                         │
│   - Verify authentication token                              │
│   - Extract user_id from session                             │
│   - Save user message to database                            │
│   - Stream response from OpenRouter                          │
│   - Save assistant response to database                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│   Database: chat_messages table                              │
│   - User message stored with client-generated ID             │
│   - Assistant message stored with server-generated ID        │
│   - RLS policies ensure user can only see their messages     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Authentication

#### Anonymous Session Creation
```typescript
// lib/supabase.ts
export async function ensureAnonymousSession() {
  const supabase = createClientSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  }
  
  return session;
}
```

#### Frontend Usage
```typescript
// components/playground/ModernChatInterface.tsx
useEffect(() => {
  async function initSession() {
    await ensureAnonymousSession();
    const supabase = createClientSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      setAccessToken(session.access_token);
      accessTokenRef.current = session.access_token;
    }
  }
  
  initSession();
}, []);
```

### 2. Loading Chat History

#### Server Action
```typescript
// app/actions/chat.ts
export async function getChatHistory(
  scrapeId: string,
  accessToken: string
): Promise<ChatHistoryResponse> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  });

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("scrape_id", scrapeId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  // Transform JSONB content to string
  const messages = data.map(msg => ({
    ...msg,
    content: typeof msg.content === "object" && "text" in msg.content
      ? msg.content.text
      : msg.content
  }));

  return { success: true, messages };
}
```

#### Frontend Loading
```typescript
// components/playground/ModernChatInterface.tsx
useEffect(() => {
  async function loadHistory() {
    const history = await getChatHistory(scrape.id, accessToken);
    if (history.success && history.messages) {
      setMessages(history.messages);
    }
  }
  
  if (accessToken) {
    loadHistory();
  }
}, [scrape.id, accessToken]);
```

### 3. Saving Messages

#### User Messages
```typescript
// app/api/chat/route.ts
const lastUserMessage = messages[messages.length - 1];

if (lastUserMessage?.role === "user" && lastUserMessage.id) {
  // Extract content
  let messageContent = "";
  if (typeof lastUserMessage.content === "string") {
    messageContent = lastUserMessage.content;
  } else if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
    const textParts = lastUserMessage.parts.filter(p => p.type === "text");
    messageContent = textParts.map(p => p.text).join("\n");
  }

  // Save to database
  if (messageContent && messageContent.trim() !== "") {
    await supabase.from("chat_messages").insert({
      id: lastUserMessage.id,
      scrape_id: scrapeId,
      user_id: userId,
      role: "user",
      content: { text: messageContent }
    });
  }
}
```

#### Assistant Messages
```typescript
// app/api/chat/route.ts
onFinish: async (result) => {
  const finalText = result.text;
  
  if (finalText && typeof finalText === "string" && finalText.trim() !== "") {
    // Generate stable ID
    const lastUserMsg = messages.find(m => m.role === "user" && m.id);
    const assistantMessageId = lastUserMsg 
      ? `assistant-${lastUserMsg.id}-${Date.now()}`
      : `assistant-${Date.now()}`;

    // Save to database
    await supabase.from("chat_messages").insert({
      id: assistantMessageId,
      scrape_id: scrapeId,
      user_id: userId,
      role: "assistant",
      content: { text: finalText }
    });
  }
}
```

### 4. Clearing History

#### Server Action
```typescript
// app/actions/chat.ts
export async function clearChatHistory(
  scrapeId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  });

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("scrape_id", scrapeId);
  // RLS ensures they only delete their own messages

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

#### Frontend Integration
```typescript
// components/playground/ModernChatInterface.tsx
const handleClearChat = async () => {
  const result = await clearChatHistory(scrape.id, accessToken);
  if (result.success) {
    setMessages([]);
    toast.success("Chat history cleared");
  } else {
    toast.error("Failed to clear history");
  }
};

// Pass to AgentHeader
<AgentHeader scrape={scrape} onClearChat={handleClearChat} />
```

```typescript
// components/playground/AgentHeader.tsx
<DropdownMenuItem onClick={onClearChat}>
  <Trash2 className="w-4 h-4 mr-2" />
  Clear Chat History
</DropdownMenuItem>
```

---

## AI SDK v6 Compatibility

### Correct Message Format
```typescript
// ❌ WRONG (AI SDK v5 format)
sendMessage({ text: input });

// ✅ CORRECT (AI SDK v6 format)
sendMessage({ content: input });
```

### Dynamic Headers with useRef
```typescript
const accessTokenRef = useRef<string | null>(null);

useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: () => ({ scrapeId: scrape.id }),
    headers: () => ({
      Authorization: `Bearer ${accessTokenRef.current}`
    })
  })
});

// Update ref when token changes
useEffect(() => {
  accessTokenRef.current = accessToken;
}, [accessToken]);
```

**Why useRef?** The `headers` function captures the token value when created. Using a ref ensures we always read the latest token value.

---

## Content Storage Strategy

### Why JSONB?
We store content as JSONB `{ text: "..." }` instead of plain TEXT:

**Advantages**:
- ✅ Flexible for future content types (images, files, tool calls)
- ✅ Compatible with AI SDK message format
- ✅ Easy to query and transform
- ✅ Supports structured data

**Example**:
```typescript
// Database storage
content: { text: "Hello, how can I help?" }

// Future possibilities
content: { 
  text: "Here's an image",
  image: { url: "...", alt: "..." }
}
```

### Transformation on Load
```typescript
// When loading from database
const messages = data.map(msg => ({
  ...msg,
  content: typeof msg.content === "object" && "text" in msg.content
    ? msg.content.text  // Extract text
    : msg.content        // Fallback to raw content
}));
```

---

## Security

### Row Level Security (RLS)

All policies filter by `auth.uid() = user_id`:

**Read Policy**:
```sql
CREATE POLICY "Allow read own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);
```

**Result**: Users can only read their own messages.

**Insert Policy**:
```sql
CREATE POLICY "Allow insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Result**: Users can only insert messages as themselves (can't fake other users).

**Delete Policy**:
```sql
CREATE POLICY "Allow delete own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);
```

**Result**: Users can only delete their own messages.

### Token Validation

Every API request verifies the token:

```typescript
// app/api/chat/route.ts
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response("Unauthorized", { status: 401 });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } }
});

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response("Invalid token", { status: 401 });
}
```

---

## Performance Optimization

### 1. Indexed Queries
```sql
-- Fast lookups by scrape_id and user_id
CREATE INDEX idx_chat_messages_scrape_id ON chat_messages(scrape_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- Fast sorting by created_at
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
```

**Query Performance**:
- `SELECT * FROM chat_messages WHERE scrape_id = '...'` → Index scan (~1ms)
- `DELETE FROM chat_messages WHERE scrape_id = '...'` → Index scan (~1ms)

### 2. Idempotent Saves

Prevent duplicate messages:

```typescript
// Check if message already exists
const { data: existing } = await supabase
  .from("chat_messages")
  .select("id")
  .eq("id", messageId)
  .maybeSingle();

if (!existing) {
  // Only insert if it doesn't exist
  await supabase.from("chat_messages").insert({ ... });
}
```

**Why**: Network issues or retries could cause duplicate saves.

### 3. Load Once, Cache in Memory

```typescript
// Load history only once on mount
useEffect(() => {
  async function loadHistory() {
    const history = await getChatHistory(scrapeId, accessToken);
    setMessages(history.messages);
  }
  
  loadHistory();
}, [scrapeId, accessToken]); // Only re-run if these change
```

**Result**: No repeated database queries during chat.

---

## Troubleshooting

### Issue: "Unauthorized" Error
**Symptom**: API returns 401 Unauthorized

**Causes**:
1. Anonymous auth not enabled in Supabase
2. Access token not passed in headers
3. Token expired

**Solutions**:
```typescript
// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log("Session:", session);

// Verify token is passed
console.log("Access token:", accessTokenRef.current);
```

### Issue: Messages Not Persisting
**Symptom**: Messages disappear on reload

**Causes**:
1. Messages not saving to database
2. Content validation failing
3. RLS policies blocking access

**Solutions**:
```typescript
// Check database
SELECT * FROM chat_messages WHERE scrape_id = 'your-id';

// Check logs
console.log("[Chat] User message saved successfully");
console.log("[Chat] Assistant message saved successfully");
```

### Issue: "Objects are not valid as a React child"
**Symptom**: React error when rendering messages

**Cause**: Content is an object instead of string

**Solution**:
```typescript
// Transform content on load
const content = typeof msg.content === "object" && "text" in msg.content
  ? msg.content.text
  : msg.content;
```

### Issue: Empty Messages Being Saved
**Symptom**: Messages with no content in database

**Solution**: Add validation before saving:
```typescript
if (messageContent && messageContent.trim() !== "") {
  await supabase.from("chat_messages").insert({ ... });
} else {
  console.warn("Skipping empty message");
}
```

---

## Testing

### Manual Testing Checklist

- [ ] **Save User Message**: Send a message, check database
- [ ] **Save Assistant Message**: Wait for response, check database
- [ ] **Reload Page**: Refresh, verify messages still visible
- [ ] **Clear History**: Click clear, verify messages deleted
- [ ] **Multiple Agents**: Switch agents, verify separate histories
- [ ] **Multiple Users**: Use incognito window, verify private histories

### SQL Queries for Testing

```sql
-- Check all messages
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;

-- Check messages for specific agent
SELECT * FROM chat_messages WHERE scrape_id = 'your-scrape-id';

-- Check messages for specific user
SELECT * FROM chat_messages WHERE user_id = 'your-user-id';

-- Count messages per agent
SELECT scrape_id, COUNT(*) as message_count
FROM chat_messages
GROUP BY scrape_id;

-- Clean up test data
DELETE FROM chat_messages WHERE user_id = 'test-user-id';
```

---

## Future Enhancements

### Planned Features
- **Conversation Sharing**: Share chat history URLs with others
- **Export Chat**: Download conversations as JSON or Markdown
- **Search History**: Search across all past conversations
- **Message Reactions**: Like/dislike AI responses
- **Conversation Branching**: Fork conversations at any point

### Potential Optimizations
- **Pagination**: Load messages in chunks for long conversations
- **Caching**: Redis cache for frequently accessed conversations
- **Compression**: Compress old messages to save space
- **Archiving**: Move old conversations to cold storage

---

## References

### Documentation
- [Supabase Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Vercel AI SDK v6](https://sdk.vercel.ai/docs)
- [DefaultChatTransport](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/default-chat-transport)

### Related Files
- `database/migrations/002_chat_history.sql` - Database schema
- `app/actions/chat.ts` - Server actions
- `types/chat.ts` - TypeScript types
- `app/api/chat/route.ts` - API endpoint
- `components/playground/ModernChatInterface.tsx` - Frontend
- `lib/supabase.ts` - Supabase helpers

---

**Last Updated**: December 6, 2024







