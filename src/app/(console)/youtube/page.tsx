"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Play, Loader2, Clipboard, Check, AlertCircle } from "lucide-react";
import { fadeInVariants, outputTextVariants, pageVariants } from "@/lib/animations";
import StreamingText from "@/components/session/StreamingText";
import { cn } from "@/lib/cn";

const MODELS = [
  { id: "chatgpt", label: "ChatGPT", color: "bg-[#10a37f]", dim: "bg-[#10a37f]/15", text: "text-[#10a37f]", border: "border-[#10a37f]/30" },
  { id: "claude", label: "Claude", color: "bg-[#d97757]", dim: "bg-[#d97757]/15", text: "text-[#d97757]", border: "border-[#d97757]/30" },
  { id: "gemini", label: "Gemini", color: "bg-[#4285f4]", dim: "bg-[#4285f4]/15", text: "text-[#4285f4]", border: "border-[#4285f4]/30" },
];

type StyleType = "obsidian" | "bullets" | "takeaways";

const STYLES: { id: StyleType; label: string }[] = [
  { id: "obsidian", label: "Obsidian Note" },
  { id: "bullets", label: "Bullet Points" },
  { id: "takeaways", label: "Key Takeaways" },
];

const PROMPTS: Record<StyleType, string> = {
  obsidian: `I'm giving you a YouTube transcript. Convert it into a short Obsidian note in my voice — casual, lowercase, no fluff.
Rules:
Write like I'm just jotting down what stuck with me after watching, not summarizing
Lowercase throughout, casual tone, no fancy words
Only the core ideas — stuff I'd actually remember. skip repetition and filler
Group related things naturally, don't go point by point
End with a small "what i'm taking from this" section — 3-4 bullet points max, actionable
Short enough to read in under 2 minutes
Format: one-line title, date placeholder, tags, then the note body
Here's the transcript: `,
  bullets: `Summarize this YouTube transcript into clean bullet points. Only the key ideas, no filler. Keep it short.\nTranscript: `,
  takeaways: `What are the 5 most important things from this YouTube transcript? Be direct and concise.\nTranscript: `,
};

export default function YoutubeSummaryPage() {
  const [url, setUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("chatgpt");
  const [selectedStyle, setSelectedStyle] = useState<StyleType>("obsidian");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  // Check connection status for the subset of models
  useEffect(() => {
    const check = async () => {
      const ids = MODELS.map((m) => m.id);
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/check-login/${id}`)
            .then((r) => r.json())
            .catch(() => ({ loggedIn: false }))
        )
      );
      const status: Record<string, boolean> = {};
      ids.forEach((id, i) => {
        status[id] = responses[i].loggedIn ?? false;
      });
      setConnected(status);
      
      // Default to first available model
      const firstAvailable = ids.find(id => responses[ids.indexOf(id)]?.loggedIn);
      if (firstAvailable) {
        setSelectedModel(firstAvailable);
      }
    };
    check();
  }, []);

  const handleSummarize = async () => {
    if (!url.trim()) return;
    setError("");
    setOutput("");
    setPhase("running");
    setLoadingTranscript(true);

    try {
      // 1. Fetch transcript
      const transcriptRes = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const transcriptData = await transcriptRes.json();

      if (!transcriptRes.ok) {
        throw new Error(transcriptData.error || "Failed to fetch transcript");
      }

      const fullPrompt = PROMPTS[selectedStyle] + transcriptData.transcript;
      setLoadingTranscript(false);
      setIsStreaming(true);

      // 2. Send built prompt to AI via existing streaming endpoint
      const res = await fetch(`/api/prompt/${selectedModel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!res.body) throw new Error("No response stream received");

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
                setOutput(currentOutput);
              }
              if (data.status === "done" || data.status === "error") {
                // The actual loop will break once stream closes or we handle error internally
              }
            } catch (e) {
              // Ignore partially sent chunks
            }
          }
        }
      }

      setIsStreaming(false);
      setPhase("done");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setLoadingTranscript(false);
      setIsStreaming(false);
      setPhase("idle"); // revert back to let them try again
    }
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeModelData = MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-zinc-300">
      <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-zinc-800/50 bg-[#1a1a1a] sticky top-0 z-10">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Play className="size-4 fill-red-500 text-red-500" />
          <span className="font-medium text-zinc-200">YouTube Summarizer</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <motion.div
          className="max-w-[750px] mx-auto w-full space-y-8"
          variants={pageVariants}
          initial="initial"
          animate="animate"
        >
          {/* Input Controls Section */}
          <div className="bg-[#242424] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                YouTube URL
              </label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Model Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Select Model
                </label>
                <div className="flex flex-wrap gap-2">
                  {MODELS.map((m) => {
                    const isConnected = connected[m.id];
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => isConnected && setSelectedModel(m.id)}
                        disabled={!isConnected}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                          !isConnected
                            ? "opacity-30 cursor-not-allowed border-zinc-800 text-zinc-600"
                            : isSelected
                            ? `${m.dim} ${m.text} ${m.border}`
                            : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 bg-transparent"
                        )}
                      >
                        {isConnected && isSelected && (
                          <span className={cn("w-1.5 h-1.5 rounded-full", m.color)} />
                        )}
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Summary Style
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as StyleType)}
                  aria-label="Summary Style"
                  className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#1a1a1a]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <motion.button
                onClick={handleSummarize}
                disabled={!url.trim() || phase === "running"}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {phase === "running" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {loadingTranscript ? "Fetching Transcript..." : "Summarizing..."}
                  </>
                ) : (
                  "Summarize"
                )}
              </motion.button>
            </div>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex gap-3 items-start"
              >
                <AlertCircle className="size-5 text-red-500 shrink-0" />
                <div className="text-sm text-red-200">{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Output Display */}
          {(output || isStreaming) && (
            <motion.div
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              className="pt-4 border-t border-zinc-800/50"
            >
              {/* User Prompt style representation */}
              <motion.div className="flex gap-4 mb-8" variants={fadeInVariants}>
                <div className="h-6 w-6 rounded-sm bg-zinc-800 flex items-center justify-center text-[11px] font-medium text-zinc-300 shrink-0 mt-1">
                  U
                </div>
                <div className="pt-0.5 text-zinc-200">
                  Summarize this YouTube video using the "{STYLES.find(s => s.id === selectedStyle)?.label}" format.
                  <div className="text-xs text-zinc-500 mt-1 truncate opacity-80">{url}</div>
                </div>
              </motion.div>

              {/* AI Response */}
              <motion.div className="flex gap-4" variants={outputTextVariants} initial="initial" animate="animate">
                <div className={cn(
                  "h-6 w-6 rounded-sm flex items-center justify-center text-[12px] font-bold text-white shrink-0 mt-1",
                  activeModelData ? activeModelData.color : "bg-gradient-to-br from-purple-500 to-pink-500"
                )}>
                  {activeModelData?.label.charAt(0) || "O"}
                </div>
                <div className="flex-1 space-y-5 pt-0.5">
                  {isStreaming && !output ? (
                    <p className="text-zinc-500 italic flex items-center gap-2">
                      Waiting for {activeModelData?.label}...
                      <motion.span
                        className="inline-block w-1.5 h-4 bg-zinc-500 rounded-sm"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    </p>
                  ) : (
                    <StreamingText text={output} isStreaming={isStreaming} />
                  )}

                  {/* Actions */}
                  {(!isStreaming && output) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 mt-6 pt-2"
                    >
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-1.5"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                        {copied && <span className="text-xs font-medium text-zinc-300">Copied!</span>}
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
