<div align="center">
  <img src="./assets/hero.png" alt="PiperTrace — Multimodal Media Forensics" width="100%" />
</div>

<p align="center">
  <a href="https://diufoundry-storybook.vercel.app"><img alt="Live Platform" src="https://img.shields.io/badge/LIVE_PLATFORM-0A1826?style=for-the-badge&logo=vercel&logoColor=35C8D5&labelColor=060A0F" /></a>&nbsp;
  <a href="https://diufoundry.online"><img alt="DIU Foundry" src="https://img.shields.io/badge/DIU_FOUNDRY-STUDIO-0A1826?style=for-the-badge&logoColor=6BC6CE&labelColor=060A0F" /></a>&nbsp;
  <img alt="TypeScript" src="https://img.shields.io/badge/TYPESCRIPT-v5-0A1826?style=for-the-badge&logo=typescript&logoColor=3178C6&labelColor=060A0F" />&nbsp;
  <img alt="Supabase" src="https://img.shields.io/badge/SUPABASE-AUTH_&_RLS-0A1826?style=for-the-badge&logo=supabase&logoColor=3ECF8E&labelColor=060A0F" />
</p>

<p align="center">
  <b>Evidence, not just a verdict.</b><br/>
  <em>Local-first multimodal media-forensics workspace for evidentiary integrity across images, documents, video, and audio.</em>
</p>

---

## 🔬 Product Capabilities

PiperTrace shifts forensic investigation from unverified black-box verdicts to verifiable evidentiary signals:

- **Multimodal Workflows** — Four distinct signal inspection pipelines: Image, Document, Video, and Audio.
- **Local Signal Inspection** — Category-specific signal measurements (ELA, FFT spectrum, luminance, difference maps) computed entirely client-side.
- **Evidentiary Integrity** — Browser Web Crypto SHA-256 fingerprinting and continuous re-verification against tampering.
- **Reference Document Comparison** — Differential pixel & structural delta mapping for altered legal contracts and documents.
- **Section 63 BSA Documentation** — Structured preparation aid aligning digital media examination with legal audit criteria.
- **Zero API Dependency** — Core signal measurements run without third-party commercial AI or external detection endpoints.

> **Forensic Standard**: A measured signal, ELA/FFT view, or difference map is an evidentiary measurement, not an autonomous deepfake verdict. PiperTrace produces auditable technical documentation.

---

## 🛠️ System Architecture

```text
[ CLIENT WORKBENCH ] ── (SHA-256 Hash) ──► [ LOCAL SIGNAL ENGINE ]
         │                                          │
         ▼                                          ▼
[ BROWSER WEB CRYPTO ]                     [ CANVAS / WEB AUDIO ]
         │                                   (ELA / FFT / Diffs)
         │                                          │
         ▼                                          ▼
[ SUPABASE AUTH / RLS ] ◄── (Audit Trails) ─────────┘
```

- **Framework**: React 19, TypeScript, Vite, TanStack Start
- **Styling & Motion**: Tailwind CSS v4, Instrument Serif, JetBrains Mono
- **Database & Storage**: Supabase Postgres with strict Row-Level Security & private evidence buckets
- **Cryptography**: Web Crypto API (Client-side SHA-256)

---

## ⚡ Quickstart

```bash
# Clone the repository
git clone https://github.com/Kishordiu/pipertrace_DF.git
cd pipertrace_DF

# Install dependencies (Bun recommended)
bun install

# Configure environment variables
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# Start the local development studio
bun run dev
```

---

<p align="center">
  <b>RESEARCH → BUILD → TEST → SHIP</b><br/>
  <sub>A digital product by <a href="https://diufoundry.online">DIU Foundry</a> · Engineered by K. Kishor Kumar</sub>
</p>
