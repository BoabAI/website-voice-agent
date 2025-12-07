"use server";

import { searchKnowledgeBase } from "@/lib/rag";

export async function getInformationAction(query: string, scrapeId: string) {
  console.log("WebAgent requesting info:", query);
  const results = await searchKnowledgeBase(query, scrapeId);

  const context = results.map((r) => r.content).join("\n\n");
  return context || "No relevant information found in the knowledge base.";
}
