import express from 'express';
import http from 'http';
import path from 'path';
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
    id: 'poll-envelope-1',
    category: 'hideaway',
    categoryLabel: '💌 THE RED ENVELOPE MATCH',
    title: "Who Should Win Tonight's Grand Candlelit Date Night?",
    prompt: "Tonight at 'Jab We Matched', 500 spectators decide which newly paired couple unseals the Red Envelope to win the VIP romantic dinner table and roses!",
    requiresVoterInput: true,
    inputPromptText: 'Spectator Hot Take Required: Why does this couple belong together?',
    allowAudienceOptions: true,
    status: 'active',
    totalVotes: 284,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-env-1',
        label: 'Kabir & Ananya',
        description: 'The childhood best friends turned slow-burn romantic match. Sparks flying all evening!',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        votes: 146,
        tag: 'Slow Burn Romance 💕',
      },
      {
        id: 'opt-env-2',
        label: 'Rohan & Priya',
        description: 'Enemies-to-lovers dynamic with electric stage banter. Unpredictable and high voltage!',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        votes: 89,
        tag: 'Spicy Chemistry 🔥',
      },
      {
        id: 'opt-env-3',
        label: 'Aarav & Meera',
        description: 'The speed-dating blind match that instantly bonded over Bollywood tunes and cutting chai.',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        votes: 38,
        tag: 'Fan Favorite Duo 🌸',
      },
      {
        id: 'opt-env-4',
        label: 'Audience Write-In: Nominate a New Pair!',
        description: 'Think two people on stage secretly belong together? Nominate your own dream match.',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        votes: 11,
        requiresWriteIn: true,
        tag: 'Audience Matchmaker ✍️',
      },
    ],
  },
  {
    id: 'poll-redflag-2',
    category: 'drama',
    categoryLabel: '🚩 RED FLAG OR BOLLYWOOD ROMANCE?',
    title: "He texted 'Tum bohot alag ho' at 2 AM with a 7-minute audio. Red flag or pure romance?",
    prompt: "The hosts intercepted his late-night speed-dating notes. Spectators in the hall, what is your official verdict on his intentions?",
    requiresVoterInput: true,
    inputPromptText: 'Tribunal Verdict Required: State your case on whether he is genuine or toxic:',
    allowAudienceOptions: true,
    status: 'active',
    totalVotes: 342,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-rf1',
        label: 'Major Red Flag 🚩 Block Him Immediately!',
        description: "That is textbook sweet-talker energy. He definitely forwarded that 7-minute audio to 4 other girls.",
        votes: 198,
        tag: 'Red Flag Alert 🚩',
      },
      {
        id: 'opt-rf2',
        label: "Pure Aditya Kashyap Energy 🥺 He's Just a Hopeless Romantic",
        description: 'He was being vulnerable and sincere! True love starts with unhinged late-night voice messages.',
        votes: 104,
        tag: 'Hopeless Romantic 💖',
      },
      {
        id: 'opt-rf3',
        label: "Playing for the Stage Cameras 🎭 It's All for the Plot",
        description: 'He rehearsed that speech in the mirror before coming to Jab We Matched tonight.',
        votes: 31,
        tag: 'Bollywood Melodrama 🎬',
      },
      {
        id: 'opt-rf4',
        label: 'Audience Write-In: Prescribe His Stage Penalty!',
        description: 'Should he sing Tum Se Hi on stage or buy samosas for the entire front row?',
        votes: 9,
        requiresWriteIn: true,
        tag: 'Custom Penalty ⚡',
      },
    ],
  },
  {
    id: 'poll-compatibility-3',
    category: 'truth_or_dare',
    categoryLabel: '💘 THE SOULMATE COMPATIBILITY TEST',
    title: 'Which Matched Couple Has Genuine Staying Power After Tonight?',
    prompt: 'Beyond the lights of the auditorium, which couple will actually last beyond the upcoming weekend?',
    requiresVoterInput: true,
    inputPromptText: 'Your Reality Check: What will make or break their connection?',
    allowAudienceOptions: false,
    status: 'active',
    totalVotes: 215,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-ct1',
        label: 'Dev & Tara (Pure Soulmate Harmony)',
        description: 'Same dry humor, shared Spotify playlist, already planning date #2.',
        votes: 119,
        tag: 'Soulmate Chemistry 💍',
      },
      {
        id: 'opt-ct2',
        label: 'Zayn & Natasha (Chaotic Opposites)',
        description: 'Electric sparks and endless bickering. High passion but will they text back tomorrow?',
        votes: 72,
        tag: 'Rollercoaster Romance 🎢',
      },
      {
        id: 'opt-ct3',
        label: 'Neither 🙅 Destination: Friendzone',
        description: 'They will follow each other on Instagram tonight and never talk again.',
        votes: 24,
        tag: 'Campus Reality 💀',
      },
    ],
  },
  {
    id: 'poll-wildcard-4',
    category: 'recoupling',
    categoryLabel: '⚡ THE WILDCARD MATCHMAKER BUTTON',
    title: 'Should The Mystery Audience Member Challenge The Stage Match?',
    prompt: 'Someone in row 4 has declared they have an unresolved confession for one of the stage contestants! Do the 500 spectators give them the microphone?',
    requiresVoterInput: true,
    inputPromptText: 'Why vote this way? Share your reaction with the host:',
    allowAudienceOptions: true,
    status: 'active',
    totalVotes: 188,
    winnerOptionId: undefined,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-wc1',
        label: 'Give Them The Mic! 🎤 We Need Peak Bollywood Drama',
        description: 'We did not come to Jab We Matched for peace, we came for jaw-dropping plot twists!',
        votes: 134,
        tag: 'Peak Cinema 🍿',
      },
      {
        id: 'opt-wc2',
        label: 'Protect The Couple 🛡️ Respect Their Match',
        description: 'They just had a sweet moment together; do not derail the connection with outside chaos.',
        votes: 54,
        tag: 'Protect The Match 🕊️',
      },
    ],
  },
];

