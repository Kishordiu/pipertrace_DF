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

type CertificateDraft = {
  partyName: string; partyRelation: string; partyAddress: string; partySource: string; partyOtherSource: string;
  partyMakeModel: string; partyColor: string; partySerial: string; partyDeviceId: string; partyOtherInfo: string;
  roleOwned: boolean; roleMaintained: boolean; roleManaged: boolean; roleOperated: boolean;
  lawfulControlConfirmed: boolean; normalCourseConfirmed: boolean; deviceWorking: string; malfunctionImpact: string;
  partyDate: string; partyTime: string; partyPlace: string;
  expertName: string; expertRelation: string; expertAddress: string; expertDesignation: string; expertSource: string;
  expertOtherSource: string; expertMakeModel: string; expertColor: string; expertSerial: string; expertDeviceId: string;
  expertOtherInfo: string; expertDate: string; expertTime: string; expertPlace: string;
};

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (kind: string) => parts.find((x) => x.type === kind)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")}`;
}
function timeInIndia() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}
function CertificateField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="bsa-field block min-w-0">
    <span className="block text-xs font-semibold text-foreground">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70" />
    <span className="bsa-print-value hidden mt-1 text-sm">{value.trim() || "NOT PROVIDED — complete before signing"}</span>
  </label>;
}
function CertificateSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="bsa-field block min-w-0">
    <span className="block text-xs font-semibold text-foreground">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground">
      <option value="">Select the applicable source type…</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
    <span className="bsa-print-value hidden mt-1 text-sm">{value ? "Selected: [X] " + value : "NOT PROVIDED — select before signing"}</span>
  </label>;
}

function CertificateCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="bsa-checkbox flex items-start gap-2 text-sm leading-6">
    <input className="mt-1 shrink-0" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="flex-1">{label}<span className="bsa-print-value hidden mt-1 text-sm">{checked ? "CONFIRMED BY THE PARTY — verify this is accurate before signing." : "NOT CONFIRMED — must be completed by the party."}</span></span>
  </label>;
}

function CaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reveal, setReveal] = useState(false);
  const [certificate, setCertificate] = useState<CertificateDraft>(() => ({
    partyName: "", partyRelation: "", partyAddress: "", partySource: "", partyOtherSource: "", partyMakeModel: "", partyColor: "", partySerial: "", partyDeviceId: "", partyOtherInfo: "",
    roleOwned: false, roleMaintained: false, roleManaged: false, roleOperated: false, lawfulControlConfirmed: false, normalCourseConfirmed: false, deviceWorking: "unknown", malfunctionImpact: "",
    partyDate: "", partyTime: "", partyPlace: "",
    expertName: "", expertRelation: "", expertAddress: "", expertDesignation: "", expertSource: "", expertOtherSource: "", expertMakeModel: "", expertColor: "", expertSerial: "", expertDeviceId: "", expertOtherInfo: "",
    expertDate: "", expertTime: "", expertPlace: "",
  }));
  const setCertificateField = <K extends keyof CertificateDraft>(key: K, value: CertificateDraft[K]) => setCertificate((current) => ({ ...current, [key]: value }));
  const q = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data: c, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: ev } = await supabase.from("audit_events").select("*").eq("case_id", id).order("created_at");
      const f = c.findings as unknown as StoredFindings;
      const urls: Record<string, string> = { original: await signedUrl(c.storage_path) };
      if (c.reference_path) urls.reference = await signedUrl(c.reference_path);
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
    if (c.category === "document" && !reveal) {
      const approved = window.confirm("This case contains a document image that is masked to protect personal details. Reveal the document in the PDF? Only continue if you are in a private place and authorised to include it.");
      if (approved) {
        setReveal(true);
        await logEvent(c.id, "report_generated", { unmasked_document: true });
        window.setTimeout(() => window.print(), 180);
        return;
      }
    }
    await logEvent(c.id, "report_generated", { unmasked_document: c.category === "document" && reveal });
    window.print();
  }
  async function remove() {
    if (!confirm("Delete this case, its files and audit log permanently?")) return;
    await deleteCase(c);
    qc.invalidateQueries({ queryKey: ["cases"] });
    navigate({ to: "/cases" });
  }
  const mask = c.category === "document" && !reveal;
  const visualReviewRegions = c.category === "image" && f.dims
    ? (f.regions ?? [])
        .filter((region) => region.w * region.h >= f.dims!.width * f.dims!.height * 0.0015)
        .sort((a, b) => (b.w * b.h) - (a.w * a.h))
        .slice(0, 6)
    : [];

  return (
    <Shell>
      <section className="report-cover report-block rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">PiperTrace · Digital Evidence Review</p>
            <h1 className="mt-3 font-serif text-4xl italic tracking-tight">Technical examination report</h1>
            <p className="report-muted mt-2 text-sm">Measured inspection record — not an automatic authenticity verdict.</p>
          </div>
          <div className="rounded-xl border border-border px-3 py-2 text-right">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Case category</p>
            <p className="mt-1 text-sm font-semibold capitalize">{c.category}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ReportFact label="Evidence file" value={c.file_name} />
          <ReportFact label="File size" value={formatBytes(c.size_bytes)} />
          <ReportFact label="Received (IST)" value={formatIst(c.created_at)} />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-[#f7fafb] p-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">SHA-256 integrity fingerprint</p>
          <p className="bsa-hash mt-1 break-all font-mono text-xs leading-5">{c.sha256}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-xs">Input quality: {f.quality.level}</span>
          {c.category === "image" && <span className="rounded-full border border-[#e6b3ac] bg-[#fff4f2] px-3 py-1 text-xs text-[#8b2920]">{visualReviewRegions.length} boxed review areas</span>}
          {c.category === "document" && <span className="rounded-full border border-[#e6b3ac] bg-[#fff4f2] px-3 py-1 text-xs text-[#8b2920]">{f.regions?.length ?? 0} differing regions</span>}
        </div>
      </section>
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <Eyebrow>{c.category} · measured signal inspection · {f.engine}</Eyebrow>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">{c.title}</h2>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">SHA-256 {c.sha256}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={verify} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">Verify hash</button>
          <button onClick={printReport} className="rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground">Download PDF</button>
          <button onClick={remove} className="rounded-full px-4 py-2 text-sm text-destructive hover:bg-muted">Delete</button>
        </div>
      </div>

      <section className={`report-block mt-5 rounded-xl border p-5 ${f.quality.level === "good" ? "border-border bg-secondary" : "border-border bg-muted"}`}>
        <p className="font-mono text-[11px] uppercase tracking-widest">Input quality: {f.quality.level}</p>
        {f.quality.notes.map((n) => <p key={n} className="mt-1 text-sm text-muted-foreground">{n}</p>)}
      </section>

      <section className="report-block mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reader-friendly summary</p>
        <h2 className="mt-2 font-serif text-3xl italic">What the results mean</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This section translates the measurements into plain language. It describes visible differences or signal patterns only; it does not decide whether a file is genuine or fraudulent.
        </p>
        {c.category === "image" && (
          <div className="mt-5 space-y-3 text-sm leading-6">
            <p><strong>What this test does:</strong> It re-saves this image as JPEG and measures local pixel differences. It does not compare identity fields to an original.</p>
            <p><strong>What the numbers say:</strong> The mean re-save difference is {f.signals.find((s) => s.key === "ela_mean")?.value ?? "—"}/255. The 99th-percentile difference is {f.signals.find((s) => s.key === "ela_p99")?.value ?? "—"}/255. These are pixel measurements, not a probability of tampering.</p>
            <p><strong>Visual review map:</strong> Red numbered boxes mark up to six regions with the highest local JPEG re-save differences. They show where a human should look first; text edges, logos, patterned backgrounds, and compression can also trigger these boxes.</p>
            <p className="rounded-lg border border-[#e6b3ac] bg-[#fff4f2] p-3 text-sm"><strong>Finding:</strong> This single-image test cannot determine the exact field that was changed or provide a validated 90%+ edit confidence. To compare names, dates, numbers, or photo placement, use Document mode with a trusted original.</p>
          </div>
        )}
        {c.category === "document" && (
          <div className="mt-5 space-y-3 text-sm leading-6">
            <p><strong>What was checked:</strong> PiperTrace aligned the uploaded document image with the supplied reference and compared pixel brightness.</p>
            <p><strong>What was observed:</strong> {(() => {
              const changed = f.signals.find((s) => s.key === "changed_pct")?.value ?? "not available";
              const count = f.signals.find((s) => s.key === "regions")?.value ?? f.regions?.length ?? 0;
              return `${changed}% of aligned pixels crossed the configured brightness-difference threshold. The analysis grouped them into ${count} connected region(s). These are pixel-level differences, not an automated identification of changed text fields.`;
            })()}</p>
            <p><strong>Where to look:</strong> Coordinates below are measured from the top-left corner of the uploaded evidence image (x = from left, y = from top). Width and height describe each rectangular area in pixels. Open the Difference Overlay to see the highlighted locations.</p>
            {f.dims && visualReviewRegions.length > 0 ? (
              <ol className="list-decimal space-y-2 pl-5">
                {visualReviewRegions.map((r, i) => {
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

      <section className="report-visuals report-block mt-6 grid gap-5 md:grid-cols-2">
        {c.category === "document" && urls.reference && (
          <Figure label="Reference original" caption={mask ? "Reference is masked by default to protect personal details." : (c.reference_name ?? "Supplied reference")}>
            <img src={urls.reference} alt="Reference original document" className={`w-full rounded-lg ${mask ? "blur-xl" : ""}`} />
            {mask && <p className="mt-2 text-xs text-muted-foreground">Reveal the document to inspect the reference and questioned image together.</p>}
          </Figure>
        )}
        {c.category !== "audio" && c.category !== "video" && (
          <Figure label={c.category === "document" ? "Questioned document" : "Original image"} caption={mask ? "Masked by default to protect personal details." : c.file_name}>
            <div className="report-image-evidence relative w-full">
              <img src={urls["original"]} alt={c.category === "document" ? "Questioned document" : "Original evidence"} className={`block w-full rounded-lg ${mask ? "blur-xl" : ""}`} />
              {c.category === "image" && f.dims && visualReviewRegions.length > 0 && (
                <svg viewBox={`0 0 ${f.dims.width} ${f.dims.height}`} preserveAspectRatio="none" aria-label="Numbered areas to review" className="pointer-events-none absolute inset-0 h-full w-full">
                  {visualReviewRegions.map((region, index) => {
                    const labelH = f.dims!.width * 0.045;
                    const labelW = f.dims!.width * 0.075;
                    const labelY = Math.max(0, region.y - labelH);
                    return <g key={index}>
                      <rect x={region.x} y={region.y} width={region.w} height={region.h} fill="rgba(224,45,45,0.08)" stroke="#e02d2d" strokeWidth={Math.max(2, f.dims!.width / 300)} />
                      <rect x={region.x} y={labelY} width={labelW} height={labelH} fill="#e02d2d" />
                      <text x={region.x + labelW * 0.12} y={labelY + labelH * 0.72} fill="#ffffff" fontSize={labelH * 0.7} fontWeight="700">R{index + 1}</text>
                    </g>;
                  })}
                </svg>
              )}
            </div>
            {c.category === "document" && <button onClick={() => setReveal(!reveal)} className="mt-2 text-xs text-primary print:hidden">{reveal ? "Mask" : "Reveal"} both document images</button>}
          </Figure>
        )}
        {c.category === "video" && <Figure label="Original" caption={c.file_name}><video src={urls["original"]} controls className="w-full rounded-lg bg-ink" /></Figure>}
        {c.category === "audio" && <Figure label="Original" caption={c.file_name}><audio src={urls["original"]} controls className="w-full" /></Figure>}
        {f.maps.filter((m) => m.key !== "review-regions").map((m) => (
          <Figure key={m.key} label={m.label} caption={m.caption} variant={m.key === "ela" ? "report-figure-ela" : ""}>
            <img src={urls[m.key]} alt={m.label} className={`w-full rounded-lg bg-ink ${mask && m.key === "diff" ? "blur-xl" : ""}`} />
          </Figure>
        ))}
      </section>

      <section className="report-block mt-7">
        <h2 className="font-serif text-2xl italic">Measured results in plain language</h2>
        <table className="report-table mt-3 w-full text-sm">
          <tbody className="divide-y divide-border border-y border-border">
            {f.signals.map((s) => (
              <tr key={s.key}><td className="py-2.5 pr-3 font-medium">{s.label}</td><td className="py-2.5 pr-3 font-mono">{s.value}{s.unit ? ` ${s.unit}` : ""}</td><td className="report-muted py-2.5">{explainSignal(s.key, c.category)}</td></tr>
            ))}
          </tbody>
        </table>
        {f.regions && f.regions.length > 0 && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">Regions (x,y,w,h px): {f.regions.slice(0, 12).map((r) => `[${r.x},${r.y},${r.w},${r.h}]`).join(" ")}</p>
        )}
      </section>

      {f.series.map((s) => (
        <section key={s.label} className="report-chart mt-8 rounded-2xl border border-border bg-card p-5">
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

      <section className="report-block mt-7">
        <h2 className="font-serif text-2xl italic">Examination boundaries</h2>
        <div className="mt-3 rounded-xl border border-border bg-white p-4">
          <p className="text-sm leading-6">The reported boxes are review locations generated by the stated pixel-comparison method. They are not a trained classifier's confidence score. No “90% likely edited” value is displayed because this build has not been validated against a labelled test set that would support such a claim.</p>
          <ul className="report-muted mt-3 list-disc space-y-1 pl-5 text-sm">
            {f.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </section>

      <section className="report-block mt-7 rounded-xl border border-border bg-white p-5">
        <h2 className="font-serif text-2xl italic">Evidence handling log</h2>
        <p className="report-muted mt-1 text-xs">Times are displayed in India Standard Time (IST).</p>
        <ol className="mt-4 space-y-3 border-l border-border pl-4">
          {ev.map((event) => (
            <li key={event.id} className="break-words">
              <p className="font-mono text-xs text-muted-foreground">{formatIst(event.created_at)}</p>
              <p className="mt-0.5 text-sm capitalize">{event.event.replace(/_/g, " ")}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="report-page-break report-block mt-7">
        <div className="bsa-panel rounded-2xl border border-border bg-white p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Bharatiya Sakshya Adhiniyam, 2023</p>
          <h2 className="mt-2 font-serif text-3xl italic">Section 63 — Schedule certificate draft</h2>
          <p className="bsa-note mt-2 text-sm leading-6 text-muted-foreground">Structured against the Schedule referred to in Section 63(4)(c). File facts and SHA-256 below are automatically populated from the uploaded bytes. Identity, device custody, ordinary-course statements, and signatures must be supplied and verified by the actual party and expert. This application does not sign or certify those declarations.</p>
          <div className="mt-4 rounded-lg border border-[#e6c88e] bg-[#fff9e9] p-3 text-sm leading-6">
            <strong>Before use:</strong> Do not sign any unchecked or unverified statement. Part A is completed by the party; Part B is completed by the expert. Attach the hash report below and have the completed certificate reviewed by the responsible legal professional.
            <p className="mt-2"><a className="underline underline-offset-2" href="https://www.indiacode.nic.in/bitstream/123456789/20063/1/a2023-47.pdf" target="_blank" rel="noreferrer">Official India Code text of the Act and Schedule</a></p>
          </div>

          <div className="mt-6">
            <h3 className="bsa-section-heading font-serif text-2xl italic">Part A — to be completed by the party</h3>
            <p className="bsa-note mt-1 text-xs leading-5 text-muted-foreground">Enter the party’s own details. Do not use the logged-in account name unless that person is the responsible party.</p>
            <p className="mt-3 text-sm leading-6">I, <strong>{certificate.partyName || "NOT PROVIDED — party name required"}</strong>, son/daughter/spouse of <strong>{certificate.partyRelation || "NOT PROVIDED"}</strong>, residing/employed at <strong>{certificate.partyAddress || "NOT PROVIDED"}</strong>, state that I have produced the electronic record/output described below from this digital-record source:</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CertificateSelect label="Device / digital-record source" value={certificate.partySource} onChange={(v) => setCertificateField("partySource", v)} options={["Computer / Storage Media", "DVR", "Mobile", "Flash Drive", "CD/DVD", "Server", "Cloud", "Other"]} />
              <CertificateField label="Other source detail (if applicable)" value={certificate.partyOtherSource} onChange={(v) => setCertificateField("partyOtherSource", v)} />
              <CertificateField label="Make and model" value={certificate.partyMakeModel} onChange={(v) => setCertificateField("partyMakeModel", v)} />
              <CertificateField label="Colour" value={certificate.partyColor} onChange={(v) => setCertificateField("partyColor", v)} />
              <CertificateField label="Serial number" value={certificate.partySerial} onChange={(v) => setCertificateField("partySerial", v)} />
              <CertificateField label="IMEI / UIN / UID / MAC / Cloud ID (as applicable)" value={certificate.partyDeviceId} onChange={(v) => setCertificateField("partyDeviceId", v)} />
              <div className="sm:col-span-2"><CertificateField label="Other relevant device/source information" value={certificate.partyOtherInfo} onChange={(v) => setCertificateField("partyOtherInfo", v)} /></div>
            </div>
            <div className="mt-4 rounded-xl bg-[#f7fafb] p-4">
              <p className="font-semibold text-sm">Source relationship — select only what is true</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <CertificateCheck label="Owned by me" checked={certificate.roleOwned} onChange={(v) => setCertificateField("roleOwned", v)} />
                <CertificateCheck label="Maintained by me" checked={certificate.roleMaintained} onChange={(v) => setCertificateField("roleMaintained", v)} />
                <CertificateCheck label="Managed by me" checked={certificate.roleManaged} onChange={(v) => setCertificateField("roleManaged", v)} />
                <CertificateCheck label="Operated by me" checked={certificate.roleOperated} onChange={(v) => setCertificateField("roleOperated", v)} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <CertificateCheck label="I confirm that this device/source was under my lawful control for regularly creating, storing, or processing information for a regularly carried-on activity." checked={certificate.lawfulControlConfirmed} onChange={(v) => setCertificateField("lawfulControlConfirmed", v)} />
              <CertificateCheck label="I confirm that the applicable activity was regularly performed using this device/source, information was regularly fed in the ordinary course of that activity, and I have considered the statutory device-operation conditions before making this declaration." checked={certificate.normalCourseConfirmed} onChange={(v) => setCertificateField("normalCourseConfirmed", v)} />
              <label className="bsa-field block">
                <span className="text-xs font-semibold">Device condition during relevant period</span>
                <select value={certificate.deviceWorking} onChange={(e) => setCertificateField("deviceWorking", e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm">
                  <option value="unknown">Not established / not yet answered</option>
                  <option value="yes">Working properly</option>
                  <option value="no">Not working properly / interruption reported</option>
                </select>
                <span className="bsa-print-value hidden mt-1 text-sm">{certificate.deviceWorking === "yes" ? "Working properly" : certificate.deviceWorking === "no" ? "Not working properly / interruption reported" : "NOT ESTABLISHED — complete before signing"}</span>
              </label>
              <CertificateField label="If there was any malfunction or interruption, explain whether it affected the record’s accuracy" value={certificate.malfunctionImpact} onChange={(v) => setCertificateField("malfunctionImpact", v)} />
            </div>
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="font-semibold text-sm">Automatically calculated hash report</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Row k="Electronic record / file" v={c.file_name} />
                <Row k="MIME type / size" v={c.mime_type + " / " + formatBytes(c.size_bytes) + " (" + c.size_bytes + " bytes)"} />
                <Row k="Hash algorithm" v="SHA-256" />
                <Row k="Hash value" v={c.sha256} />
                <Row k="Received (IST)" v={formatIst(c.created_at)} />
                <Row k="Analysis system" v={f.engine + " — browser-local signal inspection"} />
                <Row k="Stored-file verification" v={getIntegrityStatus(ev)} />
              </dl>
              <p className="bsa-note mt-3 text-xs leading-5 text-muted-foreground">This hash was calculated from the uploaded file using SHA-256. It identifies the byte sequence; by itself it does not establish who created the file, whether its contents are true, or whether the source device was under lawful control.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="bsa-field"><span className="block text-xs font-semibold">Party signature</span><p className="bsa-print-value mt-1 block text-sm">{certificate.partyName || "NOT PROVIDED — party name required"}</p><p className="mt-2 border-b border-slate-400 pb-2 text-xs text-muted-foreground">Sign here on the final copy</p></div>
              <CertificateField label="Date (DD/MM/YYYY)" value={certificate.partyDate} onChange={(v) => setCertificateField("partyDate", v)} />
              <CertificateField label="Time (IST, 24-hour)" value={certificate.partyTime} onChange={(v) => setCertificateField("partyTime", v)} />
              <div className="sm:col-span-3"><CertificateField label="Place" value={certificate.partyPlace} onChange={(v) => setCertificateField("partyPlace", v)} /></div>
            </div>
            <p className="bsa-note mt-3 text-xs text-muted-foreground">Signature: sign the final printed copy only after completing and verifying the details above.</p>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="bsa-section-heading font-serif text-2xl italic">Part B — to be completed by the expert</h3>
            <p className="bsa-note mt-1 text-xs leading-5 text-muted-foreground">This part is deliberately not auto-signed. The actual expert must enter their own identity, qualifications/designation, source/device details and complete the required declaration.</p>
            <p className="mt-3 text-sm leading-6">I, <strong>{certificate.expertName || "NOT PROVIDED — expert name required"}</strong>, son/daughter/spouse of <strong>{certificate.expertRelation || "NOT PROVIDED"}</strong>, residing/employed at <strong>{certificate.expertAddress || "NOT PROVIDED"}</strong>, solemnly affirm and state as follows. I have examined or been provided the electronic record/output identified below from the following device/source:</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CertificateField label="Expert full name" value={certificate.expertName} onChange={(v) => setCertificateField("expertName", v)} />
              <CertificateField label="Son/daughter/spouse of" value={certificate.expertRelation} onChange={(v) => setCertificateField("expertRelation", v)} />
              <CertificateField label="Residing/employed at" value={certificate.expertAddress} onChange={(v) => setCertificateField("expertAddress", v)} />
              <CertificateField label="Expert designation / qualifications" value={certificate.expertDesignation} onChange={(v) => setCertificateField("expertDesignation", v)} />
              <CertificateSelect label="Device / digital-record source examined" value={certificate.expertSource} onChange={(v) => setCertificateField("expertSource", v)} options={["Computer / Storage Media", "DVR", "Mobile", "Flash Drive", "CD/DVD", "Server", "Cloud", "Other"]} />
              <CertificateField label="Other source detail (if applicable)" value={certificate.expertOtherSource} onChange={(v) => setCertificateField("expertOtherSource", v)} />
              <CertificateField label="Make and model" value={certificate.expertMakeModel} onChange={(v) => setCertificateField("expertMakeModel", v)} />
              <CertificateField label="Colour" value={certificate.expertColor} onChange={(v) => setCertificateField("expertColor", v)} />
              <CertificateField label="Serial number" value={certificate.expertSerial} onChange={(v) => setCertificateField("expertSerial", v)} />
              <CertificateField label="IMEI / UIN / UID / MAC / Cloud ID (as applicable)" value={certificate.expertDeviceId} onChange={(v) => setCertificateField("expertDeviceId", v)} />
              <div className="sm:col-span-2"><CertificateField label="Other relevant device/source details and examination notes" value={certificate.expertOtherInfo} onChange={(v) => setCertificateField("expertOtherInfo", v)} /></div>
            </div>
            <div className="mt-4 rounded-xl bg-[#f7fafb] p-4">
              <p className="font-semibold text-sm">Hash of examined electronic record</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Row k="Electronic record" v={c.file_name} />
                <Row k="Algorithm" v="SHA-256" />
                <Row k="Hash value" v={c.sha256} />
              </dl>
              <p className="bsa-note mt-2 text-xs text-muted-foreground">The expert must independently verify the hash against the record they examined and attach/retain the hash report as required.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="bsa-field"><span className="block text-xs font-semibold">Expert signature</span><p className="bsa-print-value mt-1 block text-sm">{certificate.expertName || "NOT PROVIDED — expert name required"}</p><p className="mt-2 border-b border-slate-400 pb-2 text-xs text-muted-foreground">Sign here on the final copy</p></div>
              <CertificateField label="Date (DD/MM/YYYY)" value={certificate.expertDate} onChange={(v) => setCertificateField("expertDate", v)} />
              <CertificateField label="Time (IST, 24-hour)" value={certificate.expertTime} onChange={(v) => setCertificateField("expertTime", v)} />
              <div className="sm:col-span-3"><CertificateField label="Place" value={certificate.expertPlace} onChange={(v) => setCertificateField("expertPlace", v)} /></div>
            </div>
            <p className="bsa-note mt-3 text-xs text-muted-foreground">Expert signature: to be completed by the expert after they have checked the record and statutory requirements. PiperTrace cannot provide this attestation.</p>
          </div>
          <div className="mt-6 rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm">Completion checklist</h3>
            <ul className="report-muted mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Confirm who is the legally responsible party and enter the source/device details accurately.</li>
              <li>Verify the SHA-256 hash against the electronic record; attach the hash report.</li>
              <li>Have the appropriate expert complete Part B independently.</li>
              <li>Check the completed certificate against the official Schedule and obtain legal review where necessary.</li>
            </ul>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function formatIst(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium", hour12: false }).format(new Date(value));
}
function getIntegrityStatus(events: { event: string; detail: unknown }[]) {
  const last = [...events].reverse().find((e) => e.event === "integrity_verified");
  if (!last) return "Not verified after storage yet";
  const detail = (last.detail ?? {}) as Record<string, unknown>;
  return detail.match === true ? "Stored bytes matched at last verification" : detail.match === false ? "MISMATCH at last verification" : "Verification event recorded; result unavailable";
}
function explainSignal(key: string, category: string) {
  const explanation: Record<string, string> = {
    resolution: "Original pixel dimensions of this image or decoded media.",
    megapixels: "Total image size in millions of pixels.",
    ela_mean: "Average pixel difference after a JPEG re-save; not an edit probability.",
    ela_p99: "Difference near the high end of the pixel distribution; not a confidence score.",
    ela_tile_cv: "How uneven the re-save differences are between small image tiles.",
    lum_mean: "Average brightness of the image.",
    lum_std: "How much brightness varies across the image.",
    clip: "Near-black or near-white pixels; white paper and text can naturally produce high values.",
    changed_pct: "Aligned pixels that crossed the configured brightness-difference threshold.",
    regions: "Connected groups of pixels that differed from the supplied reference.",
    mean_delta: "Average brightness difference across the two aligned images.",
    evidence_res: "Pixel dimensions of the questioned image.",
    reference_res: "Pixel dimensions of the reference image.",
    duration: "Decoded media duration.",
    frames: "Number of video frames sampled, not every frame in the original.",
    motion_mean: "Average visual change between sampled video frames.",
    discontinuities: "Abrupt changes between samples; ordinary cuts and camera movement can cause these.",
    discontinuity_times: "Sample timestamps of the detected abrupt changes.",
    sample_rate: "Audio samples per second.",
    channels: "Number of audio channels; only channel one was analysed.",
    peak: "Highest observed audio sample level.",
    rms: "Average audio signal energy.",
    crest: "Difference between peak level and average level.",
    silence: "Estimated share of analysed windows below the near-silence threshold.",
    dc: "Average sample offset from zero.",
    bandwidth: "Estimated audio bandwidth from this recording; codec effects matter.",
  };
  return explanation[key] ?? (category === "image" ? "Measured pixel property; it has no standalone forensic verdict." : "Measured media property; interpret it with the method and limitations.");
}
function ReportFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-[#f7fafb] p-3"><p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="report-shell min-h-screen"><SiteHeader /><main className="report-main mx-auto max-w-6xl px-6 py-10">{children}</main></div>;
}
function Figure({ label, caption, children, variant = "" }: { label: string; caption: string; children: React.ReactNode; variant?: string }) {
  return <figure className={`report-figure rounded-2xl border border-border bg-card p-4 ${variant}`}><p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>{children}<figcaption className="report-muted mt-2 text-xs text-muted-foreground">{caption}</figcaption></figure>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt><dd className="break-all">{v}</dd></div>;
}
