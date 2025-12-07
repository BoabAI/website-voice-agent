"use server";

import { createClient } from "@supabase/supabase-js";
import type { ChatMessage, ChatHistoryResponse } from "@/types/chat";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Helper to create an authenticated Supabase client
 */
function createAuthenticatedClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Get chat history for a specific scrape and user
 */
export async function getChatHistory(
  scrapeId: string,
  accessToken: string
): Promise<ChatHistoryResponse> {
  if (!accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = createAuthenticatedClient(accessToken);

  try {
    // Verify the user is authenticated and get their ID
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Invalid token" };
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("scrape_id", scrapeId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching chat history:", error);
      return { success: false, error: error.message };
    }

    // Transform messages to match AI SDK format
    const transformedMessages = data.map((msg: ChatMessage) => {
      // Extract text from JSONB content field
      let content: string = "";

      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (
        typeof msg.content === "object" &&
        msg.content !== null &&
        "text" in msg.content
      ) {
        content = (msg.content as { text: string }).text || "";
      } else if (msg.content) {
        // Fallback: stringify if it's some other format
        content = JSON.stringify(msg.content);
      }

      return {
        id: msg.id,
        role: msg.role,
        content: content,
        createdAt: msg.created_at,
      };
    });

    console.log(
      `[getChatHistory] Transformed ${transformedMessages.length} messages`,
      transformedMessages.map((m) => ({
        id: m.id,
        role: m.role,
        contentType: typeof m.content,
        contentPreview: m.content?.substring(0, 50),
      }))
    );

    return {
      success: true,
      messages: transformedMessages as unknown as ChatMessage[],
    };
  } catch (error) {
    console.error("Unexpected error in getChatHistory:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Clear chat history for a specific scrape
 */
export async function clearChatHistory(
  scrapeId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = createAuthenticatedClient(accessToken);

  try {
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("scrape_id", scrapeId);
    // RLS ensures they only delete their own messages

    if (error) {
      console.error("Error clearing chat history:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in clearChatHistory:", error);
    return { success: false, error: "Internal server error" };
  }
}
