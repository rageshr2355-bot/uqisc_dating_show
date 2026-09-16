<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Jab We Matched — Live Dating Show Polling

Live interactive audience polling for a dating-show / matchmaking event: real-time voting,
spectator "hot takes," reaction bursts, envelope-reveal animations, and a stage broadcast
screen — built for ~500 concurrent phones plus one shared stage display.

This is the same app you had running on AI Studio, with one important addition: **an admin
passphrase now protects the Stage Screen and Host Console**, so only you can drive the show
while the audience link stays completely open, no sign-in required.

## The three views

| View | URL | Who can open it |
|---|---|---|
| **Audience Pad** | `?view=audience` (default) | Anyone — this is what the QR code links to. No login, no accounts. |
| **Stage Screen** | `?view=stage` | You, after entering the admin passphrase once per device. |
| **Host Console** | `?view=host` | You, after entering the admin passphrase once per device. |

A visitor on the Audience Pad has **no button, tab, or link anywhere in the UI** that leads to
Stage or Host — those only show up in the header/footer once you're logged in as admin. And
even if someone manually edits the URL to `?view=host`, the server itself rejects every
host-only action (switching questions, locking votes, resetting, editing, deleting, simulating
spectators) unless the request carries a valid admin session token — so this isn't just a UI
trick, it's enforced by the backend.

## Setting your admin passphrase

Before your event, set `ADMIN_KEY` in your `.env` file (copy `.env.example` to `.env`):

```
ADMIN_KEY="something-only-you-know"
```

If you skip this, the server will generate a random passphrase for you at startup and print it
in the server logs, e.g.:

```
================================================================
  ADMIN ACCESS — Stage Screen & Host Console
  Passphrase: 7f3a9c21
  (auto-generated because ADMIN_KEY was not set in .env — set
   ADMIN_KEY yourself before the event so it stays the same
   across restarts.)
  Enter this once at ?view=host or ?view=stage on your device.
  The Audience Pad (?view=audience, the QR code link) never
  needs it and never shows a way to reach the other views.
================================================================
```

Go to `your-domain.com/?view=host` (or `?view=stage`) on your laptop/tablet, enter the
passphrase once, and it's remembered on that device (in its browser's local storage) for 24
hours. Use "Log Out Admin" in the footer if you ever want to clear it early.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `ADMIN_KEY`
3. Run the app: `npm run dev`
4. Visit `http://localhost:3000/?view=audience` for the audience view, and
   `http://localhost:3000/?view=host` to log in as admin.

## About the QR code

The QR code / "Join" link always points at `?view=audience` — generate it from the Host
Console or Stage Screen once you're logged in (Header → "Join QR", or the mini QR badge
pinned to the corner of the Stage Screen). It will automatically use whatever domain the app
is actually running on.

## Important: getting a truly public URL (no Google sign-in wall)

If you deploy this straight back onto an **AI Studio preview URL** (the kind that looks like
`https://ais-pre-XXXXXXXXXXXXX-....run.app`), Google puts its own sign-in wall ("cookie check")
in front of it — that's a property of that specific *preview* Cloud Run channel, completely
separate from this app's own code, and it will block audience members who aren't signed into
that Google account/project.

To get a link your audience can open with zero Google login, do one of the following:

1. **Use AI Studio's own "Publish"/production deploy flow** (rather than the auto preview
   channel) if your AI Studio project offers one — production app URLs are public by default.
2. **Deploy this code to your own Cloud Run service** and set its ingress/authentication to
   "Allow unauthenticated invocations" (Cloud Console → Cloud Run → your service → Security).
   This project builds as a normal Node server (`npm run build && npm start`), so it deploys to
   Cloud Run like any other container.
3. **Deploy somewhere else entirely** — Render, Railway, Fly.io, a plain VPS, etc. — any of
   these will serve the app as a normal public website with no extra auth layer by default.
   `npm run build` produces `dist/` (static frontend) + `dist/server.cjs` (the Node server);
   `npm start` runs it.

Whichever you choose, the admin passphrase built into this app is what keeps Stage/Host
private — you don't need (and shouldn't rely on) a platform-level login wall for that anymore.

## Architecture (unchanged from the original)

- **Frontend:** React + Vite, single-page app, view switches via `?view=` query param.
- **Backend:** Express + `ws` WebSocket server in `server.ts`, in-memory state, broadcasts vote/
  question/reaction updates to every connected client in real time.
- **New:** an in-memory admin session store (`server.ts`) gates every `/api/host/*` and
  question-editing endpoint behind a passphrase exchanged for a short-lived session token.
