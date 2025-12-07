"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { MessageSquare, Mic, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceChat } from "./VoiceChat";

interface ChatInterfaceProps {
  scrapeId: string;
}

export function ChatInterface({ scrapeId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { scrapeId },
    }),
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="text" className="flex-1 flex flex-col">
        <div className="px-6 pt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">
              <MessageSquare className="w-4 h-4 mr-2" />
              Text Chat
            </TabsTrigger>
            <TabsTrigger value="voice">
              <Mic className="w-4 h-4 mr-2" />
              WebAgent
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="text" className="flex-1 flex flex-col min-h-0 p-6">
          <Card className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <p>Ask any question about the scraped website.</p>
                  </div>
                )}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="text-sm prose prose-sm max-w-none break-words dark:prose-invert">
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
                                .map((part: any) =>
                                  part.type === "text" ? part.text : ""
                                )
                                .join("")
                            : typeof (m as any).content === "string"
                            ? (m as any).content
                            : ""}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-red-500 text-sm p-4 border border-red-200 rounded">
                    Error: {error.message}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!input.trim()) return;

                  sendMessage({ text: input });
                  setInput("");
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="flex-1 p-6">
          <VoiceChat scrapeId={scrapeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
