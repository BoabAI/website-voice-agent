"use client";

import { motion } from "framer-motion";
import { Zap, Mic, Clock, Globe, Shield, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Instant Ingestion",
    description:
      "Paste your URL and our engine crawls your site in seconds, building a comprehensive knowledge base.",
    icon: Zap,
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    title: "Natural Voice AI",
    description:
      "Our agents speak naturally with ultra-low latency for human-like conversations.",
    icon: Mic,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Real-time Responses",
    description:
      "No awkward pauses. Our optimized pipeline ensures your agent responds instantly to user queries.",
    icon: Clock,
    color: "bg-green-500/10 text-green-500",
  },
  {
    title: "Global Reach",
    description:
      "Deploy a WebAgent that's accessible from anywhere via the browser, supporting multiple languages instantly.",
    icon: Globe,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Enterprise Security",
    description:
      "Your data is encrypted and secure. We prioritize privacy and compliance for all voice interactions.",
    icon: Shield,
    color: "bg-red-500/10 text-red-500",
  },
  {
    title: "Deep Analytics",
    description:
      "Gain insights from every conversation with detailed transcripts, sentiment analysis, and usage metrics.",
    icon: BarChart,
    color: "bg-cyan-500/10 text-cyan-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 bg-white relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-2 text-sm font-semibold text-blue-700 border border-blue-200/60 mb-6"
          >
            <Zap className="w-4 h-4" />
            <span>Powerful Features</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900"
          >
            Everything you need to build amazing WebAgents
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 leading-relaxed"
          >
            From instant ingestion to real-time voice, we've built the complete
            platform for modern AI agents.
          </motion.p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={item}>
              <div className="group relative h-full p-8 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300/60 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                {/* Gradient hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-violet-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110",
                      feature.color
                    )}
                  >
                    <feature.icon className="h-7 w-7" />
                  </div>

                  <h3 className="text-xl font-semibold mb-3 text-slate-900 group-hover:text-blue-700 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
