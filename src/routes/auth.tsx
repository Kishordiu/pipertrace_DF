import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Eyebrow, SiteHeader } from "@/components/site";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PiperTrace" },
      { name: "description", content: "Sign in to PiperTrace to analyse media and keep a private case history." },
      { property: "og:title", content: "Sign in — PiperTrace" },
      { property: "og:description", content: "Private, per-account forensic case history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/studio" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/studio" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/studio` },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your inbox to confirm your email, then sign in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
  }

  const input = "w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="min-h-screen grain">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <Eyebrow>Private case room</Eyebrow>
          <h1 className="mt-4 text-5xl font-medium tracking-tight">
            Your evidence <span className="font-serif font-normal italic">stays yours.</span>
          </h1>
          <p className="mt-6 max-w-md text-muted-foreground">
            Analysis runs in your browser. Originals, maps and the audit trail are stored privately under your account —
            no one else can read them.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-serif text-3xl italic">{mode === "in" ? "Sign in" : "Create account"}</h2>
          <div className="mt-6 space-y-3">
            <button type="button" onClick={() => social("google")}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted">
              Continue with Google
            </button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
              Continue with Lovable
            </button>
          </div>
          <div className="my-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />or email<span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input className={input} type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <input className={input} type="password" required minLength={8} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
            <button disabled={busy} className="w-full rounded-lg bg-ink px-4 py-3 text-sm text-ink-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-primary hover:underline">
            {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
