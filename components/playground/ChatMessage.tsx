"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { User, Sparkles } from "lucide-react";
import { UIMessage } from "ai";

// Helper to check if a message has renderable text content
const hasTextContent = (m: UIMessage) => {
  // Check parts array (new UIMessage structure)
  if (m.parts) {
    return m.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0
    );
  }
  // Fallback for legacy content property
  const content = (m as any).content;
  if (content && typeof content === "string" && content.trim().length > 0) return true;
  return false;
};

// Helper to check if a message is searching using the specific tool
const isSearchingTool = (m: UIMessage) => {
  return (m as any).toolInvocations?.some(
    (tool: any) => tool.toolName === "search_knowledge_base"
  );
};

interface ChatMessageProps {
  message: UIMessage;
  index?: number;
}

export const ChatMessage = memo(({ message: m, index = 0 }: ChatMessageProps) => {
  const isMessageThinking = m.role === "assistant" && !hasTextContent(m);
  const isMessageSearching = isMessageThinking && isSearchingTool(m);

  return (
    <motion.div
      initial={
        isMessageThinking
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 10 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isMessageThinking ? 0 : index * 0.1 }}
      className={`flex mb-6 ${
        m.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex gap-4 max-w-[85%] ${
          m.role === "user" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            m.role === "user"
              ? "bg-gray-900"
              : "bg-linear-to-br from-blue-600 via-violet-600 to-purple-600 shadow-md shadow-blue-500/20"
          }`}
        >
          {m.role === "user" ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
        </div>

        <div
          className={`rounded-2xl px-5 py-3.5 leading-relaxed ${
            m.role === "user"
              ? "bg-gray-100 text-gray-900 rounded-tr-sm"
              : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm"
          }`}
        >
          {isMessageThinking ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              </div>
              {isMessageSearching && (
                <span className="text-xs text-gray-400 animate-pulse">
                  Searching knowledge base...
                </span>
              )}
            </div>
          ) : (
            <div className="text-[15px] leading-relaxed prose prose-sm max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({ children }: any) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }: any) => (
                    <ul className="list-disc pl-4 mb-2 last:mb-0">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }: any) => (
                    <ol className="list-decimal pl-4 mb-2 last:mb-0">
                      {children}
                    </ol>
                  ),
                  li: ({ children }: any) => (
                    <li className="mb-1">{children}</li>
                  ),
                  h1: ({ children }: any) => (
                    <h1 className="text-xl font-bold mb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }: any) => (
                    <h2 className="text-lg font-bold mb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }: any) => (
                    <h3 className="text-base font-bold mb-2">
                      {children}
                    </h3>
                  ),
                  blockquote: ({ children }: any) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                      {children}
                    </blockquote>
                  ),
                  code: ({
                    node,
                    inline,
                    className,
                    children,
                    ...props
                  }: any) => {
                    return inline ? (
                      <code
                        className="bg-gray-200/50 rounded px-1 py-0.5 text-sm font-mono text-pink-600"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre
                        className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto text-sm font-mono my-2"
                        {...props}
                      >
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  a: ({ children, href }: any) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {m.parts
                  ? m.parts
                      .map((part) =>
                        part.type === "text" ? part.text : ""
                      )
                      .join("")
                  : typeof (m as any).content === "string"
                  ? (m as any).content
                  : ""}
              </ReactMarkdown>
              {!m.parts &&
                typeof (m as any).content === "object" && (
                  <span className="text-red-500 text-xs">
                    [Error: Invalid message format]
                  </span>
                )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";

