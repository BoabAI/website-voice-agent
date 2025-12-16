"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Sparkles,
  Globe,
  ArrowRight,
  Settings2,
  Mic,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { scrapeFormSchema, type ScrapeFormValues } from "@/lib/validations";
import { startScraping, checkExistingScrape } from "@/app/actions/scrape";

export function AgentCreationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeFormSchema),
    defaultValues: {
      url: "",
      crawlType: "full",
      pageLimit: 10,
    },
  });

  const crawlType = form.watch("crawlType");

  async function onSubmit(data: ScrapeFormValues) {
    setIsLoading(true);

    try {
      const existing = await checkExistingScrape(data.url);

      if (existing.exists && existing.scrape) {
        toast.info("This URL has already been scraped!", {
          description: "Redirecting to existing agent...",
        });
        router.push(`/playground/${existing.scrape.id}`);
        setIsLoading(false);
        return;
      }

      const result = await startScraping(data);

      if (result.success) {
        if (result.existingScrapeId) {
          toast.info("This URL has already been scraped!", {
            description: "Redirecting to existing agent...",
          });
          router.push(`/playground/${result.existingScrapeId}`);
        } else if (result.scrapeId) {
          toast.success("Agent creation started!", {
            description: "Processing your website...",
          });
          router.push(`/playground/${result.scrapeId}`);
        }
      } else {
        toast.error("Failed to create agent", {
          description: result.error || "Unknown error",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function onError() {
    // Show toast notification for validation errors
    const urlError = form.formState.errors.url;
    if (urlError) {
      toast.error("Invalid URL format", {
        description: urlError.message,
      });
    }
  }

  return (
    <div className="flex flex-col items-center justify-start md:justify-center min-h-full bg-white p-4 md:p-8 py-12 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 md:space-y-8"
      >
        {/* Greeting */}
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-5xl font-medium bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
          >
            Hello, Creator
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-gray-400"
          >
            What website would you like to talk to today?
          </motion.p>
        </div>

        {/* Input Form */}
        <div className="w-full relative">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onError)}
              className="relative z-10"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <Input
                          placeholder="Enter website URL..."
                          className="w-full h-14 md:h-16 pl-5 md:pl-6 pr-28 md:pr-32 text-base md:text-lg rounded-2xl border-gray-200 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 group-hover:shadow-md"
                          autoComplete="off"
                          {...field}
                        />

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {/* Settings Trigger */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                              >
                                <Settings2 className="w-5 h-5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-72 md:w-80 p-4"
                              align="end"
                            >
                              <div className="space-y-4">
                                <h4 className="font-medium leading-none">
                                  Crawl Settings
                                </h4>

                                <FormField
                                  control={form.control}
                                  name="crawlType"
                                  render={({ field }) => (
                                    <FormItem className="space-y-2">
                                      <FormLabel>Depth</FormLabel>
                                      <FormControl>
                                        <RadioGroup
                                          onValueChange={field.onChange}
                                          defaultValue={field.value}
                                          className="grid grid-cols-2 gap-2"
                                        >
                                          <Label
                                            htmlFor="single"
                                            className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                                              field.value === "single"
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                          >
                                            <RadioGroupItem
                                              value="single"
                                              id="single"
                                              className="sr-only"
                                            />
                                            <span className="text-sm font-medium">
                                              Single Page
                                            </span>
                                          </Label>
                                          <Label
                                            htmlFor="full"
                                            className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                                              field.value === "full"
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                          >
                                            <RadioGroupItem
                                              value="full"
                                              id="full"
                                              className="sr-only"
                                            />
                                            <span className="text-sm font-medium">
                                              Full Site
                                            </span>
                                          </Label>
                                        </RadioGroup>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />

                                {crawlType === "full" && (
                                  <FormField
                                    control={form.control}
                                    name="pageLimit"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Page Limit</FormLabel>
                                        <Select
                                          onValueChange={(value) =>
                                            field.onChange(Number(value))
                                          }
                                          defaultValue={String(field.value)}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select limit" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="10">
                                              10 pages
                                            </SelectItem>
                                            <SelectItem value="20">
                                              20 pages
                                            </SelectItem>
                                            <SelectItem value="50">
                                              50 pages
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Submit Button */}
                          <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !form.watch("url")}
                            className={`h-12 w-12 rounded-xl transition-all duration-300 ${
                              form.watch("url")
                                ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                                : "bg-gray-200 text-gray-400"
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-6 h-6" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Features / Hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl mt-8 md:mt-16 px-0 md:px-4"
        >
          {[
            {
              icon: Zap,
              title: "Instant Analysis",
              desc: "Turns any website into structured knowledge in seconds.",
            },
            {
              icon: Sparkles,
              title: "Smart Understanding",
              desc: "Advanced AI processes content for accurate answers.",
            },
            {
              icon: Mic,
              title: "Voice Interaction",
              desc: "Talk to your agents naturally with real-time voice mode.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative p-5 md:p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-linear-to-br from-blue-600/5 via-violet-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-600 via-violet-600 to-purple-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 transition-all duration-300 group-hover:-translate-y-1">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
