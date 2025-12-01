# Product Requirement Document: Instant Website Voice Agent Demo

## 1. Overview
The **Instant Website Voice Agent Demo** is a platform designed to allow users to instantly generate and test a custom AI voice and chat agent by simply providing a website URL. The system automatically ingests the website's content, builds a knowledge base, and provisions a Vapi AI agent capable of natural voice interactions and accurate question answering via a RAG pipeline orchestrated by N8N.

## 2. Objectives
- **Instant Value Demonstration**: Allow users to experience the product's capabilities within minutes without friction (no initial sign-up).
- **High-Quality Ingestion**: Accurately crawl, clean, and structure website data to ensure high-fidelity answers.
- **Natural Voice Interaction**: Leverage OpenAI Realtime API or Gemini Live to provide human-like speech, low-latency responses, and smooth turn-taking.

## 3. Technology Stack
- **Workflow Orchestration & Backend**: [N8N](https://n8n.io/)
- **Voice AI Engine**: [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) or [Gemini Live](https://ai.google.dev/gemini-api/docs/live) (chosen over Vapi for cost efficiency in web demos - ~80% cost reduction)
- **Knowledge Base / Vector Database**: (Supabase Postgres Vector)
- **LLM**: OpenRouter (Preferred for accessing models like OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet)

## 4. Core Features

### 4.1. Website Ingestion & Knowledge Base
**Owner**: N8N Workflows
- **URL Input**: Users submit a target website URL.
- **Crawling**: The system crawls the provided URL to extract text content.
    - *Requirement*: Handle common page types (About, Pricing, Documentation).
    - *Requirement*: Respect `robots.txt` where appropriate but maximize demo success.
- **Processing**:
    - **Cleaning**: Remove HTML boilerplate, scripts, and non-content elements.
    - **Chunking**: Split text into semantic chunks suitable for embedding.
- **Storage**: Save chunks and embeddings into the Knowledge Base.
- **Updates**: Support re-crawling to update the Knowledge Base when the source site changes.

### 4.2. AI Chat & Voice Agent
**Owner**: OpenAI Realtime API / Gemini Live (Voice) & N8N (RAG Pipeline)
- **RAG Pipeline**:
    - Upon receiving a user query (voice or text), the system retrieves relevant chunks from the Knowledge Base.
    - The LLM generates a response based *only* on the retrieved context to minimize hallucinations.
- **Voice Capabilities (OpenAI Realtime API / Gemini Live)**:
    - **ASR (Automatic Speech Recognition)**: Transcribe user speech to text in real-time.
    - **TTS (Text-to-Speech)**: Convert LLM responses to natural-sounding speech.
    - **Turn-Taking**: Handle interruptions and pauses naturally.
- **Dual Modality**: Support both voice interaction and text-based chat in the demo interface.

### 4.3. Free Instant Demo
**Owner**: Frontend & Orchestration
- **User Flow**:
    1. User lands on the demo page.
    2. Enters a URL (e.g., `https://example.com`).
    3. System processes the site (Progress indicator shown).
    4. "Agent Ready" state triggers the demo interface.
    5. User talks to or chats with the agent immediately.
- **Constraints**:
    - Time-boxed processing (target < 2 minutes for average sites).
    - Usage limits (e.g., limited duration per demo session to prevent abuse).

## 5. User Stories
1. **As a potential customer**, I want to enter my company's URL and talk to an agent immediately so that I can verify if it understands my business.
2. **As a developer**, I want the crawler to intelligently parse my documentation so that the agent can answer technical questions accurately.
3. **As a user**, I want to interrupt the agent if it's talking too long, and have it stop and listen, simulating a real conversation.

## 6. Future Scope
- **Customization**: Allow users to tweak the system prompt or voice personality after the initial demo.
- **Widget Export**: Allow users to embed the created demo agent onto their own site via a script tag.
- **Multi-Language Support**: Auto-detect website language and configure the agent accordingly.
