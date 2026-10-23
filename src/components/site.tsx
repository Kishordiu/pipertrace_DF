import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const auth = supabase.auth;
      const { data } = auth.onAuthStateChange((_event, session) => {
        if (active) {
          setUserEmail(session?.user?.email ?? null);
          setAuthReady(true);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();

      void auth.getSession().then(({ data: sessionData }) => {
        if (!active) return;
        setUserEmail(sessionData.session?.user?.email ?? null);
        setAuthReady(true);
      }).catch((error: unknown) => {
        if (active) {
          setAuthReady(true);
          console.error("Unable to read the current session.", error);
        }
      });
    } catch (error) {
      setAuthReady(true);
      console.error("Supabase authentication is not configured.", error);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const link = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  const mobileLink = "flex min-h-11 items-center rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-secondary";

  function closeMenu() {
    setMenuOpen(false);
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserEmail(null);
      closeMenu();
      toast.success("You have been signed out.");
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-2.5" aria-label="PiperTrace home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2d4248] p-1.5 shadow-sm"><img src="/pipertrace-mark.svg" alt="" className="h-full w-full object-contain" /></span>
          <span className="font-serif text-xl italic sm:text-2xl">PiperTrace</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">forensics</span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex lg:gap-6" aria-label="Main navigation">
          <Link to="/studio" search={{}} className={link} activeProps={{ className: "text-foreground" }}>Studio</Link>
          {userEmail && <Link to="/cases" className={link} activeProps={{ className: "text-foreground" }}>Cases</Link>}
          <Link to="/methodology" className={link} activeProps={{ className: "text-foreground" }}>Method</Link>
          <Link to="/section-63" className={link} activeProps={{ className: "text-foreground" }}>Section 63</Link>
          {authReady && (userEmail ? (
            <>
              <span className="max-w-36 truncate text-xs text-muted-foreground" title={userEmail}>{userEmail}</span>
              <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground transition hover:opacity-90">
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="rounded-full bg-gradient-to-r from-[#315BEB] to-[#35C8D5] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5">Sign in</Link>
          ))}
        </nav>

        <button type="button" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden" aria-controls="pipertrace-mobile-nav" aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      {menuOpen && (
        <div id="pipertrace-mobile-nav" className="border-t border-border/70 bg-background/95 px-4 pb-4 pt-3 shadow-card md:hidden">
          <nav className="mx-auto grid max-w-6xl grid-cols-2 gap-2" aria-label="Mobile navigation">
            <Link to="/studio" search={{}} className={mobileLink} onClick={closeMenu}>Studio</Link>
            {userEmail && <Link to="/cases" className={mobileLink} onClick={closeMenu}>Cases</Link>}
            <Link to="/methodology" className={mobileLink} onClick={closeMenu}>Methodology</Link>
            <Link to="/section-63" className={mobileLink} onClick={closeMenu}>Section 63 BSA</Link>
            {userEmail ? (
              <>
                <div className="col-span-2 rounded-xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">Signed in as <span className="font-medium text-foreground">{userEmail}</span></div>
                <button type="button" className={mobileLink + " col-span-2 justify-center"} onClick={() => void signOut()}><LogOut size={15} className="mr-2" /> Sign out</button>
              </>
            ) : (
              <Link to="/auth" className={mobileLink + " col-span-2 justify-center"} onClick={closeMenu}><ShieldCheck size={15} className="mr-2" /> Sign in / Create account</Link>
            )}
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
        <p className="font-mono text-[10px] leading-relaxed uppercase tracking-wider sm:text-xs sm:tracking-widest">Local-first · Account-protected cases · No Gemini key required</p>
      </div>
    </footer>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{children}</p>;
}
