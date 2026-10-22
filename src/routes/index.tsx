import { createFileRoute, Link } from "@tanstack/react-router";
import { EvidenceDeck } from "@/components/EvidenceDeck";
import { Eyebrow, SiteFooter, SiteHeader } from "@/components/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PiperTrace — Evidence, not just a verdict" },
      { name: "description", content: "Local-first multimodal media forensics for images, documents, video and audio. Real signals, honest limits, no API keys." },
      { property: "og:title", content: "PiperTrace — Evidence, not just a verdict" },
      { property: "og:description", content: "Local-first multimodal media forensics with provenance-aligned, quality-gated evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const pillars = [
  { k: "Provenance", v: "Every finding names the model or method that produced it, its version, and its documented meaning." },
  { k: "Quality gate", v: "Input and output reliability are measured first. Weak inputs lower the weight of a finding — visibly." },
  { k: "Concordance", v: "Independent analyses stay separate. PiperTrace shows where they agree, disagree, and what cannot be concluded." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden grain">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-24 md:grid-cols-12">
            <div className="md:col-span-8">
              <Eyebrow>Multimodal media forensics · local-first</Eyebrow>
              <h1 className="mt-6 text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
                Evidence, <span className="font-serif font-normal italic text-primary">not just</span> a verdict.
              </h1>
            </div>
            <div className="flex flex-col justify-end gap-6 md:col-span-4">
              <p className="text-lg leading-relaxed text-muted-foreground">
                PiperTrace hashes the original file, runs category-specific local analysis, and maps each finding to
                coordinates or timestamps — with its source, its reliability, and its limits.
              </p>
              <div className="flex gap-3">
                <Link to="/methodology" className="rounded-full bg-ink px-5 py-3 text-sm text-ink-foreground hover:opacity-90">Read the method</Link>
                <Link to="/section-63" className="rounded-full border border-border px-5 py-3 text-sm hover:bg-muted">Section 63 BSA</Link>
              </div>
            </div>
          </div>
        </section>

        <EvidenceDeck />

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Eyebrow>The PiperTrace algorithm</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight md:text-5xl">
              Provenance-aligned, <span className="font-serif font-normal italic">quality-gated</span> evidence concordance.
            </h2>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
              {pillars.map((x, i) => (
                <div key={x.k} className="bg-card p-8">
                  <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
                  <h3 className="mt-6 font-serif text-3xl italic">{x.k}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{x.v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-2">
            <h2 className="text-4xl font-medium tracking-tight md:text-5xl">
              What we <span className="font-serif font-normal italic">refuse</span> to fake.
            </h2>
            <ul className="space-y-4 font-mono text-sm opacity-80">
              {["No random-weight models presented as detectors", "No “probability” without calibration", "No fabricated heatmaps, timestamps or accuracy claims", "No paid API or Gemini key required for the core workflow", "No auto-certificates — legal drafts need a human"].map((t) => (
                <li key={t} className="border-b border-ink-foreground/15 pb-4">— {t}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
