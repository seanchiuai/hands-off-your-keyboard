"use client";

import { useState, useEffect, useRef } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { VoiceAgentDisplay } from "@/components/VoiceAgentDisplay";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ConversationMessage {
  speaker: "user" | "agent" | "system";
  text: string;
  timestamp: number;
}

interface Product {
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
  productId?: string;
}

type AgentStatus = "idle" | "listening" | "thinking" | "speaking" | "searching";

function SinglePageUI() {
  const { user } = useUser();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { speaker: "system", text: "Welcome! Tap the mic to start shopping.", timestamp: Date.now() },
  ]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const stopCaptureRef = useRef<(() => void) | null>(null);

  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hoyk:pinned") || "[]"); } catch { return []; }
  });
  const [recent] = useState<string[]>(["Wireless headphones under $150","OLED monitor 27\"","Waterproof hiking shoes"]);

  // Convex mutations and queries
  const initiateSession = useAction(api.voiceShopper.initiateSession);
  const endSession = useMutation(api.voiceShopper.endSession);
  const saveShoppingItem = useMutation(api.voiceShopper.saveShoppingItem);
  const shoppingHistory = useQuery(api.voiceShopper.getShoppingHistory, { limit: 20 });

  // Get session items from Convex
  const sessionItems = useQuery(
    api.voiceShopper.getSessionItems,
    sessionId ? { sessionId } : "skip"
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
      if (message.type === "text") {
        setMessages((prev) => [
          ...prev,
          {
            speaker: "agent",
            text: message.data.text,
            timestamp: Date.now(),
          },
        ]);
      } else if (message.type === "status") {
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

      setMessages([
        {
          speaker: "agent",
          text: "Hi! I'm your voice shopping assistant. Tell me what you're looking for!",
          timestamp: Date.now(),
        },
      ]);

      toast.success("Voice session started!");

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
    if (!sessionId) return;

    try {
      setAgentStatus("idle");

      if (stopCaptureRef.current) {
        stopCaptureRef.current();
        stopCaptureRef.current = null;
      }
      stopCapture();
      stopAudio();

      disconnect();

      await endSession({ sessionId });
      setIsActive(false);
      setSessionId(null);

      setMessages((prev) => [
        ...prev,
        {
          speaker: "system",
          text: "Session ended",
          timestamp: Date.now(),
        },
      ]);

      toast.success("Voice session ended");
    } catch (error) {
      console.error("Failed to end session:", error);
      toast.error("Failed to end session");
    }
  };

  const togglePin = (text: string) => {
    setPinned((prev) => {
      const exists = prev.includes(text);
      const next = exists ? prev.filter((t) => t !== text) : [text, ...prev].slice(0, 6);
      try { localStorage.setItem("hoyk:pinned", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Handle product save
  const handleSaveProduct = async (productId: string) => {
    if (!sessionId) {
      toast.error("No active session");
      return;
    }

    const product = currentProducts.find((p) => p.productId === productId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    try {
      await saveShoppingItem({
        sessionId,
        productId: product.productId || `product_${Date.now()}`,
        productName: product.title,
        description: product.description,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        price: product.price,
      });

      toast.success(`Saved ${product.title}`);
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Failed to save product");
    }
  };

  // Update products when session items change
  useEffect(() => {
    if (sessionItems && sessionItems.length > 0) {
      const products: Product[] = sessionItems.map((item) => ({
        productId: item.productId,
        title: item.productName,
        description: item.description || "",
        price: item.price || 0,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl || "",
      }));

      setCurrentProducts(products);
    }
  }, [sessionItems]);

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-[1800px] p-4 lg:p-8">
        {/* Header */}
        <header className="mb-8 text-center lg:text-left">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Hands Off Your Keyboard
          </h1>
          <p className="text-muted-foreground">Voice-first shopping assistant powered by AI</p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr]">
          {/* Left: Agent panel */}
          <div className="flex h-[calc(100vh-200px)] min-h-[500px] max-h-[800px] flex-col gap-6">
            <VoiceAgentDisplay
              messages={messages}
              agentStatus={agentStatus}
              className="flex-1 shadow-lg"
            />
            <div className="flex items-center justify-center pb-4">
              <VoiceInputButton
                onSessionStart={onSessionStart}
                onSessionEnd={onSessionEnd}
                isConnecting={isConnecting}
                isActive={isActive}
              />
            </div>
          </div>

          {/* Right: Main workspace */}
          <section className="flex min-h-[calc(100vh-200px)] max-h-[800px] flex-col rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
            {/* Pinned queries bar */}
            {pinned.length > 0 && (
              <div className="border-b border-border/60 bg-muted/30 px-6 py-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Pinned:
                  </span>
                  {pinned.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePin(p)}
                      className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-medium hover:bg-blue-600/20 transition-colors whitespace-nowrap border border-blue-600/20"
                    >
                      {p} ×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Status indicator */}
              <div className="mb-6 rounded-xl border border-border/60 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-3 w-3 rounded-full ${
                    agentStatus === "idle" ? "bg-green-500" :
                    agentStatus === "listening" ? "bg-blue-500 animate-pulse" :
                    agentStatus === "thinking" || agentStatus === "searching" ? "bg-yellow-500 animate-pulse" :
                    "bg-purple-500 animate-pulse"
                  }`} />
                  <h3 className="text-lg font-semibold">
                    {agentStatus === "idle" && "Ready to assist"}
                    {agentStatus === "listening" && "Listening to your request..."}
                    {agentStatus === "thinking" && "Processing your request..."}
                    {agentStatus === "speaking" && "Responding..."}
                    {agentStatus === "searching" && "Searching for products..."}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {agentStatus === "idle" && "Click the microphone to start a voice search"}
                  {agentStatus === "listening" && "Speak naturally about what you're looking for"}
                  {agentStatus === "thinking" && "Understanding your needs and planning the search"}
                  {agentStatus === "speaking" && "Confirming your request"}
                  {agentStatus === "searching" && "Finding the best products across multiple retailers"}
                </p>
              </div>

              {/* Quick actions */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">Quick Start</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recent.map((query) => (
                    <button
                      key={query}
                      onClick={() => togglePin(query)}
                      className="group text-left p-4 rounded-lg border border-border/60 hover:border-blue-600/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all"
                    >
                      <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                        {query}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to pin this search
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Results with Tabs */}
              <Tabs defaultValue="current" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="current">Current Results</TabsTrigger>
                  <TabsTrigger value="saved">Saved Items</TabsTrigger>
                </TabsList>

                <TabsContent value="current" className="space-y-4">
                  {currentProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentProducts.map((product) => (
                        <ProductCard
                          key={product.productId}
                          product={{
                            _id: product.productId || "",
                            title: product.title,
                            description: product.description,
                            price: product.price,
                            currency: "USD",
                            imageUrl: product.imageUrl,
                            productUrl: product.productUrl,
                            availability: true,
                            source: "voice-search",
                            systemRank: 1,
                          }}
                          onSave={handleSaveProduct}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                      <div className="mx-auto max-w-md space-y-3">
                        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold">No products yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Start a voice session and tell me what you&apos;re looking for!
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="saved" className="space-y-4">
                  {shoppingHistory && shoppingHistory.length > 0 ? (
                    <div className="space-y-4">
                      {shoppingHistory.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.productName}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            {item.price && (
                              <p className="text-lg font-bold text-primary mt-2">
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {item.productUrl && (
                            <a
                              href={item.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                      <div className="mx-auto max-w-md space-y-3">
                        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold">No saved items</h3>
                        <p className="text-sm text-muted-foreground">
                          Save products during a voice session to see them here!
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </div>
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

