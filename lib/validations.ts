import { z } from "zod";

export const urlFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
});

export type UrlFormValues = z.infer<typeof urlFormSchema>;

export const scrapeFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  crawlType: z.enum(["single", "full"], {
    message: "Please select a crawl type.",
  }),
  pageLimit: z.number().int().min(1).max(100),
});

export type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;
