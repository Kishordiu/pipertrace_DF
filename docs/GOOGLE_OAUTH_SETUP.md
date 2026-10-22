# Google sign-in setup for PiperTrace

The error `Unsupported provider: missing OAuth secret` comes from Supabase Auth. It means the Google identity provider is being called, but its OAuth Client Secret is missing in the Supabase provider settings. The browser code cannot create or recover that secret.

## 1. Create the Google OAuth web client

1. Open Google Cloud Console — Credentials: https://console.cloud.google.com/apis/credentials
2. Select the intended Google Cloud project, or create one.
3. Complete the OAuth consent screen / Google Auth Platform branding and audience details requested by Google.
4. Create an OAuth client ID with application type **Web application**.
5. In **Authorized JavaScript origins**, add:

   `https://diufoundry-storybook.vercel.app`

   Add your own production domain too, if one is used. For local testing, add `http://localhost:3000`.

6. In **Authorized redirect URIs**, add the Supabase callback exactly:

   `https://amcxylppnpchwpuzaxec.supabase.co/auth/v1/callback`

7. Save the OAuth client and copy its Client ID and Client Secret. Do not paste the Client Secret in a chat, commit it to GitHub, or put it in a `VITE_*` environment variable.

## 2. Configure the Google provider in Supabase

1. Open the Supabase dashboard: https://supabase.com/dashboard
2. Select the PiperTrace project with reference `amcxylppnpchwpuzaxec`.
3. Go to **Authentication → Sign In / Providers → Google** (the menu label may vary slightly).
4. Enable Google.
5. Paste the Google **Client ID** into the Client ID field.
6. Paste the matching Google **Client Secret** into the Client Secret field.
7. Save the provider configuration.

This is the essential fix for `missing OAuth secret`. Google OAuth will fail before displaying the Google account picker until the Supabase provider has its secret.

## 3. Configure Supabase return URLs

In **Authentication → URL Configuration**:

- Site URL: `https://diufoundry-storybook.vercel.app`
- Add redirect URL: `https://diufoundry-storybook.vercel.app/auth`
- For local testing: `http://localhost:3000/auth`

If using another domain, add its corresponding `/auth` URL. Keep redirect URLs narrowly scoped; do not allow arbitrary untrusted redirects.

There are two distinct redirect settings:

- Google Cloud's **Authorized redirect URI** is the Supabase callback ending in `/auth/v1/callback`.
- Supabase's **Redirect URLs** allowlist includes the PiperTrace app return URL ending in `/auth`.

Do not confuse these URLs.

## 4. Permissions and least privilege

PiperTrace requests only the standard identity scopes `openid email profile` to sign the user in. It does **not** request access to all Gmail, Drive, Contacts, Calendar or other Google data.

If a future feature needs a Google API, implement a separate, explicit authorization action explaining which data is accessed and why. Ask for only the necessary additional scopes at the time that feature is used.

## 5. Test the entire flow

1. Open `https://diufoundry-storybook.vercel.app/auth`.
2. Click **Continue with Google**.
3. Select the intended Google account and review the consent screen.
4. After approval, verify return to PiperTrace and navigation to Studio.
5. Refresh the page and confirm the session remains active.
6. Open Cases, save and reload a case, then sign out.
7. Repeat with an email/password account to ensure the basic auth path also works.

If Supabase still reports `missing OAuth secret`, re-open the Supabase Google provider page and confirm the Client Secret was saved in the same project that the application URL points to.

If Google reports `redirect_uri_mismatch`, compare the URI Google displays in the error with the exact Authorized redirect URI registered in Google Cloud.

## Security notes

- Client ID is not a secret; Client Secret is.
- Configure the secret only in Google/Supabase provider settings, never in this repository or browser bundle.
- Never use a Supabase service-role key in a `VITE_*` variable.
- A Google login consent screen does not mean the app has access to all Google services. The configured scopes determine the requested access.
