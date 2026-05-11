"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cardVariants } from "@/lib/animations";

const AIS = [
  { id: "chatgpt",    name: "ChatGPT",    icon: "smart_toy",       colorClass: "text-[#10a37f]", bgClass: "bg-[#10a37f]/10", desc: "OpenAI's flagship model. Handles general reasoning, writing, and code.",       disabled: false },
  { id: "claude",     name: "Claude",     icon: "psychology",      colorClass: "text-[#d97757]", bgClass: "bg-[#d97757]/10", desc: "Anthropic's long-context assistant — great for analysis and nuanced tasks.", disabled: false },
  { id: "gemini",     name: "Gemini",     icon: "auto_awesome",    colorClass: "text-[#4285f4]", bgClass: "bg-[#4285f4]/10", desc: "Google's multimodal model. Excels at research and factual grounding.",         disabled: false },
  { id: "perplexity",name: "Perplexity", icon: "search_insights",  colorClass: "text-[#0b8089]", bgClass: "bg-[#0b8089]/10", desc: "AI-powered search engine for factual grounding and citations.",                disabled: false },
  { id: "grok",       name: "Grok",       icon: "cruelty_free",    colorClass: "text-zinc-300",  bgClass: "bg-zinc-700/30",   desc: "xAI's frontier model with real-time knowledge and X/Twitter integration.",  disabled: false },
];

export default function ConnectionsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadingMsg, setLoadingMsg] = useState<Record<string, string>>({});
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const checkAll = useCallback(async () => {
    const activeAIs = AIS.filter((a) => !a.disabled).map((a) => a.id);
    try {
      const results = await Promise.all(
        activeAIs.map((ai) =>
          fetch(`/api/check-login/${ai}`, { signal: AbortSignal.timeout(5000) })
            .then((r) => r.json())
            .catch(() => ({ loggedIn: false, error: true }))
        )
      );
      const hasError = results.every((r: any) => r.error);
      setServerOnline(!hasError);
      const status: Record<string, boolean> = {};
      activeAIs.forEach((ai, i) => {
        status[ai] = results[i].loggedIn ?? false;
      });
      setConnected(status);
    } catch {
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 10000);
    return () => clearInterval(interval);
  }, [checkAll]);

  const handleConnect = async (ai: string) => {
    setLoadingMsg((p) => ({ ...p, [ai]: "Opening browser..." }));
    setLoading((p) => ({ ...p, [ai]: true }));

    fetch(`/api/login-ai/${ai}`, { method: "POST" }).then(async () => {
      const res = await fetch(`/api/check-login/${ai}`);
      const data = await res.json();
      setConnected((p) => ({ ...p, [ai]: data.loggedIn }));
      setLoading((p) => ({ ...p, [ai]: false }));
      setLoadingMsg((p) => ({ ...p, [ai]: "" }));
    });

    setTimeout(() => {
      setLoadingMsg((p) => ({ ...p, [ai]: "Log in to the browser window..." }));
    }, 3000);
  };

  const handleDisconnect = async (ai: string) => {
    await fetch(`/api/disconnect-ai/${ai}`, { method: "POST" }).catch(() => {});
    setConnected((p) => ({ ...p, [ai]: false }));
  };

  const activeCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#1a1a1a]">
      <header className="bg-[#1a1a1a] text-zinc-400 text-sm sticky top-0 z-40 flex justify-between items-center h-14 w-full px-6">
        <div />
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              serverOnline === null ? "bg-zinc-600" : serverOnline ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-zinc-500">
            {serverOnline === null ? "Checking server..." : serverOnline ? "Automation server online" : "Automation server offline"}
          </span>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto max-w-[900px] mx-auto w-full pt-12">
        <div className="mb-12 text-center">
          <h3
            className="text-4xl text-[#e5e2e1] mb-2"
            style={{ fontFamily: "ui-serif, Georgia, serif", fontWeight: 400 }}
          >
            Connections
          </h3>
          <p className="text-sm text-zinc-400">
            Connect your AI accounts. Orchestria will use your existing logins to run prompts.
          </p>
        </div>

        {/* Server offline warning */}
        <AnimatePresence>
          {serverOnline === false && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-start gap-3 bg-red-950/30 border border-red-900/40 text-red-300 rounded-xl px-4 py-3 text-sm"
            >
              <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">warning</span>
              <div>
                <p className="font-medium mb-0.5">Automation server is not running</p>
                <p className="text-red-400 text-xs">
                  Run <code className="bg-red-950/50 px-1.5 py-0.5 rounded font-mono">npm run dev</code> — it starts both Next.js and the automation server together.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AIS.map((ai, i) => (
            <motion.div
              key={ai.id}
              custom={i}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              whileHover={!ai.disabled ? "hover" : undefined}
              className="bg-[#242424] rounded-2xl p-6 border border-[#333] flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-10 w-10 rounded-lg ${ai.bgClass} ${ai.colorClass} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[22px]">{ai.icon}</span>
                </div>
                <AnimatePresence mode="wait">
                  {connected[ai.id] ? (
                    <motion.span
                      key="on"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center text-xs font-medium text-emerald-400/80"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 mr-1.5 animate-pulse" />
                      Connected
                    </motion.span>
                  ) : (
                    <motion.span
                      key="off"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center text-xs text-zinc-600"
                    >
                      Not connected
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="mb-6">
                <h4 className="text-base text-zinc-200 font-medium mb-1">{ai.name}</h4>
                <p className="text-sm text-zinc-400 line-clamp-2">{ai.desc}</p>
              </div>

              {ai.disabled ? (
                <button
                  disabled
                  className="w-full py-2 px-4 rounded-xl bg-[#2a2a2a] text-zinc-600 cursor-not-allowed text-sm font-medium border border-[#333]"
                >
                  Coming Soon
                </button>
              ) : connected[ai.id] ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDisconnect(ai.id)}
                  className="w-full py-2 px-4 rounded-xl bg-[#333] text-zinc-200 hover:bg-red-900/30 hover:text-red-300 hover:border-red-900/40 border border-transparent transition-colors text-sm font-medium"
                >
                  Disconnect
                </motion.button>
              ) : (
                <motion.button
                  whileTap={!loading[ai.id] ? { scale: 0.97 } : {}}
                  onClick={() => handleConnect(ai.id)}
                  disabled={loading[ai.id] || serverOnline === false}
                  className="w-full py-2 px-4 rounded-xl bg-[#ececec] text-zinc-900 hover:bg-white transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading[ai.id] ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[15px] animate-spin">autorenew</span>
                      {loadingMsg[ai.id] || "Connecting..."}
                    </span>
                  ) : (
                    "Connect"
                  )}
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-12 max-w-xs mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500">Connection Status</span>
            <span className="text-xs text-zinc-400">{activeCount} of 5 connected</span>
          </div>
          <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-zinc-300 rounded-full"
              animate={{ width: `${(activeCount / 5) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {activeCount === 5 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs text-emerald-400/70 mt-3"
            >
              All 5 AIs connected — you're ready to orchestrate ✓
            </motion.p>
          )}
        </div>
      </main>
    </div>
  );
}
