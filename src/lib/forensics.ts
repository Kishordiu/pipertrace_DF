// Browser-only, local forensic signal inspection. Every value here is measured
// from the uploaded bytes; nothing is a model verdict or a calibrated probability.

export type Category = "image" | "document" | "video" | "audio";

export type Signal = {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  method: string;
};

export type Series = { label: string; xLabel: string; yLabel: string; points: { x: number; y: number }[] };

export type Region = { x: number; y: number; w: number; h: number; changed: number };

export type MapImage = { key: string; label: string; blob: Blob; caption: string };

export type AnalysisResult = {
  engine: string;
  kind: "signal-inspection";
  quality: { level: "good" | "limited" | "poor"; notes: string[] };
  signals: Signal[];
  series: Series[];
  regions?: Region[];
  dims?: { width: number; height: number };
  limits: string[];
};

export const ENGINE = "pipertrace-local/1.0";

export async function sha256(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("This file could not be decoded as an image in your browser.");
  }
}

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  return { c, ctx };
}

function fit(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scale: s };
}

const toBlob = (c: HTMLCanvasElement, type = "image/png", q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Encoding failed"))), type, q));

// Sea-glass ramp: dark ink -> aqua -> pale pearl.
function ramp(t: number): [number, number, number] {
  t = Math.min(1, Math.max(0, t));
  const stops: [number, number, number][] = [
    [14, 24, 32],
    [20, 92, 110],
    [72, 190, 190],
    [240, 236, 220],
  ];
  const p = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p));
  const f = p - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function percentile(values: Float32Array | number[], p: number) {
  const arr = Array.from(values).sort((a, b) => a - b);
  if (!arr.length) return 0;
  return arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))]!;
}

/* ---------------- Image: Error Level Analysis + basic statistics ---------------- */

