import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// ---------------------------------------------------------------------------
// ADMIN ACCESS CONTROL
//
// The "Audience Pad" view (voting, hot takes, reactions) is intentionally
// public with zero login, so anyone who scans the QR code can jump straight
// in. The "Stage Screen" and "Host Console" views control the live show for
// everyone, so they are gated behind a single shared admin passphrase set via
// the ADMIN_KEY environment variable. If you don't set one, a random
// passphrase is generated at startup and printed below — copy it from the
// server logs before the event.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// SWEAR-WORD FILTER
//
// Applied to anything an anonymous audience member types that can end up on
// the Stage Screen: confessions, and write-in nominee names/descriptions.
// Whole-word, case-insensitive matching (so "assassin" or "class" don't
// trip on substrings). This is a practical blocklist for a live college
// event, not an exhaustive or clever filter — the host's moderation queue
// (for confessions) remains the real backstop.
// ---------------------------------------------------------------------------
const PROFANITY_LIST = [
  'fuck', 'fucking', 'fucker', 'motherfucker',
  'shit', 'bullshit', 'shitty',
  'bitch', 'bitches',
  'asshole', 'ass',
  'bastard',
  'cunt',
  'dick', 'dickhead',
  'piss', 'pissed',
  'slut', 'whore',
  'cock',
  'twat',
  'wanker',
  'nigger', 'nigga',
  'faggot', 'fag',
  'retard', 'retarded',
  'rape', 'rapist',
];
const PROFANITY_REGEX = new RegExp(
  `\\b(${PROFANITY_LIST.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

function containsProfanity(text: string): boolean {
  if (!text) return false;
  return PROFANITY_REGEX.test(text);
}

const ADMIN_KEY = (process.env.ADMIN_KEY || '').trim() || crypto.randomBytes(4).toString('hex');
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const adminSessions = new Map<string, number>(); // token -> expiresAt

function createAdminSession(): string {
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return token;
}

function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expiresAt = adminSessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

// Periodically sweep expired sessions so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions.entries()) {
    if (now > expiresAt) adminSessions.delete(token);
  }
}, 1000 * 60 * 30);

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers to avoid leaking length via timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Types for Jab We Matched Event
interface PollOption {
  id: string;
  label: string;
  description?: string;
  avatarUrl?: string;
  votes: number;
  isUserCreated?: boolean;
  createdBy?: string;
  requiresWriteIn?: boolean;
  tag?: string;
}

interface UserVoteInput {
  hotTake?: string;
  customWriteIn?: string;
  spiceLevel?: number;
  voterName: string;
}

interface PollQuestion {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  prompt: string;
  options: PollOption[];
  requiresVoterInput: boolean;
  inputPromptText?: string;
  allowAudienceOptions: boolean;
  status: 'active' | 'locked' | 'revealed';
  totalVotes: number;
  winnerOptionId?: string;
  createdAt: string;
}

interface AudienceHotTake {
  id: string;
  pollId: string;
  voterName: string;
  optionLabel: string;
  hotTake: string;
  spiceLevel: number;
  timestamp: string;
}

// Initial Data matching the poster and event theme: "Jab We Matched"
const INITIAL_POLLS: PollQuestion[] = [
  {
    id: 'poll-hely-elimination',
    category: 'dumping',
    categoryLabel: '💔 THE ELIMINATION ROUND',
    title: 'Which Guy Will Hely Eliminate?',
    prompt: "Hely has to send one of the remaining guys home tonight. Who do you think it'll be?",
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-hely-guess',
        label: 'Type Your Guess',
        description: "Who do you think Hely will eliminate? Type his name below.",
        votes: 0,
        requiresWriteIn: true,
        tag: 'Audience Guess 🔮',
      },
    ],
  },
  {
    id: 'poll-tahsin-choice',
    category: 'recoupling',
    categoryLabel: '💘 THE FINAL CHOICE',
    title: 'Which Girl Will Tahsin Choose?',
    prompt: "Tahsin has to make his final choice tonight. Who do you think he'll pick?",
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-tahsin-guess',
        label: 'Type Your Guess',
        description: "Who do you think Tahsin will choose? Type her name below.",
        votes: 0,
        requiresWriteIn: true,
        tag: 'Audience Guess 🔮',
      },
    ],
  },
  {
    id: 'poll-mm-round1',
    category: 'truth_or_dare',
    categoryLabel: '🎭 MILIND + MEERA · ROUND 1',
    title: 'What Should They Do First?',
    prompt: "Milind and Meera just finished 3 minutes of getting to know each other. What should they do next?",
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'opt-mm1-1', label: 'Do a pickup line on each other', votes: 0, tag: 'Round 1' },
      { id: 'opt-mm1-2', label: 'Give each other a compliment', votes: 0, tag: 'Round 1' },
      { id: 'opt-mm1-3', label: 'Recreate a movie scene', votes: 0, tag: 'Round 1' },
      { id: 'opt-mm1-4', label: 'Read out the last DM — then explain', votes: 0, tag: 'Round 1' },
    ],
  },
  {
    id: 'poll-mm-round2',
    category: 'truth_or_dare',
    categoryLabel: '🎭 MILIND + MEERA · ROUND 2',
    title: 'Round 2 Challenge',
    prompt: 'Keep it going! Which challenge should Milind and Meera take on?',
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'opt-mm2-1', label: 'Call your mum — let the other person speak on the phone', votes: 0, tag: 'Round 2' },
      { id: 'opt-mm2-2', label: 'Would You Rather speed round', votes: 0, tag: 'Round 2' },
      { id: 'opt-mm2-3', label: "What's something you're afraid to admit you find attractive? (Hear me outs)", votes: 0, tag: 'Round 2' },
      { id: 'opt-mm2-4', label: 'Childhood crush story', votes: 0, tag: 'Round 2' },
    ],
  },
  {
    id: 'poll-mm-round3',
    category: 'truth_or_dare',
    categoryLabel: '🎭 MILIND + MEERA · ROUND 3',
    title: 'Round 3 Challenge',
    prompt: 'Which challenge should Milind and Meera take on?',
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'opt-mm3-1', label: 'Swap phones for 30 seconds', votes: 0, tag: 'Round 3' },
      { id: 'opt-mm3-2', label: 'Draw a portrait of each other in one minute', votes: 0, tag: 'Round 3' },
      { id: 'opt-mm3-3', label: 'Last Google search', votes: 0, tag: 'Round 3' },
      { id: 'opt-mm3-4', label: 'Reveal a detail/red flag in your last relationship or situationship', votes: 0, tag: 'Round 3' },
    ],
  },
  {
    id: 'poll-mm-round4',
    category: 'truth_or_dare',
    categoryLabel: '🎭 MILIND + MEERA · ROUND 4',
    title: 'Round 4 Challenge',
    prompt: 'Which challenge should Milind and Meera take on?',
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'opt-mm4-1', label: 'Take a couple photo for us to post on the ISC account', votes: 0, tag: 'Round 4' },
      { id: 'opt-mm4-2', label: 'Read out the last DM', votes: 0, tag: 'Round 4' },
      { id: 'opt-mm4-3', label: 'Call your mum — let the other person speak on the phone', votes: 0, tag: 'Round 4' },
      { id: 'opt-mm4-4', label: 'Post a couple photo on the ISC Instagram story', votes: 0, tag: 'Round 4' },
    ],
  },
  {
    id: 'poll-mm-round5',
    category: 'truth_or_dare',
    categoryLabel: '🎭 MILIND + MEERA · ROUND 5',
    title: 'Round 5 Challenge',
    prompt: 'Last challenge! Which one should Milind and Meera take on?',
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      { id: 'opt-mm5-1', label: "Reveal the last time you slid into someone's DMs / chatted up someone", votes: 0, tag: 'Round 5' },
      { id: 'opt-mm5-2', label: 'Let your date post something on your story', votes: 0, tag: 'Round 5' },
      { id: 'opt-mm5-3', label: 'Last Google search', votes: 0, tag: 'Round 5' },
      { id: 'opt-mm5-4', label: 'Tell your date what you noticed about them first', votes: 0, tag: 'Round 5' },
    ],
  },
  {
    id: 'poll-cutest-couple',
    category: 'recoupling',
    categoryLabel: '💖 FINALE',
    title: "Who's the Cutest Couple?",
    prompt: "Out of tonight's couples, who do YOU think is the cutest?",
    requiresVoterInput: false,
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 0,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-cutest-hely',
        label: 'Hely & ___',
        description: "Type the full couple name, e.g. 'Hely & Priya'",
        votes: 0,
        requiresWriteIn: true,
        tag: 'Type the couple 💬',
      },
      {
        id: 'opt-cutest-tahsin',
        label: 'Tahsin & ___',
        description: "Type the full couple name, e.g. 'Tahsin & Priya'",
        votes: 0,
        requiresWriteIn: true,
        tag: 'Type the couple 💬',
      },
      { id: 'opt-cutest-anmol', label: 'Anmol & Yasna', votes: 0, tag: 'Couple 💕' },
      { id: 'opt-cutest-sarah', label: 'Sarah & Kathan', votes: 0, tag: 'Couple 💕' },
      // Milind & Meera is deliberately NOT here — add it live via
      // Host Console → Edit Question → + Add Option, right at the reveal
      // moment, so it's a genuine surprise (the data doesn't exist
      // anywhere on any device until you add it).
    ],
  },
];

const INITIAL_HOT_TAKES: AudienceHotTake[] = [];

// ---------------------------------------------------------------------------
// PERSISTENCE
//
// Everything below survives a process restart (a crash, a manual restart
// during the food break, a redeploy) by round-tripping through a JSON file.
// NOTE: this only actually survives on Render if a persistent Disk is
// attached and mounted at DATA_DIR — Render's default filesystem is wiped
// on every restart/redeploy. Without a disk, this still helps for in-place
// crashes that don't recreate the container, but not for a real redeploy.
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Could not create data directory:', err);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  // Debounced — coalesces a burst of votes/edits into one disk write rather
  // than hammering the disk on every single request.
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistNow();
  }, 1000);
}

function persistNow() {
  try {
    ensureDataDir();
    const snapshot = {
      polls: state.polls,
      activePollId: state.activePollId,
      hotTakes: state.hotTakes,
      reactionCounts: state.reactionCounts,
      featuredConfessionId: state.featuredConfessionId,
      confessionsBoardActive: state.confessionsBoardActive,
      waitingScreenActive: state.waitingScreenActive,
      confessions,
      voteRegistry,
      savedAt: new Date().toISOString(),
    };
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(snapshot));
    fs.renameSync(tmpFile, DATA_FILE); // atomic on the same filesystem
  } catch (err) {
    console.error('Failed to save state to disk:', err);
  }
}

function loadPersistedState(): Partial<{
  polls: PollQuestion[];
  activePollId: string;
  hotTakes: AudienceHotTake[];
  reactionCounts: Record<string, number>;
  featuredConfessionId: string | null;
  confessionsBoardActive: boolean;
  waitingScreenActive: boolean;
  confessions: Confession[];
  voteRegistry: Record<string, Record<string, string>>;
}> | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load persisted state (starting fresh):', err);
    return null;
  }
}

const persisted = loadPersistedState();

// Anonymous Confessions — held OUTSIDE `state` on purpose. `state` gets
// broadcast wholesale into every broadcast and into GET /api/state, which
// every connected client (including anonymous audience members) receives —
// so anything unmoderated must never live there. Confessions start
// 'pending' and only become visible to the public once a host approves
// them; the host console fetches the full pending/approved/rejected list
// separately over an admin-authenticated endpoint, never over the public
// broadcast.
interface Confession {
  id: string;
  text: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}
let confessions: Confession[] = persisted?.confessions || [];
const MAX_STORED_CONFESSIONS = 500; // cap memory growth over a long event
const MAX_PUBLIC_CONFESSIONS = 60; // cap what's ever sent to the public feed

// One vote per device per poll: pollId -> deviceId -> the optionId they
// currently have selected. Voting again just moves this pointer and
// adjusts the counts — it no longer adds a second vote.
let voteRegistry: Record<string, Record<string, string>> = persisted?.voteRegistry || {};

function getPublicConfessions() {
  return confessions
    .filter((c) => c.status === 'approved')
    .slice(-MAX_PUBLIC_CONFESSIONS);
}

function publicState() {
  return { ...state, confessions: getPublicConfessions() };
}

// App Server State
const state = {
  polls: persisted?.polls || (JSON.parse(JSON.stringify(INITIAL_POLLS)) as PollQuestion[]),
  activePollId: persisted?.activePollId || 'poll-hely-elimination',
  hotTakes: persisted?.hotTakes || (JSON.parse(JSON.stringify(INITIAL_HOT_TAKES)) as AudienceHotTake[]),
  reactionCounts: (persisted?.reactionCounts || {
    '🌹': 342,
    '🚩': 215,
    '🔥': 489,
    '💔': 118,
    '🍿': 276,
    '💖': 512,
  }) as Record<string, number>,
  featuredConfessionId: persisted?.featuredConfessionId ?? null as string | null,
  confessionsBoardActive: persisted?.confessionsBoardActive ?? false,
  // Defaults to true: a fresh boot always starts on the audience's "Hang
  // Tight" waiting screen until the host explicitly pushes a question live.
  waitingScreenActive: persisted?.waitingScreenActive ?? true,
};

// Batching buffer for 700-spectator reaction bursts
interface PendingBurst {
  id: string;
  emoji: string;
  label: string;
  x: number;
}
let pendingReactions: PendingBurst[] = [];
let pendingVoteBroadcastTimeout: NodeJS.Timeout | null = null;
let lastVotePollId: string | null = null;

async function startServer() {
  const app = express();
  // Render (and most hosts) assign their own port via $PORT — always defer to it.
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Admin auth middleware — applied only to host/stage control endpoints.
  // The audience-facing endpoints (vote, options, reaction, state, new
  // question suggestions) never touch this and remain fully public.
  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = req.header('x-admin-token');
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    next();
  }

  // Admin login: exchange the shared passphrase for a session token
  app.post('/api/admin/login', (req, res) => {
    const { passphrase } = req.body as { passphrase?: string };
    if (!passphrase || !timingSafeEqual(String(passphrase), ADMIN_KEY)) {
      return res.status(401).json({ error: 'Incorrect admin passphrase' });
    }
    const token = createAdminSession();
    return res.json({ success: true, token });
  });

  // Admin session check (used to restore admin state on page reload)
  app.get('/api/admin/check', (req, res) => {
    const token = req.header('x-admin-token');
    return res.json({ valid: isValidAdminToken(token) });
  });

  // Admin logout
  app.post('/api/admin/logout', (req, res) => {
    const token = req.header('x-admin-token');
    if (token) adminSessions.delete(token);
    return res.json({ success: true });
  });

  // WebSocket Server optimized for 700+ clients
  const wss = new WebSocketServer({ 
    server,
    // Per-message deflate disabled to save CPU during mass broadcast to 700 sockets
    perMessageDeflate: false 
  });

  // Pre-serialized broadcast function to prevent running JSON.stringify 700 times
  function broadcastPreSerialized(message: string) {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 64 * 1024) {
        client.send(message);
      }
    }
  }

  function broadcast(event: { type: string; payload: unknown }) {
    const message = JSON.stringify(event);
    broadcastPreSerialized(message);
  }

  function getConnectedCount() {
    // Show connected count or floor of active spectators
    return Math.max(1, wss.clients.size);
  }

  // Real debounce for the audience-count broadcast. Previously this fired
  // an immediate broadcast() on every single connect/close event — with
  // ~700 phones connecting in the same few seconds (everyone scanning the
  // QR code at once), that's up to ~700 broadcasts each fanning out to up
  // to ~700 sockets: a genuine O(n²) message storm. Now any burst of
  // connect/close events within the window collapses into exactly one
  // broadcast carrying the final count.
  let audienceCountBroadcastTimer: NodeJS.Timeout | null = null;
  function scheduleAudienceCountBroadcast() {
    if (audienceCountBroadcastTimer) return;
    audienceCountBroadcastTimer = setTimeout(() => {
      audienceCountBroadcastTimer = null;
      broadcast({
        type: 'AUDIENCE_COUNT_UPDATED',
        payload: { count: getConnectedCount() },
      });
    }, 400);
  }

  // Heartbeat interval to cleanly prune dead mobile sockets and maintain accurate spectator count
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: WebSocket & { isAlive?: boolean }) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send initial snapshot on connect
    const initMessage = JSON.stringify({
      type: 'INIT_STATE',
      payload: {
        ...publicState(),
        connectedAudienceCount: getConnectedCount(),
      },
    });
    ws.send(initMessage);

    // Debounced — see scheduleAudienceCountBroadcast above
    scheduleAudienceCountBroadcast();

    ws.on('close', () => {
      scheduleAudienceCountBroadcast();
    });

    ws.on('error', () => {
      ws.terminate();
    });
  });

  // Reaction batching timer: Flushes emoji reaction bursts every 120ms to all 700 clients
  setInterval(() => {
    if (pendingReactions.length === 0) return;

    // Pick up to 10 visual bursts to render smoothly across client viewports
    const burstsToSend = pendingReactions.slice(-10);
    pendingReactions = [];

    const msg = JSON.stringify({
      type: 'REACTION_BATCH',
      payload: {
        bursts: burstsToSend,
        reactionCounts: state.reactionCounts,
      },
    });
    broadcastPreSerialized(msg);
  }, 120);

  // Micro-debounced vote broadcaster to smoothly handle thundering herds of votes
  function scheduleVoteBroadcast(pollId: string, newHotTake: AudienceHotTake | null) {
    lastVotePollId = pollId;
    if (pendingVoteBroadcastTimeout) return;

    pendingVoteBroadcastTimeout = setTimeout(() => {
      pendingVoteBroadcastTimeout = null;
      const targetPollId = lastVotePollId;
      if (!targetPollId) return;
      const poll = state.polls.find((p) => p.id === targetPollId);
      if (poll) {
        const msg = JSON.stringify({
          type: 'VOTE_RECORDED',
          payload: {
            pollId: targetPollId,
            poll,
            newHotTake,
          },
        });
        broadcastPreSerialized(msg);
      }
    }, 80);
  }

  // REST API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      connectedAudienceCount: getConnectedCount(),
      activePollId: state.activePollId,
    });
  });

  app.get('/api/app-info', (req, res) => {
    res.json({
      name: 'Jab We Matched',
      requiresAuth: false,
      authMethod: 'guest_instant',
      adminAuthMethod: 'shared_passphrase',
      status: 'live',
    });
  });

  app.get('/api/state', (req, res) => {
    res.json({
      ...publicState(),
      connectedAudienceCount: getConnectedCount(),
    });
  });

  // Cast a Vote (with required voter hot take)
  app.post('/api/vote', (req, res) => {
    const { pollId, optionId, voterName, userRequiredInput, deviceId } = req.body as {
      pollId: string;
      optionId: string;
      voterName: string;
      userRequiredInput?: UserVoteInput;
      deviceId?: string;
    };

    if (!pollId || !optionId) {
      return res.status(400).json({ error: 'Missing pollId or optionId' });
    }
    if (!deviceId) {
      return res.status(400).json({ error: 'Missing deviceId' });
    }

    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.status === 'locked' || poll.status === 'revealed') {
      return res.status(403).json({ error: 'Voting is currently locked for this question' });
    }

    let option = poll.options.find((o) => o.id === optionId);

    // If voting on write-in option, append or update nominee (resolve which
    // option this vote actually targets — don't touch counts yet, that
    // happens uniformly below via the one-vote-per-device logic).
    if (option?.requiresWriteIn && userRequiredInput?.customWriteIn) {
      const customText = userRequiredInput.customWriteIn.trim();
      if (customText) {
        if (containsProfanity(customText)) {
          return res.status(400).json({ error: 'Please keep nominations family-friendly.' });
        }
        const existingCustom = poll.options.find(
          (o) => o.label.toLowerCase() === customText.toLowerCase()
        );
        if (existingCustom) {
          option = existingCustom;
        } else {
          const newCustomOpt: PollOption = {
            id: `opt-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            label: customText,
            description: `Audience Matchmaker nominee by ${voterName || 'Secret Matchmaker'}`,
            votes: 0,
            isUserCreated: true,
            createdBy: voterName,
            tag: 'Audience Matchmaker ✍️',
          };
          poll.options.push(newCustomOpt);
          option = newCustomOpt;
        }
      }
    }

    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    // One vote per device per poll. Voting again just moves your vote —
    // it no longer stacks additional votes on refresh/re-submit.
    const pollVotes = voteRegistry[pollId] || (voteRegistry[pollId] = {});
    const previousOptionId = pollVotes[deviceId];

    if (previousOptionId !== option.id) {
      if (previousOptionId) {
        const previousOption = poll.options.find((o) => o.id === previousOptionId);
        if (previousOption) {
          previousOption.votes = Math.max(0, previousOption.votes - 1);
          poll.totalVotes = Math.max(0, poll.totalVotes - 1);
        }
      }
      option.votes += 1;
      poll.totalVotes += 1;
      pollVotes[deviceId] = option.id;
    }

    // Record Audience Hot Take (optional commentary — filtered, but never
    // blocks the vote itself; a flagged hot take is just dropped silently)
    let newHotTake: AudienceHotTake | null = null;
    const hotTakeText = userRequiredInput?.hotTake?.trim();
    if (hotTakeText && !containsProfanity(hotTakeText)) {
      newHotTake = {
        id: `ht-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        pollId,
        voterName: voterName?.trim() || 'Audience Matchmaker',
        optionLabel: option.label,
        hotTake: hotTakeText,
        spiceLevel: userRequiredInput.spiceLevel || 5,
        timestamp: 'Just now',
      };
      state.hotTakes.unshift(newHotTake);
      if (state.hotTakes.length > 60) {
        state.hotTakes.pop();
      }
    }

    scheduleSave();

    // Schedule debounced broadcast so 700 concurrent voters don't overwhelm network
    scheduleVoteBroadcast(pollId, newHotTake);

    return res.json({
      success: true,
      poll,
      newHotTake,
    });
  });

  // Audience adds a new Option to the ballot
  app.post('/api/options', (req, res) => {
    const { pollId, label, description, createdBy, tag, deviceId } = req.body as {
      pollId: string;
      label: string;
      description?: string;
      createdBy?: string;
      tag?: string;
      deviceId?: string;
    };

    if (!pollId || !label?.trim()) {
      return res.status(400).json({ error: 'Missing pollId or option label' });
    }
    if (!deviceId) {
      return res.status(400).json({ error: 'Missing deviceId' });
    }
    if (containsProfanity(label) || containsProfanity(description || '')) {
      return res.status(400).json({ error: 'Please keep nominations family-friendly.' });
    }

    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (!poll.allowAudienceOptions) {
      return res.status(403).json({ error: 'This question does not allow audience option submissions' });
    }

    const newOption: PollOption = {
      id: `opt-aud-${Date.now()}`,
      label: label.trim(),
      description: description?.trim() || `Nominated live by spectator ${createdBy || 'Matchmaker'}`,
      votes: 0,
      isUserCreated: true,
      createdBy: createdBy || 'Spectator',
      tag: tag?.trim() || 'Crowd Nominee 🌟',
    };

    poll.options.push(newOption);

    // Nominating counts as this device's vote for their own nomination —
    // same one-vote-per-device rule as regular voting, so repeat
    // submissions can't stack free votes.
    const pollVotes = voteRegistry[pollId] || (voteRegistry[pollId] = {});
    const previousOptionId = pollVotes[deviceId];
    if (previousOptionId) {
      const previousOption = poll.options.find((o) => o.id === previousOptionId);
      if (previousOption) {
        previousOption.votes = Math.max(0, previousOption.votes - 1);
        poll.totalVotes = Math.max(0, poll.totalVotes - 1);
      }
    }
    newOption.votes = 1;
    poll.totalVotes += 1;
    pollVotes[deviceId] = newOption.id;

    scheduleSave();

    broadcast({
      type: 'OPTION_ADDED',
      payload: {
        pollId,
        option: newOption,
        poll,
      },
    });

    return res.json({ success: true, poll, option: newOption });
  });

  // Create a new question — host-only. This used to be open to anyone
  // (an "audience can suggest a question" feature) and it went straight
  // live on every phone the moment it was submitted — that's now closed.
  app.post('/api/questions', requireAdmin, (req, res) => {
    const {
      title,
      prompt,
      category,
      categoryLabel,
      requiresVoterInput,
      inputPromptText,
      allowAudienceOptions,
      options,
    } = req.body;

    if (!title?.trim() || !options || options.length < 2) {
      return res.status(400).json({ error: 'Title and at least 2 options are required' });
    }

    const newPoll: PollQuestion = {
      id: `poll-${Date.now()}`,
      title: title.trim(),
      prompt: prompt?.trim() || "Cast your live vote for tonight's Jab We Matched event!",
      category: category || 'drama',
      categoryLabel: categoryLabel || '💌 JAB WE MATCHED BALLOT',
      requiresVoterInput: Boolean(requiresVoterInput),
      inputPromptText: inputPromptText?.trim() || 'Required: State your reasoning for this vote',
      allowAudienceOptions: Boolean(allowAudienceOptions),
      status: 'active',
      totalVotes: 0,
      createdAt: new Date().toISOString(),
      options: options.map((opt: { label: string; description?: string; avatarUrl?: string; tag?: string; requiresWriteIn?: boolean }, idx: number) => ({
        id: `opt-${Date.now()}-${idx}`,
        label: opt.label.trim(),
        description: opt.description?.trim(),
        avatarUrl: opt.avatarUrl?.trim() || undefined,
        tag: opt.tag?.trim() || 'Match Nominee',
        requiresWriteIn: Boolean(opt.requiresWriteIn),
        votes: 0,
      })),
    };

    state.polls.unshift(newPoll);
    state.activePollId = newPoll.id;
    scheduleSave();

    broadcast({
      type: 'QUESTION_CREATED',
      payload: { poll: newPoll, activePollId: newPoll.id },
    });

    return res.json({ success: true, poll: newPoll });
  });

  // Update question and text (Host editor)
  app.put('/api/questions/:id', requireAdmin, (req, res) => {
    const pollId = req.params.id;
    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const {
      title,
      prompt,
      category,
      categoryLabel,
      requiresVoterInput,
      inputPromptText,
      allowAudienceOptions,
      options,
    } = req.body;

    if (title !== undefined) poll.title = String(title).trim();
    if (prompt !== undefined) poll.prompt = String(prompt).trim();
    if (category !== undefined) poll.category = category;
    if (categoryLabel !== undefined) poll.categoryLabel = String(categoryLabel).trim();
    if (requiresVoterInput !== undefined) poll.requiresVoterInput = Boolean(requiresVoterInput);
    if (inputPromptText !== undefined) poll.inputPromptText = String(inputPromptText).trim();
    if (allowAudienceOptions !== undefined) poll.allowAudienceOptions = Boolean(allowAudienceOptions);

    if (Array.isArray(options) && options.length >= 2) {
      poll.options = options.map((opt: any, idx: number) => {
        const existingOpt = poll.options.find((o) => o.id === opt.id);
        const avatarUrl = opt.avatarUrl ? String(opt.avatarUrl).trim() : undefined;
        return {
          id: opt.id || `opt-${Date.now()}-${idx}`,
          label: String(opt.label).trim(),
          description: opt.description ? String(opt.description).trim() : undefined,
          avatarUrl: avatarUrl || undefined,
          tag: opt.tag ? String(opt.tag).trim() : undefined,
          requiresWriteIn: Boolean(opt.requiresWriteIn),
          votes: existingOpt ? existingOpt.votes : (opt.votes || 0),
          isUserCreated: existingOpt?.isUserCreated || false,
          createdBy: existingOpt?.createdBy,
        };
      });

      poll.totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
    }

    scheduleSave();

    broadcast({
      type: 'QUESTION_UPDATED',
      payload: { poll },
    });

    return res.json({ success: true, poll });
  });

  app.post('/api/host/update-poll', requireAdmin, (req, res) => {
    const { pollId, ...rest } = req.body;
    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const {
      title,
      prompt,
      category,
      categoryLabel,
      requiresVoterInput,
      inputPromptText,
      allowAudienceOptions,
      options,
    } = rest;

    if (title !== undefined) poll.title = String(title).trim();
    if (prompt !== undefined) poll.prompt = String(prompt).trim();
    if (category !== undefined) poll.category = category;
    if (categoryLabel !== undefined) poll.categoryLabel = String(categoryLabel).trim();
    if (requiresVoterInput !== undefined) poll.requiresVoterInput = Boolean(requiresVoterInput);
    if (inputPromptText !== undefined) poll.inputPromptText = String(inputPromptText).trim();
    if (allowAudienceOptions !== undefined) poll.allowAudienceOptions = Boolean(allowAudienceOptions);

    if (Array.isArray(options) && options.length >= 2) {
      poll.options = options.map((opt: any, idx: number) => {
        const existingOpt = poll.options.find((o) => o.id === opt.id);
        const avatarUrl = opt.avatarUrl ? String(opt.avatarUrl).trim() : undefined;
        return {
          id: opt.id || `opt-${Date.now()}-${idx}`,
          label: String(opt.label).trim(),
          description: opt.description ? String(opt.description).trim() : undefined,
          avatarUrl: avatarUrl || undefined,
          tag: opt.tag ? String(opt.tag).trim() : undefined,
          requiresWriteIn: Boolean(opt.requiresWriteIn),
          votes: existingOpt ? existingOpt.votes : (opt.votes || 0),
          isUserCreated: existingOpt?.isUserCreated || false,
          createdBy: existingOpt?.createdBy,
        };
      });

      poll.totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
    }

    scheduleSave();

    broadcast({
      type: 'QUESTION_UPDATED',
      payload: { poll },
    });

    return res.json({ success: true, poll });
  });

  // Remove PFPs (Host action)
  app.post('/api/host/remove-pfps', requireAdmin, (req, res) => {
    const { pollId } = req.body as { pollId?: string };

    if (pollId) {
      const poll = state.polls.find((p) => p.id === pollId);
      if (!poll) {
        return res.status(404).json({ error: 'Question not found' });
      }
      poll.options.forEach((opt) => {
        delete opt.avatarUrl;
      });
      scheduleSave();
      broadcast({
        type: 'PFPS_REMOVED',
        payload: { pollId, poll },
      });
      return res.json({ success: true, pollId, poll });
    } else {
      // Remove PFPs across all questions
      state.polls.forEach((p) => {
        p.options.forEach((opt) => {
          delete opt.avatarUrl;
        });
      });
      scheduleSave();
      broadcast({
        type: 'PFPS_REMOVED',
        payload: { pollId: null, polls: state.polls },
      });
      return res.json({ success: true, all: true, polls: state.polls });
    }
  });

  // Delete question (Host cleanup)
  app.delete('/api/questions/:id', requireAdmin, (req, res) => {
    const pollId = req.params.id;
    if (state.polls.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only question remaining' });
    }

    const pollIndex = state.polls.findIndex((p) => p.id === pollId);
    if (pollIndex === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }

    state.polls.splice(pollIndex, 1);
    if (state.activePollId === pollId) {
      state.activePollId = state.polls[0].id;
    }
    scheduleSave();

    broadcast({
      type: 'QUESTION_DELETED',
      payload: { pollId, activePollId: state.activePollId },
    });

    return res.json({ success: true, activePollId: state.activePollId });
  });

  app.post('/api/host/delete-poll', requireAdmin, (req, res) => {
    const { pollId } = req.body as { pollId: string };
    if (state.polls.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only question remaining' });
    }

    const pollIndex = state.polls.findIndex((p) => p.id === pollId);
    if (pollIndex === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }

    state.polls.splice(pollIndex, 1);
    if (state.activePollId === pollId) {
      state.activePollId = state.polls[0].id;
    }
    scheduleSave();

    broadcast({
      type: 'QUESTION_DELETED',
      payload: { pollId, activePollId: state.activePollId },
    });

    return res.json({ success: true, activePollId: state.activePollId });
  });

  // Audience Emoji Reaction Burst (Batched for 700 users)
  app.post('/api/reaction', (req, res) => {
    const { emoji, label } = req.body as { emoji: string; label?: string };
    if (!emoji) {
      return res.status(400).json({ error: 'Missing emoji' });
    }

    state.reactionCounts[emoji] = (state.reactionCounts[emoji] || 0) + 1;

    // Push into batch accumulator
    pendingReactions.push({
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      label: label || 'Reaction',
      x: 8 + Math.random() * 84,
    });

    // Cap memory buffer
    if (pendingReactions.length > 50) {
      pendingReactions = pendingReactions.slice(-50);
    }

    return res.json({ success: true });
  });

  // Anonymous Confessions — public submission (no name, no login).
  // Lands as 'pending' and is invisible to everyone until a host approves
  // it (see the requireAdmin endpoints below) — see the comment above the
  // `confessions` store for why this never touches the public `state`.
  app.post('/api/confessions', (req, res) => {
    const { text } = req.body as { text?: string };
    const trimmed = (text || '').trim();

    if (!trimmed) {
      return res.status(400).json({ error: 'Confession text is required' });
    }
    if (trimmed.length > 300) {
      return res.status(400).json({ error: 'Keep it under 300 characters' });
    }
    if (containsProfanity(trimmed)) {
      return res.status(400).json({ error: 'Please keep it clean — that included flagged language.' });
    }

    const confession: Confession = {
      id: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      text: trimmed,
      createdAt: Date.now(),
      status: 'pending',
    };
    confessions.push(confession);
    if (confessions.length > MAX_STORED_CONFESSIONS) {
      confessions = confessions.slice(-MAX_STORED_CONFESSIONS);
    }
    scheduleSave();

    // Deliberately NOT broadcast to the public socket — it's only visible
    // to the host, who polls GET /api/host/confessions to review it.
    return res.json({ success: true });
  });

  // Host moderation queue — the ONLY place pending/rejected confession text
  // is ever transmitted, and only over an admin-authenticated request.
  app.get('/api/host/confessions', requireAdmin, (req, res) => {
    return res.json({ confessions: [...confessions].sort((a, b) => b.createdAt - a.createdAt) });
  });

  app.post('/api/host/confessions/:id/approve', requireAdmin, (req, res) => {
    const confession = confessions.find((c) => c.id === req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }
    confession.status = 'approved';
    scheduleSave();
    broadcast({
      type: 'CONFESSIONS_UPDATED',
      payload: { confessions: getPublicConfessions() },
    });
    return res.json({ success: true });
  });

  // Reject also doubles as an instant "pull down" for anything already
  // approved that needs to come off the live feed immediately.
  app.post('/api/host/confessions/:id/reject', requireAdmin, (req, res) => {
    const confession = confessions.find((c) => c.id === req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }
    const wasApproved = confession.status === 'approved';
    confession.status = 'rejected';
    scheduleSave();
    // A rejected/pulled confession can never stay highlighted on the big screen board
    if (state.featuredConfessionId === confession.id) {
      state.featuredConfessionId = null;
    }
    if (wasApproved) {
      broadcast({
        type: 'CONFESSIONS_UPDATED',
        payload: {
          confessions: getPublicConfessions(),
          featuredConfessionId: state.featuredConfessionId,
          confessionsBoardActive: state.confessionsBoardActive,
        },
      });
    }
    return res.json({ success: true });
  });

  // Open (or re-focus) the Confessions Board on the Stage Screen — a
  // scrollable list of every approved confession, not a single full-screen
  // takeover. Passing an id highlights/auto-scrolls that one into view, so
  // the host can step through the list one at a time. Only an already
  // approved confession can ever be highlighted — never bypasses moderation.
  app.post('/api/host/confessions/:id/launch', requireAdmin, (req, res) => {
    const confession = confessions.find((c) => c.id === req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }
    if (confession.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved confessions can be shown on the big screen' });
    }
    state.featuredConfessionId = confession.id;
    state.confessionsBoardActive = true;
    scheduleSave();
    broadcast({
      type: 'CONFESSIONS_UPDATED',
      payload: {
        confessions: getPublicConfessions(),
        featuredConfessionId: state.featuredConfessionId,
        confessionsBoardActive: state.confessionsBoardActive,
      },
    });
    return res.json({ success: true });
  });

  // Fully closes the Confessions Board on stage.
  app.post('/api/host/confessions/clear-launch', requireAdmin, (req, res) => {
    state.featuredConfessionId = null;
    state.confessionsBoardActive = false;
    scheduleSave();
    broadcast({
      type: 'CONFESSIONS_UPDATED',
      payload: { confessions: getPublicConfessions(), featuredConfessionId: null, confessionsBoardActive: false },
    });
    return res.json({ success: true });
  });

  // Host-controlled waiting screen, shown on the Audience Pad in place of
  // the normal ballot whenever there's nothing live to vote on.
  app.post('/api/host/waiting-screen', requireAdmin, (req, res) => {
    const { active } = req.body as { active?: boolean };
    state.waitingScreenActive = Boolean(active);
    scheduleSave();
    broadcast({
      type: 'WAITING_SCREEN_CHANGED',
      payload: { waitingScreenActive: state.waitingScreenActive },
    });
    return res.json({ success: true, waitingScreenActive: state.waitingScreenActive });
  });


  app.post('/api/host/active-poll', requireAdmin, (req, res) => {
    const { pollId } = req.body as { pollId: string };
    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    state.activePollId = pollId;
    // Pushing a question live is what ends the waiting screen — the
    // Audience Pad defaults to "Hang Tight" on every boot until this happens.
    const wasWaiting = state.waitingScreenActive;
    state.waitingScreenActive = false;
    scheduleSave();

    broadcast({
      type: 'POLL_CHANGED',
      payload: { activePollId: pollId },
    });
    if (wasWaiting) {
      broadcast({
        type: 'WAITING_SCREEN_CHANGED',
        payload: { waitingScreenActive: false },
      });
    }

    return res.json({ success: true, activePollId: pollId });
  });

  // Host Controls: Toggle Lock / Status
  app.post('/api/host/status', requireAdmin, (req, res) => {
    const { pollId, status } = req.body as {
      pollId: string;
      status: 'active' | 'locked' | 'revealed';
    };

    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    poll.status = status;

    if (status === 'revealed') {
      const sorted = [...poll.options].sort((a, b) => b.votes - a.votes);
      if (sorted.length > 0 && sorted[0].votes > 0) {
        poll.winnerOptionId = sorted[0].id;
      }
    }
    scheduleSave();

    broadcast({
      type: 'STATUS_CHANGED',
      payload: { pollId, status, winnerOptionId: poll.winnerOptionId, poll },
    });

    return res.json({ success: true, poll });
  });

  // Host Controls: Reset Votes (Specific poll or entire show)
  const handleResetPoll = (pollId: string | undefined, res: any) => {
    if (!pollId || pollId === 'all') {
      // Reset all polls
      state.polls.forEach((p) => {
        p.options.forEach((o) => {
          o.votes = 0;
        });
        p.totalVotes = 0;
        p.status = 'active';
        p.winnerOptionId = undefined;
      });
      state.hotTakes = [];
      voteRegistry = {}; // every device's vote pointer is stale after a full reset
      scheduleSave();

      broadcast({
        type: 'POLL_RESET',
        payload: { pollId: 'all', polls: state.polls, hotTakes: [] },
      });

      return res.json({ success: true, all: true, polls: state.polls });
    }

    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    poll.options.forEach((o) => {
      o.votes = 0;
    });
    poll.totalVotes = 0;
    poll.status = 'active';
    poll.winnerOptionId = undefined;
    delete voteRegistry[pollId]; // this poll's device vote pointers are stale now

    // Clear hot takes associated with this reset question so the live tickers refresh
    state.hotTakes = state.hotTakes.filter((h) => h.pollId !== pollId);
    scheduleSave();

    broadcast({
      type: 'POLL_RESET',
      payload: { pollId, poll, polls: state.polls, hotTakes: state.hotTakes },
    });

    return res.json({ success: true, poll, polls: state.polls, hotTakes: state.hotTakes });
  };

  app.post('/api/host/reset', requireAdmin, (req, res) => {
    const { pollId, resetAll } = req.body as { pollId?: string; resetAll?: boolean };
    const targetPollId = resetAll ? 'all' : pollId;
    return handleResetPoll(targetPollId, res);
  });

  // RESTful aliases for reset
  app.post('/api/questions/:id/reset', requireAdmin, (req, res) => {
    return handleResetPoll(req.params.id, res);
  });

  app.post('/api/polls/:id/reset', requireAdmin, (req, res) => {
    return handleResetPoll(req.params.id, res);
  });

  // Host Controls: Simulate 700 Spectators (Stress-Test & Live Demo)
  app.post('/api/host/simulate-spectators', requireAdmin, (req, res) => {
    const { pollId, count = 100 } = req.body as { pollId?: string; count?: number };
    const poll = state.polls.find((p) => p.id === (pollId || state.activePollId));
    if (!poll || poll.options.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const votesToAdd = Math.min(700, Math.max(10, count));

    const sampleTakes = [
      'Pure Bollywood cinema! If this couple does not win, the whole hall will riot.',
      'That eye contact during the slow dance sealed the deal for everyone in row 5.',
      'He apologized like a true hero. Give the romantic boy a chance!',
      'Textbook player moves. We need to save her before next semester starts!',
      'Their banter has 10/10 Geet and Aditya energy. Instant soulmates.',
      'Honestly I came here for the snacks, but now I am emotionally invested in this match.',
      'They have negative chemistry, someone please press the red buzzer on stage!',
      'Match made in Bollywood heaven. The red envelope was made for them.',
    ];

    const spectatorNames = [
      'Aarohi_Row2', 'Rahul_BollyFan', 'Simran_K', 'ChaiLover_Aman',
      'Geet_Vibes', 'AdityaK_Stan', 'Tara_Speaks', 'Kabir_HostFan',
      'Spectator_442', 'Priya_Auditorium', 'Karan_SpeedDate'
    ];

    // Distribute simulated spectator votes with realistic weight
    for (let i = 0; i < votesToAdd; i++) {
      const optIdx = Math.random() < 0.55 
        ? 0 
        : Math.random() < 0.85 
          ? 1 
          : Math.floor(Math.random() * poll.options.length);
      const targetOpt = poll.options[optIdx] || poll.options[0];
      targetOpt.votes += 1;
      poll.totalVotes += 1;
    }

    // Add 3 fresh hot takes
    for (let j = 0; j < 3; j++) {
      const take: AudienceHotTake = {
        id: `ht-sim-${Date.now()}-${j}`,
        pollId: poll.id,
        voterName: spectatorNames[Math.floor(Math.random() * spectatorNames.length)],
        optionLabel: poll.options[0].label,
        hotTake: sampleTakes[Math.floor(Math.random() * sampleTakes.length)],
        spiceLevel: Math.floor(Math.random() * 2) + 4,
        timestamp: 'Just now',
      };
      state.hotTakes.unshift(take);
    }
    state.hotTakes = state.hotTakes.slice(0, 60);
    scheduleSave();

    broadcast({
      type: 'VOTE_RECORDED',
      payload: { pollId: poll.id, poll, newHotTake: state.hotTakes[0] },
    });

    return res.json({
      success: true,
      poll,
      addedVotes: votesToAdd,
      totalVotes: poll.totalVotes,
    });
  });

  // Integrate Vite for development, or static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Jab We Matched Live Polling server (700-spectator scale ready) running at http://0.0.0.0:${PORT}`);
    console.log('');
    console.log('================================================================');
    console.log('  ADMIN ACCESS — Stage Screen & Host Console');
    console.log('  Passphrase:', ADMIN_KEY);
    if (!process.env.ADMIN_KEY) {
      console.log('  (auto-generated because ADMIN_KEY was not set in .env — set');
      console.log('   ADMIN_KEY yourself before the event so it stays the same');
      console.log('   across restarts.)');
    }
    console.log('  Enter this once at ?view=host or ?view=stage on your device.');
    console.log('  The Audience Pad (?view=audience, the QR code link) never');
    console.log('  needs it and never shows a way to reach the other views.');
    console.log('================================================================');
    if (persisted) {
      console.log(`  Restored saved state from ${DATA_FILE} (saved ${persisted && (persisted as any).savedAt ? (persisted as any).savedAt : 'unknown time'})`);
    } else {
      console.log(`  No saved state found at ${DATA_FILE} — starting fresh.`);
      console.log('  NOTE: on Render, this file only survives real restarts if a');
      console.log('  persistent Disk is attached and mounted at DATA_DIR.');
    }
    console.log('================================================================');
    console.log('');
  });

  // Flush a final save on graceful shutdown (Render sends SIGTERM before
  // stopping/redeploying a service) so nothing from the last few seconds
  // before a restart gets lost to the debounce window.
  const shutdown = () => {
    console.log('Shutting down — saving state...');
    persistNow();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
