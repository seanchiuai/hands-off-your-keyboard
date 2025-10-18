"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

type ServiceStatus = "checking" | "success" | "error" | "warning";

interface ServiceTest {
  name: string;
  status: ServiceStatus;
  message: string;
  details?: string;
}

export default function DevTestPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();

  const [services, setServices] = useState<ServiceTest[]>([
    { name: "Microphone Access", status: "checking", message: "Checking..." },
    { name: "Clerk Authentication", status: "checking", message: "Checking..." },
    { name: "Convex Backend", status: "checking", message: "Checking..." },
    { name: "Voice Agent WebSocket", status: "checking", message: "Checking..." },
    { name: "Gemini API", status: "checking", message: "Checking..." },
    { name: "Cartesia TTS API", status: "checking", message: "Checking..." },
    { name: "SerpAPI", status: "checking", message: "Checking..." },
  ]);

  const updateService = (name: string, status: ServiceStatus, message: string, details?: string) => {
    setServices((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message, details } : s))
    );
  };

  // Test Microphone Access
  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      updateService(
        "Microphone Access",
        "success",
        "Microphone access granted",
        "Browser has permission to access microphone"
      );
    } catch (error: any) {
      updateService(
        "Microphone Access",
        "error",
        "Microphone access denied",
        error.message || "Please allow microphone access in browser settings"
      );
    }
  };

  // Test Clerk Authentication
  useEffect(() => {
    if (clerkLoaded) {
      if (user) {
        updateService(
          "Clerk Authentication",
          "success",
          "Authenticated",
          `User: ${user.emailAddresses[0]?.emailAddress || user.id}`
        );
      } else {
        updateService(
          "Clerk Authentication",
          "warning",
          "Not authenticated",
          "User is not signed in"
        );
      }
    }
  }, [clerkLoaded, user]);

  // Test Convex Backend
  useEffect(() => {
    if (!convexLoading) {
      if (isAuthenticated) {
        updateService(
          "Convex Backend",
          "success",
          "Connected",
          `Convex URL: ${process.env.NEXT_PUBLIC_CONVEX_URL || "Not set"}`
        );
      } else {
        updateService(
          "Convex Backend",
          "warning",
          "Not authenticated",
          "Sign in to test Convex connection"
        );
      }
    }
  }, [convexLoading, isAuthenticated]);

  // Test Voice Agent WebSocket
  const testVoiceAgent = async () => {
    const wsUrl = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "ws://localhost:8000";
    try {
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        updateService(
          "Voice Agent WebSocket",
          "error",
          "Connection timeout",
          `Failed to connect to ${wsUrl} within 5 seconds`
        );
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        updateService(
          "Voice Agent WebSocket",
          "success",
          "Connected",
          `Voice agent is running at ${wsUrl}`
        );
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        updateService(
          "Voice Agent WebSocket",
          "error",
          "Connection failed",
          `Cannot connect to ${wsUrl}. Make sure the voice agent server is running.`
        );
      };
    } catch (error: any) {
      updateService(
        "Voice Agent WebSocket",
        "error",
        "Connection error",
        error.message
      );
    }
  };

  // Test Gemini API
  const testGeminiAPI = async () => {
    try {
      const response = await fetch("/api/test-gemini");
      const data = await response.json();

      if (data.success) {
        updateService(
          "Gemini API",
          "success",
          "API key valid",
          data.message || "Gemini API is working"
        );
      } else {
        updateService(
          "Gemini API",
          "error",
          "API test failed",
          data.error || "Check API key in environment variables"
        );
      }
    } catch (error: any) {
      updateService(
        "Gemini API",
        "error",
        "Test endpoint error",
        "API test route not available or error occurred"
      );
    }
  };

  // Test Cartesia API
  const testCartesiaAPI = async () => {
    try {
      const response = await fetch("/api/test-cartesia");
      const data = await response.json();

      if (data.success) {
        updateService(
          "Cartesia TTS API",
          "success",
          "API key valid",
          data.message || "Cartesia TTS API is working"
        );
      } else {
        updateService(
          "Cartesia TTS API",
          "error",
          "API test failed",
          data.error || "Check API key in voice_agent/.env"
        );
      }
    } catch (error: any) {
      updateService(
        "Cartesia TTS API",
        "error",
        "Test endpoint error",
        "API test route not available or error occurred"
      );
    }
  };

  // Test SerpAPI
  const testSerpAPI = async () => {
    try {
      const response = await fetch("/api/test-serpapi");
      const data = await response.json();

      if (data.success) {
        updateService(
          "SerpAPI",
          "success",
          "API key valid",
          data.message || "SerpAPI is working"
        );
      } else {
        updateService(
          "SerpAPI",
          "error",
          "API test failed",
          data.error || "Check API key in environment variables"
        );
      }
    } catch (error: any) {
      updateService(
        "SerpAPI",
        "error",
        "Test endpoint error",
        "API test route not available or error occurred"
      );
    }
  };

  // Run all tests
  const runAllTests = () => {
    setServices((prev) => prev.map((s) => ({ ...s, status: "checking" as ServiceStatus, message: "Checking..." })));
    testMicrophone();
    testVoiceAgent();
    testGeminiAPI();
    testCartesiaAPI();
    testSerpAPI();
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case "checking":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case "checking":
        return "border-blue-500/20 bg-blue-500/5";
      case "success":
        return "border-green-500/20 bg-green-500/5";
      case "error":
        return "border-red-500/20 bg-red-500/5";
      case "warning":
        return "border-yellow-500/20 bg-yellow-500/5";
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6 page-transition">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-mona-heading text-gradient-primary">Developer Test Console</h1>
        <button
          onClick={runAllTests}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border/60 bg-background hover:bg-card/60 transition-colors"
        >
          Run All Tests
        </button>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.name}
            className={`card-simple rounded-2xl p-5 border transition-all ${getStatusColor(service.status)}`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5">{getStatusIcon(service.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <span className={`text-sm font-medium ${
                    service.status === "success" ? "text-green-600" :
                    service.status === "error" ? "text-red-600" :
                    service.status === "warning" ? "text-yellow-600" :
                    "text-blue-600"
                  }`}>
                    {service.status === "checking" ? "Checking..." :
                     service.status === "success" ? "OK" :
                     service.status === "error" ? "Failed" : "Warning"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{service.message}</p>
                {service.details && (
                  <p className="text-xs text-muted-foreground/80 font-mono bg-background/50 p-2 rounded border border-border/40 mt-2">
                    {service.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 rounded-2xl border border-border/60 bg-card/30">
        <h2 className="text-lg font-semibold mb-3">Environment Configuration</h2>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Convex URL:</span>
            <span className="text-foreground">{process.env.NEXT_PUBLIC_CONVEX_URL || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voice Agent URL:</span>
            <span className="text-foreground">{process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "ws://localhost:8000"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Clerk Domain:</span>
            <span className="text-foreground">{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "Configured" : "Not set"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
