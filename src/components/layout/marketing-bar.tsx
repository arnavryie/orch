"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const centerLinks = [
  { href: "#solutions", label: "Solutions" },
  { href: "/dashboard", label: "Orchestration" },
  { href: "#models", label: "Models" },
  { href: "#docs", label: "Docs" },
] as const;

export function MarketingBar() {
  const pathname = usePathname();
  const isMarketing = pathname === "/";

  return (
    <header className="border-b border-border-subtle bg-surface-base">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Orchestria
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {centerLinks.map(({ href, label }) => {
            const active =
              !isMarketing && label === "Orchestration" && pathname !== "/";
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "text-sm transition-colors",
                  active
                    ? "rounded-md bg-surface-hover px-3 py-1.5 text-white"
                    : "text-muted hover:text-white",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-muted hover:text-white">
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Launch Console
          </Link>
        </div>
      </div>
    </header>
  );
}
