# PiperTrace

**Evidence, not just a verdict.**

PiperTrace is a local-first multimodal media-forensics workspace for images, documents, video and audio. It records SHA-256 fingerprints, runs category-specific signal inspection in the browser, stores user-owned cases in Supabase, and prepares a technical report with methodology and limitations.

## Product capabilities

- Four distinct workflows: Image, Document, Video and Audio.
- Local signal inspection with explicit measurements, quality notes and limitations.
- Optional reference-image comparison for document/edit inspection.
- SHA-256 hashing and integrity re-verification.
- Private, per-account case records and evidence files.
- Audit event timeline and printable report view.
- Section 63 BSA documentation-preparation aid.
- No Gemini or commercial detection API key is required for the implemented browser-local analysis.

**Scientific limitation:** a measured signal, ELA/FFT view or difference map is not, by itself, a trained deepfake verdict. PiperTrace must not display a real/fake score unless a suitable trained and evaluated model is actually configured.

## Stack

- React 19, TypeScript, Vite and TanStack Start.
- Tailwind CSS v4.
- Supabase Auth, Postgres and private Storage.
- Browser Web Crypto for SHA-256.
- Canvas/Web Audio APIs for local signal inspection.

## Local development

Requirements: Node.js supported by Vite 8 and Bun (recommended because bun.lock is maintained).

1. Copy .env.example to .env.
2. Fill in your Supabase project URL and publishable key.
3. Install and run:

    bun install
    bun run dev

Open the local URL printed by Vite (configured to use port 3000).

Checks:

    bun run build
    bun run lint
    bun run test

## Supabase setup

Read docs/AUTH_SETUP.md before enabling sign-in in production. The app uses Supabase Auth directly; no external auth broker is part of the runtime.

Required browser environment variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Server-side environment variables, when using server functions that access Supabase:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

The publishable/anon key is intended for browser use. Never put a service-role key in a VITE_* variable or commit private credentials. The .env file is ignored by Git.

## Deployment

Vercel builds the main branch. Set environment variables under the Vercel project's Environment Variables, then redeploy after changing Supabase Auth redirect settings or environment variables.

For Google login, configure the Google provider in Supabase Auth and register the Supabase callback URI in Google Cloud. Email/password sign-in remains available independently.

## Evidence and privacy

Cases and audit events are restricted by Supabase Row Level Security, and evidence is stored under a user-specific path in a private Storage bucket. Use only media you are permitted to inspect. Avoid uploading real identity documents to public samples, and delete sensitive cases when no longer needed.

The generated report is a technical summary and documentation aid, not an automatic legal certificate or a guarantee of admissibility.