export async function analyzeImage(file: File): Promise<{ result: AnalysisResult; maps: MapImage[] }> {
  const bmp = await loadBitmap(file);
  const { w, h } = fit(bmp.width, bmp.height, 1600);
  const { c, ctx } = canvasOf(w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const orig = ctx.getImageData(0, 0, w, h);

  const jpeg = await toBlob(c, "image/jpeg", 0.9);
  const re = await loadBitmap(jpeg);
  const { ctx: ctx2 } = canvasOf(w, h);
  ctx2.drawImage(re, 0, 0, w, h);
  const rec = ctx2.getImageData(0, 0, w, h);

  const n = w * h;
  const diff = new Float32Array(n);
  let sum = 0;
  let max = 0;
  let lumSum = 0;
  let lumSq = 0;
  let clippedDark = 0;
  let clippedBright = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d =
      (Math.abs(orig.data[o]! - rec.data[o]!) +
        Math.abs(orig.data[o + 1]! - rec.data[o + 1]!) +
        Math.abs(orig.data[o + 2]! - rec.data[o + 2]!)) /
      3;
    diff[i] = d;
    sum += d;
    if (d > max) max = d;
    const l = 0.2126 * orig.data[o]! + 0.7152 * orig.data[o + 1]! + 0.0722 * orig.data[o + 2]!;
    lumSum += l;
    lumSq += l * l;
    if (l <= 2) clippedDark++;
    if (l >= 253) clippedBright++;
  }
  const mean = sum / n;
  const p99 = percentile(sampleArr(diff, 40000), 99);
  const lumMean = lumSum / n;
  const lumStd = Math.sqrt(Math.max(0, lumSq / n - lumMean * lumMean));

  // Render ELA map, normalised to the 99th percentile so a few outliers do not flatten it.
  const { c: mc, ctx: mctx } = canvasOf(w, h);
  const out = mctx.createImageData(w, h);
  const norm = p99 > 0 ? p99 : 1;
  for (let i = 0; i < n; i++) {
    const [r, g, b] = ramp(diff[i]! / norm);
    out.data[i * 4] = r;
    out.data[i * 4 + 1] = g;
    out.data[i * 4 + 2] = b;
    out.data[i * 4 + 3] = 255;
  }
  mctx.putImageData(out, 0, 0);
  const elaBlob = await toBlob(mc);

  // Block-level ELA spread: how uneven recompression error is across 32px tiles.
  const tile = 32;
  const tileMeans: number[] = [];
  for (let ty = 0; ty < h; ty += tile)
    for (let tx = 0; tx < w; tx += tile) {
      let s = 0;
      let k = 0;
      for (let y = ty; y < Math.min(h, ty + tile); y++)
        for (let x = tx; x < Math.min(w, tx + tile); x++) {
          s += diff[y * w + x]!;
          k++;
        }
      tileMeans.push(s / k);
    }

  // Identify the spatial tiles with the largest ELA differences for review.
  // These are review coordinates, not an edit classifier or a fraud verdict.
  const gridCols = Math.ceil(w / tile);
  const gridRows = Math.ceil(h / tile);
  const cutoff = percentile(tileMeans, 95);
  const hot = tileMeans.map((v) => v > cutoff ? 1 : 0);
  const seenTiles = new Uint8Array(hot.length);
  const elaRegions: Region[] = [];
  for (let i = 0; i < hot.length; i++) {
    if (!hot[i] || seenTiles[i]) continue;
    const stack = [i];
    seenTiles[i] = 1;
    let minx = Infinity, miny = Infinity, maxx = -1, maxy = -1, sum = 0, count = 0;
    while (stack.length) {
      const j = stack.pop()!;
      const gx = j % gridCols;
      const gy = Math.floor(j / gridCols);
      minx = Math.min(minx, gx); miny = Math.min(miny, gy);
      maxx = Math.max(maxx, gx); maxy = Math.max(maxy, gy);
      sum += tileMeans[j]!;
      count++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gridCols || ny >= gridRows) continue;
        const next = ny * gridCols + nx;
        if (hot[next] && !seenTiles[next]) { seenTiles[next] = 1; stack.push(next); }
      }
    }
    const sx = bmp.width / w, sy = bmp.height / h;
    const x = Math.round(minx * tile * sx);
    const y = Math.round(miny * tile * sy);
    const right = Math.min(bmp.width, Math.round(Math.min(w, (maxx + 1) * tile) * sx));
    const bottom = Math.min(bmp.height, Math.round(Math.min(h, (maxy + 1) * tile) * sy));
    elaRegions.push({ x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y), changed: round(sum / Math.max(1, count), 2) });
  }
  elaRegions.sort((a, b) => b.changed - a.changed);
  const reviewRegions = elaRegions.slice(0, 12);

  const tMean = tileMeans.reduce((a, b) => a + b, 0) / tileMeans.length;
  const tStd = Math.sqrt(tileMeans.reduce((a, b) => a + (b - tMean) ** 2, 0) / tileMeans.length);

  // Histogram of ELA values for a real chart.
  const bins = 24;
  const hist = new Array(bins).fill(0);
  const hmax = Math.max(1, max);
  for (let i = 0; i < n; i++) hist[Math.min(bins - 1, Math.floor((diff[i]! / hmax) * bins))]++;

  const notes: string[] = [];
  const mp = (bmp.width * bmp.height) / 1e6;
  if (mp < 0.3) notes.push("Low resolution (under 0.3 MP) limits what recompression analysis can show.");
  if (bmp.width > 1600 || bmp.height > 1600) notes.push(`Analysed at ${w}×${h} (downscaled from ${bmp.width}×${bmp.height}).`);
  if (file.type === "image/png") notes.push("PNG is lossless: ELA reflects one JPEG pass and highlights edges and texture broadly.");
  const level = mp < 0.3 ? "poor" : notes.length > 1 ? "limited" : "good";

  return {
    result: {
      engine: ENGINE,
      kind: "signal-inspection",
      quality: { level, notes },
      dims: { width: bmp.width, height: bmp.height },
      regions: reviewRegions,
      signals: [
        { key: "resolution", label: "Resolution", value: `${bmp.width} × ${bmp.height}`, method: "Decoded pixel dimensions" },
        { key: "megapixels", label: "Megapixels", value: round(mp), unit: "MP", method: "width × height / 10⁶" },
        { key: "ela_mean", label: "ELA mean error", value: round(mean), unit: "/255", method: "Mean abs. difference after JPEG q=90 re-save" },
        { key: "ela_p99", label: "ELA 99th percentile", value: round(p99), unit: "/255", method: "99th percentile of per-pixel ELA" },
        { key: "ela_tile_cv", label: "ELA tile unevenness", value: round(tMean > 0 ? tStd / tMean : 0), unit: "CV", method: "Coefficient of variation of 32px tile means" },
        { key: "lum_mean", label: "Mean luminance", value: round(lumMean, 1), unit: "/255", method: "Rec.709 luma" },
        { key: "lum_std", label: "Luminance spread", value: round(lumStd, 1), unit: "σ", method: "Std. dev. of luma" },
        { key: "clip", label: "Clipped pixels", value: round(((clippedDark + clippedBright) / n) * 100), unit: "%", method: "Luma ≤ 2 or ≥ 253" },
      ],
      series: [
        {
          label: "ELA error distribution",
          xLabel: "ELA error (/255)",
          yLabel: "Pixels",
          points: hist.map((y, i) => ({ x: round(((i + 0.5) / bins) * hmax, 1), y })),
        },
      ],
      limits: [
        "ELA shows where JPEG recompression error is uneven. Edges, text and textures naturally score higher.",
        "A bright area is a place to look closer — not proof that those pixels were edited.",
        "No trained manipulation-detection model is configured, so no authenticity score is given.",
      ],
    },
    maps: [{ key: "ela", label: "Error level map", blob: elaBlob, caption: "Normalised to the 99th percentile. Brighter = larger recompression error." }],
  };
}

