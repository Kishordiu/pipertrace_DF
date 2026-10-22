# PiperTrace

**Evidence, not just a verdict.**

PiperTrace is a local-first multimodal media-forensics workspace for images, documents, video and audio. It records SHA-256 fingerprints, runs category-specific signal inspection in the browser, stores user-owned cases in Supabase, and prepares a technical report with methodology and limitations.

## Product capabilities

- Four distinct workflows: Image, Document, Video and Audio.
- Local signal inspection with explicit measurements, quality notes and limitations.
- Reference-image comparison for document/edit inspection.
- SHA-256 hashing and integrity re-verification.
- Private, per-account case records and evidence files.
- Audit event timeline and technical report view.
- Section 63 BSA documentation-preparation aid.
- No Gemini or commercial detection API key is required for the browser-local analysis.

**Scientific limitation:** a measured signal, ELA/FFT view or difference map is not, by itself, a trained deepfake verdict. PiperTrace must not display a real/fake score unless a suitable trained and evaluated model is actually configured.

## Stack

- React 19, TypeScript, Vite and TanStack Start.
- Tailwind CSS v4.
- Supabase Auth, Postgres and private Storage.
- Browser Web Crypto for SHA-256.
- Canvas/Web Audio APIs for local signal inspection.

## Start locally

Requirements: Node.js supported by Vite 8 and Bun (recommended).

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for your own Supabase project.
3. Follow `docs/PROJECT_SETUP.md` and apply `supabase/setup.sql` to that project.
4. Run:

    bun install
    bun run dev

Checks:

    bun run build
    bun run lint
    bun run test

## Production setup

Start with **[docs/PROJECT_SETUP.md](docs/PROJECT_SETUP.md)**. It documents the owned Supabase project, database/storage setup, Vercel variables, auth redirects, Google OAuth callback and end-to-end smoke test.

Google sign-in requires the Google provider to be enabled in Supabase and a Client ID/Secret saved in its provider settings. The browser app uses only the anon/publishable key; never put a service-role key into a `VITE_*` variable or commit it.

## Evidence and privacy

Case rows and audit events are restricted with Supabase Row Level Security. Evidence files are stored under an owner-specific path in a private Storage bucket. Use only media you are authorized to inspect. Use synthetic documents for test cases and delete sensitive cases when no longer needed.

Generated reports are technical summaries and documentation aids, not automatic legal certificates or guarantees of admissibility.