const INITIAL_HOT_TAKES: AudienceHotTake[] = [
  {
    id: 'ht-1',
    pollId: 'poll-envelope-1',
    voterName: 'PoojaFromRow3',
    optionLabel: 'Kabir & Ananya',
    hotTake: 'Kabir literally looked at Ananya like Aditya in Jab We Met when they shared the microphone. If they do not win the red envelope date I am calling the hosts!',
    spiceLevel: 5,
    timestamp: 'Just now',
  },
  {
    id: 'ht-2',
    pollId: 'poll-redflag-2',
    voterName: 'BollyGeek99',
    optionLabel: 'Major Red Flag 🚩 Block Him Immediately!',
    hotTake: 'A 7-minute voice note at 2 AM is not romantic, that is a whole podcast episode. Block him and save your sanity!',
    spiceLevel: 5,
    timestamp: '1 min ago',
  },
  {
    id: 'ht-3',
    pollId: 'poll-envelope-1',
    voterName: 'ChaiLoverRohan',
    optionLabel: 'Rohan & Priya',
    hotTake: 'Rohan and Priya have that exact enemies-to-lovers tension that makes for legendary campus stories. Send them to the candlelit table!',
    spiceLevel: 4,
    timestamp: '3 mins ago',
  },
];

// Anonymous Confessions — held OUTSIDE `state` on purpose. `state` gets
// spread wholesale into every broadcast and into GET /api/state, which every
// connected client (including anonymous audience members) receives — so
// anything unmoderated must never live there. Confessions start 'pending'
// and only become visible to the public once a host approves them; the host
// console fetches the full pending/approved/rejected list separately over an
// admin-authenticated endpoint, never over the public broadcast.
interface Confession {
  id: string;
  text: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}
let confessions: Confession[] = [];
const MAX_STORED_CONFESSIONS = 500; // cap memory growth over a long event
const MAX_PUBLIC_CONFESSIONS = 60; // cap what's ever sent to the public feed

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
  polls: JSON.parse(JSON.stringify(INITIAL_POLLS)) as PollQuestion[],
  activePollId: 'poll-envelope-1',
  hotTakes: JSON.parse(JSON.stringify(INITIAL_HOT_TAKES)) as AudienceHotTake[],
  reactionCounts: {
    '🌹': 342,
    '🚩': 215,
    '🔥': 489,
    '💔': 118,
    '🍿': 276,
    '💖': 512,
  } as Record<string, number>,
  featuredConfessionId: null as string | null,
  confessionsBoardActive: false,
  waitingScreenActive: false,
};

