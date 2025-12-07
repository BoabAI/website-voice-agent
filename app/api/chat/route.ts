import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { searchKnowledgeBase } from "@/lib/rag";
import { getScrapeById } from "@/lib/db/scrapes";
import { createClient } from "@supabase/supabase-js";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, scrapeId } = await req.json();
    const authHeader = req.headers.get("Authorization");

    if (!scrapeId) {
      return new Response("Missing scrapeId", { status: 400 });
    }

    if (!messages || messages.length === 0) {
      return new Response("Missing messages", { status: 400 });
    }

    if (!authHeader) {
      return new Response("Unauthorized: Missing Authorization header", {
        status: 401,
      });
    }

    // Create authenticated Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized: Invalid token", { status: 401 });
    }

    const userId = user.id;

    console.log(
      `[Chat] Received ${messages.length} messages for scrapeId: ${scrapeId}, User: ${userId}`
    );

    // Save the latest user message (assuming it's the last one)
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user" && lastUserMessage.id) {
      console.log(`[Chat] Saving user message:`, {
        id: lastUserMessage.id,
        content: lastUserMessage.content,
        contentType: typeof lastUserMessage.content,
        parts: lastUserMessage.parts,
      });

      // Check if it already exists to prevent duplicates (idempotency)
      const { data: existing } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("id", lastUserMessage.id)
        .maybeSingle();

      if (!existing) {
        // Extract content from message (handle different formats)
        let messageContent = "";
        
        if (typeof lastUserMessage.content === "string") {
          messageContent = lastUserMessage.content;
        } else if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textParts = lastUserMessage.parts.filter((p: any) => p.type === "text");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messageContent = textParts.map((p: any) => p.text).join("\n");
        } else if (lastUserMessage.content) {
          messageContent = JSON.stringify(lastUserMessage.content);
        }

        console.log(`[Chat] Extracted content:`, { messageContent, length: messageContent.length });

        // Validate content is not empty
        if (messageContent && messageContent.trim() !== "") {
          const { error: insertError } = await supabase
            .from("chat_messages")
            .insert({
              id: lastUserMessage.id,
              scrape_id: scrapeId,
              user_id: userId,
              role: "user",
              content: { text: messageContent }, // Store as JSONB
            });

          if (insertError) {
            console.error("[Chat] Error saving user message:", insertError, {
              messageId: lastUserMessage.id,
              scrapeId,
              userId,
            });
          } else {
            console.log("[Chat] User message saved successfully");
          }
        } else {
          console.warn("[Chat] Skipping user message with empty content", {
            hasContent: !!lastUserMessage.content,
            hasParts: !!lastUserMessage.parts,
          });
        }
      } else {
        console.log("[Chat] User message already exists, skipping");
      }
    }

    // Fetch scrape details to customize the persona
    const scrape = await getScrapeById(scrapeId);
    const websiteUrl = scrape?.url || "the website";
    const domain = websiteUrl.replace(/^https?:\/\//, "").split("/")[0];

    const systemPrompt = `
You are the official AI representative for ${domain}. Your core purpose is to answer questions about the product, explain its capabilities, and help users get started based on the content from ${websiteUrl}.

You have access to a tool 'search_knowledge_base' that searches the website's documentation and content.

CRITICAL BEHAVIOR:
1. **Be an Expert**: You represent the brand. Speak with confidence and authority (use "we" when referring to the product).
2. **Always Search First**: When asked about features, pricing, or "what can you do?", ALWAYS use 'search_knowledge_base' to find the exact details.
3. **Never Say "I Don't Know"**: If a search returns limited results, do NOT say "I don't know" or "I couldn't find that." Instead, pivot gracefully: "I don't have the specific details on that exact feature right now, but I can tell you about [Core Feature]..." or ask a clarifying question.
4. **Be Proactive**: Don't just answer; suggest the next step. (e.g., "Would you like to see how that works?" or "I can explain the pricing if you're interested.")
5. **Tone**: Professional, enthusiastic, and helpful. You are here to sell the value of the product.
`;

    // Clean and convert messages to simple format for OpenRouter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanedMessages = messages.map((msg: any) => {
      let content = "";

      if (msg.parts && Array.isArray(msg.parts)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textParts = msg.parts.filter((part: any) => part.type === "text");
        content = textParts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((part: any) => part.text || "")
          .join("\n")
          .trim();
      } else if (typeof msg.content === "string") {
        content = msg.content;
      }

      // Preserve tool calls/results if they exist in history
      const toolCalls = msg.toolCalls;
      const toolInvocations = msg.toolInvocations;

      return {
        role: msg.role,
        content: content || " ",
        // Pass through tool-related fields if present
        ...(toolCalls && { toolCalls }),
        ...(toolInvocations && { toolInvocations }),
      };
    });

    // Stream the response using Vercel AI SDK
    const result = streamText({
      model: openrouter("openai/gpt-4o-mini"),
      messages: cleanedMessages,
      system: systemPrompt,
      stopWhen: stepCountIs(5), // Allow multi-step (Search -> Answer)
      tools: {
        search_knowledge_base: tool({
          description: "Search the scraped website content for information.",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
          }),
          execute: async ({ query }: { query: string }) => {
            console.log(`[Tool] Searching knowledge base for: "${query}"`);
            const results = await searchKnowledgeBase(query, scrapeId);

            if (!results || results.length === 0) {
              return "No relevant information found.";
            }

            const context = results
              .map((item) => item.content)
              .join("\n\n---\n\n");

            return context;
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onFinish: async (result: any) => {
        console.log("[Chat] Stream finished:", {
          finishReason: result.finishReason,
          usage: result.usage,
          steps: result.steps?.length || 1,
        });

        // Save assistant response
        try {
          console.log("[Chat] onFinish result structure:", {
            hasText: !!result.text,
            textValue: result.text,
            hasResponse: !!result.response,
            responseKeys: result.response ? Object.keys(result.response) : [],
            assistantMessages: result.response?.messages?.filter((m: any) => m.role === "assistant"),
          });

          const finalText = result.text;

          if (!finalText || typeof finalText !== "string" || finalText.trim() === "") {
            console.log("[Chat] No valid text to save");
            return;
          }

          // Generate a stable ID for the assistant message
          // Use the last user message ID + current timestamp
          const lastUserMsg = messages.find((m: any) => m.role === "user" && m.id);
          const assistantMessageId = lastUserMsg 
            ? `assistant-${lastUserMsg.id}-${Date.now()}`
            : `assistant-${Date.now()}`;

          console.log("[Chat] Saving assistant message with ID:", assistantMessageId);

          // Check if this message already exists
          const { data: existing } = await supabase
            .from("chat_messages")
            .select("id")
            .eq("id", assistantMessageId)
            .maybeSingle();

          if (!existing) {
            const { error: insertError } = await supabase
              .from("chat_messages")
              .insert({
                id: assistantMessageId,
                scrape_id: scrapeId,
                user_id: userId,
                role: "assistant",
                content: { text: finalText },
              });

            if (insertError) {
              console.error("[Chat] Error saving assistant message:", insertError);
            } else {
              console.log("[Chat] Assistant message saved successfully:", assistantMessageId);
            }
          } else {
            console.log("[Chat] Assistant message already exists, skipping");
          }
        } catch (saveError) {
          console.error("[Chat] Failed to save assistant response:", saveError);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
