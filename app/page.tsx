"use client";

import { useState, useRef } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { toast } from "sonner";
import { useAudioStream } from "@/hooks/use-audio-stream";
import { useWebSocketConnection } from "@/hooks/use-websocket-connection";

export default function Home() {
  return (
    <>
      <Authenticated>
        <SinglePageUI />
      </Authenticated>
      <Unauthenticated>
        <SignInView />
      </Unauthenticated>
    </>
  );
}

type AgentStatus = "idle" | "listening" | "thinking" | "speaking" | "searching";

function SinglePageUI() {
  const { user } = useUser();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const stopCaptureRef = useRef<(() => void) | null>(null);

  // Convex queries and actions
  const initiateSession = useAction(api.voiceShopper.initiateSession);

  // Get research results from background research agent
  const researchResults = useQuery(
    api.research.getLatestResearchResults,
    sessionId ? { sessionId } : {}
  );

  // Audio streaming hooks
  const { startCapture, stopCapture, playAudio, stopAudio, initAudioContext } = useAudioStream();

  // WebSocket connection configuration
  const VOICE_AGENT_URL = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "ws://localhost:8000";
  const [userId, setUserId] = useState<string | null>(null);

  // WebSocket connection
  const { connect, disconnect, sendAudio, isConnected } = useWebSocketConnection({
    url: sessionId && userId
      ? `${VOICE_AGENT_URL}?sessionId=${sessionId}&userId=${userId}`
      : VOICE_AGENT_URL,
    onOpen: () => {
      console.log("Connected to voice agent");
      toast.success("Voice agent connected!");
      setAgentStatus("listening");
    },
    onClose: () => {
      console.log("Disconnected from voice agent");
      setAgentStatus("idle");
    },
    onError: () => {
      if (isActive) {
        toast.error("Voice connection lost", {
          description: "Check that the voice agent is running.",
          duration: 5000,
        });
      }
      setAgentStatus("idle");
    },
    onMessage: (message) => {
      if (message.type === "status") {
        if (message.data.status === "thinking") setAgentStatus("thinking");
        else if (message.data.status === "speaking") setAgentStatus("speaking");
        else if (message.data.status === "listening") setAgentStatus("listening");
        else if (message.data.status === "searching") setAgentStatus("searching");
      } else if (message.type === "function_call") {
        if (message.data.function === "search_products") {
          toast.info("Searching for products...");
        }
      }
    },
    onAudioData: async (audioData) => {
      try {
        await playAudio(audioData);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    },
  });

  // Handle session start
  const onSessionStart = async () => {
    try {
      setIsConnecting(true);
      setAgentStatus("thinking");

      initAudioContext();

      const result = await initiateSession({});
      setSessionId(result.sessionId);
      setUserId(result.userId || user?.id || "anonymous");
      setIsActive(true);

      toast.success("Listening... Tell me what you're looking for!");

      connect();

      const cleanup = await startCapture((audioData) => {
        if (isConnected) {
          sendAudio(audioData);
        }
      });

      stopCaptureRef.current = cleanup;
    } catch (error) {
      console.error("Failed to start session:", error);
      setIsActive(false);
      setAgentStatus("idle");
      disconnect();

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("microphone") || errorMessage.includes("getUserMedia")) {
        toast.error("Microphone access denied", {
          description: "Please allow microphone access in your browser settings.",
          duration: 6000,
        });
      } else {
        toast.error("Failed to start voice session", {
          description: "Make sure your microphone is connected and the voice agent server is running.",
          duration: 6000,
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle session end
  const onSessionEnd = async () => {
    try {
      setAgentStatus("idle");

      if (stopCaptureRef.current) {
        stopCaptureRef.current();
        stopCaptureRef.current = null;
      }
      stopCapture();
      stopAudio();

      disconnect();

      setIsActive(false);
      setSessionId(null);

      toast.success("Voice session ended");
    } catch (error) {
      console.error("Failed to end session:", error);
      toast.error("Failed to end session");
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 flex flex-col items-center justify-start px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
          Hands Off Your Keyboard
        </h1>
        <p className="text-lg text-muted-foreground">
          {agentStatus === "idle" && "Click the mic to start shopping"}
          {agentStatus === "listening" && "Listening..."}
          {agentStatus === "thinking" && "Processing your request..."}
          {agentStatus === "speaking" && "Getting your results..."}
          {agentStatus === "searching" && "Searching for products..."}
        </p>
      </header>

      {/* Microphone Button */}
      <div className="mb-16">
        <VoiceInputButton
          onSessionStart={onSessionStart}
          onSessionEnd={onSessionEnd}
          isConnecting={isConnecting}
          isActive={isActive}
        />
      </div>

      {/* Product Grid */}
      <div className="w-full max-w-7xl">
        {researchResults && researchResults.length > 0 ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center">Suggested Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {researchResults.map((product, index) => (
                <div
                  key={index}
                  className="group relative rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-md hover:shadow-xl transition-all overflow-hidden"
                >
                  {/* Product Image */}
                  {product.imageUrl && (
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        ${product.price.toFixed(2)}
                      </span>
                      <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-6">
              <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">No products yet</h3>
            <p className="text-muted-foreground text-lg">
              Start a voice session to get AI-powered product recommendations!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function SignInView() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8 animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-6 animate-float">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="stagger-fade-in space-y-4 mb-8">
          <h1 className="text-5xl font-mona-heading text-gradient-primary">Welcome to VIBED</h1>
          <p className="text-muted-foreground text-lg">Your AI-powered shopping assistant</p>
        </div>
        <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
          <SignInButton mode="modal">
            <button className="w-full px-6 py-3.5 gradient-primary text-white rounded-xl font-semibold hover-lift button-press">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="w-full px-6 py-3.5 border-2 border-border rounded-xl hover:bg-card/50 transition-all-smooth button-press hover-lift">
              Create Account
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

