import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, SiteFooter, SiteHeader } from "@/components/site";
import { categories } from "@/lib/categories";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — PiperTrace" },
      { name: "description", content: "How PiperTrace analyses images, documents, video and audio — and what each analysis cannot conclude." },
      { property: "og:title", content: "Methodology — PiperTrace" },
      { property: "og:description", content: "Category-aware forensic methods with stated limits." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Methodology,
});

function Methodology() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>Methodology</Eyebrow>
        <h1 className="mt-4 max-w-3xl text-5xl font-medium tracking-tight">
          One standard, <span className="font-serif font-normal italic">four</span> kinds of media.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Every upload starts the same way: the original file's SHA-256 digest is computed locally and logged to the
          audit trail before any analysis runs.
        </p>
        <div className="mt-16 divide-y divide-border border-y border-border">
          {categories.map((c) => (
            <section key={c.id} id={c.id} className="grid scroll-mt-24 gap-8 py-14 md:grid-cols-12">
              <div className="md:col-span-4">
                <p className="font-mono text-xs text-muted-foreground">{c.index} · {c.tagline}</p>
                <h2 className="mt-3 font-serif text-5xl italic">{c.title}</h2>
                <img src={c.art} alt="" width={1024} height={1024} loading="lazy" className="mt-6 h-40 w-40 object-contain" />
              </div>
              <div className="space-y-6 md:col-span-8">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Method</p>
                  <p className="mt-2 text-lg leading-relaxed">{c.method}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted p-5">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">What it cannot conclude</p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{c.limits}</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
