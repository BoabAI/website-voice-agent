"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  Send,
  Mic,
  Loader2,
  User,
  Bot,
  MicOff,
  Sparkles,
  PhoneOff,
  AudioWaveform,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getInformationAction } from "@/app/actions/voice";
import { cn } from "@/lib/utils";
import type { ScrapeWithPages } from "@/types/scrape";
import { AgentHeader } from "./AgentHeader";
import { AudioVisualizer } from "./AudioVisualizer";
import { ensureAnonymousSession, createClientSupabase } from "@/lib/supabase";
import { getChatHistory, clearChatHistory } from "@/app/actions/chat";
import { SimpleProgressView } from "./AgentProgressView";

interface ModernChatInterfaceProps {
  scrape: ScrapeWithPages;
}

// Helper to check if a message has renderable text content
const hasTextContent = (m: any) => {
  if (m.content && m.content.trim().length > 0) return true;
  if (m.parts) {
    return m.parts.some(
      (part: any) => part.type === "text" && part.text.trim().length > 0
    );
  }
  return false;
};

// Helper to check if a message is searching using the specific tool
const isSearchingTool = (m: any) => {
  return m.toolInvocations?.some(
    (tool: any) => tool.toolName === "search_knowledge_base"
  );
};

export function ModernChatInterface({ scrape }: ModernChatInterfaceProps) {
  const router = useRouter();
  const scrapeId = scrape.id;
  const [input, setInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingPages, setRefreshingPages] = useState<
    { title?: string; url: string; id: string }[]
  >([]);
  // Removed ignoreCompletion state in favor of hasSeenProcessing
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "connecting" | "active"
  >("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [currentUserTranscript, setCurrentUserTranscript] = useState("");
  const [currentAiTranscript, setCurrentAiTranscript] = useState("");
  const [conversationState, setConversationState] = useState<
    "listening" | "speaking" | "user_speaking" | "processing"
  >("listening");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fullUserTranscriptRef = useRef("");
  const fullAiTranscriptRef = useRef("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasPriorHistory, setHasPriorHistory] = useState(false);

  // Permission handling state
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionErrorType, setPermissionErrorType] = useState<
    "denied" | "not-found" | null
  >(null);

  // Update container bounds on mount/resize for subtitle positioning
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        setContainerBounds(containerRef.current.getBoundingClientRect());
      }
    };

    // Initial update
    updateBounds();

    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [isVoiceMode]); // Re-calculate when voice mode toggles

  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ scrapeId: scrape.id }),
      headers: () => {
        const headers: Record<string, string> = {};
        if (accessTokenRef.current) {
          console.log("[Chat] Adding Authorization header to request");
          headers.Authorization = `Bearer ${accessTokenRef.current}`;
        } else {
          console.warn("[Chat] No access token available for request!");
        }
        return headers;
      },
    }),
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error("Failed to send message: " + error.message);
    },
  });

  const lastMessage = messages[messages.length - 1];
  const isLastMessageAssistant = lastMessage?.role === "assistant";

  // Logic for showing the standalone thinking indicator
  // Only show if we're waiting for a response but it hasn't been added to messages yet
  const showStandaloneThinking =
    (status === "submitted" || status === "streaming") &&
    !isLastMessageAssistant;

  // Initialize session and load history
  useEffect(() => {
    async function initSessionAndHistory() {
      try {
        console.log("[Chat] Initializing anonymous session...");
        await ensureAnonymousSession();
        const supabase = createClientSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          console.log("[Chat] Session authenticated, token received");
          setAccessToken(session.access_token);
          accessTokenRef.current = session.access_token;

          // Load history
          const history = await getChatHistory(scrapeId, session.access_token);
          if (
            history.success &&
            history.messages &&
            history.messages.length > 0
          ) {
            console.log(
              `[Chat] Loaded ${history.messages.length} messages from history`
            );
            setHasPriorHistory(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setMessages(history.messages as any);
          } else if (history.error) {
            console.error("[Chat] Failed to load history:", history.error);
          }
        } else {
          console.error(
            "[Chat] No session token received after authentication"
          );
        }
      } catch (err) {
        console.error("[Chat] Failed to init session:", err);
        toast.error("Failed to initialize chat session");
      } finally {
        setIsLoadingHistory(false);
      }
    }

    initSessionAndHistory();
  }, [scrapeId, setMessages]);

  const handleClearChat = async () => {
    if (!accessToken) return;

    try {
      const result = await clearChatHistory(scrapeId, accessToken);
      if (result.success) {
        setMessages([]);
        setHasPriorHistory(false);
        toast.success("Chat history cleared");
      } else {
        toast.error("Failed to clear history: " + result.error);
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Something went wrong");
    }
  };

  // Removed duplicate definition of showStandaloneThinking

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pendingMessage, showStandaloneThinking]);

  // Auto-focus input on mount and keep focus when switching from voice mode
  useEffect(() => {
    if (!isVoiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVoiceMode]);

  // Poll for updates when processing
  // Removed old polling logic as it is now integrated above

  // Clear pending message when it appears in messages
  useEffect(() => {
    if (!pendingMessage) return;
    const exists = messages.some((m: any) => {
      if (m.role !== "user") return false;
      if (m.content === pendingMessage) return true;
      if (m.parts) {
        return m.parts.some(
          (p: any) => p.type === "text" && p.text === pendingMessage
        );
      }
      return false;
    });

    if (exists) {
      setPendingMessage(null);
    }
  }, [messages, pendingMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      if (remoteStream.current) {
        remoteStream.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function startVoiceSession() {
    try {
      setVoiceStatus("connecting");

      const tokenResponse = await fetch(
        `/api/voice/token?scrapeId=${scrapeId}`
      );
      const data = await tokenResponse.json();

      if (!data.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      pc.ontrack = (e) => {
        if (audioEl.current) {
          audioEl.current.srcObject = e.streams[0];
          remoteStream.current = e.streams[0];
        }
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;

      dc.addEventListener("open", () => {
        setVoiceStatus("active");
        toast.success("Voice mode activated");

        const sessionUpdate = {
          type: "session.update",
          session: {
            tools: [
              {
                type: "function",
                name: "search_knowledge_base",
                description:
                  "Search the scraped website content for information.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "The search query" },
                  },
                  required: ["query"],
                },
              },
            ],
            tool_choice: "auto",
            input_audio_transcription: {
              model: "whisper-1",
            },
          },
        };
        dc.send(JSON.stringify(sessionUpdate));

        // Trigger initial greeting
        const domain = scrape.url
          ? scrape.url
              .replace(/^https?:\/\//, "")
              .replace(/^www\./, "")
              .split("/")[0]
          : "the website";

        const initialGreeting = {
          type: "response.create",
          response: {
            instructions: `Please greet the user and welcome them to ${domain}. Introduce yourself as the AI guide for this site.`,
          },
        };
        dc.send(JSON.stringify(initialGreeting));
      });

      dc.addEventListener("message", async (e) => {
        const event = JSON.parse(e.data);

        // Handle speech events for UI state
        if (event.type === "response.audio.delta") {
          setConversationState("speaking");
        } else if (event.type === "input_audio_buffer.speech_started") {
          setConversationState("user_speaking");
          setCurrentUserTranscript("");
          fullUserTranscriptRef.current = "";
          setCurrentAiTranscript(""); // Clear AI transcript when user interrupts
          fullAiTranscriptRef.current = "";
        } else if (event.type === "response.done") {
          setConversationState("listening");
        } else if (event.type === "response.create") {
          setConversationState("processing");
          setCurrentAiTranscript("");
          fullAiTranscriptRef.current = "";
        } else if (event.type === "response.audio_transcript.delta") {
          // AI Transcript Delta
          fullAiTranscriptRef.current += event.delta;
          setCurrentAiTranscript(fullAiTranscriptRef.current);
        } else if (
          event.type === "conversation.item.input_audio_transcription.completed"
        ) {
          // User Final Transcript
          if (event.transcript) {
            fullUserTranscriptRef.current = event.transcript;
            setCurrentUserTranscript(event.transcript);
          }
        } else if (event.type === "input_audio_buffer.speech_stopped") {
          // Optional: user stopped speaking, maybe show a "processing" state or just wait
        }

        if (event.type === "response.function_call_arguments.done") {
          const { name, arguments: args } = event;

          if (name === "search_knowledge_base") {
            const { query } = JSON.parse(args);
            const result = await getInformationAction(query, scrapeId);

            const toolOutput = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: result,
              },
            };
            dc.send(JSON.stringify(toolOutput));
            dc.send(JSON.stringify({ type: "response.create" }));
          }
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-realtime-mini-2025-10-06";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);
    } catch (error: any) {
      // Don't log full error for expected permission issues
      if (
        error.name !== "NotAllowedError" &&
        error.name !== "PermissionDeniedError" &&
        error.name !== "NotFoundError"
      ) {
        console.error("Failed to start voice session:", error);
      }

      // Handle microphone permission errors specifically
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        console.log("[Voice] Microphone permission denied by user");
        setPermissionErrorType("denied");
        setPermissionDenied(true);
      } else if (error.name === "NotFoundError") {
        console.log("[Voice] Microphone device not found");
        setPermissionErrorType("not-found");
        setPermissionDenied(true);
      } else {
        console.error("Failed to start voice session:", error);
        toast.error("Failed to activate voice mode");
      }

      setVoiceStatus("idle");
      setIsVoiceMode(false);
    }
  }

  function stopVoiceSession() {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clean up local stream tracks to stop the microphone
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach((track) => track.stop());
      remoteStream.current = null;
    }

    setVoiceStatus("idle");
    setIsVoiceMode(false);
    setIsMuted(false);
    setCurrentUserTranscript("");
    setCurrentAiTranscript("");
    fullUserTranscriptRef.current = "";
    fullAiTranscriptRef.current = "";
    toast.info("Voice mode deactivated");

    // Play end session sound
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // "Power down" sound effect
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        100,
        audioContext.currentTime + 0.2
      );

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.2
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.error("Failed to play end sound", e);
    }
  }

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleVoiceToggle = () => {
    if (isVoiceMode) {
      stopVoiceSession();
    } else {
      setIsVoiceMode(true);
      startVoiceSession();
    }
  };

  const [hasSeenProcessing, setHasSeenProcessing] = useState(false);

  const handleRefresh = async (
    promise: Promise<any>,
    selectedPages: { title?: string; url: string; id: string }[]
  ) => {
    setIsRefreshing(true);
    setRefreshingPages(selectedPages);
    setHasSeenProcessing(false); // Reset tracking

    // Refresh router to fetch updated status
    router.refresh();

    try {
      await promise;
    } finally {
      // Don't clear refreshing state here.
    }
  };

  // Poll for updates when processing or refreshing
  useEffect(() => {
    if (
      isRefreshing ||
      scrape.status === "processing" ||
      scrape.status === "pending"
    ) {
      const interval = setInterval(() => {
        router.refresh();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [scrape.status, router, isRefreshing]);

  // Handle status transitions
  useEffect(() => {
    // 1. Detect if we have entered the processing state
    if (scrape.status === "processing" || scrape.status === "pending") {
      setHasSeenProcessing(true);
    }

    // 2. Only clear refreshing if we are completed AND we have previously confirmed
    //    that the server acknowledged the processing state.
    //    This ensures we don't clear on the initial "stale" completed state.
    if (scrape.status === "completed" && isRefreshing && hasSeenProcessing) {
      setIsRefreshing(false);
      setRefreshingPages([]);
      setHasSeenProcessing(false);
    }
  }, [scrape.status, isRefreshing, hasSeenProcessing]);

  // Check if we should show the progress view based on scrape status or manual refresh state
  const shouldShowProgress =
    isRefreshing ||
    (scrape.status !== "completed" && scrape.status !== "failed");

  const isRefreshOperation =
    isRefreshing || (scrape.metadata as any)?.operation_mode === "refresh";

  // Get recently processed pages for the progress view (only for initial agent creation)
  const recentPages = [...(scrape.scraped_pages || [])]
    .sort((a, b) => {
      // Use updated_at if available (for refreshed pages), otherwise created_at
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  if (shouldShowProgress) {
    return (
      <SimpleProgressView
        domain={new URL(scrape.url).hostname}
        currentUrl={
          (scrape.metadata as any)?.current_processing_url || scrape.url
        }
        status={scrape.status || "processing"}
        step={scrape.current_step || "processing_pages"}
        pagesProcessed={scrape.pages_scraped || 0}
        recentPages={recentPages}
        refreshingPages={
          refreshingPages.length > 0 ? refreshingPages : undefined
        }
        isRefreshOperation={isRefreshOperation}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <AgentHeader
        scrape={scrape}
        onClearChat={handleClearChat}
        onRefreshStart={handleRefresh}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth flex flex-col">
        {/* ... Rest of chat UI ... */}
        <div
          className={`max-w-3xl mx-auto w-full flex-1 ${
            messages.length === 0 &&
            !pendingMessage &&
            !isVoiceMode &&
            !isLoadingHistory &&
            !hasPriorHistory
              ? "flex flex-col justify-center"
              : ""
          } pb-24`}
        >
          {(isLoadingHistory || (hasPriorHistory && messages.length === 0)) &&
          !isVoiceMode ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            messages.length === 0 &&
            !pendingMessage &&
            !isVoiceMode &&
            !hasPriorHistory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Agent Ready
                  </h3>
                  <p className="text-gray-500 max-w-md">
                    I&apos;ve analyzed the website. You can now ask questions
                    about its content or{" "}
                    <button
                      onClick={handleVoiceToggle}
                      className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      switch to voice mode
                    </button>{" "}
                    for a conversation.
                  </p>
                </div>
              </motion.div>
            )
          )}

          {isVoiceMode && (
            <div
              ref={containerRef}
              className="flex-1 flex flex-col items-center justify-center h-full w-full relative overflow-hidden"
            >
              {/* Visualizer - Main Content */}
              <div className="w-full flex-1 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                {voiceStatus === "connecting" ? (
                  <div className="flex flex-col items-center justify-center gap-6">
                    <div className="relative flex items-center justify-center">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-16 h-16 border border-blue-500/30 rounded-full bg-blue-500/5 animate-ripple opacity-0"
                          style={{
                            animationDelay: `${i * 0.6}s`,
                          }}
                        />
                      ))}
                      <motion.div
                        className="w-16 h-16 bg-linear-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 z-10"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <AudioWaveform className="w-8 h-8 text-white" />
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full px-4 flex items-center justify-center">
                    <AudioVisualizer
                      stream={
                        conversationState === "speaking"
                          ? remoteStream.current
                          : localStream.current
                      }
                      isActive={voiceStatus === "active"}
                      mode={conversationState}
                    />
                  </div>
                )}
              </div>

              {/* Draggable Subtitles - Rendered via Portal */}
              {typeof window !== "undefined" &&
                containerBounds &&
                createPortal(
                  <motion.div
                    drag
                    dragMomentum={false}
                    whileDrag={{ scale: 1.05, cursor: "grabbing" }}
                    className="fixed z-9999 flex flex-col items-center justify-center gap-2 cursor-grab touch-none"
                    // Calculate initial position based on the container's center
                    initial={{
                      x: "-50%",
                      y: 0,
                      left: containerBounds.left + containerBounds.width / 2,
                      top: containerBounds.top + containerBounds.height * 0.55,
                    }}
                    style={{ position: "fixed" }}
                  >
                    <AnimatePresence mode="wait">
                      {currentAiTranscript && (
                        <motion.div
                          key="ai-transcript"
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="bg-black/40 backdrop-blur-md text-white px-6 py-4 rounded-3xl text-lg font-medium text-center max-w-xl shadow-2xl border border-white/10 leading-relaxed select-none pointer-events-auto"
                        >
                          {currentAiTranscript}
                        </motion.div>
                      )}
                      {currentUserTranscript && !currentAiTranscript && (
                        <motion.div
                          key="user-transcript"
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="bg-blue-600/40 backdrop-blur-md text-white px-6 py-4 rounded-3xl text-lg font-medium text-center max-w-xl shadow-2xl border border-white/10 leading-relaxed select-none pointer-events-auto"
                        >
                          {currentUserTranscript}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>,
                  document.body
                )}

              {/* Status Text & Controls */}
              <div className="flex-none pb-12 pt-2 text-center space-y-6 z-10">
                <div className="space-y-2 min-h-12">
                  <p
                    className={cn(
                      "text-lg font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                      voiceStatus === "connecting"
                        ? "text-gray-400 animate-pulse"
                        : "text-gray-600"
                    )}
                  >
                    {voiceStatus === "active"
                      ? isMuted
                        ? "Microphone muted"
                        : conversationState === "speaking"
                        ? "Tap to interrupt"
                        : conversationState === "user_speaking"
                        ? "Listening..."
                        : conversationState === "processing"
                        ? "Thinking..."
                        : "Go ahead, I'm listening"
                      : "Connecting..."}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={toggleMute}
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-14 w-14 rounded-full border-2 transition-all duration-300",
                      isMuted
                        ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                  >
                    {isMuted ? (
                      <MicOff className="w-6 h-6" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                  </Button>

                  <Button
                    onClick={stopVoiceSession}
                    variant="destructive"
                    size="lg"
                    className="h-14 px-8 rounded-full shadow-lg shadow-red-500/20 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 font-medium bg-red-500 hover:bg-red-600"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>End Session</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isVoiceMode &&
            messages.map((m, index) => {
              const isMessageThinking =
                m.role === "assistant" && !hasTextContent(m);
              const isMessageSearching =
                isMessageThinking && isSearchingTool(m);

              return (
                <motion.div
                  key={m.id}
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
                                  .map((part: any) =>
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
            })}

          {/* Pending Message */}
          {pendingMessage && !isVoiceMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex mb-6 justify-end"
            >
              <div className="flex gap-4 max-w-[85%] flex-row-reverse">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-900">
                  <User className="w-4 h-4 text-white" />
                </div>

                <div className="rounded-2xl px-5 py-3.5 leading-relaxed bg-gray-100 text-gray-900 rounded-tr-sm">
                  <div className="text-[15px] whitespace-pre-wrap">
                    {pendingMessage}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {showStandaloneThinking && !isVoiceMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start mb-6"
            >
              <div className="flex gap-4 max-w-[85%] flex-row">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-linear-to-br from-blue-600 via-violet-600 to-purple-600 shadow-md shadow-blue-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl px-5 py-3.5 leading-relaxed bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="mx-auto max-w-md text-red-600 text-sm p-4 bg-red-50 border border-red-100 rounded-xl text-center my-4">
              Error: {error.message}
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-linear-to-t from-white via-white to-transparent z-10">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log(
                "[Chat] Form submit - accessToken present:",
                !!accessToken,
                "accessTokenRef:",
                !!accessTokenRef.current,
                "input:",
                input
              );
              if (
                !input.trim() ||
                isVoiceMode ||
                showStandaloneThinking ||
                !accessToken
              )
                return;
              setPendingMessage(input);
              sendMessage({ text: input }); // AI SDK expects text property
              setInput("");
              // Keep focus on input after sending message
              inputRef.current?.focus();
            }}
            className="relative group"
          >
            <div
              className={cn(
                "relative flex items-center bg-[#F0F4F9] rounded-full transition-all duration-300",
                "hover:shadow-md focus-within:shadow-lg focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-200"
              )}
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  !accessToken
                    ? "Initializing..."
                    : isVoiceMode
                    ? "Voice mode active..."
                    : "Ask a question about the website..."
                }
                disabled={isVoiceMode || !accessToken}
                className="h-14 pl-6 pr-32 border-none bg-transparent focus-visible:ring-0 text-base shadow-none"
              />

              <div className="absolute right-2 flex items-center gap-2">
                {/* Voice Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={handleVoiceToggle}
                      variant="ghost"
                      size="icon"
                      disabled={voiceStatus === "connecting"}
                      className={cn(
                        "h-10 w-10 rounded-full transition-all hover:bg-gray-200/50",
                        isVoiceMode
                          ? "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
                          : "text-gray-500"
                      )}
                    >
                      {voiceStatus === "connecting" ? (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <AudioWaveform className="w-5 h-5" />
                        </motion.div>
                      ) : isVoiceMode ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <AudioWaveform className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isVoiceMode ? "End Voice" : "Voice mode"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={
                    showStandaloneThinking ||
                    !input.trim() ||
                    isVoiceMode ||
                    !accessToken
                  }
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full transition-all",
                    input.trim()
                      ? "bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white shadow-md shadow-blue-500/20"
                      : "bg-transparent text-gray-300 hover:bg-transparent cursor-default"
                  )}
                >
                  {accessToken ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-center mt-3 text-xs text-gray-400">
              {isVoiceMode
                ? "Microphone is active"
                : "Agent can make mistakes, so double-check it"}
            </div>
          </form>
        </div>
      </div>

      <audio ref={audioEl} autoPlay className="hidden" />

      {/* Permission Denied Dialog */}
      <Dialog open={permissionDenied} onOpenChange={setPermissionDenied}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {permissionErrorType === "denied"
                ? "Microphone Access Blocked"
                : "Microphone Not Found"}
            </DialogTitle>
            <DialogDescription asChild className="space-y-4 pt-4">
              <div className="text-muted-foreground text-sm">
                {permissionErrorType === "denied" ? (
                  <div className="flex flex-col gap-2">
                    <p>
                      Your browser is blocking microphone access. To use voice
                      mode, please enable it:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        Click the 🔒 <strong>lock icon</strong> in your address
                        bar.
                      </li>
                      <li>
                        Find <strong>Microphone</strong> in the list.
                      </li>
                      <li>
                        Toggle the switch to <strong>On</strong> or select{" "}
                        <strong>Allow</strong>.
                      </li>
                      <li>Refresh the page to apply changes.</li>
                    </ol>
                  </div>
                ) : (
                  <p>
                    No microphone was detected on your system. Please check your
                    system settings and ensure a microphone is connected.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setPermissionDenied(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
