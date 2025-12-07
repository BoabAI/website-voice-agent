import { PlaygroundLayoutClient } from "@/components/playground/PlaygroundLayoutClient";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <PlaygroundLayoutClient>
        {children}
      </PlaygroundLayoutClient>
    </TooltipProvider>
  );
}