function sampleArr(a: Float32Array, k: number) {
  if (a.length <= k) return a;
  const out = new Float32Array(k);
  const step = a.length / k;
  for (let i = 0; i < k; i++) out[i] = a[Math.floor(i * step)]!;
  return out;
}

/* ---------------- Document: aligned difference against a reference ---------------- */

export async function analyzeDocument(file: File, reference: File): Promise<{ result: AnalysisResult; maps: MapImage[] }> {
  const a = await loadBitmap(file);
  const b = await loadBitmap(reference);
  const { w, h } = fit(a.width, a.height, 1600);
  const A = canvasOf(w, h);
  A.ctx.drawImage(a, 0, 0, w, h);
  const B = canvasOf(w, h);
  B.ctx.drawImage(b, 0, 0, w, h);
  const da = A.ctx.getImageData(0, 0, w, h).data;
  const db = B.ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const THRESH = 40;
  const mask = new Uint8Array(n);
  let changed = 0;
  let sumD = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const la = 0.2126 * da[o]! + 0.7152 * da[o + 1]! + 0.0722 * da[o + 2]!;
    const lb = 0.2126 * db[o]! + 0.7152 * db[o + 1]! + 0.0722 * db[o + 2]!;
    const d = Math.abs(la - lb);
    sumD += d;
    if (d > THRESH) {
      mask[i] = 1;
      changed++;
    }
  }

  // Grid regions, then merge touching cells into boxes.
  const cell = 24;
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const hot = new Uint8Array(gw * gh);
  const frac = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      let c = 0;
      let k = 0;
      for (let y = gy * cell; y < Math.min(h, (gy + 1) * cell); y++)
        for (let x = gx * cell; x < Math.min(w, (gx + 1) * cell); x++) {
          c += mask[y * w + x]!;
          k++;
        }
      frac[gy * gw + gx] = c / k;
      if (c / k > 0.04) hot[gy * gw + gx] = 1;
    }
  const seen = new Uint8Array(gw * gh);
  const regions: Region[] = [];
  for (let i = 0; i < hot.length; i++) {
    if (!hot[i] || seen[i]) continue;
    let minx = Infinity, miny = Infinity, maxx = -1, maxy = -1, f = 0, cnt = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % gw;
      const y = Math.floor(j / gw);
      minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
      f += frac[j]!; cnt++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const k = ny * gw + nx;
        if (hot[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
      }
    }
    const sx = a.width / w;
    const sy = a.height / h;
    regions.push({
      x: Math.round(minx * cell * sx),
      y: Math.round(miny * cell * sy),
      w: Math.round((maxx - minx + 1) * cell * sx),
      h: Math.round((maxy - miny + 1) * cell * sy),
      changed: round((f / cnt) * 100, 1),
    });
  }
  regions.sort((p, q) => q.w * q.h - p.w * p.h);

  // Overlay: faded evidence + highlighted differing pixels + region boxes.
  const O = canvasOf(w, h);
  O.ctx.globalAlpha = 0.35;
  O.ctx.drawImage(a, 0, 0, w, h);
  O.ctx.globalAlpha = 1;
  const ov = O.ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < n; i++) if (mask[i]) { ov.data[i * 4] = 20; ov.data[i * 4 + 1] = 150; ov.data[i * 4 + 2] = 170; ov.data[i * 4 + 3] = 255; }
  O.ctx.putImageData(ov, 0, 0);
  O.ctx.strokeStyle = "rgb(200,70,40)";
  O.ctx.lineWidth = 2;
  for (const r of regions.slice(0, 40)) O.ctx.strokeRect((r.x * w) / a.width, (r.y * h) / a.height, (r.w * w) / a.width, (r.h * h) / a.height);
  const overlay = await toBlob(O.c);

  const notes: string[] = [];
  const arA = a.width / a.height;
  const arB = b.width / b.height;
  if (Math.abs(arA - arB) / arA > 0.02) notes.push(`Aspect ratios differ (${a.width}×${a.height} vs ${b.width}×${b.height}); the reference was stretched to align, so differences may reflect cropping or scanning rather than edits.`);
  if (a.width !== b.width || a.height !== b.height) notes.push("Resolutions differ; the reference was resampled before comparison.");
  const level = notes.length === 0 ? "good" : notes.length === 1 ? "limited" : "poor";

  return {
    result: {
      engine: ENGINE,
      kind: "signal-inspection",
      quality: { level, notes },
      dims: { width: a.width, height: a.height },
      regions: regions.slice(0, 40),
      signals: [
        { key: "changed_pct", label: "Differing pixels", value: round((changed / n) * 100, 3), unit: "%", method: `|Δ luma| > ${THRESH} after alignment` },
        { key: "regions", label: "Differing regions", value: regions.length, method: "Merged 24px cells with >4% differing pixels" },
        { key: "mean_delta", label: "Mean luma difference", value: round(sumD / n), unit: "/255", method: "Mean |Δ luma| over all pixels" },
        { key: "evidence_res", label: "Evidence resolution", value: `${a.width} × ${a.height}`, method: "Decoded dimensions" },
        { key: "reference_res", label: "Reference resolution", value: `${b.width} × ${b.height}`, method: "Decoded dimensions" },
      ],
      series: [],
      limits: [
        "A difference map proves the two aligned files differ in those areas. It does not prove fraud or show who changed them.",
        "Alignment is a straight resize; rotated, skewed or re-scanned pages will show widespread differences.",
        "PiperTrace is not an identity-verification service.",
      ],
    },
    maps: [{ key: "diff", label: "Difference overlay", blob: overlay, caption: "Aqua = differing pixels. Boxes = merged regions, in evidence-image coordinates." }],
  };
}

