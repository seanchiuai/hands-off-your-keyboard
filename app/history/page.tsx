"use client";

import { useEffect, useState } from "react";

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
  const [filter, setFilter] = useState<"all" | "voice" | "search">("all");
  const [query, setQuery] = useState("");

  const [pinned, setPinned] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("hoyk:history:pinned") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem("hoyk:history:pinned", JSON.stringify(pinned)); } catch {}
  }, [pinned]);

  const entries = [
    { id: 1, type: "voice" as const, title: "Find wireless headphones", ts: Date.now() - 3600_000 },
    { id: 2, type: "search" as const, title: "Compared Sony vs Bose", ts: Date.now() - 7200_000 },
    { id: 3, type: "voice" as const, title: "Add to wishlist: Kindle", ts: Date.now() - 86400_000 },
  ];

  const filtered = entries.filter((e) =>
    (filter === "all" || e.type === filter) &&
    (query.trim() === "" || e.title.toLowerCase().includes(query.toLowerCase()))
  );

  const groups = filtered.reduce<Record<string, typeof entries>>( (acc, item) => {
    const key = new Date(item.ts).toDateString();
    acc[key] = acc[key] || [] as any;
    acc[key].push(item);
    return acc;
  }, {});
  const ordered = Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

  const togglePin = (id: number) => {
    setPinned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const exportMarkdown = () => {
    const lines = filtered.map((e) => `- [${new Date(e.ts).toLocaleString()}] (${e.type}) ${e.title}`);
    const blob = new Blob(["# History\n\n" + lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "history.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6 page-transition">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-mona-heading text-gradient-primary">History</h1>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border/60 overflow-hidden">
            {(["all", "voice", "search"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-3 py-2 text-sm ${
                  filter === opt ? "gradient-primary text-white" : "text-muted-foreground hover:bg-card/60"
                }`}
              >
                {opt[0].toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          <input
            className="px-3 py-2 text-sm rounded-lg border border-border/60 bg-background min-w-[220px]"
            placeholder="Search history…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={exportMarkdown} className="px-3 py-2 text-sm rounded-lg border border-border/60 hover:bg-card/60">Export</button>
        </div>
      </header>

      <section className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground">No matching entries.</div>
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
                            e.type === "voice" ? "bg-blue-500/20 text-blue-400 border border-blue-400/40" : "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40"
                          }`}
                        >
                          {e.type.toUpperCase()}
                        </span>
                        <div className="text-sm text-foreground">{e.title}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <button className="px-2 py-1 rounded-md hover:bg-card/70">View</button>
                        <button onClick={() => togglePin(e.id)} className="px-2 py-1 rounded-md hover:bg-card/70">{pinned.includes(e.id) ? "Unpin" : "Pin"}</button>
                        <button className="px-2 py-1 rounded-md hover:bg-card/70">Delete</button>
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
        Tip: Pinned items surface in quick access on Home after you speak.
      </div>
    </div>
  );
}


