import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, SiteHeader } from "@/components/site";

type AuthMode = "sign-in" | "sign-up" | "reset-request" | "update-password";

function isRecoveryCallback() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "recovery";
}

// OAuth/email callbacks must never return a phone user to an unreachable localhost URL.
// Local development sign-in returns to the live app unless a non-local origin is being used.
const PRODUCTION_APP_ORIGIN = "https://diufoundry-storybook.vercel.app";

function authReturnUrl(query = "") {
  if (typeof window === "undefined") return `${PRODUCTION_APP_ORIGIN}/auth${query}`;
  const { hostname, origin } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  return `${isLocalhost ? PRODUCTION_APP_ORIGIN : origin}/auth${query}`;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — PiperTrace" },
      { name: "description", content: "Securely sign in to manage your private PiperTrace evidence cases." },
      { property: "og:title", content: "Sign in — PiperTrace" },
      { property: "og:description", content: "Private evidence cases and audit history." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(() => isRecoveryCallback() ? "update-password" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleAuthIssue, setGoogleAuthIssue] = useState<"missing-secret" | "provider-disabled" | "redirect" | "generic" | null>(null);

  useEffect(() => {
    let active = true;
    const recoveryCallback = isRecoveryCallback();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update-password");
        setBusy(false);
        return;
      }
      if (session && !recoveryCallback) void navigate({ to: "/studio", replace: true });
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("Unable to restore the authentication session.", error.message);
        return;
      }
      if (recoveryCallback) {
        setMode("update-password");
        return;
      }
      if (data.session) void navigate({ to: "/studio", replace: true });
    }).catch((error: unknown) => {
      if (active) {
        console.error("Unable to restore the authentication session.", error);
        toast.error("We couldn't restore your session. Please try signing in again.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      if (mode === "sign-in") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) throw new Error("Sign-in did not create a session. Please try again.");
        toast.success("Signed in securely.");
        await navigate({ to: "/studio", replace: true });
        return;
      }

      if (mode === "sign-up") {
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authReturnUrl() },
        });
        if (error) throw error;
        setPassword("");
        setConfirmPassword("");
        if (data.session) {
          toast.success("Your account is ready.");
          await navigate({ to: "/studio", replace: true });
        } else {
          setMode("sign-in");
          toast.success("Check your inbox to verify your address before signing in, if email confirmation is enabled.");
        }
        return;
      }

      if (mode === "reset-request") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authReturnUrl("?mode=recovery"),
        });
        if (error) throw error;
        setMode("sign-in");
        toast.success("If an account exists for that address, a password-reset link will arrive shortly.");
        return;
      }

      if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
      if (password !== confirmPassword) throw new Error("The passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
      await navigate({ to: "/studio", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (busy) return;
    setGoogleAuthIssue(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authReturnUrl(),
          // Request only the standard Google identity needed for sign-in.
          // Additional Google APIs must have a separate, explicit consent flow.
          scopes: "openid email profile",
        },
      });
      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in is unavailable.";
      if (/missing oauth secret|missing.*client secret|external_google_secret|unsupported provider/i.test(message)) {
        setGoogleAuthIssue("missing-secret");
        toast.error("Google sign-in needs one-time provider configuration.");
      } else if (/provider.*(not enabled|disabled)/i.test(message)) {
        setGoogleAuthIssue("provider-disabled");
        toast.error("Google sign-in is not enabled in Supabase yet.");
      } else if (/redirect.*(allow|url|not.*permitted)|not.*allowlisted|redirect_uri_mismatch/i.test(message)) {
        setGoogleAuthIssue("redirect");
        toast.error("The OAuth redirect URL needs to be added to the provider configuration.");
      } else {
        setGoogleAuthIssue("generic");
        toast.error(message);
      }
      setBusy(false);
    }
  }

  const resetForm = mode === "reset-request";
  const updatingPassword = mode === "update-password";
  const signingUp = mode === "sign-up";
  const heading = resetForm ? "Reset your password" : updatingPassword ? "Choose a new password" : signingUp ? "Create your account" : "Welcome back";
  const description = resetForm
    ? "We'll send a secure reset link if an account exists for this address."
    : updatingPassword
      ? "Choose a new password for your PiperTrace account."
      : signingUp
        ? "Create a private workspace for your evidence and case history."
        : "Sign in to continue to your private evidence workspace.";

  const inputClass = "w-full min-w-0 rounded-xl border border-border bg-white px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-4 focus:ring-primary/10";
  const primaryClass = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#315BEB] via-[#337DEB] to-[#35C8D5] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(49,91,235,0.65)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_28px_-14px_rgba(49,91,235,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 md:grid-cols-2 md:gap-16 md:py-16">
        <section className="max-w-xl">
          <Eyebrow>Private case room</Eyebrow>
          <h1 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Your evidence <span className="font-serif font-normal italic text-primary">stays yours.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sign in to keep your evidence, generated findings, integrity checks and case history together in one private workspace.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <TrustNote title="Private case history" detail="Cases are scoped to the signed-in account." />
            <TrustNote title="Local-first analysis" detail="No Gemini key is required for the core workflow." />
          </div>
          <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />
            Use only media you are authorized to inspect. Account access does not make a finding a legal certification.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-border/80 bg-white p-5 shadow-[0_30px_80px_-48px_rgba(29,53,87,0.3)] sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#315BEB] to-[#35C8D5] text-white shadow-sm">
              {resetForm ? <Mail size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-2xl italic text-foreground sm:text-3xl">{heading}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>

          {!resetForm && !updatingPassword && (
            <>
              <button type="button" disabled={busy} onClick={() => void signInWithGoogle()}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-60">
                <GoogleMark />
                Continue with Google
              </button>
              {googleAuthIssue && (
                <div role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-xs leading-relaxed text-amber-950">
                  <p className="font-semibold">
                    {googleAuthIssue === "missing-secret"
                      ? "Google sign-in is missing its OAuth client secret."
                      : googleAuthIssue === "provider-disabled"
                        ? "Google sign-in is not enabled in Supabase."
                        : googleAuthIssue === "redirect"
                          ? "The Google sign-in redirect is not allowlisted."
                          : "Google sign-in could not start."}
                  </p>
                  <p className="mt-1.5">
                    {googleAuthIssue === "missing-secret"
                      ? "In Supabase Dashboard → Authentication → Sign In / Providers → Google, add the Web OAuth Client ID and Client Secret created in Google Cloud. Store the secret in Supabase only—never in this app or GitHub."
                      : googleAuthIssue === "provider-disabled"
                        ? "Enable the Google provider in Supabase and save its Web OAuth Client ID and Client Secret. Email/password sign-in remains available."
                        : googleAuthIssue === "redirect"
                          ? "Allow the Supabase callback URI in Google Cloud and allow this app's /auth return URL in Supabase Auth URL Configuration."
                          : "Check the Google provider configuration in Supabase. Email/password sign-in remains available."}
                  </p>
                  <a className="mt-2 inline-flex font-semibold underline underline-offset-2" href="https://github.com/Kishordiu/diufoundry-storybook/blob/main/docs/GOOGLE_OAUTH_SETUP.md" target="_blank" rel="noreferrer">
                    View setup instructions
                  </a>
                </div>
              )}
              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            {!updatingPassword && (
              <div>
                <label htmlFor="pipertrace-email" className="mb-1.5 block text-xs font-medium text-foreground">Email address</label>
                <input id="pipertrace-email" className={inputClass} type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            )}

            {!resetForm && (
              <div>
                <label htmlFor="pipertrace-password" className="mb-1.5 block text-xs font-medium text-foreground">
                  {updatingPassword ? "New password" : "Password"}
                </label>
                <div className="relative">
                  <input id="pipertrace-password" className={inputClass + " pr-12"} type={showPassword ? "text" : "password"} name={updatingPassword || signingUp ? "new-password" : "current-password"} autoComplete={updatingPassword || signingUp ? "new-password" : "current-password"} minLength={8} required placeholder={updatingPassword ? "At least 8 characters" : "Enter your password"} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button type="button" className="absolute inset-y-0 right-2 inline-flex w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {(signingUp || updatingPassword) && <p className="mt-1.5 text-[11px] text-muted-foreground">Use at least 8 characters.</p>}
              </div>
            )}

            {(signingUp || updatingPassword) && (
              <div>
                <label htmlFor="pipertrace-confirm-password" className="mb-1.5 block text-xs font-medium text-foreground">Confirm password</label>
                <input id="pipertrace-confirm-password" className={inputClass} type={showPassword ? "text" : "password"} name="confirm-password" autoComplete="new-password" minLength={8} required placeholder="Enter the password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
            )}

            <button type="submit" className={primaryClass} disabled={busy}>
              {busy ? <><LoaderCircle size={17} className="animate-spin" /> Please wait…</> : resetForm ? "Send reset link" : updatingPassword ? "Update password" : signingUp ? "Create account" : "Sign in securely"}
            </button>
          </form>

          <div className="mt-5 flex min-h-8 flex-wrap items-center justify-between gap-3 text-xs">
            {!resetForm && !updatingPassword && !signingUp && <button type="button" onClick={() => setMode("reset-request")} className="text-primary hover:underline">Forgot password?</button>}
            {updatingPassword && <p className="text-muted-foreground">Open the reset link, then choose your new password above.</p>}
            {resetForm && <button type="button" onClick={() => setMode("sign-in")} className="text-primary hover:underline">Back to sign in</button>}
            {!updatingPassword && !resetForm && (
              <button type="button" onClick={() => { setMode(signingUp ? "sign-in" : "sign-up"); setPassword(""); setConfirmPassword(""); }} className="ml-auto text-primary hover:underline">
                {signingUp ? "Already have an account?" : "Create account"}
              </button>
            )}
          </div>
          <p className="mt-5 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground">
            Authentication is provided directly by Supabase. Google sign-in requires the Google provider to be configured in the Supabase project.
          </p>
        </section>
      </main>
    </div>
  );
}

function TrustNote({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-border/80 bg-white/80 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>;
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.41-.19-2.08H12v3.94h5.38a4.6 4.6 0 0 1-2 3.02v2.46h3.24c1.9-1.75 2.98-4.32 2.98-7.34Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.46c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.54A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.41 13.95A6.02 6.02 0 0 1 6.1 12c0-.68.12-1.34.32-1.95V7.51H3.06A10 10 0 0 0 2 12c0 1.62.39 3.14 1.06 4.49l3.35-2.54Z"/>
      <path fill="#EA4335" d="M12 5.93c1.47 0 2.79.5 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.35 2.54C7.2 7.69 9.4 5.93 12 5.93Z"/>
    </svg>
  );
}
