"use client";

import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { VoiceAgentDisplay } from "@/components/VoiceAgentDisplay";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAudioStream } from "@/hooks/use-audio-stream";
import { useWebSocketConnection } from "@/hooks/use-websocket-connection";

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

export default function VoiceShopperPage() {
  const { user } = useUser();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const stopCaptureRef = useRef<(() => void) | null>(null);

  // Convex mutations and queries
  const initiateSession = useAction(api.voiceShopper.initiateSession);
  const endSession = useMutation(api.voiceShopper.endSession);
  const saveShoppingItem = useMutation(api.voiceShopper.saveShoppingItem);
  const shoppingHistory = useQuery(api.voiceShopper.getShoppingHistory, { limit: 20 });

  // Get actual session items from Convex
  const sessionItems = useQuery(
    api.voiceShopper.getSessionItems,
    sessionId ? { sessionId } : "skip"
  );

  // Audio streaming hooks
  const { startCapture, stopCapture, playAudio, stopAudio, initAudioContext } = useAudioStream();

  // WebSocket connection configuration
  const VOICE_AGENT_URL = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "ws://localhost:8000";
  
  // Get user ID for WebSocket connection
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
      // Only show error if we were previously connected (connection lost)
      // Don't spam errors if we never connected in the first place
      if (isActive) {
        toast.error("Voice connection lost", {
          description: "Check that the voice agent is running. See TESTING_GUIDE.md for setup instructions.",
          duration: 5000,
        });
      }
      setAgentStatus("idle");
    },
    onMessage: (message) => {
      // Handle JSON messages from voice agent
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
        // Update agent status
        if (message.data.status === "thinking") {
          setAgentStatus("thinking");
        } else if (message.data.status === "speaking") {
          setAgentStatus("speaking");
        } else if (message.data.status === "listening") {
          setAgentStatus("listening");
        } else if (message.data.status === "searching") {
          setAgentStatus("searching");
        }
      } else if (message.type === "function_call") {
        // Handle function call results
        if (message.data.function === "search_products") {
          toast.info("Searching for products...");
        }
      }
    },
    onAudioData: async (audioData) => {
      // Play received audio from agent
      try {
        await playAudio(audioData);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    },
  });

  // Handle session start
  const handleSessionStart = async () => {
    try {
      setIsConnecting(true);
      setAgentStatus("thinking");

      // Initialize audio context (requires user interaction)
      initAudioContext();

      // Initiate session via Convex
      const result = await initiateSession({});

      setSessionId(result.sessionId);
      setUserId(result.userId || user?.id || "anonymous");
      setIsActive(true);

      // Add welcome message
      setMessages([
        {
          speaker: "agent",
          text: "Hi! I'm your voice shopping assistant. Tell me what you're looking for, and I'll help you find it!",
          timestamp: Date.now(),
        },
      ]);

      toast.success("Voice session started!");

      // Connect to WebSocket server
      connect();

      // Start capturing audio from microphone
      const cleanup = await startCapture((audioData) => {
        // Send audio data to voice agent via WebSocket
        if (isConnected) {
          sendAudio(audioData);
        }
      });

      stopCaptureRef.current = cleanup;
    } catch (error) {
      console.error("Failed to start session:", error);

      // Cleanup on error
      setIsActive(false);
      setAgentStatus("idle");
      disconnect();

      // Show appropriate error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("microphone") || errorMessage.includes("getUserMedia")) {
        toast.error("Microphone access denied", {
          description: "Please allow microphone access in your browser settings and try again.",
          duration: 6000,
        });
      } else {
        toast.error("Failed to start voice session", {
          description: "Make sure your microphone is connected and the voice agent server is running at " + VOICE_AGENT_URL,
          duration: 6000,
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle session end
  const handleSessionEnd = async () => {
    if (!sessionId) return;

    try {
      setAgentStatus("idle");

      // Stop audio capture
      if (stopCaptureRef.current) {
        stopCaptureRef.current();
        stopCaptureRef.current = null;
      }
      stopCapture();
      stopAudio();

      // Disconnect WebSocket
      disconnect();

      // End session in backend
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
      toast.error("Failed to end session", {
        description: "The session may have already ended. You can safely start a new session.",
        duration: 4000,
      });
    }
  };

  // Handle product save
  const handleSaveProduct = async (productId: string) => {
    if (!sessionId) {
      toast.error("No active session", {
        description: "Please start a voice session first before saving products.",
      });
      return;
    }

    const product = currentProducts.find((p) => p.productId === productId);
    if (!product) {
      toast.error("Product not found", {
        description: "This product may have been removed from the results.",
      });
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

      setSavedProductIds((prev) => {
        const updated = new Set(prev);
        if (product.productId) {
          updated.add(product.productId);
        }
        return updated;
      });

      toast.success(`Saved ${product.title}`);
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Failed to save product", {
        description: "There was an error saving this product. Please try again or check your connection.",
        duration: 4000,
      });
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
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-gradient-primary">Voice Shopper</h1>
            <p className="text-muted-foreground/90 text-xl max-w-2xl mx-auto">
              Talk to your AI shopping assistant to find the perfect products ✨
            </p>
          </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Voice Controls & Conversation */}
          <div className="space-y-6">
            {/* Voice Control */}
            <Card className="card-elevated rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Voice Control</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Click the microphone to start or stop the voice session 🎤
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-10">
                <VoiceInputButton
                  onSessionStart={handleSessionStart}
                  onSessionEnd={handleSessionEnd}
                  isConnecting={isConnecting}
                  isActive={isActive}
                />
              </CardContent>
            </Card>

            {/* Conversation Display */}
            <VoiceAgentDisplay
              messages={messages}
              agentStatus={agentStatus}
              className="min-h-[400px]"
            />
          </div>

          {/* Right Column: Products & History */}
          <div className="space-y-6">
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Current Results</TabsTrigger>
                <TabsTrigger value="saved">Saved Items</TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="space-y-4">
                <Card className="card-elevated rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Product Results</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                      Products from your current voice search 🛍️
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentProducts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No products yet</h3>
                          <p className="text-muted-foreground">
                            Start a voice session and tell me what you&apos;re looking for!
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="saved" className="space-y-4">
                <Card className="card-elevated rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Saved Items</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                      Your saved products from all sessions 💾
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shoppingHistory && shoppingHistory.length > 0 ? (
                      <div className="space-y-4">
                        {shoppingHistory.map((item) => (
                          <div
                            key={item._id}
                            className="flex items-center gap-4 p-4 border rounded-lg card-product price-highlight"
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold">{item.productName}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                              {item.price && (
                                <p className="text-lg font-bold text-primary mt-2">
                                  ${item.price.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No saved items</h3>
                          <p className="text-muted-foreground">
                            Save products during a voice session to see them here!
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
