import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteHeader() {
  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl italic">PiperTrace</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            forensics
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/methodology" className={link} activeProps={{ className: "text-foreground" }}>Method</Link>
          <Link to="/section-63" className={link} activeProps={{ className: "text-foreground" }}>Section 63</Link>
          <a href="https://github.com/Kishordiu/pipertraces" target="_blank" rel="noreferrer"
            className="rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground hover:opacity-90">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p><span className="font-serif text-lg italic text-foreground">PiperTrace</span> — Evidence, not just a verdict.</p>
        <p className="font-mono text-xs uppercase tracking-widest">Local-first · Zero API keys · NexAI InnoHack 2026, VIT Vellore</p>
      </div>
    </footer>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{children}</p>;
}
