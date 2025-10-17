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
    { speaker: "system", text: "You're all set. Tap the mic to start.", timestamp: Date.now() },
  ]);
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hoyk:pinned") || "[]"); } catch { return []; }
  });
  const [recent, setRecent] = useState<string[]>(["Wireless headphones under $150","OLED monitor 27\"","Waterproof hiking shoes"]);
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
        { speaker: "agent", text: "On it. I’ll surface a few solid picks.", timestamp: Date.now() },
      ]);
      setAgentStatus("idle");
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
    <main className="min-h-screen w-full">
      <div className="mx-auto max-w-7xl p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left: Agent panel */}
          <div className="flex h-[72vh] min-h-[420px] flex-col gap-4">
            <VoiceAgentDisplay
              messages={messages}
              interimTranscript={interimTranscript}
              agentStatus={agentStatus}
              className="flex-1"
            />
            <div className="flex items-center justify-center pt-2">
              <VoiceInputButton
                onSessionStart={onSessionStart}
                onSessionEnd={onSessionEnd}
                isActive={isListening}
              />
            </div>
          </div>

          {/* Right: Main workspace */}
          <section className="flex min-h-[72vh] flex-col rounded-2xl border border-border/60 bg-card/70 p-6">
            <header className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hands Off Your Keyboard</h2>
            </header>
            <div className="flex-1">
              {/* Pinned strip */}
              <div className="mb-4 flex items-center gap-2 overflow-x-auto">
                {pinned.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Pin queries to keep them handy.</div>
                ) : (
                  pinned.map((p) => (
                    <button key={p} onClick={() => togglePin(p)} className="px-3 py-1.5 rounded-full border border-border/60 text-sm hover:bg-card/80 whitespace-nowrap">
                      {p}
                    </button>
                  ))
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card-simple rounded-xl p-5">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="mt-1 text-foreground">Ready to assist</div>
                </div>
                <div className="card-simple rounded-xl p-5">
                  <div className="text-sm text-muted-foreground">Tips</div>
                  <div className="mt-1 text-foreground">Try asking for product ideas.</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border/50 p-5 text-sm text-muted-foreground">
                Results, research, and previews will appear here as you talk.
              </div>

              {/* Recently viewed */}
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium">Recently viewed</div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button key={r} onClick={() => togglePin(r)} className="px-3 py-1.5 rounded-md border border-border/60 text-sm hover:bg-card/80">
                      {r}
                    </button>
                  ))}
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

