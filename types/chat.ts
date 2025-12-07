export interface ChatMessage {
  id: string;
  scrape_id: string;
  user_id: string;
  role: "user" | "assistant" | "system" | "data";
  content: unknown;
  created_at: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  messages?: ChatMessage[];
  error?: string;
}
