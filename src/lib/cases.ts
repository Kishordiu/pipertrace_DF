import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, Category, MapImage } from "@/lib/forensics";

export type StoredMap = { key: string; label: string; path: string; caption: string };
export type StoredFindings = AnalysisResult & { maps: StoredMap[] };

const ext = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin");

async function audit(caseId: string, event: string, detail: Record<string, unknown> = {}) {
  const { error } = await supabase.from("audit_events").insert({ case_id: caseId, event, detail: detail as never });
  if (error) throw error;
}

export async function saveCase(input: {
  category: Category;
  title: string;
  file: File;
  sha: string;
  reference?: { file: File; sha: string } | undefined;
  result: AnalysisResult;
  maps: MapImage[];
}) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("You are signed out. Sign in again to save.");
  const id = crypto.randomUUID();
  const base = `${uid}/${id}`;
  const originalPath = `${base}/original.${ext(input.file.name)}`;

  const up = await supabase.storage.from("evidence").upload(originalPath, input.file, { contentType: input.file.type || "application/octet-stream" });
  if (up.error) throw up.error;
  let refPath: string | null = null;
  if (input.reference) {
    refPath = `${base}/reference.${ext(input.reference.file.name)}`;
    const r = await supabase.storage.from("evidence").upload(refPath, input.reference.file, { contentType: input.reference.file.type || "application/octet-stream" });
    if (r.error) throw r.error;
  }
  const stored: StoredMap[] = [];
  for (const m of input.maps) {
    const path = `${base}/map-${m.key}.${m.blob.type === "image/jpeg" ? "jpg" : "png"}`;
    const r = await supabase.storage.from("evidence").upload(path, m.blob, { contentType: m.blob.type });
    if (r.error) throw r.error;
    stored.push({ key: m.key, label: m.label, path, caption: m.caption });
  }
  const findings: StoredFindings = { ...input.result, maps: stored };
  const { error } = await supabase.from("cases").insert({
    id,
    category: input.category,
    title: input.title || input.file.name,
    file_name: input.file.name,
    mime_type: input.file.type || "application/octet-stream",
    size_bytes: input.file.size,
    sha256: input.sha,
    storage_path: originalPath,
    reference_name: input.reference?.file.name ?? null,
    reference_sha256: input.reference?.sha ?? null,
    reference_path: refPath,
    findings: findings as never,
  });
  if (error) throw error;
  await audit(id, "evidence_received", { file_name: input.file.name, size_bytes: input.file.size, sha256: input.sha });
  if (input.reference) await audit(id, "reference_received", { file_name: input.reference.file.name, sha256: input.reference.sha });
  await audit(id, "analysis_completed", { engine: input.result.engine, quality: input.result.quality.level, signals: input.result.signals.length });
  await audit(id, "artifacts_stored", { maps: stored.map((m) => m.key) });
  return id;
}

export async function logEvent(caseId: string, event: string, detail: Record<string, unknown> = {}) {
  await audit(caseId, event, detail);
}

export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from("evidence").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function verifyStoredHash(path: string) {
  const { data, error } = await supabase.storage.from("evidence").download(path);
  if (error) throw error;
  const buf = await data.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deleteCase(c: { id: string; storage_path: string; reference_path: string | null; findings: unknown }) {
  const f = c.findings as StoredFindings;
  const paths = [c.storage_path, c.reference_path, ...(f.maps ?? []).map((m) => m.path)].filter(Boolean) as string[];
  await supabase.storage.from("evidence").remove(paths);
  const { error } = await supabase.from("cases").delete().eq("id", c.id);
  if (error) throw error;
}
