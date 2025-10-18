"use client";

import { useState, useRef, useMemo } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { toast } from "sonner";
import { useAudioStream } from "@/hooks/use-audio-stream";
import { useWebSocketConnection } from "@/hooks/use-websocket-connection";
import { Heart, TrendingUp, DollarSign, Sparkles } from "lucide-react";

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

type SortOption = "relevance" | "price-low" | "price-high" | "newest";

function SinglePageUI() {
  const { user } = useUser();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const stopCaptureRef = useRef<(() => void) | null>(null);

  // Convex queries and actions
  const initiateSession = useAction(api.voiceShopper.initiateSession);
  const saveProduct = useMutation(api.preferenceItemsManagement.saveItemForPreferences);

  // Get saved items to track which products are saved
  const savedItems = useQuery(api.preferenceItemsManagement.getSavedItems, {});

  // Get research results from background research agent
  // Skip query if no sessionId to prevent unauthorized access
  const researchResults = useQuery(
    api.research.getLatestResearchResults,
    sessionId ? { sessionId } : "skip"
  );

  // Update saved product IDs when savedItems changes
  useMemo(() => {
    if (savedItems) {
      setSavedProductIds(new Set(savedItems.map(item => item.productId)));
    }
  }, [savedItems]);

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

      // Validate session result before proceeding
      if (!result.sessionId || !result.userId) {
        throw new Error("Failed to create valid session - missing sessionId or userId");
      }

      setSessionId(result.sessionId);
      setUserId(result.userId);
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

  // Handle save product
  const handleSaveProduct = async (product: any) => {
    if (!sessionId) return;

    try {
      await saveProduct({
        sessionId,
        productId: product.productUrl, // Using URL as unique ID
        productName: product.title,
        description: product.description,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        price: product.price,
      });

      setSavedProductIds(prev => new Set([...prev, product.productUrl]));
      toast.success("Product saved!");
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Failed to save product");
    }
  };

  // Sort products
  const sortedProducts = useMemo(() => {
    if (!researchResults) return [];

    const products = [...researchResults];

    switch (sortBy) {
      case "price-low":
        return products.sort((a, b) => a.price - b.price);
      case "price-high":
        return products.sort((a, b) => b.price - a.price);
      case "newest":
        return products.reverse();
      case "relevance":
      default:
        return products;
    }
  }, [researchResults, sortBy]);

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 flex flex-col items-center justify-start px-4 py-12">
      {/* Header */}
      <header className="mb-8 text-center w-full max-w-2xl">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          Hands Off Your Keyboard
        </h1>

        {/* Enhanced Status Indicator */}
        <div className="relative">
          <div className={`
            px-6 py-4 rounded-2xl border-2 transition-all duration-300
            ${agentStatus === "idle" ? "border-border/40 bg-card/30" : "border-primary/50 bg-primary/5"}
          `}>
            <div className="flex items-center justify-center gap-3">
              {/* Animated Status Icon */}
              <div className={`
                relative flex items-center justify-center
                ${agentStatus !== "idle" ? "animate-pulse-ring" : ""}
              `}>
                {agentStatus === "idle" && (
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                )}
                {agentStatus === "listening" && (
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-green-500 animate-pulse" />
                    <div className="absolute inset-0 h-6 w-6 rounded-full bg-green-500/30 animate-ping" />
                  </div>
                )}
                {agentStatus === "thinking" && (
                  <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {agentStatus === "speaking" && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-6 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}
                {agentStatus === "searching" && (
                  <TrendingUp className="h-6 w-6 text-primary animate-bounce" />
                )}
              </div>

              {/* Status Text */}
              <span className="text-lg font-medium">
                {agentStatus === "idle" && "Click the mic to start shopping"}
                {agentStatus === "listening" && "Listening..."}
                {agentStatus === "thinking" && "Processing your request..."}
                {agentStatus === "speaking" && "Getting your results..."}
                {agentStatus === "searching" && "Searching for products..."}
              </span>
            </div>

            {/* Progress Bar */}
            {agentStatus !== "idle" && (
              <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 animate-progress-indeterminate" />
              </div>
            )}
          </div>
        </div>
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
        {sortedProducts.length > 0 ? (
          <>
            {/* Header with Sort Controls */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Suggested Products</h2>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {sortedProducts.length} {sortedProducts.length === 1 ? 'result' : 'results'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 bg-card border border-border/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-fade-in">
              {sortedProducts.map((product, index) => {
                const isSaved = savedProductIds.has(product.productUrl);

                return (
                  <div
                    key={index}
                    className="group relative rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-md hover:shadow-xl transition-all overflow-hidden"
                  >
                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveProduct(product)}
                      disabled={isSaved}
                      className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-sm transition-all ${
                        isSaved
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-black/30 hover:bg-black/50 text-white'
                      }`}
                      title={isSaved ? 'Saved' : 'Save product'}
                    >
                      <Heart
                        className={`h-5 w-5 transition-all ${isSaved ? 'fill-current' : ''}`}
                      />
                    </button>

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
                        <span className="text-2xl font-bold text-primary flex items-center gap-1">
                          <DollarSign className="h-5 w-5" />
                          {product.price.toFixed(2)}
                        </span>
                        <a
                          href={product.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium inline-flex items-center gap-2"
                        >
                          View
                          <TrendingUp className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
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