// Batching buffer for 500-spectator reaction bursts
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

  // WebSocket Server optimized for 500+ clients
  const wss = new WebSocketServer({ 
    server,
    // Per-message deflate disabled to save CPU during mass broadcast to 500 sockets
    perMessageDeflate: false 
  });

  // Pre-serialized broadcast function to prevent running JSON.stringify 500 times
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

    // Debounced broadcast of audience count to avoid spamming on 500 rapid connections
    broadcast({
      type: 'AUDIENCE_COUNT_UPDATED',
      payload: { count: getConnectedCount() },
    });

    ws.on('close', () => {
      broadcast({
        type: 'AUDIENCE_COUNT_UPDATED',
        payload: { count: getConnectedCount() },
      });
    });

    ws.on('error', () => {
      ws.terminate();
    });
  });

  // Reaction batching timer: Flushes emoji reaction bursts every 120ms to all 500 clients
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
    const { pollId, optionId, voterName, userRequiredInput } = req.body as {
      pollId: string;
      optionId: string;
      voterName: string;
      userRequiredInput?: UserVoteInput;
    };

    if (!pollId || !optionId) {
      return res.status(400).json({ error: 'Missing pollId or optionId' });
    }

    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.status === 'locked' || poll.status === 'revealed') {
      return res.status(403).json({ error: 'Voting is currently locked for this question' });
    }

    let option = poll.options.find((o) => o.id === optionId);

    // If voting on write-in option, append or update nominee
    if (option?.requiresWriteIn && userRequiredInput?.customWriteIn) {
      const customText = userRequiredInput.customWriteIn.trim();
      if (customText) {
        const existingCustom = poll.options.find(
          (o) => o.label.toLowerCase() === customText.toLowerCase()
        );
        if (existingCustom) {
          existingCustom.votes += 1;
          option = existingCustom;
        } else {
          const newCustomOpt: PollOption = {
            id: `opt-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            label: customText,
            description: `Audience Matchmaker nominee by ${voterName || 'Secret Matchmaker'}`,
            votes: 1,
            isUserCreated: true,
            createdBy: voterName,
            tag: 'Audience Matchmaker ✍️',
          };
          poll.options.push(newCustomOpt);
          option = newCustomOpt;
        }
      } else {
        option.votes += 1;
      }
    } else if (option) {
      option.votes += 1;
    } else {
      return res.status(404).json({ error: 'Option not found' });
    }

    poll.totalVotes += 1;

    // Record Audience Hot Take
    let newHotTake: AudienceHotTake | null = null;
    const hotTakeText = userRequiredInput?.hotTake?.trim();
    if (hotTakeText) {
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

    // Schedule debounced broadcast so 500 concurrent voters don't overwhelm network
    scheduleVoteBroadcast(pollId, newHotTake);

    return res.json({
      success: true,
      poll,
      newHotTake,
    });
  });

  // Audience adds a new Option to the ballot
  app.post('/api/options', (req, res) => {
    const { pollId, label, description, createdBy, tag } = req.body as {
      pollId: string;
      label: string;
      description?: string;
      createdBy?: string;
      tag?: string;
    };

    if (!pollId || !label?.trim()) {
      return res.status(400).json({ error: 'Missing pollId or option label' });
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
      votes: 1,
      isUserCreated: true,
      createdBy: createdBy || 'Spectator',
      tag: tag?.trim() || 'Crowd Nominee 🌟',
    };

    poll.options.push(newOption);
    poll.totalVotes += 1;

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

  // Create a new question (Host or Audience submission)
  app.post('/api/questions', (req, res) => {
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

    broadcast({
      type: 'QUESTION_DELETED',
      payload: { pollId, activePollId: state.activePollId },
    });

    return res.json({ success: true, activePollId: state.activePollId });
  });

  // Audience Emoji Reaction Burst (Batched for 500 users)
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

    broadcast({
      type: 'POLL_CHANGED',
      payload: { activePollId: pollId },
    });

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

    // Clear hot takes associated with this reset question so the live tickers refresh
    state.hotTakes = state.hotTakes.filter((h) => h.pollId !== pollId);

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

  // Host Controls: Simulate 500 Spectators (Stress-Test & Live Demo)
  app.post('/api/host/simulate-spectators', requireAdmin, (req, res) => {
    const { pollId, count = 100 } = req.body as { pollId?: string; count?: number };
    const poll = state.polls.find((p) => p.id === (pollId || state.activePollId));
    if (!poll || poll.options.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const votesToAdd = Math.min(500, Math.max(10, count));

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
    console.log(`Jab We Matched Live Polling server (500-spectator scale ready) running at http://0.0.0.0:${PORT}`);
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
    console.log('');
  });
}

startServer();
