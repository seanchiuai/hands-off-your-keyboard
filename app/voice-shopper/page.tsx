"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { VoiceAgentDisplay } from "@/components/VoiceAgentDisplay";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());

  // Convex mutations and queries
  const initiateSession = useAction(api.voiceShopper.initiateSession);
  const endSession = useMutation(api.voiceShopper.endSession);
  const saveShoppingItem = useMutation(api.voiceShopper.saveShoppingItem);
  const shoppingHistory = useQuery(api.voiceShopper.getShoppingHistory, { limit: 20 });

  // Mock: In production, this would be replaced with actual research results query
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const researchResults = useQuery(
    api.voiceShopper.getSessionItems,
    sessionId ? { sessionId } : "skip"
  );

  // Handle session start
  const handleSessionStart = async () => {
    try {
      setIsConnecting(true);
      setAgentStatus("thinking");

      // Initiate session via Convex
      const result = await initiateSession({});

      setSessionId(result.sessionId);
      setIsActive(true);
      setAgentStatus("listening");

      // Add welcome message
      setMessages([
        {
          speaker: "agent",
          text: "Hi! I'm your voice shopping assistant. Tell me what you're looking for, and I'll help you find it!",
          timestamp: Date.now(),
        },
      ]);

      toast.success("Voice session started!");

      // TODO: In production, establish WebSocket connection to Pipecat server
      // const ws = new WebSocket(`ws://localhost:8000?sessionId=${result.sessionId}`);
      // ws.onmessage = (event) => handleWebSocketMessage(event);

    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Failed to start voice session");
      setIsActive(false);
      setAgentStatus("idle");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle session end
  const handleSessionEnd = async () => {
    if (!sessionId) return;

    try {
      setAgentStatus("idle");
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

      // TODO: Close WebSocket connection
      // ws.close();

    } catch (error) {
      console.error("Failed to end session:", error);
      toast.error("Failed to end session");
    }
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
      toast.error("Failed to save product");
    }
  };

  // Mock: Simulate receiving products from research
  // In production, this would come from WebSocket messages or Convex queries
  useEffect(() => {
    if (isActive && sessionId) {
      // Simulate products appearing after a search
      const mockProducts: Product[] = [
        {
          productId: "1",
          title: "Premium Wireless Headphones",
          description: "Industry-leading noise cancellation, 30-hour battery life",
          price: 349.99,
          imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400",
          productUrl: "https://example.com/headphones",
        },
        {
          productId: "2",
          title: "Ergonomic Office Chair",
          description: "Mesh back, adjustable height, lumbar support",
          price: 299.99,
          imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
          productUrl: "https://example.com/chair",
        },
      ];

      // Mock research delay
      const timer = setTimeout(() => {
        if (currentProducts.length === 0) {
          setCurrentProducts(mockProducts);
          setAgentStatus("speaking");

          setMessages((prev) => [
            ...prev,
            {
              speaker: "agent",
              text: "I found some great options for you! Here are my top recommendations.",
              timestamp: Date.now(),
            },
          ]);

          setTimeout(() => setAgentStatus("listening"), 2000);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isActive, sessionId, currentProducts.length]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Voice Shopper</h1>
          <p className="text-muted-foreground text-lg">
            Talk to your AI shopping assistant to find the perfect products
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Voice Controls & Conversation */}
          <div className="space-y-6">
            {/* Voice Control */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Control</CardTitle>
                <CardDescription>
                  Click the microphone to start or stop the voice session
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
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
                <Card>
                  <CardHeader>
                    <CardTitle>Product Results</CardTitle>
                    <CardDescription>
                      Products from your current voice search
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
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">
                          Start a voice session and tell me what you&apos;re looking for!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="saved" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Saved Items</CardTitle>
                    <CardDescription>
                      Your saved products from all sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shoppingHistory && shoppingHistory.length > 0 ? (
                      <div className="space-y-4">
                        {shoppingHistory.map((item) => (
                          <div
                            key={item._id}
                            className="flex items-center gap-4 p-4 border rounded-lg"
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
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">
                          No saved items yet. Save products during a voice session!
                        </p>
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
  );
}