/* ---------------- Video: time-indexed frame sampling ---------------- */

export async function analyzeVideo(file: File, onProgress?: (p: number) => void): Promise<{ result: AnalysisResult; maps: MapImage[] }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("This video format cannot be decoded by your browser. Try MP4 (H.264) or WebM."));
    });
    const dur = v.duration;
    if (!isFinite(dur) || dur <= 0) throw new Error("Could not read the video duration.");
    const N = Math.min(48, Math.max(8, Math.round(dur * 2)));
    const W = 160;
    const H = Math.max(1, Math.round((W * v.videoHeight) / v.videoWidth));
    const { ctx } = canvasOf(W, H);
    const strip = canvasOf(W * 8, H);
    let prev: Uint8ClampedArray | null = null;
    const diffPts: { x: number; y: number }[] = [];
    const lumPts: { x: number; y: number }[] = [];
    let dark = 0;
    for (let i = 0; i < N; i++) {
      const t = Math.min(dur - 0.05, (i + 0.5) * (dur / N));
      await new Promise<void>((res) => {
        v.onseeked = () => res();
        v.currentTime = t;
      });
      ctx.drawImage(v, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      let lum = 0;
      for (let k = 0; k < d.length; k += 4) lum += 0.2126 * d[k]! + 0.7152 * d[k + 1]! + 0.0722 * d[k + 2]!;
      lum /= W * H;
      if (lum < 16) dark++;
      lumPts.push({ x: round(t, 2), y: round(lum, 1) });
      if (prev) {
        let s = 0;
        for (let k = 0; k < d.length; k += 4) s += Math.abs(d[k]! - prev[k]!) + Math.abs(d[k + 1]! - prev[k + 1]!) + Math.abs(d[k + 2]! - prev[k + 2]!);
        diffPts.push({ x: round(t, 2), y: round(s / (3 * W * H), 2) });
      }
      prev = new Uint8ClampedArray(d);
      const slot = Math.floor((i * 8) / N);
      if (Math.floor(((i - 1) * 8) / N) !== slot) strip.ctx.drawImage(v, slot * W, 0, W, H);
      onProgress?.((i + 1) / N);
    }
    const ys = diffPts.map((p) => p.y);
    const mean = ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length);
    const sd = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, ys.length));
    const spikes = diffPts.filter((p) => p.y > mean + 2.5 * sd && p.y > 8);
    const stripBlob = await toBlob(strip.c, "image/jpeg", 0.85);

    const notes: string[] = [];
    if (v.videoHeight < 360) notes.push(`Low resolution (${v.videoWidth}×${v.videoHeight}).`);
    if (dur / N > 1.5) notes.push(`Sparse sampling: one frame every ${round(dur / N, 1)} s.`);
    if (dark / N > 0.3) notes.push("Many sampled frames are near-black.");
    const level = notes.length === 0 ? "good" : notes.length === 1 ? "limited" : "poor";

    return {
      result: {
        engine: ENGINE,
        kind: "signal-inspection",
        quality: { level, notes },
        dims: { width: v.videoWidth, height: v.videoHeight },
        signals: [
          { key: "duration", label: "Duration", value: round(dur, 2), unit: "s", method: "Container metadata" },
          { key: "resolution", label: "Resolution", value: `${v.videoWidth} × ${v.videoHeight}`, method: "Decoded frame size" },
          { key: "frames", label: "Frames sampled", value: N, method: "Evenly spaced seeks" },
          { key: "motion_mean", label: "Mean inter-frame change", value: round(mean), unit: "/255", method: "Mean abs. RGB difference between consecutive samples" },
          { key: "discontinuities", label: "Abrupt transitions", value: spikes.length, method: "Change > mean + 2.5σ and > 8/255" },
          { key: "discontinuity_times", label: "Transition timestamps", value: spikes.map((s) => `${s.x}s`).join(", ") || "none", method: "Sample time of each abrupt transition" },
        ],
        series: [
          { label: "Inter-frame change", xLabel: "Time (s)", yLabel: "Mean |Δ| (/255)", points: diffPts },
          { label: "Frame luminance", xLabel: "Time (s)", yLabel: "Luma (/255)", points: lumPts },
        ],
        limits: [
          "Abrupt transitions can be ordinary cuts, camera motion or compression keyframes — they are timestamps to review, not evidence of a deepfake.",
          "No trained video deepfake model is configured, so no authenticity score is given.",
        ],
      },
      maps: [{ key: "strip", label: "Contact strip", blob: stripBlob, caption: "Eight evenly spaced frames, left to right." }],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- Audio: waveform, levels and spectrogram ---------------- */

function fftMag(re: Float32Array): Float32Array {
  const n = re.length;
  const im = new Float32Array(n);
  const r = re.slice();
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const t = r[i]!; r[i] = r[j]!; r[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len)
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const a = i + k, b = i + k + len / 2;
        const xr = r[b]! * wr - im[b]! * wi;
        const xi = r[b]! * wi + im[b]! * wr;
        r[b] = r[a]! - xr; im[b] = im[a]! - xi;
        r[a] = r[a]! + xr; im[a] = im[a]! + xi;
      }
  }
  const out = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(r[i]!, im[i]!);
  return out;
}

