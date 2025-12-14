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
      {/* Show ModernChatInterface even if processing, but pass status so it can show progress overlay if needed */}
      <ModernChatInterface scrape={scrape} />
    </div>
  );
}
