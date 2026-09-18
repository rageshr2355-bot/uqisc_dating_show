// Simulates an audience arriving and voting.
//
//   node load-tests/audience-wave.mjs [BASE_URL] [PHONES] [JOIN_SECONDS] [VOTE_SECONDS]
//   node load-tests/audience-wave.mjs https://your-domain.com 700 60 10
//
// Each "phone" opens a WebSocket (like the real page does), fetches state,
// then votes on the live question with its own device id. Needs Node 22+.
// The host must have pushed a question to the stage first.

import { performance } from 'node:perf_hooks';

const BASE_URL = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PHONES = Number(process.argv[3] || process.env.PHONES || 700);
const JOIN_SECONDS = Number(process.argv[4] || process.env.JOIN_SECONDS || 30);
const VOTE_SECONDS = Number(process.argv[5] || process.env.VOTE_SECONDS || 10);
const WS_URL = BASE_URL.replace(/^http/, 'ws');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]);
};
const summary = (label, rows) => {
  const ok = rows.filter((r) => r.ok).length;
  const ms = rows.map((r) => r.ms);
  const statuses = {};
  for (const r of rows) statuses[r.status] = (statuses[r.status] || 0) + 1;
  const out = { label, total: rows.length, ok, successRate: +((ok / rows.length) * 100).toFixed(1), p50Ms: pct(ms, 50), p95Ms: pct(ms, 95), p99Ms: pct(ms, 99), maxMs: pct(ms, 100), statuses };
  console.log(out);
  return out;
};

const state = await fetch(`${BASE_URL}/api/state`).then((r) => r.json());
const poll = state.polls.find((p) => p.id === state.activePollId);
if (!poll) throw new Error('No live question — push one to the stage first.');
if (poll.status !== 'active') throw new Error(`Live question is ${poll.status}; it must be open for voting.`);
if (state.waitingScreenActive) console.warn('Note: waiting screen is on, phones would not see the question yet.');
const options = poll.options.filter((o) => !o.requiresWriteIn);
console.log(`Target ${BASE_URL} · question "${poll.title.slice(0, 50)}…" · ${options.length} options`);
console.log(`${PHONES} phones joining over ${JOIN_SECONDS}s, then voting over ${VOTE_SECONDS}s\n`);

// ---- join: open a socket + fetch state (what the page does on load)
const joinStart = performance.now();
const spacing = (JOIN_SECONDS * 1000) / PHONES;
let socketsOpen = 0;
let messagesReceived = 0;
const sockets = [];
const joins = await Promise.all(Array.from({ length: PHONES }, async (_, i) => {
  const wait = joinStart + i * spacing - performance.now();
  if (wait > 0) await sleep(wait);
  const t0 = performance.now();
  try {
    const ws = new WebSocket(WS_URL);
    sockets.push(ws);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('ws error'));
      setTimeout(() => reject(new Error('ws timeout')), 15000);
    });
    socketsOpen += 1;
    ws.onmessage = () => { messagesReceived += 1; };
    const res = await fetch(`${BASE_URL}/api/state`);
    return { ok: res.ok, status: res.status, ms: performance.now() - t0, deviceId: crypto.randomUUID() };
  } catch (err) {
    return { ok: false, status: 0, ms: performance.now() - t0, deviceId: '', error: String(err) };
  }
}));
console.log('---- JOIN ----');
const joinResult = summary(`join-${PHONES}-over-${JOIN_SECONDS}s`, joins);
console.log(`sockets open: ${socketsOpen}/${PHONES}\n`);

// ---- vote
const voters = joins.filter((j) => j.ok);
const voteStart = performance.now();
const vSpacing = (VOTE_SECONDS * 1000) / voters.length;
const msgBeforeVotes = messagesReceived;
const votes = await Promise.all(voters.map(async (j, i) => {
  const wait = voteStart + i * vSpacing - performance.now();
  if (wait > 0) await sleep(wait);
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId: poll.id, optionId: options[i % options.length].id, deviceId: j.deviceId }),
    });
    return { ok: res.status === 200, status: res.status, ms: performance.now() - t0 };
  } catch {
    return { ok: false, status: 0, ms: performance.now() - t0 };
  }
}));
console.log('---- VOTE ----');
const voteResult = summary(`vote-${voters.length}-over-${VOTE_SECONDS}s`, votes);

await sleep(1500);
const after = await fetch(`${BASE_URL}/api/state`).then((r) => r.json());
const afterPoll = after.polls.find((p) => p.id === poll.id);
const expected = poll.totalVotes + votes.filter((v) => v.ok).length;
console.log(`\nserver total votes: ${afterPoll.totalVotes} (expected ${expected}) ${afterPoll.totalVotes === expected ? '✓' : '✗ MISMATCH'}`);
console.log(`broadcast messages received across all sockets during voting: ${messagesReceived - msgBeforeVotes} (≈ ${((messagesReceived - msgBeforeVotes) / Math.max(1, socketsOpen)).toFixed(1)} per phone)`);

console.log('\n---- VERDICT ----');
const healthy = joinResult.successRate >= 98 && voteResult.successRate >= 98 && voteResult.p95Ms <= 3000 && afterPoll.totalVotes === expected;
console.log(healthy ? 'HEALTHY' : 'PROBLEMS — see above');
for (const ws of sockets) ws.close();
process.exit(healthy ? 0 : 1);
