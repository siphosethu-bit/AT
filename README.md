# Internet Athi official website

An art-directed React and TypeScript website for Internet Athi. The site is organised as a living archive with dedicated routes for the current album, video, live dates, story, booking and press contact.

## Local development

Requirements:

- Node.js 20 or newer
- npm 10 or newer

Install and run:

```bash
npm install
npm run dev
```

Vite prints the local URL in the terminal. The development server supports all five routes:

- `/`
- `/listen`
- `/live`
- `/story`
- `/book`

## Production checks

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

The production output is written to `dist/`.

## Content updates

Verified artist content is kept in `src/content/artist.ts`. Update that file for:

- Album details and track links
- Music videos
- Live dates and ticket links
- Contact details
- Social profiles
- Press coverage

The interfaces in `src/content/types.ts` keep required titles, dates and URLs consistent. Event dates use ISO 8601 timestamps with the South African UTC offset. The live page compares each event end date with the current time, so an expired event moves into the past archive automatically.

Portrait, album and video imagery is kept in `public/assets/`. Keep the existing dimensions in component markup when replacing an image so page layout remains stable.

## Booking enquiries

No form service or server endpoint was supplied. The booking form validates required details in the browser and opens a prepared email to `bookings@internetathi.com`. It does not claim to send or store an enquiry. When a production form service is approved, replace the mailto handler in `src/pages/BookPage.tsx` with a server-side submission and retain the existing loading, error and confirmation requirements.

## Deployment

The project is a static Vite build. `public/_redirects` supports history fallback on Netlify, and `vercel.json` provides the equivalent rewrite for Vercel. On another host, route unknown paths to `index.html` so direct links such as `/listen` and `/book` resolve correctly.

No environment variables are currently required.

## Content gaps requiring approval

- A downloadable electronic press kit, technical rider and stage plot were not supplied, so no fake download controls are shown.
- High-resolution approved artist portraits can replace the supplied small portraits when available.
- International booking availability, approved booking lead times and fee guidance are not published because no authoritative source was supplied.
- A server-side booking form needs an approved service or endpoint before it can honestly submit within the website.
- TikTok is omitted because the current official Linktree does not expose a verified profile destination.
