"use client";

import { motion } from "framer-motion";
import { Globe, Database, PhoneCall, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: 1,
    title: "Enter URL",
    description:
      "Simply paste your website URL. We support any public facing documentation or marketing site.",
    icon: Globe,
  },
  {
    id: 2,
    title: "Auto-Ingestion",
    description:
      "We crawl your site in real-time, processing text and structure into a vector knowledge base.",
    icon: Database,
  },
  {
    id: 3,
    title: "Connect Voice",
    description:
      "Our system instantly provisions a secure, low-latency WebSocket connection for audio streaming.",
    icon: PhoneCall,
  },
  {
    id: 4,
    title: "Start Talking",
    description:
      "Engage with your new AI agent directly in the browser. No plugins or downloads needed.",
    icon: Sparkles,
  },
];

export function HowItWorksSection() {
  const router = useRouter();

  const handleTryFree = () => {
    router.push("/playground");
  };

  return (
    <section
      id="how-it-works"
      className="py-32 bg-gradient-to-b from-slate-50/50 via-white to-white relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-violet-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center mb-20 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2 text-sm font-semibold text-violet-700 border border-violet-200/60 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simple Process</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent"
          >
            From website to WebAgent in minutes
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 leading-relaxed"
          >
            Four simple steps to transform your content into an intelligent
            WebAgent. No complex setup required.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="flex flex-col h-full group"
              >
                {/* Card */}
                <div className="relative h-full p-8 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-violet-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:via-violet-50/30 group-hover:to-purple-50/50 transition-all duration-300" />

                  <div className="relative z-10 pr-2">
                    {/* Icon and Arrow */}
                    <div className="mb-6 flex items-center justify-between">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100/80 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                        <step.icon className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                      </div>
                      
                      {/* Connector Arrow (Desktop only) */}
                      {index < steps.length - 1 && (
                        <div className="hidden lg:block">
                          <ArrowRight className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold mb-3 text-slate-900">
                      {step.title}
                    </h3>
                    
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-slate-600 text-lg mb-6">Ready to get started?</p>
          <div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all hover:scale-105 cursor-pointer"
            onClick={handleTryFree}
          >
            <span>Try it free</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
