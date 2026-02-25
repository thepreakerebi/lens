# Lens

AI-powered CCTV monitoring platform for security operators. Built for the **BeOrchid Africa Developers Hackathon 2026** (Open Innovation track).

## What it does

- **Ingest footage** — Add CCTV video via URL or direct upload; Twelve Labs indexes it for AI search
- **Natural language search** — Query in plain English (e.g. “show me incidents near gate B between 2–4pm”) and get matching clips with timestamps
- **Automated alerts** — Configure rules in natural language; get notified by email or webhook when matches are found
- **Incident inbox** — Real-time incident feed with severity, camera info, and clip timestamps

## Tech stack

- **Frontend:** Next.js 15 (App Router), TypeScript, shadcn/ui, Tailwind CSS
- **Backend:** Convex (database, real-time sync, cron, HTTP actions)
- **Video AI:** Twelve Labs (Marengo search, Pegasus analysis)
- **Auth:** Better Auth (Google OAuth)
- **Alerts:** Resend (email)

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.local.example` to `.env.local` and fill in:

   - `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` (from `npx convex dev`)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth)

   Set Convex cloud env vars via `npx convex env set KEY val`:

   - `BETTER_AUTH_SECRET`
   - `SITE_URL`
   - `TWELVE_LABS_API_KEY`
   - `RESEND_API_KEY` — Required for incident email alerts. Get from [Resend](https://resend.com).
   - `RESEND_FROM_EMAIL` (optional) — Sender address, e.g. `Lens Alerts <alerts@yourdomain.com>`. If unset, uses `onboarding@resend.dev` (Resend test domain; only sends to your Resend account email until you verify a domain).

3. **Run Convex dev**

   ```bash
   npx convex dev
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
lens/
├── app/
│   ├── (auth)/           # Sign-in
│   ├── (dashboard)/      # Cameras, ingest, search, alerts, settings
│   └── api/auth/         # Better Auth routes
├── components/           # UI, cameras, search, alerts
├── convex/               # Convex functions (queries, mutations, actions, crons)
└── lib/                  # Auth helpers
```
