import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const link = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  const mobileLink = "flex min-h-11 items-center rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-secondary";

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" onClick={closeMenu} className="flex shrink-0 items-baseline gap-2" aria-label="PiperTrace home">
          <span className="font-serif text-xl italic sm:text-2xl">PiperTrace</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            forensics
          </span>
        </Link>

        <nav className="hidden items-center gap-4 lg:gap-6 md:flex" aria-label="Main navigation">
          <Link to="/studio" search={{}} className={link} activeProps={{ className: "text-foreground" }}>Studio</Link>
          <Link to="/cases" className={link} activeProps={{ className: "text-foreground" }}>Cases</Link>
          <Link to="/methodology" className={link} activeProps={{ className: "text-foreground" }}>Method</Link>
          <Link to="/section-63" className={link} activeProps={{ className: "text-foreground" }}>Section 63</Link>
          <a
            href="https://github.com/Kishordiu/pipertraces"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground transition-transform hover:-translate-y-0.5 hover:opacity-90"
          >
            GitHub
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-controls="pipertrace-mobile-nav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      {menuOpen && (
        <div id="pipertrace-mobile-nav" className="border-t border-border/70 bg-background/95 px-4 pb-4 pt-3 shadow-card md:hidden">
          <nav className="mx-auto grid max-w-6xl grid-cols-2 gap-2" aria-label="Mobile navigation">
            <Link to="/studio" search={{}} className={mobileLink} onClick={closeMenu}>Studio</Link>
            <Link to="/cases" className={mobileLink} onClick={closeMenu}>Cases</Link>
            <Link to="/methodology" className={mobileLink} onClick={closeMenu}>Methodology</Link>
            <Link to="/section-63" className={mobileLink} onClick={closeMenu}>Section 63 BSA</Link>
            <a
              href="https://github.com/Kishordiu/pipertraces"
              target="_blank"
              rel="noreferrer"
              className={mobileLink + " col-span-2 justify-center"}
              onClick={closeMenu}
            >
              View project on GitHub ↗
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between md:py-12">
        <p><span className="font-serif text-lg italic text-foreground">PiperTrace</span> — Evidence, not just a verdict.</p>
        <p className="font-mono text-[10px] leading-relaxed uppercase tracking-wider sm:text-xs sm:tracking-widest">Local-first · Zero API keys · NexAI InnoHack 2026, VIT Vellore</p>
      </div>
    </footer>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{children}</p>;
}
