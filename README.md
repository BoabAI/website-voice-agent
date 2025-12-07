# WebAgent Demo

A modern SaaS platform that transforms websites into interactive voice agents using AI. Simply provide a website URL, and our system will scrape the content and create a conversational AI agent that can answer questions about that website using voice.

![WebAgent Demo](https://via.placeholder.com/800x400/1f2937/ffffff?text=Web+Voice+Agent+Demo)

## ✨ Key Features

- **Website Scraping**: Extract content from any website using Firecrawl
- **Voice Interaction**: Real-time voice conversations powered by OpenAI Realtime API
- **Smart Knowledge Base**: Vectorized content storage with Supabase
- **Global Visibility**: See all scraped websites (with user attribution)
- **Anonymous Access**: No signup required - works immediately
- **Multi-page Support**: Scrape single pages or entire platforms
- **Real-time Updates**: Live status tracking during scraping
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

Get started in 5 minutes:

### 1. Set Up Supabase

```bash
# Create project at supabase.com
# Enable Anonymous Authentication
# Run schema from doc/SUPABASE_SETUP.md
```

### 2. Set Up Firecrawl

```bash
# Get API key from firecrawl.dev
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Add your Supabase and Firecrawl credentials
```

### 4. Run the Application

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and try scraping `https://example.com`!

## 📋 Prerequisites

- **Node.js 18.17+**
- **Supabase Account** ([supabase.com](https://supabase.com))
- **Firecrawl API Key** ([firecrawl.dev](https://firecrawl.dev))

## 🛠️ Installation

### Clone and Install

```bash
git clone https://github.com/BoabAI/website-voice-agent.git
cd web-voice-agent
npm install
```

### Environment Setup

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
FIRECRAWL_API_KEY=fc-your-api-key-here
```

### Database Setup

1. Create a Supabase project
2. Enable Anonymous Authentication
3. Run the SQL schema from `database/schema/supabase-schema.sql`
4. Verify tables are created (`scrapes` and `scraped_pages`)

## 🎯 How It Works

### Phase 1: Website Scraping ✅

1. **Submit URL**: User enters a website URL
2. **Choose Type**: Single page or full platform crawl
3. **AI Scraping**: Firecrawl extracts content intelligently
4. **Store Content**: Vectorized storage in Supabase
5. **View Results**: Browse all scraped pages in the playground

### Phase 2: WebAgent Voice 🔄

1. **Voice Interface**: WebRTC connection to OpenAI Realtime API
2. **Real-time Audio**: Bidirectional voice streaming
3. **Knowledge Retrieval**: RAG on scraped content
4. **Conversational AI**: Natural voice responses about the website

## 📁 Project Structure

```
web-voice-agent/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions
│   ├── playground/        # Scraping results interface
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── playground/       # Scraping playground UI
├── lib/                  # Utilities and integrations
│   ├── db/              # Database helpers
│   ├── firecrawl.ts     # Scraping integration
│   └── supabase.ts      # Database client
├── doc/                  # Documentation
├── database/             # Database schema and migrations
└── types/               # TypeScript definitions
```

## 🏗️ Architecture

### System Components

**Frontend (Next.js)**

- User interface for URL submission and agent interaction
- Real-time voice interface using WebRTC
- Responsive design with Tailwind CSS and shadcn/ui

**Backend (Next.js Server Actions)**

- API orchestration and validation
- Firecrawl job management
- Anonymous authentication with Supabase

**Ingestion (Firecrawl)**

- Intelligent web scraping and content extraction
- Handles JavaScript-rendered content
- Markdown output for optimal AI processing

**Knowledge Base (Supabase)**

- PostgreSQL with pgvector extension
- Row Level Security (RLS) policies
- Anonymous user management

**WebAgent Voice (OpenAI Realtime API)**

- WebRTC-based audio streaming
- Voice Activity Detection (VAD)
- Real-time speech-to-speech conversion

### Data Flow

```
User Input → URL Validation → Firecrawl → Content Storage → WebAgent
     ↓              ↓              ↓             ↓              ↓
  Form UI    → Server Actions → Scraping Job → Supabase DB → OpenAI API
```

## 🧪 Testing

### Sample URLs to Test

- `https://example.com` - Simple single page
- `https://docs.python.org` - Multi-page documentation
- `https://news.ycombinator.com` - Dynamic content
- `https://vercel.com/docs` - Technical documentation

### Test Scenarios

- [ ] Single URL scraping
- [ ] Full platform crawling (10, 20, 50 pages)
- [ ] Duplicate URL detection
- [ ] Real-time status updates
- [ ] Re-scraping functionality
- [ ] Error handling

## 📚 Documentation

**All detailed documentation is in the `doc/` folder:**

- **[QUICKSTART.md](doc/QUICKSTART.md)** - Get started in 5 minutes
- **[SETUP.md](doc/SETUP.md)** - Complete installation and setup
- **[SUPABASE_SETUP.md](doc/SUPABASE_SETUP.md)** - Database configuration guide
- **[RAG_IMPLEMENTATION.md](doc/RAG_IMPLEMENTATION.md)** - RAG system architecture and implementation
- **[ARCHITECTURE.md](doc/ARCHITECTURE.md)** - System architecture overview
- **[IMPLEMENTATION_SUMMARY.md](doc/IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[REDESIGN_SUMMARY.md](doc/REDESIGN_SUMMARY.md)** - UI redesign documentation
- **[USAGE_GUIDE.md](doc/USAGE_GUIDE.md)** - How to use the playground
- **[CHANGELOG.md](doc/CHANGELOG.md)** - Recent updates and changes
- **[getting-started.md](doc/getting-started.md)** - Development workflow guide

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Database**: Supabase (PostgreSQL + pgvector)
- **Scraping**: Firecrawl API
- **Voice AI**: OpenAI Realtime API
- **Authentication**: Supabase Anonymous Auth

### Adding UI Components

```bash
npx shadcn@latest add <component-name>
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

Works with any platform supporting Next.js:

- Netlify
- Railway
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style
- Add JSDoc comments for complex functions
- Test thoroughly before submitting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/BoabAI/website-voice-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BoabAI/website-voice-agent/discussions)
- **Documentation**: Check the `doc/` folder

## 🗺️ Roadmap

### Phase 1 ✅ - Website Scraping

- [x] Firecrawl integration
- [x] Supabase storage
- [x] Anonymous authentication
- [x] Real-time UI updates
- [x] Multi-page crawling

### Phase 2 🔄 - WebAgent Voice (In Progress)

- [ ] OpenAI Realtime API integration
- [ ] Voice interface implementation
- [ ] RAG on scraped content
- [ ] WebRTC audio streaming

### Phase 3 📋 - Advanced Features

- [ ] Custom crawl patterns
- [ ] Scheduled re-scraping
- [ ] Team collaboration
- [ ] Analytics dashboard
- [ ] Cost tracking

---

**Built with ❤️ using Next.js, Supabase, Firecrawl, and OpenAI**
