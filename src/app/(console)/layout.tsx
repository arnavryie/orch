"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getAllSessions } from "@/lib/db";
import { fadeInVariants, sidebarItemVariants, pageVariants } from "@/lib/animations";

const NAV_ITEMS = [
  { href: "/connections", icon: "electrical_services", label: "Connections" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const loadSessions = async () => {
      try {
        const sessions = await getAllSessions();
        setSessionList(sessions.slice(0, 10)); // Show last 10
      } catch (e) {
        setSessionList([]);
      }
    };

    loadSessions();
    
    // Listen for custom event from session page
    window.addEventListener("session-saved", loadSessions as EventListener);
    
    // Global shortcut Ctrl+Shift+N
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("session-saved", loadSessions as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  const handleNewSession = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="bg-mainbg text-zinc-200 font-sans text-sm overflow-hidden h-screen flex selection:bg-purple-500/30">
      {/* SideNavBar */}
      <motion.aside
        className="fixed h-full left-0 top-0 bg-sidebar flex flex-col py-3 px-3 space-y-1 z-50 overflow-y-auto overflow-x-hidden border-r border-zinc-800/50"
        animate={{ width: collapsed ? 68 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        variants={fadeInVariants}
        initial="initial"
        whileInView="animate"
      >
        {/* Top Row Icons */}
        <div className={`flex items-center gap-2 px-2 mb-4 text-zinc-400 ${collapsed ? "flex-col mt-2" : ""}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </button>
          {!collapsed && (
            <>
              <button className="hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors ml-auto" onClick={() => router.push("/dashboard")}>
                <span className="material-symbols-outlined text-[18px]">add_comment</span>
              </button>
              <button className="hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
              <button className="hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors" onClick={() => router.back()}>
                <span className="material-symbols-outlined text-[18px]">arrow_back_ios</span>
              </button>
              <button className="hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors" onClick={() => router.forward()}>
                <span className="material-symbols-outlined text-[18px]">arrow_forward_ios</span>
              </button>
            </>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleNewSession}
          className={`py-1.5 rounded-full bg-transparent border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800/50 transition-colors duration-150 flex items-center mb-4 ${
            collapsed ? "px-2 justify-center" : "px-3 justify-start gap-2 w-full"
          }`}
          title="New Session (Ctrl+Shift+N)"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {!collapsed && "New Session"}
        </button>

        {/* Navigation Tabs */}
        <nav className="space-y-0.5 relative">
          {pathname?.startsWith("/session") && (
            <motion.div custom={0} variants={sidebarItemVariants} initial="initial" animate="animate">
              <Link
                href="/session"
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 cursor-pointer relative ${collapsed ? "justify-center" : ""}`}
              >
                {pathname?.startsWith("/session") && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-zinc-800/50 rounded-md"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="material-symbols-outlined text-[18px] relative z-10 text-zinc-200">chat_bubble</span>
                {!collapsed && <span className="relative z-10 text-zinc-200">Sessions</span>}
              </Link>
            </motion.div>
          )}
          {NAV_ITEMS.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <motion.div key={item.href} custom={idx + 1} variants={sidebarItemVariants} initial="initial" animate="animate">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 cursor-pointer relative ${collapsed ? "justify-center" : ""} ${
                    !isActive && "text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                  title={item.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 bg-zinc-800/50 rounded-md"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className={`material-symbols-outlined text-[18px] relative z-10 ${isActive ? "text-zinc-200" : ""}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className={`relative z-10 ${isActive ? "text-zinc-200" : ""}`}>{item.label}</span>}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Recents */}
        <div className={`mt-6 mb-2 ${collapsed ? "px-1" : "px-3"}`}>
          {!collapsed && <h3 className="text-xs text-zinc-500 font-medium mb-2">Recents</h3>}
          <div className="space-y-0.5 flex flex-col items-center">
            {isClient && sessionList.length === 0 && !collapsed && (
              <p className="text-xs text-zinc-600 mt-2 italic">No sessions yet</p>
            )}
            {isClient &&
              sessionList.map((item, idx) => {
                const isActive = pathname === `/session/${item.id}`;
                const displayTitle = item.title.length > 28 ? item.title.slice(0, 28) + "..." : item.title;
                return (
                  <motion.div
                    key={item.id}
                    custom={idx + NAV_ITEMS.length + 1}
                    variants={sidebarItemVariants}
                    initial="initial"
                    animate="animate"
                    className="w-full"
                  >
                    <Link
                      href={`/session/${item.id}`}
                      title={item.title}
                      className={`relative flex items-center py-1.5 rounded-md transition-colors ${
                        collapsed ? "justify-center px-0" : "px-3 -mx-3 truncate text-[13px]"
                      } ${!isActive && "text-zinc-400 hover:bg-zinc-800/50"}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className={`absolute inset-0 bg-zinc-800/50 rounded-md ${collapsed ? "" : "-mx-3"}`}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      {collapsed ? (
                        <span className={`material-symbols-outlined text-[16px] relative z-10 ${isActive ? "text-zinc-200" : "text-zinc-500"}`}>
                          terminal
                        </span>
                      ) : (
                        <span className={`relative z-10 ${isActive ? "text-zinc-200" : ""}`}>{displayTitle}</span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
          </div>
        </div>

        <div className="flex-1" />

        {/* Footer Profile */}
        <div className={`pt-4 pb-2 mt-auto ${collapsed ? "flex justify-center" : ""}`}>
          <Link
            href="/settings"
            title="Settings"
            className={`flex items-center gap-3 py-2 rounded-md transition-colors duration-150 cursor-pointer hover:bg-zinc-800/50 text-zinc-300 relative ${
              collapsed ? "px-1 justify-center" : "px-2"
            } ${pathname === "/settings" ? "bg-zinc-800/50 text-zinc-200" : ""}`}
          >
            {pathname === "/settings" && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute inset-0 bg-zinc-800/50 rounded-md"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <div className="relative z-10 w-8 h-8 rounded-full bg-zinc-300 text-zinc-900 flex items-center justify-center font-medium text-sm shrink-0">
              R
            </div>
            {!collapsed && (
              <>
                <div className="relative z-10 flex flex-col flex-1 min-w-0">
                  <span className={`text-sm font-medium truncate ${pathname === "/settings" ? "text-zinc-200" : "text-zinc-200"}`}>Ryie</span>
                  <div className="flex mt-0.5">
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider leading-none">
                      Free
                    </span>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-[18px] relative z-10 ${pathname === "/settings" ? "text-zinc-200" : "text-zinc-400"}`}>
                  settings
                </span>
              </>
            )}
          </Link>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <motion.div
        className="flex-1 flex flex-col relative min-w-0 bg-mainbg h-full"
        animate={{ marginLeft: collapsed ? 68 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
