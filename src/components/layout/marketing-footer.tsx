import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle bg-surface-base">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="text-sm font-semibold text-white">Orchestria</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="#privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="#terms" className="hover:text-white">
            Terms of Service
          </Link>
          <Link href="#status" className="hover:text-white">
            System Status
          </Link>
          <Link href="https://github.com" className="hover:text-white">
            Github
          </Link>
        </div>
        <p className="text-xs text-muted lg:text-right">
          © 2026 Orchestria AI. Operating at the speed of thought.
        </p>
      </div>
      <p className="pb-8 text-center text-xs text-muted/80">
        Orchestria — Built for the future of AI
      </p>
    </footer>
  );
}
