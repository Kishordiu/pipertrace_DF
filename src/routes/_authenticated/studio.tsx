import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eyebrow, SiteHeader } from "@/components/site";
import { categories } from "@/lib/categories";
import { analyzeAudio, analyzeDocument, analyzeImage, analyzeVideo, sha256, type Category } from "@/lib/forensics";
import { saveCase } from "@/lib/cases";

type Search = { mode?: Category };
const ACCEPT: Record<Category, string> = { image: "image/*", document: "image/*", video: "video/*", audio: "audio/*" };

export const Route = createFileRoute("/_authenticated/studio")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: ["image", "document", "video", "audio"].includes(s.mode as string) ? (s.mode as Category) : undefined,
  }),
  head: () => ({ meta: [{ title: "Studio — PiperTrace" }, { name: "description", content: "Analyse media locally." }] }),
  component: Studio,
});

function Studio() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category>(mode ?? "image");
  const [file, setFile] = useState<File | null>(null);
  const [ref, setRef] = useState<File | null>(null);
  const [step, setStep] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    if (cat === "document" && !ref) return toast.error("Add the reference/original document to compare against.");
    try {
      setStep("Computing SHA-256 of the original…");
      const sha = await sha256(file);
      const refSha = ref ? await sha256(ref) : undefined;
      setStep("Running local analysis…");
      const out =
        cat === "image" ? await analyzeImage(file)
        : cat === "document" ? await analyzeDocument(file, ref!)
        : cat === "video" ? await analyzeVideo(file, (p) => setStep(`Sampling frames… ${Math.round(p * 100)}%`))
        : await analyzeAudio(file);
      setStep("Storing evidence and audit trail…");
      const id = await saveCase({ category: cat, title: file.name, file, sha, reference: ref && refSha ? { file: ref, sha: refSha } : undefined, ...out });
      navigate({ to: "/cases/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
      setStep(null);
    }
  }

  const drop = "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center hover:border-primary";
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <Eyebrow>Studio</Eyebrow>
        <h1 className="mt-3 text-4xl font-medium tracking-tight">Open a <span className="font-serif font-normal italic">new case</span></h1>
        <div className="mt-8 grid gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Category">
          {categories.map((c) => (
            <button key={c.id} role="radio" aria-checked={cat === c.id} onClick={() => { setCat(c.id); setFile(null); setRef(null); }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${cat === c.id ? "border-primary bg-secondary" : "border-border bg-card hover:bg-muted"}`}>
              <img src={c.art} alt="" className="h-12 w-12 object-contain" />
              <span><span className="block font-serif text-xl italic">{c.title}</span><span className="text-xs text-muted-foreground">{c.tagline}</span></span>
            </button>
          ))}
        </div>
        <div className={`mt-8 grid gap-4 ${cat === "document" ? "md:grid-cols-2" : ""}`}>
          <label className={drop}>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{cat === "document" ? "Questioned document (image)" : "Evidence file"}</span>
            <span className="mt-2 text-sm">{file ? `${file.name} · ${(file.size / 1e6).toFixed(2)} MB` : "Click to choose a file (max 50 MB)"}</span>
            <input type="file" className="sr-only" accept={ACCEPT[cat]} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {cat === "document" && (
            <label className={drop}>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reference original (image)</span>
              <span className="mt-2 text-sm">{ref ? ref.name : "Click to choose the original to compare"}</span>
              <input type="file" className="sr-only" accept="image/*" onChange={(e) => setRef(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button disabled={!file || !!step || file.size > 50e6} onClick={run}
            className="rounded-full bg-ink px-6 py-3 text-sm text-ink-foreground hover:opacity-90 disabled:opacity-40">Analyse</button>
          {step && <span className="font-mono text-xs text-muted-foreground" aria-live="polite">{step}</span>}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Analysis runs in your browser. Only your account can access the stored file, maps and audit log. Use synthetic test documents — never real ID cards.
        </p>
      </main>
    </div>
  );
}
