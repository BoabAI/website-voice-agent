"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Database,
  FileText,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScrapeWithPages } from "@/types/scrape";
import { cn } from "@/lib/utils";

interface AgentProgressViewProps {
  scrape: ScrapeWithPages;
}

const STEPS = [
  {
    id: "analyzing",
    label: "Analyzing URL",
    description: "Verifying website accessibility and structure",
    icon: Globe,
  },
  {
    id: "crawling",
    label: "Crawling Content",
    description: "Discovering and downloading pages",
    icon: FileText,
  },
  {
    id: "processing_pages",
    label: "Processing Data",
    description: "Cleaning and structuring the content",
    icon: Database,
  },
  {
    id: "generating_embeddings",
    label: "Training Model",
    description: "Generating vector embeddings for knowledge base",
    icon: Sparkles,
  },
] as const;

export function AgentProgressView({ scrape }: AgentProgressViewProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Poll for updates
  useEffect(() => {
    if (scrape.status === "processing" || scrape.status === "pending") {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [scrape.status, router]);

  // Determine current step index
  useEffect(() => {
    if (scrape.status === "completed") {
      setCurrentStepIndex(STEPS.length);
    } else if (scrape.status === "failed") {
      // Keep looking at current_step to show where it failed
      if (scrape.current_step) {
        const stepIndex = STEPS.findIndex((s) => s.id === scrape.current_step);
        if (stepIndex !== -1) setCurrentStepIndex(stepIndex);
      }
    } else if (scrape.current_step) {
      const stepIndex = STEPS.findIndex((s) => s.id === scrape.current_step);
      if (stepIndex !== -1) {
        setCurrentStepIndex(stepIndex);
      } else {
        // Handle 'completed' as a step string if backend sends it
        if (scrape.current_step === "completed")
          setCurrentStepIndex(STEPS.length);
      }
    } else {
      // Fallback for legacy records or missing current_step
      if (scrape.status === "processing") setCurrentStepIndex(1); // Assume crawling
      if (scrape.status === "pending") setCurrentStepIndex(0);
    }
  }, [scrape.status, scrape.current_step]);

  const getStatusInfo = () => {
    switch (scrape.status) {
      case "processing":
        return {
          title: "Creating Your Agent",
          description: "Reading the website and training the model...",
        };
      case "pending":
        return {
          title: "In Queue",
          description: "Waiting for a worker to pick up the job...",
        };
      case "failed":
        return {
          title: "Creation Failed",
          description:
            scrape.error_message ||
            "We couldn't process this website. Please try again.",
        };
      default:
        return {
          title: "Ready",
          description: "Your agent is ready to chat!",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const domain = new URL(scrape.url).hostname;

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-white p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-12 border border-gray-100 shadow-xl shadow-blue-900/5 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          {scrape.status === "failed" ? (
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          ) : scrape.status === "completed" ? (
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
              <Loader2 className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          )}

          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            {statusInfo.title}
          </h2>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            {statusInfo.description}
          </p>

          {/* Website Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 mt-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{domain}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-sm text-gray-500 capitalize">
              {scrape.crawl_type === "single" ? "Single Page" : "Full Site"}
            </span>
          </div>
        </div>

        {/* Failed Action */}
        {scrape.status === "failed" && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => router.push("/playground")}
              className="rounded-full px-8 h-12 bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Start Again
            </Button>
          </div>
        )}

        {/* Progress Steps */}
        {(scrape.status === "processing" ||
          scrape.status === "pending" ||
          scrape.status === "failed") && (
          <div className="max-w-md mx-auto w-full space-y-0 mt-8">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent =
                index === currentStepIndex && scrape.status !== "failed";
              const isFailed =
                scrape.status === "failed" && index === currentStepIndex;
              const isPending = index > currentStepIndex;

              return (
                <div key={step.id} className="relative pb-8 last:pb-0">
                  {/* Vertical Line */}
                  {index !== STEPS.length - 1 && (
                    <div
                      className={cn(
                        "absolute top-8 left-6 w-0.5 h-full -ml-px transition-colors duration-500",
                        isCompleted ? "bg-blue-600" : "bg-gray-100"
                      )}
                    />
                  )}

                  <div className="relative flex items-start gap-4 group">
                    {/* Icon Circle */}
                    <div
                      className={cn(
                        "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-white",
                        isCompleted
                          ? "border-blue-600 text-blue-600"
                          : isCurrent
                          ? "border-blue-600 text-blue-600 shadow-lg shadow-blue-500/20 scale-110"
                          : isFailed
                          ? "border-red-500 text-red-500 bg-red-50"
                          : "border-gray-100 text-gray-300"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : isFailed ? (
                        <AlertCircle className="w-6 h-6" />
                      ) : (
                        <step.icon
                          className={cn(
                            "w-5 h-5",
                            isCurrent && "animate-pulse"
                          )}
                        />
                      )}

                      {isCurrent && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="pt-2">
                      <h3
                        className={cn(
                          "font-semibold text-base transition-colors duration-300",
                          isCompleted || isCurrent
                            ? "text-gray-900"
                            : isFailed
                            ? "text-red-600"
                            : "text-gray-400"
                        )}
                      >
                        {step.label}
                      </h3>
                      <p
                        className={cn(
                          "text-sm mt-0.5 transition-colors duration-300",
                          isCompleted || isCurrent || isFailed
                            ? "text-gray-600"
                            : "text-gray-400"
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
