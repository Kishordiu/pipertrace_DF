import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, SiteFooter, SiteHeader } from "@/components/site";

export const Route = createFileRoute("/section-63")({
  head: () => ({
    meta: [
      { title: "Section 63 BSA documentation — PiperTrace" },
      { name: "description", content: "How PiperTrace helps prepare Section 63 Bharatiya Sakshya Adhiniyam, 2023 documentation — as a draft for human review." },
      { property: "og:title", content: "Section 63 BSA documentation — PiperTrace" },
      { property: "og:description", content: "A preparation aid for electronic-record documentation, never an auto-certificate." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Section63,
});

const organises = ["Electronic-record and output details", "System particulars that are actually known", "SHA-256 digest and custody timeline", "Fields required by the statutory Schedule"];
const never = ["Invent a signatory's name, qualification or identity", "Generate a signature or certification", "Promise court admissibility", "Send media to a third party without your explicit action"];

function Section63() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>Bharatiya Sakshya Adhiniyam, 2023 · Section 63</Eyebrow>
        <h1 className="mt-4 max-w-3xl text-5xl font-medium tracking-tight">
          A draft to <span className="font-serif font-normal italic">prepare</span>, never a certificate to trust blindly.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          PiperTrace keeps the technical forensic report separate from the certificate draft. The draft needs
          completion and review by an appropriate person.
        </p>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-serif text-3xl italic">It organises</h2>
            <ul className="mt-6 space-y-3">{organises.map((t) => <li key={t} className="border-b border-border pb-3">{t}</li>)}</ul>
          </div>
          <div className="rounded-2xl bg-ink p-8 text-ink-foreground">
            <h2 className="font-serif text-3xl italic">It will never</h2>
            <ul className="mt-6 space-y-3 opacity-85">{never.map((t) => <li key={t} className="border-b border-ink-foreground/15 pb-3">{t}</li>)}</ul>
          </div>
        </div>
        <p className="mt-12 font-mono text-xs text-muted-foreground">
          Personal identifiers are masked by default in previews, case lists, logs and PDF reports.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
