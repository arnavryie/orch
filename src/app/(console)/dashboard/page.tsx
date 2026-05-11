"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const ALL_MODELS = [
  { id: "chatgpt",    label: "ChatGPT",    color: "bg-[#10a37f]", dim: "bg-[#10a37f]/15", text: "text-[#10a37f]",  border: "border-[#10a37f]/30" },
  { id: "claude",     label: "Claude",     color: "bg-[#d97757]", dim: "bg-[#d97757]/15", text: "text-[#d97757]",  border: "border-[#d97757]/30" },
  { id: "gemini",     label: "Gemini",     color: "bg-[#4285f4]", dim: "bg-[#4285f4]/15", text: "text-[#4285f4]",  border: "border-[#4285f4]/30" },
  { id: "perplexity", label: "Perplexity", color: "bg-[#0b8089]", dim: "bg-[#0b8089]/15", text: "text-[#0b8089]",  border: "border-[#0b8089]/30" },
  { id: "grok",       label: "Grok",       color: "bg-zinc-500",  dim: "bg-zinc-500/15",  text: "text-zinc-300",   border: "border-zinc-500/30"  },
];

type Status = "pending" | "running" | "done" | "error";
interface AIResult { ai: string; status: Status; output: string; }
type Phase = "idle" | "running" | "done";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function DashboardPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<AIResult[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [greeting] = useState(getGreeting);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check which AIs are connected
  useEffect(() => {
    const check = async () => {
      const ids = ALL_MODELS.map((m) => m.id);
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/check-login/${id}`)
            .then((r) => r.json())
            .catch(() => ({ loggedIn: false }))
        )
      );
      const status: Record<string, boolean> = {};
      ids.forEach((id, i) => { status[id] = responses[i].loggedIn ?? false; });
      setConnected(status);
      // Auto-select all connected AIs
      setSelected(ids.filter((id, i) => responses[i].loggedIn));
    };
    check();
  }, []);

  const toggleAI = (id: string) => {
    if (!connected[id]) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleOrchestrate = async () => {
    const p = prompt.trim();
    if (!p || selected.length === 0 || phase === "running") return;

    setCurrentPrompt(p);
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setPhase("running");

    const initial: AIResult[] = selected.map((ai) => ({
      ai, status: "running", output: "",
    }));
    setResults(initial);

    // Run ALL selected AIs in PARALLEL simultaneously using SSE
    await Promise.allSettled(
      selected.map(async (ai) => {
        try {
          const res = await fetch(`/api/prompt/${ai}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: p }),
          });

          if (!res.body) throw new Error("No response body");

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let currentOutput = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.output !== undefined) {
                    currentOutput = data.output;
                  }
                  const status: Status = data.status || "running";

                  setResults((prev) =>
                    prev.map((r) => r.ai === ai ? { ...r, status, output: currentOutput } : r)
                  );
                } catch (e) {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
        } catch {
          setResults((prev) =>
            prev.map((r) =>
              r.ai === ai
                ? { ...r, status: "error", output: "❌ Could not reach the automation server." }
                : r
            )
          );
        }
      })
    );

    setPhase("done");
  };

  const handleReset = () => {
    setPhase("idle");
    setResults([]);
    setCurrentPrompt("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOrchestrate();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;
  const doneCount = results.filter((r) => r.status === "done" || r.status === "error").length;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-zinc-800/50 shrink-0">
        <span className="text-sm text-zinc-500">
          {connectedCount === 0 ? (
            <Link href="/connections" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
              No AIs connected — go to Connections
            </Link>
          ) : (
            <span>{connectedCount} AI{connectedCount !== 1 ? "s" : ""} connected</span>
          )}
        </span>
        {phase !== "idle" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800/50"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            New Orchestration
          </motion.button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── IDLE: Prompt Input ── */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center min-h-full px-6 py-12"
            >
              {/* Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="text-center mb-10"
              >
                <div className="text-3xl mb-3">✦</div>
                <h2 className="text-2xl text-zinc-200 font-serif mb-2">{greeting}, Ryie</h2>
                <p className="text-sm text-zinc-500">Send one prompt to multiple AIs simultaneously.</p>
              </motion.div>

              {/* AI Selector */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
                className="flex flex-wrap gap-2 mb-6 justify-center"
              >
                {ALL_MODELS.map((m) => {
                  const isConnected = connected[m.id];
                  const isSelected = selected.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleAI(m.id)}
                      disabled={!isConnected}
                      title={isConnected ? `${isSelected ? "Deselect" : "Select"} ${m.label}` : `${m.label} not connected`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                        !isConnected
                          ? "opacity-30 cursor-not-allowed border-zinc-800 text-zinc-600"
                          : isSelected
                          ? `${m.dim} ${m.text} ${m.border}`
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      {isConnected && isSelected && (
                        <span className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
                      )}
                      {m.label}
                      {!isConnected && <span className="text-[9px] opacity-60">not connected</span>}
                    </button>
                  );
                })}
              </motion.div>

              {/* Prompt Box */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="w-full max-w-[720px]"
              >
                <div className="bg-[#242424] border border-zinc-800 rounded-2xl p-4 focus-within:border-zinc-600 transition-colors">
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    className="w-full bg-transparent outline-none text-sm text-zinc-200 placeholder-zinc-500 resize-none leading-relaxed"
                    placeholder={
                      selected.length === 0
                        ? "Select at least one AI above..."
                        : `Ask ${selected.length === 1 ? ALL_MODELS.find((m) => m.id === selected[0])?.label : `all ${selected.length} AIs`} something...`
                    }
                    value={prompt}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={selected.length === 0}
                    autoFocus
                  />
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/50">
                    <span className="text-xs text-zinc-600">
                      {selected.length > 0
                        ? `→ ${selected.map((id) => ALL_MODELS.find((m) => m.id === id)?.label).join(", ")}`
                        : "No AIs selected"}
                    </span>
                    <motion.button
                      onClick={handleOrchestrate}
                      disabled={!prompt.trim() || selected.length === 0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      Orchestrate
                    </motion.button>
                  </div>
                </div>
                <p className="text-center text-[11px] text-zinc-600 mt-3">
                  Enter sends to all selected AIs in parallel · Shift+Enter for new line
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ── RUNNING / DONE: Results ── */}
          {(phase === "running" || phase === "done") && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-8 max-w-[1400px] mx-auto w-full"
            >
              {/* Prompt recap */}
              <div className="flex gap-3 mb-8 max-w-[750px] mx-auto">
                <div className="h-7 w-7 rounded-full bg-zinc-300 text-zinc-900 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  R
                </div>
                <div className="text-zinc-200 text-sm leading-relaxed pt-0.5">{currentPrompt}</div>
              </div>

              {/* Progress bar when running */}
              {phase === "running" && (
                <div className="max-w-[750px] mx-auto mb-6">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span>Orchestrating...</span>
                    <span>{doneCount} / {results.length} complete</span>
                  </div>
                  <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-zinc-400 rounded-full"
                      animate={{ width: `${results.length > 0 ? (doneCount / results.length) * 100 : 0}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {/* Results Grid */}
              <div className={`grid gap-4 ${
                results.length === 1 ? "grid-cols-1 max-w-[750px] mx-auto" :
                results.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                results.length === 3 ? "grid-cols-1 md:grid-cols-3" :
                "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
              }`}>
                {results.map((r) => {
                  const model = ALL_MODELS.find((m) => m.id === r.ai)!;
                  return (
                    <motion.div
                      key={r.ai}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border p-5 flex flex-col gap-3 ${
                        r.status === "error"
                          ? "bg-red-950/20 border-red-900/30"
                          : "bg-[#242424] border-zinc-800"
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-sm font-medium ${model.text}`}>
                          <div className={`w-2 h-2 rounded-full ${model.color}`} />
                          {model.label}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {r.status === "running" ? (
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <motion.span
                                className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                              Thinking...
                            </span>
                          ) : r.status === "error" ? (
                            <span className="text-red-400">Error</span>
                          ) : (
                            <span className="text-emerald-400">Done ✓</span>
                          )}
                        </div>
                      </div>

                      {/* Response */}
                      <div className="flex-1 text-sm text-zinc-300 leading-relaxed min-h-[80px]">
                        {r.status === "running" ? (
                          <span className="flex gap-1.5 items-center text-zinc-500 italic">
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>●</motion.span>
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}>●</motion.span>
                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}>●</motion.span>
                          </span>
                        ) : (
                          <span className="whitespace-pre-wrap">{r.output}</span>
                        )}
                      </div>

                      {/* Copy button */}
                      {r.status === "done" && r.output && (
                        <button
                          onClick={() => navigator.clipboard.writeText(r.output)}
                          className="self-start flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          Copy
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Done state — new orchestration input */}
              {phase === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                  className="mt-10 max-w-[720px] mx-auto"
                >
                  <div className="bg-[#242424] border border-zinc-800 rounded-2xl p-4 focus-within:border-zinc-600 transition-colors">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      className="w-full bg-transparent outline-none text-sm text-zinc-200 placeholder-zinc-500 resize-none leading-relaxed"
                      placeholder="Follow-up or start a new orchestration..."
                      value={prompt}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/50">
                      <span className="text-xs text-zinc-600">
                        → {selected.map((id) => ALL_MODELS.find((m) => m.id === id)?.label).join(", ")}
                      </span>
                      <motion.button
                        onClick={handleOrchestrate}
                        disabled={!prompt.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        Orchestrate again
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
