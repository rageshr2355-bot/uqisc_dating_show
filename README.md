# Jab We Matched — Live Dating Show Polling

Live interactive audience polling for a dating-show / matchmaking event: real-time voting,
optional audience comments, anonymous confessions, envelope-reveal animations, and a stage
broadcast screen — built for ~700 concurrent phones plus one shared stage display.

## How a show runs

1. Phones open the audience link and see a **"Hang tight"** waiting screen. Nothing is shown
   until you push a question.
2. In the Host Console, hit **Push to stage & phones** on a question. It appears on the stage
   screen and on every phone at the same moment.
3. Everyone votes. **One vote per phone** — voting again just changes your vote. Results appear
   on a phone once it has voted.
4. **Lock** voting, then **Reveal** the winner on stage.
5. **Show Waiting Screen** takes the question off the stage and all phones between segments.

Everything (questions, votes, confessions, host logins) is saved to disk continuously, so a
server restart mid-show — during the food break, say — picks up exactly where it left off.

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

## Before the event

- Set `ADMIN_KEY` (below) and, if your host has a persistent disk, point `DATA_DIR` at it.
- Edit the placeholder questions in the Host Console to your real ones. They ship with zero votes.
- Run **Reset all votes** in the Host Console after rehearsing so the counters start clean.
- Optionally rehearse the load: `node load-tests/audience-wave.mjs https://your-domain 700 60 10`
  opens 700 fake phones, joins them over 60s and votes over 10s, and checks the totals add up.

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

## Architecture

- **Frontend:** React + Vite, single-page app, view switches via `?view=` query param.
- **Backend:** Express + `ws` WebSocket server in `server.ts`. One process; state lives in memory
  and is mirrored to `DATA_DIR/state.json` (default `./data/`) a second after every change.
- **Vote integrity:** each phone makes itself a random device id on first load and sends it with
  every vote. Votes are stored per (question, device); re-voting moves the vote. The same id
  limits audience nominations to one per phone per question.
- **Moderation:** everything an audience member types is length-capped and checked against the
  blocklist in `moderation.ts` (English + romanised Hindi, tolerant of `sh1t`-style spelling)
  before it's stored or broadcast — flagged nominations are rejected, flagged comments dropped.
  Confessions additionally wait for host approval. Add words to `BLOCKLIST` as needed.
- **Admin:** creating, editing, switching, locking and resetting questions all require the
  admin session token. Audience endpoints (`/api/vote`, `/api/options`, `/api/reaction`,
  `/api/confessions`) are public by design.
- **Broadcast load:** votes are coalesced into one broadcast per 80 ms and the "in hall" counter
  into one per 400 ms burst. Both matter at 700 phones.
