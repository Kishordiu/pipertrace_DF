# PiperTrace — connect your Supabase project

Project reference: `amcxylppnpchwpuzaxec`

## A. Apply database and storage setup once

Open https://supabase.com/dashboard/project/amcxylppnpchwpuzaxec/sql/new

1. Open `supabase/setup.sql` in this repository.
2. Copy the entire SQL file into the Supabase SQL Editor.
3. Click **Run** and confirm that it completes without errors.
4. Open Table Editor and confirm `public.cases` and `public.audit_events` exist.
5. Open Storage and confirm the `evidence` bucket is private.

The script creates account-owned case rows, audit events, Row Level Security policies, a private evidence bucket, and per-user storage-path policies. Run it on the new PiperTrace Supabase project only. It is designed to be safe to re-run for these matching schema objects.

## B. Confirm Vercel environment

The Vercel project `diufoundry-storybook` should have these values for Production, Preview and Development:

- `VITE_SUPABASE_URL=https://amcxylppnpchwpuzaxec.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` set to the project's anon/publishable client key.
- `VITE_SUPABASE_PROJECT_ID=amcxylppnpchwpuzaxec`
- `SUPABASE_URL=https://amcxylppnpchwpuzaxec.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` set to the same anon/publishable client key.
- `SUPABASE_PROJECT_ID=amcxylppnpchwpuzaxec`

Do not configure a service-role key in any `VITE_*` variable. The public anon/publishable key is used in the browser together with user sessions and RLS.

## C. Set authentication URLs

In Supabase → Authentication → URL Configuration:

- Site URL: `https://diufoundry-storybook.vercel.app`
- Redirect URL: `https://diufoundry-storybook.vercel.app/auth`
- Local development: `http://localhost:3000/auth` and `http://localhost:3000/auth?mode=recovery`

In Google Cloud Console → OAuth Client → Authorized redirect URIs, the URI for this Supabase project must be:

`https://amcxylppnpchwpuzaxec.supabase.co/auth/v1/callback`

The Google Cloud JavaScript origin is `https://diufoundry-storybook.vercel.app`. In Supabase → Authentication → Sign In / Providers → Google, enable Google and save the matching Google Client ID and Client Secret.

## D. Test real product flows

After applying SQL and saving Auth settings, redeploy the Vercel project so it uses the latest environment variables.

1. Visit https://diufoundry-storybook.vercel.app/auth and create a test account.
2. Verify email if Supabase requires confirmation.
3. Sign in and confirm Studio opens.
4. Select a supported media category, upload a small non-sensitive test file, and analyze.
5. Confirm a case and its audit events appear in Cases after a refresh.
6. Open the case, verify the stored SHA-256 and test the report action.
7. Delete the test case and verify its stored objects are removed.
8. Test Google sign-in after provider setup.

## E. Rotate the previously exposed service-role key

A service-role key was previously pasted into chat and was present in an earlier committed `.env` file. Treat it as compromised. In the Supabase dashboard, rotate/deactivate that exact legacy `service_role` key after checking other services that might use it. Remove any remaining use from Vercel or other deployments and never commit the replacement. The app's browser must only use the anon/publishable key.

## Troubleshooting

- `missing OAuth secret`: the Google provider Client Secret has not been saved in this Supabase project.
- `redirect_uri_mismatch`: the Google Cloud Authorized redirect URI must match the `/auth/v1/callback` URL exactly.
- `relation public.cases does not exist`: `supabase/setup.sql` has not been applied to this project.
- Storage `Bucket not found`: confirm the script created the private `evidence` bucket.
- Email confirmation message does not arrive: verify Supabase email provider settings and configure production SMTP for dependable delivery.
