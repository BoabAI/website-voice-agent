"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import { getAllScrapesAction } from "@/app/actions/scrape";
import type { Scrape } from "@/types/scrape";
import { ModernSidebar } from "@/components/playground/ModernSidebar";
import { MobileSidebar } from "@/components/playground/MobileSidebar";

export function PlaygroundLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scrapes, setScrapes] = useState<Scrape[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const params = useParams();
  const currentScrapeId = params?.id as string | undefined;

  useEffect(() => {
    loadScrapes();
  }, [pathname]);

  async function loadScrapes() {
    try {
      const result = await getAllScrapesAction();
      if (result.success && result.data) {
        setScrapes(result.data);
      }
    } catch (error) {
      console.error("Failed to load scrapes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop Sidebar - hidden on mobile */}
      <ModernSidebar
        scrapes={scrapes}
        isLoading={isLoading}
        currentScrapeId={currentScrapeId}
        className="hidden md:flex"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - visible on mobile only */}
        <div className="md:hidden h-14 border-b flex items-center px-4 bg-white flex-shrink-0 z-10">
          <MobileSidebar
            scrapes={scrapes}
            isLoading={isLoading}
            currentScrapeId={currentScrapeId}
          />
          <span className="ml-2 font-medium text-sm">Playground</span>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