const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -120);

export async function analyzeAudio(file: File): Promise<{ result: AnalysisResult; maps: MapImage[] }> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new Ctx();
  let buf: AudioBuffer;
  try {
    buf = await ac.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("This audio format cannot be decoded by your browser. Try WAV, MP3 or M4A.");
  } finally {
    void ac.close();
  }
  const x = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const n = x.length;
  let peak = 0, sq = 0, dc = 0, clip = 0;
  for (let i = 0; i < n; i++) {
    const s = x[i]!;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    sq += s * s;
    dc += s;
    if (a >= 0.999) clip++;
  }
  const rms = Math.sqrt(sq / n);

  // Waveform envelope (min/max per bucket) and short-term loudness.
  const B = 300;
  const per = Math.max(1, Math.floor(n / B));
  const env: { x: number; y: number }[] = [];
  const loud: { x: number; y: number }[] = [];
  let silent = 0;
  for (let b = 0; b < B && b * per < n; b++) {
    let mx = 0, s2 = 0;
    for (let i = b * per; i < Math.min(n, (b + 1) * per); i++) { const v = Math.abs(x[i]!); if (v > mx) mx = v; s2 += x[i]! * x[i]!; }
    const r = Math.sqrt(s2 / per);
    if (db(r) < -50) silent++;
    env.push({ x: round((b * per) / sr, 2), y: round(mx, 3) });
    loud.push({ x: round((b * per) / sr, 2), y: round(Math.max(-90, db(r)), 1) });
  }

  // Spectrogram: 1024-pt Hann windows.
  const N = 1024;
  const cols = Math.min(400, Math.max(1, Math.floor(n / N)));
  const hop = Math.max(1, Math.floor((n - N) / Math.max(1, cols - 1)));
  const rows = N / 2;
  const hann = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const spec: Float32Array[] = [];
  const centroid: { x: number; y: number }[] = [];
  const meanSpec = new Float32Array(rows);
  for (let c = 0; c < cols; c++) {
    const frame = new Float32Array(N);
    const off = c * hop;
    for (let i = 0; i < N; i++) frame[i] = (x[off + i] ?? 0) * hann[i]!;
    const m = fftMag(frame);
    spec.push(m);
    let num = 0, den = 0;
    for (let k = 0; k < rows; k++) { num += k * m[k]!; den += m[k]!; meanSpec[k] = (meanSpec[k] ?? 0) + m[k]! / cols; }
    centroid.push({ x: round(off / sr, 2), y: Math.round(den > 0 ? ((num / den) * sr) / N : 0) });
  }
  // Effective bandwidth: highest frequency whose average energy is within 60 dB of the maximum.
  let msMax = 0;
  for (const v of meanSpec) msMax = Math.max(msMax, v);
  let bwBin = 0;
  for (let k = rows - 1; k >= 0; k--) if (db(meanSpec[k]! / (msMax || 1)) > -60) { bwBin = k; break; }
  const bandwidth = Math.round((bwBin * sr) / N);

  const H = 256;
  const S = canvasOf(cols, H);
  const img = S.ctx.createImageData(cols, H);
  let gmax = 1e-9;
  for (const m of spec) for (const v of m) gmax = Math.max(gmax, v);
  for (let c = 0; c < cols; c++)
    for (let y = 0; y < H; y++) {
      const k = Math.floor(((H - 1 - y) / H) * rows);
      const v = (db(spec[c]![k]! / gmax) + 90) / 90;
      const [r, g, b] = ramp(v);
      const o = (y * cols + c) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  S.ctx.putImageData(img, 0, 0);
  const specBlob = await toBlob(S.c);

  const notes: string[] = [];
  if (sr < 16000) notes.push(`Low sample rate (${sr} Hz) limits spectral inspection.`);
  if (clip / n > 0.001) notes.push("Clipping detected; distortion hides fine spectral detail.");
  if (silent / env.length > 0.5) notes.push("More than half of the recording is near-silent.");
  if (buf.duration < 2) notes.push("Very short clip (under 2 s).");
  const level = notes.length === 0 ? "good" : notes.length === 1 ? "limited" : "poor";

  return {
    result: {
      engine: ENGINE,
      kind: "signal-inspection",
      quality: { level, notes },
      signals: [
        { key: "duration", label: "Duration", value: round(buf.duration, 2), unit: "s", method: "Decoded length" },
        { key: "sample_rate", label: "Sample rate", value: sr, unit: "Hz", method: "Decoder output rate" },
        { key: "channels", label: "Channels", value: buf.numberOfChannels, method: "Decoded channel count (channel 1 analysed)" },
        { key: "peak", label: "Peak level", value: round(db(peak), 1), unit: "dBFS", method: "Max |sample|" },
        { key: "rms", label: "RMS level", value: round(db(rms), 1), unit: "dBFS", method: "Root mean square" },
        { key: "crest", label: "Crest factor", value: round(db(peak) - db(rms), 1), unit: "dB", method: "Peak − RMS" },
        { key: "clip", label: "Clipped samples", value: round((clip / n) * 100, 3), unit: "%", method: "|sample| ≥ 0.999" },
        { key: "silence", label: "Near-silent time", value: round((silent / env.length) * 100, 1), unit: "%", method: "Windows below −50 dBFS" },
        { key: "dc", label: "DC offset", value: round(dc / n, 5), method: "Mean sample value" },
        { key: "bandwidth", label: "Effective bandwidth", value: bandwidth, unit: "Hz", method: "Highest bin within 60 dB of spectral max" },
      ],
      series: [
        { label: "Waveform envelope", xLabel: "Time (s)", yLabel: "Peak amplitude", points: env },
        { label: "Short-term loudness", xLabel: "Time (s)", yLabel: "dBFS", points: loud },
        { label: "Spectral centroid", xLabel: "Time (s)", yLabel: "Hz", points: centroid },
      ],
      limits: [
        "This is signal inspection, not voice-clone detection. No synthetic-speech model is configured.",
        "A narrow bandwidth or abrupt spectral edges can come from codecs, phone lines or editing — they are cues to review, not conclusions.",
      ],
    },
    maps: [{ key: "spectrogram", label: "Spectrogram", blob: specBlob, caption: `0 – ${Math.round(sr / 2)} Hz (bottom to top), 1024-pt Hann window, 90 dB range.` }],
  };
}
