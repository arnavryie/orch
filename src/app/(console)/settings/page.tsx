"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getSetting, saveSetting, clearAllSessions } from "@/lib/db";

interface SettingsState {
  displayName: string;
  primaryResearchModel: string;
  primaryWritingModel: string;
  primaryFormattingModel: string;
  saveHistoryLocally: boolean;
  showTaskPipeline: boolean;
  autoCopyOutput: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  displayName: "Ryie",
  primaryResearchModel: "chatgpt",
  primaryWritingModel: "claude",
  primaryFormattingModel: "gemini",
  saveHistoryLocally: true,
  showTaskPipeline: true,
  autoCopyOutput: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loadSettings = async () => {
      try {
        const stored = await getSetting("userSettings");
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...(stored as any) });
        }
      } catch (e) {
        console.error("Failed to load settings");
      }
    };
    loadSettings();
  }, []);

  const updateSetting = async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSetting("userSettings", next).catch(console.error);
      return next;
    });
  };

  const clearHistory = async () => {
    if (confirm("Are you sure? This will delete all session history.")) {
      await clearAllSessions();
      window.dispatchEvent(new Event("session-saved"));
      alert("History cleared");
    }
  };

  if (!isClient) return null;

  return (
    <>
      <header className="fixed top-0 right-0 z-40 p-4 flex items-center gap-4">
        <div className="hidden md:flex text-zinc-100 font-sans text-lg mr-auto absolute left-8">
          Settings
        </div>
        <button className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150 p-2">
          <span className="material-symbols-outlined text-[24px]">person</span>
        </button>
      </header>

      <main className="relative min-h-screen flex flex-col pt-24 pb-24 px-8 overflow-y-auto">
        <div className="max-w-[700px] w-full mx-auto space-y-10">
          
          {/* SECTION: Account */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Account</h2>
            <div className="bg-[#212121] border border-[#333333] rounded-xl overflow-hidden text-sm">
              <div className="p-4 flex items-center justify-between border-b border-[#333333]">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">Avatar</span>
                  <span className="text-xs text-zinc-500 mt-0.5">Your profile picture</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-300 text-zinc-900 flex items-center justify-center font-medium text-lg">
                    {settings.displayName.charAt(0).toUpperCase() || "R"}
                  </div>
                  <button className="text-zinc-400 hover:text-zinc-300 transition-colors border border-[#333333] px-3 py-1.5 rounded-md text-xs cursor-not-allowed opacity-50" title="Coming soon">
                    Change Avatar
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between border-b border-[#333333]">
                <div className="flex flex-col w-1/2">
                  <span className="text-zinc-200 font-medium">Display Name</span>
                </div>
                <div className="w-1/2 flex justify-end">
                  <input
                    type="text"
                    value={settings.displayName}
                    onChange={(e) => updateSetting("displayName", e.target.value)}
                    className="w-[200px] bg-[#1a1a1a] border border-[#333333] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-sm"
                  />
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col w-1/2">
                  <span className="text-zinc-200 font-medium">Email</span>
                  <span className="text-xs text-zinc-500 mt-0.5">Email editing coming soon</span>
                </div>
                <div className="w-1/2 flex justify-end">
                  <input
                    type="text"
                    disabled
                    value="your@email.com"
                    className="w-[200px] bg-[#1a1a1a] border border-[#333333] rounded-md px-3 py-1.5 text-zinc-500 cursor-not-allowed text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: Default Models */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Default Models</h2>
            <div className="bg-[#212121] border border-[#333333] rounded-xl overflow-hidden text-sm">
              <div className="p-4 flex items-center justify-between border-b border-[#333333]">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">Primary research model</span>
                </div>
                <select
                  value={settings.primaryResearchModel}
                  onChange={(e) => updateSetting("primaryResearchModel", e.target.value)}
                  className="bg-[#1a1a1a] border border-[#333333] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-sm w-[150px]"
                >
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div className="p-4 flex items-center justify-between border-b border-[#333333]">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">Primary writing model</span>
                </div>
                <select
                  value={settings.primaryWritingModel}
                  onChange={(e) => updateSetting("primaryWritingModel", e.target.value)}
                  className="bg-[#1a1a1a] border border-[#333333] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-sm w-[150px]"
                >
                  <option value="claude">Claude</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">Primary formatting model</span>
                </div>
                <select
                  value={settings.primaryFormattingModel}
                  onChange={(e) => updateSetting("primaryFormattingModel", e.target.value)}
                  className="bg-[#1a1a1a] border border-[#333333] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-sm w-[150px]"
                >
                  <option value="gemini">Gemini</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECTION: Session Preferences */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Session Preferences</h2>
            <div className="bg-[#212121] border border-[#333333] rounded-xl overflow-hidden text-sm">
              <ToggleRow
                label="Save session history locally"
                checked={settings.saveHistoryLocally}
                onChange={(v) => updateSetting("saveHistoryLocally", v)}
              />
              <ToggleRow
                label="Show task pipeline in session view"
                checked={settings.showTaskPipeline}
                onChange={(v) => updateSetting("showTaskPipeline", v)}
              />
              <ToggleRow
                label="Auto-copy output when done"
                checked={settings.autoCopyOutput}
                onChange={(v) => updateSetting("autoCopyOutput", v)}
                isLast
              />
            </div>
          </section>

          {/* SECTION: Danger Zone */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wider pl-1">Danger Zone</h2>
            <div className="bg-[#212121] border border-red-900/30 rounded-xl overflow-hidden text-sm">
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">Clear all session history</span>
                  <span className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</span>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-red-400 border border-red-900/50 hover:bg-red-900/20 px-4 py-2 rounded-md transition-colors text-xs font-medium"
                >
                  Clear History
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}

function ToggleRow({ label, checked, onChange, isLast }: { label: string; checked: boolean; onChange: (v: boolean) => void; isLast?: boolean }) {
  return (
    <div className={`p-4 flex items-center justify-between ${!isLast ? 'border-b border-[#333333]' : ''}`}>
      <div className="flex flex-col">
        <span className="text-zinc-200 font-medium">{label}</span>
      </div>
      <motion.div
        className="w-10 h-6 rounded-full relative cursor-pointer"
        style={{ backgroundColor: checked ? '#a855f7' : '#333' }}
        onClick={() => onChange(!checked)}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </div>
  );
}
