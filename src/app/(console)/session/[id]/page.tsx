"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { taskCardVariants, fadeInVariants, outputTextVariants } from "@/lib/animations";
import { saveSession, getSessionById } from "@/lib/db";
import StreamingText from "@/components/session/StreamingText";

interface Task {
  id: string;
  name: string;
  ai: string;
  status: "pending" | "running" | "done" | "error";
  output?: string;
  error?: string;
}

interface SessionData {
  id: string;
  prompt: string;
  models: string[];
  tasks: Task[];
  finalOutput?: string;
  status: "running" | "done" | "error";
}

export default function SessionPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [loadingCache, setLoadingCache] = useState(true);

  useEffect(() => {
    if (!id) return;
    let interval: NodeJS.Timeout;

    const init = async () => {
      // Check local cache first
      const cached = await getSessionById(id);
      if (cached && cached.status === "done") {
        setSession({
          id: cached.id,
          prompt: cached.prompt,
          models: cached.models,
          tasks: cached.tasks as Task[],
          finalOutput: cached.finalOutput,
          status: "done",
        });
        setLoadingCache(false);
        return;
      }
      setLoadingCache(false);
      startPolling();
    };

    const startPolling = () => {
      const fetchSession = async () => {
        try {
          const res = await fetch(`/api/session-status/${id}`);
          if (!res.ok) {
            setNotFound(true);
            return;
          }
          const data: SessionData = await res.json();
          setSession(data);
          if (data.status === "done" || data.status === "error") {
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Failed to fetch session status", e);
        }
      };

      fetchSession();
      interval = setInterval(fetchSession, 2000);
    };

    init();

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (session?.status === "done" && session.finalOutput && !hasSaved) {
      setHasSaved(true);
      saveSession({
        id: session.id,
        title: session.prompt.slice(0, 50),
        prompt: session.prompt,
        models: session.models,
        finalOutput: session.finalOutput,
        status: "done",
        createdAt: new Date().toISOString(),
        tasks: session.tasks,
      }).then(() => {
        window.dispatchEvent(new CustomEvent("orchestria:session-update"));
      });
    }
  }, [session?.status, session?.finalOutput, hasSaved, session]);

  const handleCopy = () => {
    if (session?.finalOutput) {
      navigator.clipboard.writeText(session.finalOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!session?.finalOutput) return;
    const blob = new Blob([session.finalOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.prompt.slice(0, 40).replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (notFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-mainbg">
        <span className="material-symbols-outlined text-[48px] text-zinc-600 mb-4">search_off</span>
        <h3 className="text-xl font-medium text-zinc-200 mb-2">Session not found</h3>
        <p className="text-sm text-zinc-500 mb-6">This orchestration session does not exist or was deleted.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-zinc-200 text-zinc-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (loadingCache || !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-mainbg">
        <span className="material-symbols-outlined text-[48px] text-zinc-600 mb-4 animate-spin">autorenew</span>
        <h3 className="text-xl font-medium text-zinc-200 mb-2">Starting orchestration...</h3>
        <p className="text-sm text-zinc-500 mb-6">Warming up the AI models.</p>
      </div>
    );
  }

  const title = session?.prompt
    ? session.prompt.length > 60
      ? session.prompt.slice(0, 60) + "..."
      : session.prompt
    : "Loading...";

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 sticky top-0 bg-mainbg z-40">
        <div className="flex flex-col text-sm text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="mx-2 text-zinc-600">/</span>
            <span className="text-zinc-400 italic">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors flex items-center justify-center"
            title="Download"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
          <button className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
          </button>
          <button className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-row overflow-hidden p-6 gap-8 max-w-[1400px] mx-auto w-full">
        {/* Chat Output */}
        <div className="w-full flex flex-col relative h-full">
          <div className="flex-1 flex flex-col bg-transparent overflow-hidden relative pt-2">
            <div className="flex-1 overflow-y-auto px-4 pb-24 text-[15px] text-zinc-300 leading-[1.6]">
              <div className="max-w-[750px] mx-auto space-y-8">
                {/* User Prompt */}
                <motion.div className="flex gap-4" variants={fadeInVariants} initial="initial" animate="animate">
                  <div className="h-6 w-6 rounded-sm bg-zinc-800 flex items-center justify-center text-[11px] font-medium text-zinc-300 shrink-0 mt-1">
                    R
                  </div>
                  <div className="pt-0.5 text-zinc-200">{session?.prompt || "..."}</div>
                </motion.div>

                {/* AI Response */}
                <motion.div className="flex gap-4" variants={outputTextVariants} initial="initial" animate="animate">
                  <div className="h-6 w-6 rounded-sm bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[12px] font-bold text-white shrink-0 mt-1">
                    O
                  </div>
                  <div className="flex-1 space-y-5 pt-0.5">
                    {session?.status === "running" && !session.finalOutput ? (
                      <p className="text-zinc-500 italic flex items-center gap-2">
                        Waiting for AI responses
                        <motion.span
                          className="inline-block w-1.5 h-4 bg-zinc-500 rounded-sm"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      </p>
                    ) : (
                      <StreamingText text={session?.finalOutput || "Processing..."} isStreaming={session?.status === "running"} />
                    )}

                    {/* In-line actions (only show when done) */}
                    {(session?.status === "done" || session?.status === "error") && session?.finalOutput && (
                      <div className="flex items-center gap-2 mt-6 pt-2">
                        <button
                          onClick={handleCopy}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-1.5"
                          title="Copy"
                        >
                          <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
                          {copied && <span className="text-xs font-medium text-zinc-300">Copied!</span>}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Sticky Bottom Strip */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a] to-transparent">
              <div className="max-w-[750px] mx-auto">
                <div className="flex justify-between items-center text-[12px] text-zinc-500 px-2 py-2">
                  <div>
                    Generated by:{" "}
                    <span className="text-zinc-400">
                      {session?.models ? session.models.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" + ") : "..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Was this output helpful?</span>
                    <div className="flex items-center gap-1">
                      <button className="hover:text-zinc-300 transition-colors p-1">
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                      </button>
                      <button className="hover:text-zinc-300 transition-colors p-1">
                        <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
