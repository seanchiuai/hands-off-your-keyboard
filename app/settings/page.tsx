"use client";

import { useEffect, useState } from "react";

type Accent = "sky" | "emerald" | "amethyst";

export default function SettingsPage() {
  const [voice, setVoice] = useState("Default");
  const [tone, setTone] = useState("Helpful");
  const [privacy, setPrivacy] = useState({ redactPII: true, saveAudio: false });
  const [uiDensity, setUiDensity] = useState<"cozy" | "compact">("cozy");
  const [motion, setMotion] = useState<"on" | "reduce">("on");
  const [accent, setAccent] = useState<Accent>("sky");

  useEffect(() => {
    // Load settings from localStorage
    try {
      const savedAccent = localStorage.getItem("hoyk:accent") as Accent | null;
      if (savedAccent) {
        setAccent(savedAccent);
        applyAccent(savedAccent);
      }
      const savedDensity = localStorage.getItem("hoyk:uiDensity") as "cozy" | "compact" | null;
      if (savedDensity) setUiDensity(savedDensity);
      const savedMotion = localStorage.getItem("hoyk:motion") as "on" | "reduce" | null;
      if (savedMotion) setMotion(savedMotion);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("hoyk:accent", accent);
      applyAccent(accent);
    } catch {}
  }, [accent]);

  useEffect(() => {
    try { localStorage.setItem("hoyk:uiDensity", uiDensity); } catch {}
  }, [uiDensity]);

  useEffect(() => {
    try { localStorage.setItem("hoyk:motion", motion); } catch {}
    if (motion === "reduce") {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }
  }, [motion]);

  const applyAccent = (a: Accent) => {
    const root = document.documentElement;
    const palettes: Record<Accent, { primary: string; glow: string; grad: [string,string,string]; accent: string }>
      = {
      sky: { primary: "#0ea5e9", glow: "rgba(14,165,233,0.25)", grad: ["#0ea5e9","#0284c7","#0369a1"], accent: "#10b981" },
      emerald: { primary: "#10b981", glow: "rgba(16,185,129,0.25)", grad: ["#10b981","#059669","#047857"], accent: "#0ea5e9" },
      amethyst: { primary: "#8b5cf6", glow: "rgba(139,92,246,0.25)", grad: ["#8b5cf6","#7c3aed","#6d28d9"], accent: "#10b981" },
    };
    const p = palettes[a];
    root.style.setProperty("--primary", p.primary);
    root.style.setProperty("--primary-glow", p.glow);
    root.style.setProperty("--gradient-start", p.grad[0]);
    root.style.setProperty("--gradient-middle", p.grad[1]);
    root.style.setProperty("--gradient-end", p.grad[2]);
    root.style.setProperty("--accent", p.accent);
  };

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6 page-transition">
      <h1 className="text-3xl font-mona-heading text-gradient-primary mb-6">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card-simple rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-3">Voice & Personality</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-muted-foreground">Voice</label>
              <select
                className="px-3 py-2 text-sm rounded-lg border border-border/60 bg-background"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                <option>Default</option>
                <option>Warm</option>
                <option>Breezy</option>
                <option>Concise</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-muted-foreground">Tone</label>
              <select
                className="px-3 py-2 text-sm rounded-lg border border-border/60 bg-background"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option>Helpful</option>
                <option>Playful</option>
                <option>Direct</option>
                <option>Researcher</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card-simple rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-3">Privacy</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Redact PII in transcripts</span>
              <input
                type="checkbox"
                checked={privacy.redactPII}
                onChange={(e) => setPrivacy((p) => ({ ...p, redactPII: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Save audio snippets</span>
              <input
                type="checkbox"
                checked={privacy.saveAudio}
                onChange={(e) => setPrivacy((p) => ({ ...p, saveAudio: e.target.checked }))}
              />
            </label>
            <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
              Session redaction runs locally before storage. Audio is never shared unless you opt-in.
            </div>
          </div>
        </section>

        <section className="card-simple rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-3">Interface</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Density</span>
              <div className="flex rounded-lg border border-border/60 overflow-hidden">
                {(["cozy", "compact"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setUiDensity(d)}
                    className={`px-3 py-2 text-sm ${uiDensity === d ? "gradient-primary text-white" : "text-muted-foreground hover:bg-card/60"}`}
                  >
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Subtle motion</span>
              <div className="flex rounded-lg border border-border/60 overflow-hidden">
                {(["on", "reduce"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMotion(m)}
                    className={`px-3 py-2 text-sm ${motion === m ? "gradient-primary text-white" : "text-muted-foreground hover:bg-card/60"}`}
                  >
                    {m === "on" ? "On" : "Reduce"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Theme accent</span>
              <div className="flex rounded-lg border border-border/60 overflow-hidden">
                {(["sky","emerald","amethyst"] as Accent[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAccent(a)}
                    className={`px-3 py-2 text-sm capitalize ${accent === a ? "gradient-primary text-white" : "text-muted-foreground hover:bg-card/60"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card-simple rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-3">Advanced</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Experimental: product recall</span>
              <input type="checkbox" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Show developer metrics</span>
              <input type="checkbox" />
            </label>
            <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
              Tip: Long-press on the mic to record a quick voice note without starting a full session.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


