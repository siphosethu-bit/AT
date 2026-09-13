# Artist desk and publishing

The code is implemented; real sign-in, saved enquiries, uploads and publishing require a configured Supabase project. No production account, database migration, external publication or Bandsintown connection was created by this change.

## Routes

- `/admin`: invitation-only artist sign-in.
- `/admin/preview`: fictional sample dashboard. Nothing is sent or published from this view.
- `/book`: sends an enquiry to the private booking database. If the backend is unavailable, the form retains the details and offers an email draft; it does not claim the brief was sent.

## Server setup

1. In the existing Supabase project, run `db/schema.sql` if not already applied, then `db/artist-desk.sql` and `db/site-content.sql`. These are additive migrations. Review them before applying to production.
2. Create or invite the artist/team accounts in Supabase Authentication. Set a strong password through your normal account-management process. There is no public admin registration or built-in shared password.
3. Set the server variables from `.env.example` in the deployment settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_ORIGIN`: exact origin, such as `https://your-site.vercel.app`, with no trailing slash.
   - `ARTIST_ADMIN_USER_IDS`: comma-separated Supabase user UUIDs allowed into this single-artist workspace.
4. Deploy the functions with the frontend. Use `vercel dev` to exercise the APIs locally, with `APP_ORIGIN` matching its local URL. Vite alone serves the frontend and sample dashboard, not the serverless APIs. Do not put any server secret in a `VITE_` variable.
5. Test a real enquiry and authorised login in a non-production environment before launch. Check Supabase Auth rate limits and add platform-level rate limiting to the login and booking endpoints for public deployment. Password recovery/invitations are handled through Supabase administration, not a public reset form here.

## Privacy and authentication

The server checks Supabase Auth and the UUID allowlist on every private request. Sessions use a Secure, HttpOnly, SameSite=Strict cookie (local HTTP is the only Secure exception), scoped to `/api`, for at most an hour. Tokens are never returned to browser JavaScript or stored in localStorage. Expired sessions require sign-in again. Mutations require an exact matching Origin and JSON content type. All private responses are non-cacheable.

Booking and content tables have RLS enabled and no browser-access policies. Only the service-role functions access them. Booking submissions require consent, validation, a honeypot, idempotency UUID, and an atomic database submission limit. Raw IP addresses are not retained; an opaque requester hash supports abuse controls. Notes stay private. A status change does not send an email, create a contract or announce a show.

Set a retention/access policy for booking details before launch; the site does not implement automatic data deletion. The artist-media bucket holds public cover artwork only, never private booking documents. Uploads accept raster JPEG/PNG/WebP up to 2 MB, with server signature checks. Replaced or unused uploads are not automatically deleted; review and remove orphaned assets through Storage administration.

## Publishing

Shows and releases have private draft and published states. Editors validate required fields, dates, coordinates, links and artwork before saving. Publishing updates `/api/site-content`; Home, Live, Listen and event structured data consume that feed. Existing static archive entries remain as a fallback. Already open public pages refresh on focus or within 60 seconds. Unpublish moves an added entry back to a draft; it is not deleted.

The map currently covers South Africa. City autocomplete provides approximate coordinates; exact venue coordinates can be entered. Times are entered in SAST (UTC+02). Releases require a Spotify album/track link, accessible cover description and uploaded or hosted HTTPS artwork. Uploaded artwork is public immediately, but the release is not listed until published.

## Bandsintown

Set `BANDSINTOWN_APP_ID` to approved API access and `BANDSINTOWN_ARTIST_ID` to the numeric artist ID. In Live & shows, fetch dates, review an event, confirm its province/coordinates, then publish it here. Stable `bit-` IDs make repeated saves update the same imported entry. This is a deliberate import workflow, not a scheduled bidirectional sync. Check manually for changed or cancelled source events and unpublish/update imported copies as needed. Non-South-African events cannot be added to the current map.

The Events API reads listings; announcements on Bandsintown are managed in Bandsintown for Artists. No API credential is exposed in public responses. References: [Bandsintown Events API](https://help.artists.bandsintown.com/en/articles/9186477-api-documentation), [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Verification

`npm run build` and `npm run lint` check the app and API types. `node scripts/artist-api-qa.mjs` verifies private access, mutation checks, draft/public separation, publishing, uploads and error handling against mocked services. `node scripts/paper-desk-qa.mjs` checks responsive layouts, navigation, accessibility and booking/desk interactions against the local frontend. `node scripts/publishing-qa.mjs` checks mobile map dialogs and publication flows with explicit API fixtures. External iframe internals are excluded from our accessibility audit.

These fixtures do not replace a live Supabase/Bandsintown integration test once credentials and migrations are configured.
