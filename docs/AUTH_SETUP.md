# Production authentication setup

PiperTrace uses Supabase Auth directly. Before using sign-up, password reset or Google sign-in in production, check these settings in the connected Supabase project.

## 1. Set Vercel environment variables

In Vercel → Project → Settings → Environment Variables, ensure these exist for Production and Preview as needed:

- VITE_SUPABASE_URL — your Supabase project URL.
- VITE_SUPABASE_PUBLISHABLE_KEY — the Supabase publishable key (legacy anon key is also accepted).

If server functions call Supabase, also set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. Never use the service-role key in the browser. The local .env file is ignored by Git.

## 2. Configure redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- Set Site URL to https://diufoundry-storybook.vercel.app.
- Add https://diufoundry-storybook.vercel.app/auth.
- Add https://diufoundry-storybook.vercel.app/auth?mode=recovery.
- For local development, add http://localhost:3000/auth and http://localhost:3000/auth?mode=recovery.

If you use another custom production domain, add that domain's equivalent URLs. Preview deployments need explicit redirect entries or a tightly scoped Vercel preview pattern; do not use broad wildcards for untrusted domains.

## 3. Email/password authentication

In Supabase Dashboard → Authentication → Sign In / Providers, verify Email is enabled. If email confirmation is enabled, users must open the confirmation message before signing in. Configure production SMTP for dependable delivery and suitable rate limits; do not disable confirmation merely to hide setup problems.

Sign-up confirmation returns to /auth. Password-reset emails return to /auth?mode=recovery; the page accepts a new password only after Supabase has established a valid recovery session.

## 4. Google OAuth (optional)

Google sign-in uses Supabase's native signInWithOAuth provider. It will not work until Google is enabled in Supabase:

1. In Google Cloud Console, create an OAuth client for a Web application.
2. Add https://diufoundry-storybook.vercel.app as an authorised JavaScript origin (also add http://localhost:3000 for local testing).
3. In Google Cloud's authorised redirect URIs, add the callback URI shown in Supabase Dashboard → Authentication → Sign In / Providers → Google. For a standard Supabase project it is https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback.
4. Enter the Google Client ID and Client Secret in the Supabase Google provider settings and enable the provider.
5. Keep https://diufoundry-storybook.vercel.app/auth in Supabase's redirect allow list.

Google credentials belong in Supabase's provider settings, not in frontend source or VITE_* variables. If Google is not configured, the UI reports that clearly and email/password remains available.

## 5. Private cases and Storage

The cases and audit tables must have Row Level Security enabled with policies scoped to auth.uid(). The evidence Storage bucket must be private. File paths start with the authenticated user's UUID, followed by the case UUID. Apply supabase/migrations/20261022000100_private_evidence_bucket.sql to the linked Supabase project using your normal migration workflow or the SQL Editor.

After changing provider settings, Site URL, redirect URLs or environment variables, deploy again and test with a new account. Test sign-up, confirmation, sign-in, password reset, Google sign-in if enabled, case saving, case reload and sign-out in a real browser.
