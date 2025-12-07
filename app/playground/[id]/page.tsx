import { notFound } from "next/navigation";
import { getScrapeByIdAction } from "@/app/actions/scrape";
import { AgentProgressView } from "@/components/playground/AgentProgressView";
import { ModernChatInterface } from "@/components/playground/ModernChatInterface";

interface PlaygroundPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { id } = await params;

  const result = await getScrapeByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const scrape = result.data;

  return (
    <div className="flex-1 overflow-hidden">
      {scrape.status === "completed" ? (
        <ModernChatInterface scrape={scrape} />
      ) : (
        <AgentProgressView scrape={scrape} />
      )}
    </div>
  );
}
