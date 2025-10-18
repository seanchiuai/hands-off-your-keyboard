"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="sticky top-[calc(var(--header-height)+8px)] z-10 -mx-2 mb-2 px-2">
      <div className="rounded-lg border border-border/60 bg-background/70 backdrop-blur px-3 py-1 text-xs tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hoyk:history:pinned") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem("hoyk:history:pinned", JSON.stringify(pinned)); } catch {}
  }, [pinned]);

  // Fetch all voice sessions from Convex
  const sessions = useQuery(api.voiceShopper.getAllSessions, { limit: 100 }) || [];

  // Transform sessions into entries for display
  const entries = sessions.map((session) => ({
    id: session.sessionId,
    type: "voice" as const,
    title: `Voice session - ${session.status}`,
    ts: session.startTime,
    status: session.status,
    endTime: session.endTime,
  }));

  // Filter by search query
  const filtered = entries.filter((e) =>
    query.trim() === "" || e.title.toLowerCase().includes(query.toLowerCase())
  );

  // Group by date
  const groups = filtered.reduce<Record<string, typeof entries>>((acc, item) => {
    const key = new Date(item.ts).toDateString();
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof entries>);
  const ordered = Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

  const togglePin = (id: string) => {
    setPinned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const exportMarkdown = () => {
    const lines = filtered.map((e) => `- [${new Date(e.ts).toLocaleString()}] ${e.title}`);
    const blob = new Blob(["# Voice Session History\n\n" + lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voice-history.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6 page-transition">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-mona-heading text-gradient-primary">Voice History</h1>
        <div className="flex gap-2">
          <input
            className="px-3 py-2 text-sm rounded-lg border border-border/60 bg-background min-w-[220px]"
            placeholder="Search history…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={exportMarkdown} className="px-3 py-2 text-sm rounded-lg border border-border/60 hover:bg-card/60">
            Export
          </button>
        </div>
      </header>

      <section className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-lg mb-2">No voice sessions yet</div>
            <div className="text-muted-foreground/60 text-sm">
              Start a voice session to see your history here
            </div>
          </div>
        ) : (
          ordered.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <SectionHeading label={dateLabel} />
              <div className="grid gap-3">
                {items.map((e) => (
                  <div key={e.id} className="card-simple rounded-xl p-4 hover-lift transition-smooth">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${
                            e.status === "active"
                              ? "bg-green-500/20 text-green-400 border border-green-400/40"
                              : e.status === "completed"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-400/40"
                              : "bg-red-500/20 text-red-400 border border-red-400/40"
                          }`}
                        >
                          {e.status.toUpperCase()}
                        </span>
                        <div className="text-sm text-foreground">
                          Voice Shopping Session
                          {e.endTime && (
                            <span className="text-muted-foreground ml-2">
                              ({Math.round((e.endTime - e.ts) / 1000 / 60)} min)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <button className="px-2 py-1 rounded-md hover:bg-card/70">View</button>
                        <button onClick={() => togglePin(e.id)} className="px-2 py-1 rounded-md hover:bg-card/70">
                          {pinned.includes(e.id) ? "Unpin" : "Pin"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <div className="mt-6 rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
        Your voice shopping sessions with Gemini AI are displayed here. Sessions are automatically saved and include conversation logs and product research results.
      </div>
    </div>
  );
}
