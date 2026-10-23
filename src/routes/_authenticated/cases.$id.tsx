import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, SiteHeader } from "@/components/site";
import { deleteCase, logEvent, signedUrl, verifyStoredHash, type StoredFindings } from "@/lib/cases";

export const Route = createFileRoute("/_authenticated/cases/$id")({
  head: () => ({ meta: [{ title: "Case report — PiperTrace" }, { name: "description", content: "Forensic case report." }] }),
  component: CaseDetail,
});

function CaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reveal, setReveal] = useState(false);
  const q = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data: c, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: ev } = await supabase.from("audit_events").select("*").eq("case_id", id).order("created_at");
      const f = c.findings as unknown as StoredFindings;
      const urls: Record<string, string> = { original: await signedUrl(c.storage_path) };
      for (const m of f.maps ?? []) urls[m.key] = await signedUrl(m.path);
      return { c, f, ev: ev ?? [], urls };
    },
  });

  if (q.isLoading) return <Shell><p className="text-muted-foreground">Loading case…</p></Shell>;
  if (q.error || !q.data) return <Shell><p className="text-destructive">{(q.error as Error)?.message ?? "Case not found"}</p></Shell>;
  const { c, f, ev, urls } = q.data;

  async function verify() {
    const h = await verifyStoredHash(c.storage_path);
    const ok = h === c.sha256;
    await logEvent(c.id, "integrity_verified", { match: ok, sha256: h });
    ok ? toast.success("Stored file matches the original SHA-256.") : toast.error("Stored file hash does NOT match.");
    qc.invalidateQueries({ queryKey: ["case", id] });
  }
  async function printReport() {
    await logEvent(c.id, "report_generated", {});
    window.print();
  }
  async function remove() {
    if (!confirm("Delete this case, its files and audit log permanently?")) return;
    await deleteCase(c);
    qc.invalidateQueries({ queryKey: ["cases"] });
    navigate({ to: "/cases" });
  }
  const mask = c.category === "document" && !reveal;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{c.category} · signal inspection · {f.engine}</Eyebrow>
          <h1 className="mt-3 text-4xl font-medium tracking-tight">{c.title}</h1>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">SHA-256 {c.sha256}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={verify} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">Verify hash</button>
          <button onClick={printReport} className="rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground">Download PDF</button>
          <button onClick={remove} className="rounded-full px-4 py-2 text-sm text-destructive hover:bg-muted">Delete</button>
        </div>
      </div>

      <section className={`mt-8 rounded-xl border p-5 ${f.quality.level === "good" ? "border-border bg-secondary" : "border-border bg-muted"}`}>
        <p className="font-mono text-[11px] uppercase tracking-widest">Input quality: {f.quality.level}</p>
        {f.quality.notes.map((n) => <p key={n} className="mt-1 text-sm text-muted-foreground">{n}</p>)}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reader-friendly summary</p>
        <h2 className="mt-2 font-serif text-3xl italic">What the results mean</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This section translates the measurements into plain language. It describes visible differences or signal patterns only; it does not decide whether a file is genuine or fraudulent.
        </p>
        {c.category === "image" && (
          <div className="mt-5 space-y-3 text-sm leading-6">
            <p><strong>What was checked:</strong> PiperTrace compared the uploaded image with a new JPEG copy and measured how much pixel values changed during that re-save.</p>
            <p><strong>What was observed:</strong> {(() => {
              const mean = Number(f.signals.find((s) => s.key === "ela_mean")?.value ?? 0);
              const p99 = Number(f.signals.find((s) => s.key === "ela_p99")?.value ?? 0);
              return `The average re-save difference is ${mean}/255 and the 99th-percentile difference is ${p99}/255. The ELA map highlights areas with larger re-save differences; text, sharp edges, patterns, and compression can naturally create these highlights.`;
            })()}</p>
            <p><strong>Where to look:</strong> Use the Error Level Map beside the original and compare bright/high-contrast areas with the same places in the original. This version of the analysis does not label specific objects or prove that a highlighted area was edited.</p>
            <p><strong>Plain-language takeaway:</strong> These measurements are review cues, not a verdict. No trained image-manipulation detector or calibrated authenticity score is configured.</p>
          </div>
        )}
        {c.category === "document" && (
          <div className="mt-5 space-y-3 text-sm leading-6">
            <p><strong>What was checked:</strong> PiperTrace aligned the uploaded document image with the supplied reference and compared pixel brightness.</p>
            <p><strong>What was observed:</strong> {(() => {
              const changed = f.signals.find((s) => s.key === "changed_pct")?.value ?? "not available";
              const count = f.signals.find((s) => s.key === "regions")?.value ?? f.regions?.length ?? 0;
              return `${changed}% of pixels crossed the configured difference threshold, grouped into ${count} differing region(s). Differences may come from text or layout changes, but also from scanning, resizing, alignment, lighting, or compression.`;
            })()}</p>
            <p><strong>Where to look:</strong> Coordinates below are measured from the top-left corner of the uploaded evidence image (x = from left, y = from top). Width and height describe each rectangular area in pixels. Open the Difference Overlay to see the highlighted locations.</p>
            {f.dims && f.regions && f.regions.length > 0 ? (
              <ol className="list-decimal space-y-2 pl-5">
                {f.regions.slice(0, 8).map((r, i) => {
                  const cx = r.x + r.w / 2;
                  const cy = r.y + r.h / 2;
                  const horizontal = cx < f.dims!.width / 3 ? "left" : cx > (2 * f.dims!.width) / 3 ? "right" : "center";
                  const vertical = cy < f.dims!.height / 3 ? "upper" : cy > (2 * f.dims!.height) / 3 ? "lower" : "middle";
                  return <li key={i}><strong>Area {i + 1} — {vertical} {horizontal}:</strong> x={r.x}, y={r.y}, width={r.w}, height={r.h} px; about {r.changed}% of the merged grid cells differed. Inspect this area in both images.</li>;
                })}
              </ol>
            ) : <p>No separate differing regions were stored for this case.</p>}
            <p><strong>Plain-language takeaway:</strong> A difference confirms the two image files are not pixel-identical in those areas. It does not, by itself, prove fraud or identify who made a change.</p>
          </div>
        )}
        {(c.category === "video" || c.category === "audio") && (
          <div className="mt-5 space-y-3 text-sm leading-6">
            <p><strong>What was checked:</strong> {c.category === "video" ? "PiperTrace sampled video frames and measured changes between neighbouring samples." : "PiperTrace measured audio levels, silence, and frequency patterns."}</p>
            <p><strong>What was observed:</strong> Review the measured-signal table and graphs for timestamps or ranges that stand out. These signals describe the file's technical properties, not whether it is authentic.</p>
            <p><strong>Plain-language takeaway:</strong> Abrupt changes, silence, clipping, or unusual frequency patterns can occur in ordinary recordings too. No trained deepfake classifier is configured.</p>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {c.category !== "audio" && c.category !== "video" && (
          <Figure label="Original" caption={mask ? "Masked by default to protect personal details." : c.file_name}>
            <img src={urls["original"]} alt="Original evidence" className={`w-full rounded-lg ${mask ? "blur-xl" : ""}`} />
            {c.category === "document" && <button onClick={() => setReveal(!reveal)} className="mt-2 text-xs text-primary print:hidden">{reveal ? "Mask" : "Reveal"}</button>}
          </Figure>
        )}
        {c.category === "video" && <Figure label="Original" caption={c.file_name}><video src={urls["original"]} controls className="w-full rounded-lg bg-ink" /></Figure>}
        {c.category === "audio" && <Figure label="Original" caption={c.file_name}><audio src={urls["original"]} controls className="w-full" /></Figure>}
        {f.maps.map((m) => (
          <Figure key={m.key} label={m.label} caption={m.caption}>
            <img src={urls[m.key]} alt={m.label} className={`w-full rounded-lg bg-ink ${mask && m.key === "diff" ? "blur-xl" : ""}`} />
          </Figure>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-3xl italic">Measured signals</h2>
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-border border-y border-border">
            {f.signals.map((s) => (
              <tr key={s.key}><td className="py-3 pr-4">{s.label}</td><td className="py-3 pr-4 font-mono">{s.value}{s.unit ? ` ${s.unit}` : ""}</td><td className="py-3 text-muted-foreground">{s.method}</td></tr>
            ))}
          </tbody>
        </table>
        {f.regions && f.regions.length > 0 && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">Regions (x,y,w,h px): {f.regions.slice(0, 12).map((r) => `[${r.x},${r.y},${r.w},${r.h}]`).join(" ")}</p>
        )}
      </section>

      {f.series.map((s) => (
        <section key={s.label} className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-serif text-2xl italic">{s.label}</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <LineChart data={s.points} margin={{ left: 8, right: 8, bottom: 16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke="var(--muted-foreground)" fontSize={11} label={{ value: s.xLabel, position: "insideBottom", offset: -8, fontSize: 11 }} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} label={{ value: s.yLabel, angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="y" stroke="var(--primary)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ))}

      <section className="mt-10 rounded-2xl bg-ink p-6 text-ink-foreground">
        <h2 className="font-serif text-2xl italic">What this cannot conclude</h2>
        <ul className="mt-3 space-y-2 text-sm opacity-85">{f.limits.map((l) => <li key={l}>— {l}</li>)}</ul>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl italic">Audit trail</h2>
          <ol className="mt-4 space-y-3 border-l border-border pl-4">
            {ev.map((e) => (
              <li key={e.id}><p className="font-mono text-xs text-muted-foreground">{new Date(e.created_at).toISOString()}</p><p className="text-sm">{e.event.replace(/_/g, " ")}</p></li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-3xl italic">Section 63 BSA — draft</h2>
          <p className="mt-2 text-xs text-muted-foreground">Preparation aid only. Requires completion and review by an appropriate person. Not a certificate.</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Electronic record" v={`${c.file_name} (${c.mime_type}, ${c.size_bytes} bytes)`} />
            <Row k="Hash algorithm / digest" v={`SHA-256 ${c.sha256}`} />
            {c.reference_sha256 && <Row k="Reference digest" v={`SHA-256 ${c.reference_sha256}`} />}
            <Row k="Received" v={new Date(c.created_at).toISOString()} />
            <Row k="Analysis system" v={`${f.engine}, browser-local`} />
            <Row k="Signatory name / designation" v="________________ (to be completed)" />
            <Row k="Device & lawful control statement" v="________________ (to be completed)" />
            <Row k="Signature & date" v="________________" />
          </dl>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-14">{children}</main></div>;
}
function Figure({ label, caption, children }: { label: string; caption: string; children: React.ReactNode }) {
  return <figure className="rounded-2xl border border-border bg-card p-4"><p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>{children}<figcaption className="mt-2 text-xs text-muted-foreground">{caption}</figcaption></figure>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt><dd className="break-all">{v}</dd></div>;
}
