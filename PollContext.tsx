import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, PollQuestion, AudienceHotTake, ReactionBurst, UserVoteInput, CreateOptionPayload, CreatePollPayload, UpdatePollPayload, Confession } from './types';
import { INITIAL_POLLS, INITIAL_HOT_TAKES } from './initialPolls';
import { sounds } from './audio';
import confetti from 'canvas-confetti';

// Legacy fallback only used when previewing on localhost with no real domain yet.
// Once you deploy, publicWebsiteUrl below always uses the real window.location.origin instead.
export const PUBLIC_SHARED_URL = 'http://localhost:3000';
const ADMIN_TOKEN_STORAGE_KEY = 'jab_matched_admin_token';

interface PollContextType {
  state: AppState;
  activePoll: PollQuestion | undefined;
  activeView: 'audience' | 'stage' | 'host';
  setActiveView: (view: 'audience' | 'stage' | 'host') => void;
  voterName: string;
  setVoterName: (name: string) => void;
  myVotes: Record<string, { optionId: string; userRequiredInput: UserVoteInput }>;
  activeBursts: ReactionBurst[];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isConnected: boolean;
  isCreateQuestionOpen: boolean;
  setIsCreateQuestionOpen: (open: boolean) => void;
  editingPoll: PollQuestion | null;
  setEditingPoll: (poll: PollQuestion | null) => void;
  isEditQuestionOpen: boolean;
  setIsEditQuestionOpen: (open: boolean) => void;
  openEditModal: (poll: PollQuestion) => void;
  // QR Code & Join Link Controls
  isQrModalOpen: boolean;
  setIsQrModalOpen: (open: boolean) => void;
  showStageCornerQr: boolean;
  setShowStageCornerQr: (show: boolean) => void;
  joinUrl: string;
  setJoinUrl: (url: string) => void;
  publicWebsiteUrl: string;
  // Admin Access Control
  isAdmin: boolean;
  isAdminCheckPending: boolean;
  loginAdmin: (passphrase: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  // Actions
  castVote: (pollId: string, optionId: string, input: UserVoteInput) => Promise<boolean>;
  addAudienceOption: (payload: CreateOptionPayload) => Promise<boolean>;
  sendReaction: (emoji: string, label: string) => void;
  createNewPoll: (payload: CreatePollPayload) => Promise<boolean>;
  updatePoll: (payload: UpdatePollPayload) => Promise<boolean>;
  removePfps: (pollId?: string) => Promise<boolean>;
  deletePoll: (pollId: string) => Promise<boolean>;
  switchActivePoll: (pollId: string) => Promise<void>;
  updatePollStatus: (pollId: string, status: 'active' | 'locked' | 'revealed') => Promise<void>;
  resetPollVotes: (pollId?: string) => Promise<boolean>;
  seedAudienceVotes: (pollId?: string) => Promise<void>;
  simulateSpectators: (count?: number) => Promise<void>;
  triggerSound: (type: 'heartbeat' | 'stinger' | 'fanfare' | 'chime' | 'buzzer') => void;
  // Anonymous Confessions
  isConfessionModalOpen: boolean;
  setIsConfessionModalOpen: (open: boolean) => void;
  submitConfession: (text: string) => Promise<boolean>;
  pendingConfessions: Confession[];
  refreshPendingConfessions: () => Promise<void>;
  approveConfession: (id: string) => Promise<boolean>;
  rejectConfession: (id: string) => Promise<boolean>;
}

const PollContext = createContext<PollContextType | undefined>(undefined);

export function PollProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    polls: INITIAL_POLLS,
    activePollId: INITIAL_POLLS[0]?.id || 'poll-envelope-1',
    hotTakes: INITIAL_HOT_TAKES,
    reactionCounts: {
      '🌹': 342,
      '🚩': 215,
      '🔥': 489,
      '💔': 118,
      '🍿': 276,
      '💖': 512,
    },
    connectedAudienceCount: 1,
    confessions: [],
  });

  // Initialize view from URL if provided (e.g. ?view=audience, ?view=stage, ?view=host or paths /stage, /host)
  const [activeView, setActiveViewState] = useState<'audience' | 'stage' | 'host'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        if (v === 'stage' || v === 'host' || v === 'audience') {
          return v;
        }
        const pathname = window.location.pathname.toLowerCase();
        if (pathname.includes('/stage')) return 'stage';
        if (pathname.includes('/host')) return 'host';
        if (pathname.includes('/audience')) return 'audience';
      } catch {
        // ignore
      }
    }
    return 'audience';
  });

  const setActiveView = useCallback((view: 'audience' | 'stage' | 'host') => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('view', view);
        window.history.replaceState(null, '', url.toString());
      } catch {
        // ignore
      }
    }
  }, []);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        if (v === 'stage' || v === 'host' || v === 'audience') {
          setActiveViewState(v);
          return;
        }
        const pathname = window.location.pathname.toLowerCase();
        if (pathname.includes('/stage')) {
          setActiveViewState('stage');
        } else if (pathname.includes('/host')) {
          setActiveViewState('host');
        } else {
          setActiveViewState('audience');
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Audience Join URL for QR Code & Link Sharing — always points at the
  // Audience Pad, and only the Audience Pad, no matter what view generated it.
  const [joinUrl, setJoinUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const origin = window.location.origin;
        const path = window.location.pathname || '/';
        return `${origin}${path}?view=audience`;
      } catch {
        // ignore
      }
    }
    return `${PUBLIC_SHARED_URL}?view=audience`;
  });

  // The site's real public URL once deployed. Derived live from the browser's
  // own address bar so it always matches wherever you actually host this
  // (Cloud Run, Render, Railway, your own domain, ...) rather than a
  // hardcoded preview link.
  const publicWebsiteUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : PUBLIC_SHARED_URL;

  // Admin Access Control: the Stage Screen & Host Console require a shared
  // passphrase (set server-side via ADMIN_KEY); the Audience Pad never does.
  const [adminToken, setAdminTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminCheckPending, setIsAdminCheckPending] = useState<boolean>(true);

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [showStageCornerQr, setShowStageCornerQr] = useState<boolean>(true);
  const [voterName, setVoterNameState] = useState<string>(() => {
    return localStorage.getItem('jab_matched_voter_name') || `Spectator_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [myVotes, setMyVotes] = useState<Record<string, { optionId: string; userRequiredInput: UserVoteInput }>>(() => {
    try {
      const saved = localStorage.getItem('jab_matched_my_votes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeBursts, setActiveBursts] = useState<ReactionBurst[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState<boolean>(false);
  const [isConfessionModalOpen, setIsConfessionModalOpen] = useState<boolean>(false);
  const [pendingConfessions, setPendingConfessions] = useState<Confession[]>([]);
  const [editingPoll, setEditingPoll] = useState<PollQuestion | null>(null);
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState<boolean>(false);

  const openEditModal = useCallback((poll: PollQuestion) => {
    setEditingPoll(poll);
    setIsEditQuestionOpen(true);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);

  const setVoterName = (name: string) => {
    const trimmed = name.trim() || 'Audience Matchmaker';
    setVoterNameState(trimmed);
    localStorage.setItem('jab_matched_voter_name', trimmed);
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    sounds.enabled = enabled;
  };

  // Verify any stored admin token is still valid on load (e.g. after a refresh)
  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      if (!adminToken) {
        setIsAdminCheckPending(false);
        return;
      }
      try {
        const res = await fetch('/api/admin/check', {
          headers: { 'x-admin-token': adminToken },
        });
        const data = await res.json();
        if (!cancelled) {
          setIsAdmin(Boolean(data.valid));
          if (!data.valid) {
            localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
            setAdminTokenState(null);
          }
        }
      } catch {
        // Backend warming up — leave admin state as-is, don't lock anyone out on a blip
      } finally {
        if (!cancelled) setIsAdminCheckPending(false);
      }
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginAdmin = async (passphrase: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.token) {
        setAdminTokenState(data.token);
        try {
          localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
        } catch {
          // ignore storage errors (e.g. private browsing)
        }
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin login failed:', err);
      return false;
    }
  };

  const logoutAdmin = async (): Promise<void> => {
    try {
      if (adminToken) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'x-admin-token': adminToken },
        });
      }
    } catch {
      // ignore
    }
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setAdminTokenState(null);
    setIsAdmin(false);
    setActiveView('audience');
  };

  // Attach the admin session token (when present) to a fetch's headers
  const withAdminHeaders = useCallback(
    (headers: Record<string, string> = {}): Record<string, string> => {
      if (adminToken) {
        return { ...headers, 'x-admin-token': adminToken };
      }
      return headers;
    },
    [adminToken]
  );

  // Trigger sound effect
  const triggerSound = useCallback((type: 'heartbeat' | 'stinger' | 'fanfare' | 'chime' | 'buzzer') => {
    if (!sounds.enabled) return;
    if (type === 'heartbeat') sounds.playHeartbeat();
    else if (type === 'stinger') sounds.playTensionStinger();
    else if (type === 'fanfare') sounds.playFanfare();
    else if (type === 'chime') sounds.playVoteChime();
    else if (type === 'buzzer') sounds.playBuzzer();
  }, []);

  // Trigger celebration confetti
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#f43f5e', '#ec4899', '#fbcfe8', '#fbbf24', '#ffffff'],
      });
    } catch {
      // ignore
    }
  }, []);

  // Fetch full state from REST API
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          polls: data.polls || prev.polls,
          activePollId: data.activePollId || prev.activePollId,
          hotTakes: data.hotTakes || prev.hotTakes,
          reactionCounts: data.reactionCounts || prev.reactionCounts,
          connectedAudienceCount: data.connectedAudienceCount || prev.connectedAudienceCount,
          confessions: data.confessions || prev.confessions,
        }));
      }
    } catch {
      // Backend warming up
    }
  }, []);

  // WebSocket Connection (Auto-reconnecting for 500 mobile audience devices)
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isSubscribed = true;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isSubscribed) {
            setIsConnected(true);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT_STATE') {
              setState(data.payload);
            } else if (data.type === 'AUDIENCE_COUNT_UPDATED') {
              setState((prev) => ({ ...prev, connectedAudienceCount: data.payload.count }));
            } else if (data.type === 'CONFESSIONS_UPDATED') {
              setState((prev) => ({ ...prev, confessions: data.payload.confessions }));
            } else if (data.type === 'VOTE_RECORDED') {
              const { pollId, poll, newHotTake } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: prev.polls.map((p) => (p.id === pollId ? poll : p)),
                hotTakes: newHotTake ? [newHotTake, ...prev.hotTakes.filter((h) => h.id !== newHotTake.id)].slice(0, 60) : prev.hotTakes,
              }));
            } else if (data.type === 'OPTION_ADDED') {
              const { pollId, poll } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: prev.polls.map((p) => (p.id === pollId ? poll : p)),
              }));
              triggerSound('chime');
            } else if (data.type === 'QUESTION_CREATED') {
              const { poll, activePollId } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: [poll, ...prev.polls.filter((p) => p.id !== poll.id)],
                activePollId,
              }));
              triggerSound('chime');
            } else if (data.type === 'QUESTION_UPDATED') {
              const { poll } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: prev.polls.map((p) => (p.id === poll.id ? poll : p)),
              }));
              triggerSound('chime');
            } else if (data.type === 'PFPS_REMOVED') {
              const { pollId, poll, polls } = data.payload;
              if (polls) {
                setState((prev) => ({ ...prev, polls }));
              } else if (poll) {
                setState((prev) => ({
                  ...prev,
                  polls: prev.polls.map((p) => (p.id === poll.id ? poll : p)),
                }));
              } else if (pollId) {
                setState((prev) => ({
                  ...prev,
                  polls: prev.polls.map((p) => {
                    if (p.id === pollId) {
                      return {
                        ...p,
                        options: p.options.map((o) => {
                          const { avatarUrl: _, ...rest } = o;
                          return rest;
                        }),
                      };
                    }
                    return p;
                  }),
                }));
              }
              triggerSound('chime');
            } else if (data.type === 'QUESTION_DELETED') {
              const { pollId, activePollId } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: prev.polls.filter((p) => p.id !== pollId),
                activePollId: prev.activePollId === pollId ? activePollId : prev.activePollId,
              }));
            } else if (data.type === 'POLL_CHANGED') {
              setState((prev) => ({ ...prev, activePollId: data.payload.activePollId }));
              triggerSound('stinger');
            } else if (data.type === 'STATUS_CHANGED') {
              const { pollId, status, poll } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: prev.polls.map((p) => (p.id === pollId ? poll : p)),
              }));

              if (status === 'locked') {
                triggerSound('buzzer');
              } else if (status === 'revealed') {
                triggerSound('fanfare');
                triggerConfetti();
              }
            } else if (data.type === 'POLL_RESET') {
              const { pollId, poll, polls, hotTakes } = data.payload;
              setState((prev) => ({
                ...prev,
                polls: polls ? polls : (poll ? prev.polls.map((p) => (p.id === pollId ? poll : p)) : prev.polls),
                hotTakes: hotTakes !== undefined 
                  ? hotTakes 
                  : (pollId === 'all' ? [] : prev.hotTakes.filter((h) => h.pollId !== pollId)),
              }));

              // Clear local spectator votes so ballots are instantly reopened for voting
              setMyVotes((prev) => {
                const next = { ...prev };
                if (pollId === 'all' || !pollId) {
                  Object.keys(next).forEach((k) => delete next[k]);
                } else {
                  delete next[pollId];
                }
                try {
                  localStorage.setItem('jab_matched_my_votes', JSON.stringify(next));
                } catch {
                  // localStorage quota/ignore
                }
                return next;
              });

              triggerSound('chime');
            } else if (data.type === 'REACTION_BATCH') {
              const { bursts, reactionCounts } = data.payload;
              setState((prev) => ({ ...prev, reactionCounts }));
              setActiveBursts((prev) => [...prev.slice(-15), ...bursts].slice(-25));
              sounds.playReactionPop();
            } else if (data.type === 'REACTION_BURST') {
              const { burst, reactionCounts } = data.payload;
              setState((prev) => ({ ...prev, reactionCounts }));
              setActiveBursts((prev) => [...prev.slice(-20), burst]);
              sounds.playReactionPop();
            }
          } catch {
            // parse error
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connect, 2500);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connect, 2500);
        }
      }
    }

    connect();
    fetchState();

    // Regular HTTP fallback polling for maximum stability on venue Wi-Fi
    const pollingInterval = setInterval(fetchState, 6000);

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      clearInterval(pollingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchState, triggerConfetti, triggerSound]);

  // Periodically clear old bursts
  useEffect(() => {
    if (activeBursts.length === 0) return;
    const timer = setTimeout(() => {
      setActiveBursts((prev) => prev.slice(2));
    }, 2400);
    return () => clearTimeout(timer);
  }, [activeBursts]);

  // Cast vote with optimistic instant feedback
  const castVote = async (pollId: string, optionId: string, input: UserVoteInput): Promise<boolean> => {
    // 1. Optimistically store local vote immediately so UI never lags
    const updatedVotes = {
      ...myVotes,
      [pollId]: { optionId, userRequiredInput: input },
    };
    setMyVotes(updatedVotes);
    localStorage.setItem('jab_matched_my_votes', JSON.stringify(updatedVotes));
    triggerSound('chime');

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId,
          optionId,
          voterName: input.voterName || voterName,
          userRequiredInput: input,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to vote');
      }

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        polls: prev.polls.map((p) => (p.id === pollId ? data.poll : p)),
        hotTakes: data.newHotTake ? [data.newHotTake, ...prev.hotTakes].slice(0, 60) : prev.hotTakes,
      }));

      return true;
    } catch (err) {
      console.error('Vote failed:', err);
      return false;
    }
  };

  // Add audience option
  const addAudienceOption = async (payload: CreateOptionPayload): Promise<boolean> => {
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add option');
      }

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        polls: prev.polls.map((p) => (p.id === payload.pollId ? data.poll : p)),
      }));

      return true;
    } catch (err) {
      console.error('Failed to add option:', err);
      return false;
    }
  };

  // Submit an anonymous confession — public, no name attached. It lands in
  // the host's moderation queue and never appears anywhere until approved.
  const submitConfession = async (text: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to submit confession:', err);
      return false;
    }
  };

  // Host-only: pull the moderation queue (pending + approved + rejected).
  // Polled rather than pushed over the public socket so pending/rejected
  // text is never sent to non-admin clients.
  const refreshPendingConfessions = useCallback(async (): Promise<void> => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/host/confessions', {
        headers: withAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPendingConfessions(data.confessions || []);
      }
    } catch {
      // ignore transient polling errors
    }
  }, [adminToken, withAdminHeaders]);

  const approveConfession = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/host/confessions/${id}/approve`, {
        method: 'POST',
        headers: withAdminHeaders(),
      });
      if (res.ok) {
        await refreshPendingConfessions();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const rejectConfession = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/host/confessions/${id}/reject`, {
        method: 'POST',
        headers: withAdminHeaders(),
      });
      if (res.ok) {
        await refreshPendingConfessions();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Keep the host's moderation queue fresh while they're logged in, so new
  // confessions show up within a few seconds without needing a page reload.
  useEffect(() => {
    if (!isAdmin) {
      setPendingConfessions([]);
      return;
    }
    refreshPendingConfessions();
    const interval = setInterval(refreshPendingConfessions, 4000);
    return () => clearInterval(interval);
  }, [isAdmin, refreshPendingConfessions]);


  const sendReaction = (emoji: string, label: string) => {
    sounds.playReactionPop();
    fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, label }),
    }).catch(() => {});
  };

  // Create new poll
  const createNewPoll = async (payload: CreatePollPayload): Promise<boolean> => {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create poll');
      }

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        polls: [data.poll, ...prev.polls],
        activePollId: data.poll.id,
      }));

      return true;
    } catch (err) {
      console.error('Create poll error:', err);
      return false;
    }
  };

  // Update existing poll (Host action to change text, questions, options, pfps)
  const updatePoll = async (payload: UpdatePollPayload): Promise<boolean> => {
    try {
      const res = await fetch(`/api/questions/${payload.pollId}`, {
        method: 'PUT',
        headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update question');
      }

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        polls: prev.polls.map((p) => (p.id === payload.pollId ? data.poll : p)),
      }));

      triggerSound('chime');
      return true;
    } catch (err) {
      console.error('Update poll error:', err);
      return false;
    }
  };

  // Remove PFPs from a specific poll or all polls (Host action)
  const removePfps = async (pollId?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/host/remove-pfps', {
        method: 'POST',
        headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pollId }),
      });

      if (!res.ok) {
        throw new Error('Failed to remove PFPs');
      }

      const data = await res.json();
      if (data.all && data.polls) {
        setState((prev) => ({ ...prev, polls: data.polls }));
      } else if (data.poll) {
        setState((prev) => ({
          ...prev,
          polls: prev.polls.map((p) => (p.id === data.poll.id ? data.poll : p)),
        }));
      } else if (pollId) {
        setState((prev) => ({
          ...prev,
          polls: prev.polls.map((p) => {
            if (p.id === pollId) {
              return {
                ...p,
                options: p.options.map((o) => {
                  const { avatarUrl: _, ...rest } = o;
                  return rest;
                }),
              };
            }
            return p;
          }),
        }));
      }

      triggerSound('chime');
      return true;
    } catch (err) {
      console.error('Remove PFPs error:', err);
      return false;
    }
  };

  // Delete poll (Host action)
  const deletePoll = async (pollId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/questions/${pollId}`, {
        method: 'DELETE',
        headers: withAdminHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to delete question');
      }
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        polls: prev.polls.filter((p) => p.id !== pollId),
        activePollId: prev.activePollId === pollId ? data.activePollId : prev.activePollId,
      }));
      return true;
    } catch (err) {
      console.error('Delete poll error:', err);
      return false;
    }
  };

  // Switch active poll
  const switchActivePoll = async (pollId: string) => {
    try {
      await fetch('/api/host/active-poll', {
        method: 'POST',
        headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pollId }),
      });
      setState((prev) => ({ ...prev, activePollId: pollId }));
      triggerSound('stinger');
    } catch (err) {
      console.error('Failed to switch poll:', err);
    }
  };

  // Update status (lock/reveal/reopen)
  const updatePollStatus = async (pollId: string, status: 'active' | 'locked' | 'revealed') => {
    try {
      const res = await fetch('/api/host/status', {
        method: 'POST',
        headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pollId, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          polls: prev.polls.map((p) => (p.id === pollId ? data.poll : p)),
        }));
        if (status === 'revealed') {
          triggerSound('fanfare');
          triggerConfetti();
        } else if (status === 'locked') {
          triggerSound('buzzer');
        }
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Reset poll votes (specific poll or entire show)
  const resetPollVotes = async (pollId?: string): Promise<boolean> => {
    const targetPollId = pollId || state.activePollId;
    try {
      // Optimistic local state reset for immediate response
      setState((prev) => ({
        ...prev,
        polls: prev.polls.map((p) => {
          if (targetPollId === 'all' || p.id === targetPollId) {
            return {
              ...p,
              options: p.options.map((o) => ({ ...o, votes: 0 })),
              totalVotes: 0,
              status: 'active',
              winnerOptionId: undefined,
            };
          }
          return p;
        }),
        hotTakes: targetPollId === 'all' ? [] : prev.hotTakes.filter((h) => h.pollId !== targetPollId),
      }));

      // Clear local votes in storage
      setMyVotes((prev) => {
        const updated = { ...prev };
        if (targetPollId === 'all') {
          Object.keys(updated).forEach((k) => delete updated[k]);
        } else {
          delete updated[targetPollId];
        }
        try {
          localStorage.setItem('jab_matched_my_votes', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      const res = await fetch('/api/host/reset', {
        method: 'POST',
        headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pollId: targetPollId }),
      });

      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          polls: data.all ? data.polls : prev.polls.map((p) => (p.id === targetPollId ? data.poll : p)),
          hotTakes: data.hotTakes !== undefined ? data.hotTakes : prev.hotTakes.filter((h) => h.pollId !== targetPollId),
        }));
        triggerSound('chime');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Reset votes failed:', err);
      return false;
    }
  };

  // Seed audience votes for testing demo
  const seedAudienceVotes = async (pollId?: string) => {
    await simulateSpectators(15);
  };

  // Simulate larger batches of spectators (50, 100, 250, 500)
  const simulateSpectators = async (count = 100) => {
    try {
      const targetId = state.activePollId;
      const res = await fetch('/api/host/simulate-spectators', {
        method: 'POST',
        headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pollId: targetId, count }),
      });
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          polls: prev.polls.map((p) => (p.id === targetId ? data.poll : p)),
        }));
        triggerSound('chime');
      }
    } catch (err) {
      console.error('Simulate spectators error:', err);
    }
  };

  const activePoll = state.polls.find((p) => p.id === state.activePollId) || state.polls[0];

  return (
    <PollContext.Provider
      value={{
        state,
        activePoll,
        activeView,
        setActiveView,
        voterName,
        setVoterName,
        myVotes,
        activeBursts,
        soundEnabled,
        setSoundEnabled,
        isConnected,
        isCreateQuestionOpen,
        setIsCreateQuestionOpen,
        editingPoll,
        setEditingPoll,
        isEditQuestionOpen,
        setIsEditQuestionOpen,
        openEditModal,
        isQrModalOpen,
        setIsQrModalOpen,
        showStageCornerQr,
        setShowStageCornerQr,
        joinUrl,
        setJoinUrl,
        publicWebsiteUrl,
        isAdmin,
        isAdminCheckPending,
        loginAdmin,
        logoutAdmin,
        castVote,
        addAudienceOption,
        sendReaction,
        createNewPoll,
        updatePoll,
        removePfps,
        deletePoll,
        switchActivePoll,
        updatePollStatus,
        resetPollVotes,
        seedAudienceVotes,
        simulateSpectators,
        triggerSound,
        isConfessionModalOpen,
        setIsConfessionModalOpen,
        submitConfession,
        pendingConfessions,
        refreshPendingConfessions,
        approveConfession,
        rejectConfession,
      }}
    >
      {children}
    </PollContext.Provider>
  );
}

export function usePollContext() {
  const ctx = useContext(PollContext);
  if (!ctx) {
    throw new Error('usePollContext must be used within a PollProvider');
  }
  return ctx;
}
