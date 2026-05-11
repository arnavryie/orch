"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, KeyRound, LayoutGrid, Network, PlusCircle, Settings, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAllSessions } from "@/lib/db";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/session/new", label: "New Session", icon: PlusCircle },
  { href: "/history", label: "History", icon: Clock3 },
  { href: "/youtube", label: "YouTube", icon: Play },
  { href: "/connections", label: "Connections", icon: Network },
  { href: "/login-ai", label: "Login AIs", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface SidebarSession {
  id: string;
  title: string;
  createdAt: string;
  status: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [recentSessions, setRecentSessions] = useState<SidebarSession[]>([]);

  const loadSessions = async () => {
    try {
      const sessions = await getAllSessions();
      setRecentSessions(sessions.slice(0, 15));
    } catch {}
  };

  useEffect(() => {
    loadSessions();
    window.addEventListener("orchestria:session-update", loadSessions);
    // Also listen to the existing event just in case
    window.addEventListener("session-saved", loadSessions);
    return () => {
      window.removeEventListener("orchestria:session-update", loadSessions);
      window.removeEventListener("session-saved", loadSessions);
    };
  }, []);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border-subtle bg-surface-raised overflow-y-auto overflow-x-hidden">
      <Link
        href="/dashboard"
        className="border-b border-border-subtle px-4 py-4 text-lg font-semibold text-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
      >
        Orchestria
      </Link>
      <nav className="flex flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            (label === "Dashboard" && pathname === "/dashboard") ||
            (label === "History" && pathname.startsWith("/history")) ||
            (label === "New Session" && pathname === "/dashboard") ||
            (label !== "Dashboard" &&
              label !== "History" &&
              label !== "New Session" &&
              pathname === href);
          return (
            <Link
              key={label}
              href={label === "New Session" ? "/dashboard" : href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0",
                active
                  ? "bg-surface-hover text-white"
                  : "text-muted hover:bg-surface-hover/60 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Recents Section */}
      <div className="flex-1 mt-2">
        <div className="px-4 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Recents
        </div>
        <div className="flex flex-col gap-0.5 px-2 mb-4">
          {recentSessions.length === 0 ? (
            <p className="text-[#5a5a5a] text-xs px-3">
              No sessions yet
            </p>
          ) : (
            recentSessions.map((s) => {
              const active = pathname === `/session/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0",
                    active
                      ? "bg-surface-hover text-white font-medium"
                      : "text-muted hover:bg-surface-hover/60 hover:text-white"
                  )}
                >
                  <span className="truncate block w-full">
                    {s.title || 'Untitled session'}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-border-subtle p-4">
        <div className="flex items-center gap-3 rounded-lg p-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0">
          <div className="size-9 rounded-full bg-surface-hover ring-1 ring-border-subtle" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">Alex Mercer</p>
            <p className="truncate text-xs text-muted">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
