# Deployment

PropertyFlow is two pieces that deploy separately:

| Piece | What it is | Where it runs |
| --- | --- | --- |
| Web app | Expo Router app exported to a static SPA (`dist/`) | Vercel |
| API server | Express (`server/`) + Postgres + image uploads on disk | Replit |

The backend stays on Replit because `POST /api/uploads` writes image files to a
local `uploads/` directory and serves them back over `/uploads`. Vercel's
filesystem is ephemeral, so moving the server there would silently break image
uploads. Moving the backend later means replacing that disk write with object
storage first.

## Deploying the web app to Vercel

### 1. Environment variable

Project Settings → Environment Variables → add for **Production, Preview and
Development**:

```
EXPO_PUBLIC_DOMAIN = your-backend.replit.app
```

Use the host only — no `https://`, no trailing slash, no `/api`.

This is the single most important setting. Metro **inlines** `EXPO_PUBLIC_*`
variables into the JavaScript bundle at build time, so the API origin is frozen
when `expo export` runs. Changing it later requires a **redeploy**, not a
restart.

The build never fails over this. If the variable is missing, or still points at
`localhost`, the site deploys and renders anyway and the app falls back to
sending API requests to its own origin, logging a console warning that says so.
A site that loads and reports a failed request is much easier to diagnose than
a red build or a blank page. `scripts/check-web-env.js` prints the same warning
in the build log.

Until you set it, the app loads and shows the login screen, but logging in
fails with "Could not reach the server at ...". That is the expected state of a
frontend with no backend wired up yet, not a broken deploy.

### 2. Build settings

`vercel.json` already specifies these, so leave the dashboard on its defaults:

- Framework preset: **Other**
- Build command: `npm run build:web`
- Output directory: `dist`

### 3. SPA routing

`vercel.json` rewrites every path to `/index.html`. Expo Router handles routing
in the browser, so without this rewrite any deep link or page refresh on a
route like `/properties` returns Vercel's **404 NOT_FOUND** page. Vercel checks
real files first, so `/_expo/...` bundles and `/assets/...` fonts still serve
normally.

## Pointing the backend at the new frontend

On the Replit side, add the Vercel origin to the API's CORS allowlist:

```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Full origin, with scheme, no trailing slash. Several may be comma separated.
Replit domains and `localhost` are always allowed. Vercel preview deployments
(`*.vercel.app`) are allowed by default since their hostnames change on every
deploy; set `ALLOW_VERCEL_PREVIEWS=false` to turn that off.

Without this, the app loads but every API call fails with a CORS error in the
browser console.

## Things that keep living on the backend domain

These are served by Express, not by the Vercel site, and their URLs will use
the Replit host:

- `/api/*` — the whole API
- `/uploads/*` — uploaded property images
- `/p/:id` — the public, no-login property share page (`lib/share.ts` builds
  these links from `EXPO_PUBLIC_DOMAIN`)

## Building locally

```bash
npm run build:web     # writes dist/
npm test              # checks API origin resolution
npx serve dist        # optional: preview the export
```

Note that `npx serve dist` serves files only. To reproduce Vercel's catch-all
rewrite (so deep links like `/properties` work on refresh) use `npx serve -s dist`.

A local build uses `EXPO_PUBLIC_DOMAIN` from `.env`. See `.env.example` for
every variable both halves expect.
