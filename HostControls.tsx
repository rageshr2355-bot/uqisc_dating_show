import React, { useState, useEffect } from 'react';
import { usePollContext } from './PollContext';
import { LaceCornerDecoration } from './JabWeMatchedBrand';
import { 
  Sliders, 
  Lock, 
  Unlock, 
  Trophy, 
  RotateCcw, 
  Trash2, 
  Radio, 
  Sparkles, 
  Users, 
  Heart,
  Flame,
  Mail,
  Zap,
  Activity,
  Edit3,
  ImageOff,
  Check,
  QrCode,
  Copy,
  ExternalLink,
  Tv,
  Smartphone,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import QRCode from 'qrcode';

export function HostControls() {
  const { 
    state, 
    activePoll, 
    switchActivePoll, 
    updatePollStatus, 
    resetPollVotes, 
    simulateSpectators, 
    deletePoll,
    openEditModal,
    removePfps,
    isQrModalOpen,
    setIsQrModalOpen,
    joinUrl,
    showStageCornerQr,
    setShowStageCornerQr,
    pendingConfessions,
    approveConfession,
    rejectConfession,
    launchConfession,
    clearFeaturedConfession,
    setWaitingScreen
  } = usePollContext();

  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isTogglingWaiting, setIsTogglingWaiting] = useState(false);

  const handleToggleWaitingScreen = async () => {
    setIsTogglingWaiting(true);
    await setWaitingScreen(!state.waitingScreenActive);
    setIsTogglingWaiting(false);
  };

  const handleLaunchConfession = async (id: string) => {
    setIsLaunching(true);
    await launchConfession(id);
    setIsLaunching(false);
  };

  const handleClearFeatured = async () => {
    setIsLaunching(true);
    await clearFeaturedConfession();
    setIsLaunching(false);
  };

  const handleApproveConfession = async (id: string) => {
    setModeratingId(id);
    await approveConfession(id);
    setModeratingId(null);
  };

  const handleRejectConfession = async (id: string) => {
    setModeratingId(id);
    await rejectConfession(id);
    setModeratingId(null);
  };

  const [hostQrUrl, setHostQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      width: 320,
      margin: 1,
      color: {
        dark: '#1e050c',
        light: '#ffffff',
      },
    })
      .then((url) => setHostQrUrl(url))
      .catch((err) => console.error('Host QR error:', err));
  }, [joinUrl]);

  const handleCopyJoinLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(joinUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = joinUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Could not copy link:', err);
    }
  };

  const [isSimulating, setIsSimulating] = useState(false);
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null);
  const [pfpActionMessage, setPfpActionMessage] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [isResettingPollId, setIsResettingPollId] = useState<string | null>(null);

  const handleResetPoll = async (pollId?: string, title?: string) => {
    const targetId = pollId || state.activePollId;
    setIsResettingPollId(targetId);
    const success = await resetPollVotes(targetId);
    setIsResettingPollId(null);
    if (success) {
      if (targetId === 'all') {
        setResetNotice('All votes across the entire show have been reset to 0! Envelopes reopened.');
      } else {
        setResetNotice(`Votes for "${title || 'current question'}" reset to 0! Envelope reopened.`);
      }
      setTimeout(() => setResetNotice(null), 4000);
    }
  };

  const handleDeletePoll = async (pollId: string, title: string) => {
    if (state.polls.length <= 1) {
      alert('Cannot delete the only remaining question in the show!');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to remove question:\n"${title}"?`);
    if (!confirmed) return;

    setDeletingPollId(pollId);
    await deletePoll(pollId);
    setDeletingPollId(null);
  };

  const handleRemovePfps = async (pollId?: string) => {
    const targetPoll = pollId ? state.polls.find((p) => p.id === pollId) : null;
    const targetLabel = targetPoll ? `"${targetPoll.title}"` : 'all show questions';
    const confirmed = window.confirm(
      `Remove all candidate profile pictures (PFPs) from ${targetLabel}?\n\nThe ballot will switch to clean text-only options.`
    );
    if (!confirmed) return;

    const success = await removePfps(pollId);
    if (success) {
      setPfpActionMessage(pollId ? 'Profile pictures removed from ballot!' : 'All profile pictures removed from show!');
      setTimeout(() => setPfpActionMessage(null), 3000);
    }
  };

  const handleSimulate = async (count: number) => {
    setIsSimulating(true);
    await simulateSpectators(count);
    setIsSimulating(false);
  };

  // Check how many questions or options currently have PFPs
  const totalPfpsInShow = state.polls.reduce(
    (count, p) => count + p.options.filter((o) => Boolean(o.avatarUrl && o.avatarUrl.trim())).length,
    0
  );
  const activePollPfpCount = activePoll 
    ? activePoll.options.filter((o) => Boolean(o.avatarUrl && o.avatarUrl.trim())).length 
    : 0;

  return (
    <div className="relative min-h-[90vh] bg-quatrefoil py-6 px-4 sm:px-8 text-pink-50 overflow-hidden">
      {/* Corner lace decorations */}
      <LaceCornerDecoration position="top-left" />
      <LaceCornerDecoration position="top-right" />
      <LaceCornerDecoration position="bottom-left" />
      <LaceCornerDecoration position="bottom-right" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* Top Console Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#40040f]/95 border-2 border-white shadow-2xl">
          <div>
            <div className="text-xs font-script text-pink-200 tracking-widest drop-shadow mb-0.5">
              uqisc presents • backstage director deck
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-matched text-white matched-3d-text uppercase tracking-wider">
              JAB WE MATCHED HOST CONTROLS
            </h1>
            <p className="text-xs text-pink-200/90 font-medium">
              Manage live auditorium ballots, lock/unseal the red envelope, and monitor 700 spectator connections.
            </p>
          </div>

          <button
            onClick={handleToggleWaitingScreen}
            disabled={isTogglingWaiting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50 ${
              state.waitingScreenActive
                ? 'bg-amber-500 hover:bg-amber-400 border-white text-black'
                : 'bg-black/40 hover:bg-black/60 border-pink-400/40 text-pink-200 hover:text-white'
            }`}
            title="Show a waiting screen on the Audience Pad instead of the live ballot"
          >
            <Clock className="w-4 h-4" />
            <span>{state.waitingScreenActive ? 'Waiting Screen ON — Click to Hide' : 'Show Waiting Screen'}</span>
          </button>
        </div>

        {/* Anonymous Confessions Moderation Queue */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#3a0a4a] via-[#2e0838] via-40% to-[#3b040e] border-2 border-purple-300 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-purple-400/20">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-300" />
              <h3 className="font-bold text-white text-sm font-matched uppercase tracking-wider">
                Confessions Moderation
              </h3>
              {pendingConfessions.filter((c) => c.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black font-mono animate-pulse">
                  {pendingConfessions.filter((c) => c.status === 'pending').length} WAITING
                </span>
              )}
            </div>
            <p className="text-[11px] text-purple-200/70 hidden sm:block">
              Nothing reaches the audience or stage until you approve it here.
            </p>
          </div>

          {pendingConfessions.filter((c) => c.status === 'pending').length === 0 ? (
            <p className="text-xs text-purple-300/60 italic text-center py-4">
              No confessions waiting for review right now.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {pendingConfessions
                .filter((c) => c.status === 'pending')
                .map((confession) => (
                  <div
                    key={confession.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-purple-400/25"
                  >
                    <p className="flex-1 text-sm text-purple-50 italic leading-relaxed">
                      "{confession.text}"
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveConfession(confession.id)}
                        disabled={moderatingId === confession.id}
                        className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-300/50 text-white transition-colors disabled:opacity-50"
                        title="Approve — shows on audience feed & stage screen"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectConfession(confession.id)}
                        disabled={moderatingId === confession.id}
                        className="p-2 rounded-lg bg-red-900 hover:bg-red-800 border border-red-400/40 text-white transition-colors disabled:opacity-50"
                        title="Reject — never shown"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {pendingConfessions.filter((c) => c.status === 'approved').length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-400/20">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-[11px] font-bold text-purple-200/80 uppercase tracking-wider">
                  Approved confessions — launch one to the big screen
                </p>
                {state.confessionsBoardActive && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const approvedList = pendingConfessions
                        .filter((c) => c.status === 'approved')
                        .slice(-20)
                        .reverse();
                      const currentIndex = approvedList.findIndex((c) => c.id === state.featuredConfessionId);
                      const goTo = (delta: number) => {
                        if (currentIndex === -1 || approvedList.length === 0) return;
                        const nextIndex = (currentIndex + delta + approvedList.length) % approvedList.length;
                        handleLaunchConfession(approvedList[nextIndex].id);
                      };
                      return (
                        <>
                          <button
                            onClick={() => goTo(-1)}
                            disabled={isLaunching || currentIndex === -1}
                            className="p-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 border border-purple-300/40 text-white transition-colors disabled:opacity-40"
                            title="Previous confession"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-mono text-purple-200/80 min-w-[40px] text-center">
                            {currentIndex === -1 ? '—' : `${currentIndex + 1}/${approvedList.length}`}
                          </span>
                          <button
                            onClick={() => goTo(1)}
                            disabled={isLaunching || currentIndex === -1}
                            className="p-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 border border-purple-300/40 text-white transition-colors disabled:opacity-40"
                            title="Next confession"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      );
                    })()}
                    <button
                      onClick={handleClearFeatured}
                      disabled={isLaunching}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-900 hover:bg-red-800 border border-red-400/40 text-[11px] text-white font-bold transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      <span>Close Board</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {pendingConfessions
                  .filter((c) => c.status === 'approved')
                  .slice(-20)
                  .reverse()
                  .map((confession) => {
                    const isFeatured = state.featuredConfessionId === confession.id;
                    return (
                      <div
                        key={confession.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] transition-colors ${
                          isFeatured
                            ? 'bg-purple-900/60 border-purple-300 shadow-md shadow-purple-950/60'
                            : 'bg-emerald-950/60 border-emerald-400/30'
                        }`}
                      >
                        <span className="flex-1 truncate italic text-emerald-50">"{confession.text}"</span>
                        {isFeatured && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-purple-500 text-white text-[10px] font-black uppercase">
                            On Screen
                          </span>
                        )}
                        <button
                          onClick={() => handleLaunchConfession(confession.id)}
                          disabled={isLaunching || isFeatured}
                          title="Launch to the stage big screen"
                          className="flex-shrink-0 p-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 border border-purple-300/50 text-white transition-colors disabled:opacity-40"
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRejectConfession(confession.id)}
                          disabled={moderatingId === confession.id}
                          title="Pull down from the live feed"
                          className="flex-shrink-0 p-1.5 rounded-lg bg-red-900 hover:bg-red-800 border border-red-400/40 text-white transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* 700 Spectators High Scale Diagnostics & Stress Tester */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#5a0914] via-[#4c0519] to-[#3b040e] border-2 border-pink-300 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-pink-400/20">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-white text-sm font-matched uppercase tracking-wider">
                  700 Spectator Scale & Engine Health
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 border border-emerald-400 text-emerald-300 font-mono">
                  OPTIMIZED FOR 700 USERS
                </span>
              </div>
              <p className="text-xs text-pink-200/80 mt-1">
                WebSocket reaction batching (120ms), debounced broadcasts, and backpressure guards are active.
              </p>
            </div>

            {/* Quick stats pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="px-3 py-1 rounded-xl bg-black/40 border border-pink-400/30 text-pink-200">
                Connected: <span className="font-black text-white">{state.connectedAudienceCount}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-black/40 border border-pink-400/30 text-pink-200">
                Active Question Votes: <span className="font-black text-white">{activePoll?.totalVotes || 0}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-black/40 border border-pink-400/30 text-pink-200">
                Hot Takes Logged: <span className="font-black text-white">{state.hotTakes.length}</span>
              </div>
            </div>
          </div>

          {/* Stress-Test & Simulation Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-pink-200 font-mono">
              Simulate Live Spectators (Test Audience Wave):
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-simulate-50-spectators"
                onClick={() => handleSimulate(50)}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-pink-400/40 text-pink-100 text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>+50 Spectators</span>
              </button>

              <button
                id="btn-simulate-100-spectators"
                onClick={() => handleSimulate(100)}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-pink-400/40 text-pink-100 text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>+100 Spectators</span>
              </button>

              <button
                id="btn-simulate-250-spectators"
                onClick={() => handleSimulate(250)}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-pink-400/40 text-pink-100 text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>+250 Spectators</span>
              </button>

              <button
                id="btn-simulate-700-spectators"
                onClick={() => handleSimulate(700)}
                disabled={isSimulating}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 border border-white text-white text-xs font-black font-mono shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-white" />
                <span>+700 Max Capacity Wave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audience Join Gateway & Live QR Code Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#35040d]/90 border-2 border-pink-400/40 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Real Mini QR Preview */}
              <div 
                onClick={() => setIsQrModalOpen(true)}
                className="w-20 h-20 bg-white p-1.5 rounded-2xl shadow-md cursor-pointer hover:scale-105 transition-transform flex-shrink-0 relative group border-2 border-rose-500"
                title="Click to expand QR Code"
              >
                {hostQrUrl ? (
                  <img src={hostQrUrl} alt="Join QR Code" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-rose-900">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                  Enlarge
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-pink-300 uppercase tracking-wider">
                    SPECTATOR JOIN GATEWAY & QR CODE
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white font-display mt-0.5">
                  Live Voting Link & Stage QR Code
                </h3>
                <p className="text-xs text-pink-200/80 mt-0.5 max-w-lg">
                  Spectators in the hall scan this code to vote on their phones without downloading any app.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                id="btn-host-open-qr-modal"
                onClick={() => setIsQrModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-white text-white text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Open Big Stage QR</span>
              </button>

              <button
                id="btn-host-copy-join-link"
                onClick={handleCopyJoinLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  copiedLink
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-black/40 hover:bg-black/60 border-pink-400/40 text-pink-200 hover:text-white'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <button
                id="btn-host-toggle-corner-qr"
                onClick={() => setShowStageCornerQr(!showStageCornerQr)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  showStageCornerQr
                    ? 'bg-amber-950/80 border-amber-400/80 text-amber-200'
                    : 'bg-black/40 border-pink-400/30 text-pink-300'
                }`}
                title="Toggle persistent mini-QR badge on bottom corner of Stage screen"
              >
                <Tv className="w-4 h-4" />
                <span>{showStageCornerQr ? 'Corner QR: ON' : 'Corner QR: OFF'}</span>
              </button>

              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-pink-200 hover:text-white transition-colors"
                title="Open Audience View in New Tab (Test as Spectator)"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-pink-400/20 flex items-center justify-between text-xs font-mono text-pink-200 overflow-hidden">
            <span className="truncate pr-2 select-all">{joinUrl}</span>
            <span className="text-[10px] text-pink-300/80 uppercase tracking-widest flex-shrink-0 font-sans">
              Instant Mobile Route
            </span>
          </div>
        </div>

        {/* Current Active Question Control Center */}
        {activePoll && (
          <div className="p-6 rounded-3xl bg-[#40040f]/90 border-2 border-pink-300/40 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-pink-300/20">
              <div>
                <span className="text-[11px] font-mono font-bold text-pink-300 uppercase tracking-widest">
                  CURRENT STAGE QUESTION
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  {activePoll.title}
                </h2>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Host Edit Question & Text Button */}
                <button
                  id="host-edit-active-question-btn"
                  onClick={() => openEditModal(activePoll)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-white text-white text-xs font-black font-mono shadow-md transition-all hover:scale-105"
                  title="Change question text, options, or remove pfps"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Question & Text</span>
                </button>

                {/* Remove PFP quick button if this poll has PFPs */}
                {activePollPfpCount > 0 && (
                  <button
                    id="host-remove-active-pfps-btn"
                    onClick={() => handleRemovePfps(activePoll.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-rose-400/50 text-rose-200 text-xs font-bold font-mono transition-all"
                    title="Remove all candidate profile pictures from this ballot"
                  >
                    <ImageOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Remove PFPs ({activePollPfpCount})</span>
                  </button>
                )}

                {activePoll.status !== 'active' && (
                  <button
                    id="host-reopen-voting-btn"
                    onClick={() => updatePollStatus(activePoll.id, 'active')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400 text-emerald-200 text-xs font-bold font-mono"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Open Ballot</span>
                  </button>
                )}

                {activePoll.status === 'active' && (
                  <button
                    id="host-lock-envelope-btn"
                    onClick={() => updatePollStatus(activePoll.id, 'locked')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-900/90 hover:bg-rose-800 border border-pink-300 text-white text-xs font-bold font-mono"
                  >
                    <Lock className="w-3.5 h-3.5 text-pink-300" />
                    <span>Seal Red Envelope (Lock Votes)</span>
                  </button>
                )}

                {activePoll.status !== 'revealed' && (
                  <button
                    id="host-reveal-winner-btn"
                    onClick={() => updatePollStatus(activePoll.id, 'revealed')}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 border border-white text-white text-xs font-black font-mono shadow-md"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Unseal Winner on Stage Screen</span>
                  </button>
                )}

                <button
                  id="host-reset-votes-btn"
                  onClick={() => handleResetPoll(activePoll.id, activePoll.title)}
                  disabled={isResettingPollId === activePoll.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-rose-950 border border-pink-400/30 text-pink-300 hover:text-white text-xs font-bold font-mono transition-all disabled:opacity-50"
                  title="Reset all votes and hot takes for this question to 0"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResettingPollId === activePoll.id ? 'animate-spin' : ''}`} />
                  <span>{isResettingPollId === activePoll.id ? 'Resetting...' : 'Reset Votes'}</span>
                </button>
              </div>
            </div>

            {/* Reset confirmation notice banner */}
            {resetNotice && (
              <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs flex items-center gap-2 font-medium animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>{resetNotice}</span>
              </div>
            )}

            {/* Current Candidates Quick Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {activePoll.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-3 rounded-2xl border ${
                    activePoll.winnerOptionId === opt.id
                      ? 'bg-rose-800/90 border-white shadow-lg'
                      : 'bg-black/40 border-pink-400/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white font-display truncate max-w-[130px]">
                      {opt.label}
                    </span>
                    <span className="font-mono font-bold text-pink-200">
                      {opt.votes} votes
                    </span>
                  </div>
                  {opt.tag && (
                    <span className="text-[10px] text-pink-300/80 block truncate">
                      {opt.tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Selector List (Switching between the questions of the night) */}
        <div className="p-6 rounded-3xl bg-[#3b040e]/90 border border-pink-300/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-white text-base font-display flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400" />
              <span>Show Questions of the Night ({state.polls.length})</span>
            </h3>

            <div className="flex items-center gap-2">
              {state.polls.some((p) => p.totalVotes > 0) && (
                <button
                  id="btn-reset-all-votes"
                  onClick={() => handleResetPoll('all')}
                  disabled={isResettingPollId === 'all'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-rose-950 border border-pink-400/30 text-pink-300 hover:text-white text-xs font-bold font-mono transition-all"
                  title="Reset votes across all questions in the entire show"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResettingPollId === 'all' ? 'animate-spin' : ''}`} />
                  <span>{isResettingPollId === 'all' ? 'Resetting All...' : 'Reset All Show Votes'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.polls.map((poll) => {
              const isActive = poll.id === state.activePollId;
              const isDeleting = deletingPollId === poll.id;

              return (
                <div
                  key={poll.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-gradient-to-r from-red-900/90 to-rose-900/90 border-white shadow-xl'
                      : 'bg-black/30 border-pink-400/20 hover:border-pink-400/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black font-mono text-pink-300 uppercase">
                        {poll.categoryLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                          poll.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : poll.status === 'locked'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {poll.status.toUpperCase()}
                        </span>

                        {/* Reset votes for this individual question */}
                        {poll.totalVotes > 0 && (
                          <button
                            id={`btn-reset-poll-votes-${poll.id}`}
                            onClick={() => handleResetPoll(poll.id, poll.title)}
                            disabled={isResettingPollId === poll.id}
                            title="Reset votes for this question to 0"
                            className="p-1 rounded-lg bg-black/40 hover:bg-rose-950 text-pink-300 hover:text-white border border-pink-400/30 transition-colors"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isResettingPollId === poll.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        {/* Quick Remove PFP if this question has any */}
                        {poll.options.some((o) => Boolean(o.avatarUrl && o.avatarUrl.trim())) && (
                          <button
                            id={`btn-remove-pfps-${poll.id}`}
                            onClick={() => handleRemovePfps(poll.id)}
                            title="Remove candidate profile pictures from this question"
                            className="p-1 rounded-lg bg-black/40 hover:bg-red-950/80 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
                          >
                            <ImageOff className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Host Edit Question & Text Button */}
                        <button
                          id={`btn-edit-poll-${poll.id}`}
                          onClick={() => openEditModal(poll)}
                          title="Edit question text, options, or pfps"
                          className="p-1 rounded-lg bg-black/40 hover:bg-rose-800 text-pink-200 hover:text-white border border-pink-400/30 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {state.polls.length > 1 && (
                          <button
                            id={`btn-delete-poll-${poll.id}`}
                            onClick={() => handleDeletePoll(poll.id, poll.title)}
                            disabled={isDeleting}
                            title="Delete this question"
                            className="p-1 rounded-lg bg-black/40 hover:bg-red-900/80 text-pink-300 hover:text-white border border-pink-500/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-white text-sm sm:text-base mb-1 font-display">
                      {poll.title}
                    </h4>
                    <p className="text-xs text-pink-200/80 line-clamp-1 mb-3">
                      {poll.prompt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-pink-300/20 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-pink-300 font-bold">
                        {poll.totalVotes} Total Votes
                      </span>
                      {poll.options.some((o) => Boolean(o.avatarUrl && o.avatarUrl.trim())) ? (
                        <span className="text-[10px] text-amber-300/90 font-sans">
                          • Has PFPs
                        </span>
                      ) : (
                        <span className="text-[10px] text-pink-300/60 font-sans">
                          • Text-only
                        </span>
                      )}
                    </div>

                    {!isActive && (
                      <button
                        id={`btn-switch-poll-${poll.id}`}
                        onClick={() => switchActivePoll(poll.id)}
                        className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold"
                      >
                        Push to Stage Screen
                      </button>
                    )}
                    {isActive && (
                      <span className="text-xs font-bold text-pink-200">
                        ● Currently On Air
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dedicated PFP & Question Ballot Control Panel */}
        <div className="p-6 rounded-3xl bg-[#32030c]/90 border border-pink-300/30 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-black/40 border border-pink-400/30 text-rose-300">
                <ImageOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Profile Picture (PFP) & Ballot Display Controls
                </h3>
                <p className="text-xs text-pink-200/80">
                  {totalPfpsInShow > 0 ? (
                    <span>
                      <strong className="text-amber-300">{totalPfpsInShow}</strong> candidate profile pictures currently active across show ballots.
                    </span>
                  ) : (
                    <span className="text-emerald-300">
                      ✓ All questions are currently in clean text-only mode (No PFPs active).
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activePollPfpCount > 0 && activePoll && (
                <button
                  id="btn-remove-active-poll-pfps"
                  onClick={() => handleRemovePfps(activePoll.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/90 hover:bg-red-900 border border-rose-400/40 text-rose-200 text-xs font-bold font-mono transition-all"
                >
                  <ImageOff className="w-3.5 h-3.5" />
                  <span>Remove PFPs from On-Air Question ({activePollPfpCount})</span>
                </button>
              )}

              {totalPfpsInShow > 0 && (
                <button
                  id="btn-remove-all-show-pfps"
                  onClick={() => handleRemovePfps()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 border border-white text-white text-xs font-black font-mono shadow-md transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Strip All PFPs from Entire Show ({totalPfpsInShow})</span>
                </button>
              )}
            </div>
          </div>

          {pfpActionMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 font-medium animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{pfpActionMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
