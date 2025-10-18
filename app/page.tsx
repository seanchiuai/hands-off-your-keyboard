"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { VoiceAgentDisplay } from "@/components/VoiceAgentDisplay";
import { VoiceInputButton } from "@/components/VoiceInputButton";

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

function SinglePageUI() {
  const [messages, setMessages] = useState<
    { speaker: "user" | "agent" | "system"; text: string; timestamp: number }[]
  >([
    { speaker: "system", text: "Welcome! Tap the mic to start shopping.", timestamp: Date.now() },
  ]);
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hoyk:pinned") || "[]"); } catch { return []; }
  });
  const [recent] = useState<string[]>(["Wireless headphones under $150","OLED monitor 27\"","Waterproof hiking shoes"]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [agentStatus, setAgentStatus] = useState<
    "idle" | "listening" | "thinking" | "speaking" | "searching"
  >("idle");
  const [isListening, setIsListening] = useState(false);

  const onSessionStart = () => {
    setIsListening(true);
    setAgentStatus("listening");
    setInterimTranscript("Listening…");
  };

  const onSessionEnd = () => {
    setIsListening(false);
    setAgentStatus("thinking");
    setInterimTranscript("");
    // Demo reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { speaker: "user", text: "Find me wireless headphones under $150", timestamp: Date.now() },
        { speaker: "agent", text: "On it. I'll surface a few solid picks.", timestamp: Date.now() },
      ]);
      setAgentStatus("searching");
      // Simulate search completion
      setTimeout(() => setAgentStatus("idle"), 2000);
    }, 800);
  };

  const togglePin = (text: string) => {
    setPinned((prev) => {
      const exists = prev.includes(text);
      const next = exists ? prev.filter((t) => t !== text) : [text, ...prev].slice(0, 6);
      try { localStorage.setItem("hoyk:pinned", JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
              interimTranscript={interimTranscript}
              agentStatus={agentStatus}
              className="flex-1 shadow-lg"
            />
            <div className="flex items-center justify-center pb-4">
              <VoiceInputButton
                onSessionStart={onSessionStart}
                onSessionEnd={onSessionEnd}
                isActive={isListening}
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

              {/* Results placeholder */}
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                <div className="mx-auto max-w-md space-y-3">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">Product results will appear here</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a voice conversation to search for products. Results will stream in real-time as the AI finds the best matches for you.
                  </p>
                </div>
              </div>
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

