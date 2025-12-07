# Playground Usage Guide

## Getting Started

### Accessing the Playground

1. **From Home Page**: Click "Generate Agent" button after filling the form
2. **Direct URL**: Navigate to `/playground` to create a new agent
3. **From Sidebar**: Click "New Agent" button in the collapsible sidebar

## Creating a New Agent

### Step 1: Open the Agent Creation Form

- Visit `/playground`
- You'll see a centered, modern form with a gradient icon at the top

### Step 2: Fill in the Details

1. **Website URL**: Enter the full URL (e.g., `https://example.com`)
2. **Crawl Type**: Choose between:
   - **Single Page**: Scrapes only the specific URL provided
   - **Full Platform**: Crawls multiple pages from the website
3. **Page Limit** (only for Full Platform):
   - 10 pages (recommended for testing)
   - 20 pages (good for small sites)
   - 50 pages (comprehensive coverage)

### Step 3: Generate Agent

- Click the "Generate Agent" button
- The system will check if the URL already exists
- If new, it creates the agent and redirects to the progress view
- If existing, it redirects to the existing agent

## Agent Progress View

While your agent is being created, you'll see a detailed vertical timeline showing real-time progress:

### Progress Steps

1. **Analyzing URL**: Verifying website accessibility and structure
2. **Crawling Content**: Discovering and downloading pages (e.g., "Crawled 10 pages")
3. **Processing Data**: Cleaning and structuring the content
4. **Training Model**: Generating vector embeddings for the knowledge base

### Visual Indicators

- **Active Step**: Pulsing blue icon with a "ping" animation
- **Completed Step**: Solid blue checkmark
- **Pending Step**: Gray icon
- **Failed Step**: Red alert icon (with "Start Again" button)

### Auto-Refresh

- The page automatically polls for updates every 3 seconds
- No manual refresh needed
- You can leave the page and come back anytime

## Using the Chat Interface

Once your agent is ready (status: completed), you'll see the modern chat interface.

### Text Chat Mode

1. **Type Your Question**: Use the input field at the bottom
2. **Send Message**: Click the send button or press Enter
3. **View Response**: Messages appear with user/bot avatars
4. **Scroll**: Auto-scrolls to the latest message

### Voice Mode

1. **Activate Voice Mode**:

   - Click the "Voice" button next to the input field
   - Grant microphone permissions when prompted
   - Wait for "Listening..." status

2. **During Voice Session**:

   - Speak naturally into your microphone
   - The AI will respond with voice
   - Visual indicator shows listening state (animated microphone)

3. **Deactivate Voice Mode**:
   - Click "End Voice" button
   - Returns to text chat mode
   - Microphone is released

### Voice Mode Features

- Real-time speech recognition
- Natural conversation flow
- AI responds with voice
- Searches knowledge base automatically
- Visual feedback (green pulsing circle when active)

## Sidebar Navigation

### Collapsible Sidebar

- **Expand**: Shows agent names, status, and details (280px)
- **Collapse**: Shows only status icons (60px)
- **Toggle**: Click the arrow button in the header

### Sidebar Features

1. **New Agent Button**:

   - Always visible at the top
   - Takes you to `/playground` to create new agent

2. **Recent Agents List**:

   - Shows all your agents in reverse chronological order
   - Each agent displays:
     - Domain name
     - Status icon with color
     - Crawl type (single page or X pages)
     - Creation date

3. **Status Indicators**:

   - 🟢 Green checkmark: Ready to use
   - 🔵 Blue spinner: Currently processing
   - 🟡 Yellow clock: Pending
   - 🔴 Red X: Failed

4. **Active Agent Highlighting**:
   - Current agent has blue background
   - Blue border around the card
   - Stands out visually

### Sidebar Shortcuts

- Click any agent to switch to it
- Collapsed view shows just icons for quick access
- Hover over collapsed icons to see tooltips (if browser supports)

## Tips & Best Practices

### For Best Results

1. **URL Selection**:

   - Use clean, accessible URLs
   - Avoid URLs behind login walls
   - Single page mode is faster for testing

2. **Crawling Strategy**:

   - Start with single page to test
   - Use 10 pages for small sites
   - Larger page limits take more time

3. **Chat Interaction**:

   - Ask specific questions about the website content
   - Use natural language
   - The AI knows about all scraped pages

4. **Voice Mode**:
   - Use in a quiet environment
   - Speak clearly and naturally
   - Wait for the AI to finish speaking before asking next question
   - Good for hands-free interaction

### Troubleshooting

**Agent stuck in "Processing"?**

- Wait a few minutes, larger sites take longer
- The page auto-refreshes every 3 seconds
- If stuck for >5 minutes, try creating a new agent

**Voice mode not working?**

- Check microphone permissions in browser
- Ensure you're on HTTPS (required for microphone)
- Check console for any errors
- Try refreshing the page

**No agents showing in sidebar?**

- Make sure you've created at least one agent
- Try refreshing the page
- Check browser console for errors

**Agent failed?**

- The URL might be inaccessible
- The website might block scraping
- Try a different URL or contact support

## Keyboard Navigation

### Future Features (Coming Soon)

- `Cmd/Ctrl + K`: Quick agent search
- `Cmd/Ctrl + N`: New agent
- `Cmd/Ctrl + B`: Toggle sidebar
- `Esc`: Close voice mode

## Security & Privacy

- All agents are associated with your session
- No agents are shared between users
- Voice data is processed by OpenAI Realtime API
- Website content is stored securely in Supabase

## Performance Tips

1. **Sidebar**: Collapse sidebar for more chat space
2. **Voice Mode**: Use good internet connection for best quality
3. **Messages**: Chat history is preserved for each agent
4. **Multiple Agents**: You can create unlimited agents

## Support

If you encounter any issues:

1. Check the browser console (F12) for errors
2. Verify your internet connection
3. Try refreshing the page
4. Create a new agent to test

## What's Next?

After setting up your agent:

- Share the agent URL with team members
- Integrate with your app via API (coming soon)
- Export conversation history (coming soon)
- Configure agent settings (coming soon)
