"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getInformationAction } from "@/app/actions/voice";

interface VoiceChatProps {
  scrapeId: string;
}

export function VoiceChat({ scrapeId }: VoiceChatProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "connecting" | "listening" | "speaking"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  async function startSession() {
    try {
      setStatus("connecting");
      setErrorMessage(null);

      // 1. Get an ephemeral token from our server
      const tokenResponse = await fetch(
        `/api/voice/token?scrapeId=${scrapeId}`
      );
      const data = await tokenResponse.json();

      if (!data.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;

      // 2. Create a PeerConnection
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      // Play remote audio
      pc.ontrack = (e) => {
        if (audioEl.current) {
          audioEl.current.srcObject = e.streams[0];
        }
      };

      // Add local audio (microphone)
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);

      // Data Channel for events (tools, text updates)
      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;

      dc.addEventListener("open", () => {
        setIsSessionActive(true);
        setStatus("speaking"); // Assuming agent speaks first

        // Configure the session with our tool
        const sessionUpdate = {
          type: "session.update",
          session: {
            tools: [
              {
                type: "function",
                name: "search_knowledge_base",
                description:
                  "Search the scraped website content for information to answer user questions.",
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
          },
        };
        dc.send(JSON.stringify(sessionUpdate));

        // Trigger initial greeting
        const initialGreeting = {
          type: "response.create",
          response: {
            instructions:
              "Please greet the user and welcome them to the website you represent. Introduce yourself as its AI assistant.",
          },
        };
        dc.send(JSON.stringify(initialGreeting));
      });

      dc.addEventListener("message", async (e) => {
        const event = JSON.parse(e.data);

        // Listen for speech start/end events from OpenAI to update UI state
        if (event.type === "response.audio.delta") {
          setStatus("speaking");
        } else if (event.type === "input_audio_buffer.speech_started") {
          setStatus("listening");
        } else if (event.type === "response.done") {
          // Optional: Reset to listening after response, though VAD usually handles this
          setStatus("listening");
        }

        // Handle Function Calling
        if (event.type === "response.function_call_arguments.done") {
          const { name, arguments: args } = event;

          if (name === "search_knowledge_base") {
            const { query } = JSON.parse(args);

            // Call our Server Action (The "Brain")
            const result = await getInformationAction(query, scrapeId);

            // Send the result back to OpenAI
            const toolOutput = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: result,
              },
            };
            dc.send(JSON.stringify(toolOutput));

            // Tell OpenAI to generate a response now
            dc.send(JSON.stringify({ type: "response.create" }));
          }
        }
      });

      // 3. Create and set Local Description (Offer)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4. Send Offer to OpenAI and get Answer
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
    } catch (error) {
      console.error("Failed to start session:", error);
      setErrorMessage("Failed to connect to voice agent.");
      setStatus("idle");
    }
  }

  function stopSession() {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setIsSessionActive(false);
    setStatus("idle");
  }

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md mx-auto">
      <Card className="flex-1 p-6 flex flex-col items-center justify-between bg-gradient-to-b from-background to-secondary/20 border-2">
        <div className="text-center space-y-2 mt-8">
          <h3 className="text-2xl font-bold tracking-tight">WebAgent</h3>
          <p className="text-muted-foreground text-sm">
            {isSessionActive
              ? "Conversation in progress"
              : "Start a voice conversation with the website expert"}
          </p>
        </div>

        <div className="relative flex items-center justify-center w-full flex-1">
          {/* Visualizer Circle */}
          <div
            className={`
              relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700
              ${
                status === "listening"
                  ? "scale-110 shadow-[0_0_60px_-10px_rgba(34,197,94,0.3)] border-4 border-green-500/20 bg-green-50/50 dark:bg-green-950/20"
                  : ""
              }
              ${
                status === "speaking"
                  ? "scale-110 shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)] border-4 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                  : ""
              }
              ${
                status === "connecting"
                  ? "scale-95 animate-pulse border-4 border-muted"
                  : ""
              }
              ${
                status === "idle"
                  ? "scale-100 border-4 border-muted bg-muted/20"
                  : ""
              }
            `}
          >
            {/* Inner Pulse Circles */}
            {isSessionActive && (
              <>
                <div
                  className={`absolute inset-0 rounded-full border border-current opacity-20 animate-[ping_2s_ease-in-out_infinite] ${
                    status === "listening" ? "text-green-500" : "text-blue-500"
                  }`}
                />
                <div
                  className={`absolute inset-4 rounded-full border border-current opacity-20 animate-[ping_2s_ease-in-out_infinite_200ms] ${
                    status === "listening" ? "text-green-500" : "text-blue-500"
                  }`}
                />
              </>
            )}

            {/* Central Icon/State */}
            <div className="z-10 flex flex-col items-center justify-center">
              {status === "connecting" ? (
                <Loader2 className="w-16 h-16 animate-spin text-muted-foreground" />
              ) : status === "speaking" ? (
                <div className="flex gap-1 h-8 items-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite]"
                      style={{ animationDelay: `${i * 0.1}s`, height: "60%" }}
                    />
                  ))}
                </div>
              ) : status === "listening" ? (
                <Mic className="w-16 h-16 text-green-500 animate-pulse" />
              ) : (
                <Mic className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Status Label */}
          <div className="absolute bottom-10 font-medium text-lg transition-colors duration-300">
            {status === "connecting" && (
              <span className="text-muted-foreground">Connecting...</span>
            )}
            {status === "listening" && (
              <span className="text-green-600 dark:text-green-400">
                Listening...
              </span>
            )}
            {status === "speaking" && (
              <span className="text-blue-600 dark:text-blue-400">
                Speaking...
              </span>
            )}
            {status === "idle" && (
              <span className="text-muted-foreground">Ready to start</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full mb-8">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium text-center w-full">
              {errorMessage}
            </div>
          )}

          {!isSessionActive ? (
            <Button
              size="lg"
              className="w-full max-w-xs h-12 text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 rounded-full"
              onClick={startSession}
              disabled={status === "connecting"}
            >
              {status === "connecting" ? "Connecting..." : "Start Conversation"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              className="w-full max-w-xs h-12 text-lg rounded-full shadow-md hover:bg-destructive/90"
              onClick={stopSession}
            >
              <MicOff className="mr-2 h-5 w-5" />
              End Session
            </Button>
          )}
        </div>
      </Card>
      <audio ref={audioEl} autoPlay />
    </div>
  );
}
