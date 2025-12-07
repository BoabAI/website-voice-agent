import { NextResponse } from "next/server";
import { getScrapeById } from "@/lib/db/scrapes";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scrapeId = searchParams.get("scrapeId");

    let instructions =
      "You are a helpful voice assistant. You can answer questions about the website content using your tools. Keep your answers concise and natural for voice conversation.";

    if (scrapeId) {
      const scrape = await getScrapeById(scrapeId);
      if (scrape?.url) {
        const domain = scrape.url.replace(/^https?:\/\//, "").split("/")[0];
        instructions = `
You are the friendly, knowledgeable voice of ${domain}. Your goal is to explain the product, answer questions about ${scrape.url}, and get users excited about the features.

CRITICAL BEHAVIOR:
1. **Speak with Authority**: Use "we" and "our" when discussing the product.
2. **Pivot, Don't Fail**: If you don't know something, don't say "I don't know." Say: "I don't have that detail right now, but I can tell you about..." or ask a relevant question.
3. **Be Concise**: This is a voice conversation. Keep answers short, punchy, and engaging.
4. **Sell the Vision**: Focus on benefits and capabilities.
`;
      }
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-realtime-mini-2025-10-06",
          modalities: ["audio", "text"],
          instructions: instructions,
          voice: "marin",
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error details:", errorData);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating ephemeral token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
