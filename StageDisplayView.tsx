import React, { useState } from 'react';
import { usePollContext } from './PollContext';
import { LaceCornerDecoration } from './JabWeMatchedBrand';
import { 
  Trophy, 
  Lock, 
  Flame, 
  Users, 
  Sparkles, 
  Radio, 
  QrCode, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Heart,
  CheckCircle2,
  X,
  Mail,
  MailOpen,
  PartyPopper,
  Edit3,
  RotateCcw
} from 'lucide-react';

export function StageDisplayView() {
  const { 
    activePoll, 
    state, 
    updatePollStatus, 
    triggerSound, 
    soundEnabled, 
    setSoundEnabled,
    openEditModal,
    resetPollVotes,
    setIsQrModalOpen
  } = usePollContext();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResettingStage, setIsResettingStage] = useState(false);

  if (!activePoll) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-pink-200">
        <p>No active question to display on stage.</p>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const sortedOptions = [...activePoll.options].sort((a, b) => {
    if (activePoll.status === 'revealed') {
      return b.votes - a.votes;
    }
    return 0;
  });

  const winnerOption = activePoll.winnerOptionId
    ? activePoll.options.find((o) => o.id === activePoll.winnerOptionId)
    : [...activePoll.options].sort((a, b) => b.votes - a.votes)[0];

  const totalVotes = activePoll.totalVotes || 0;

  return (
    <div className="relative min-h-[90vh] flex flex-col justify-between p-4 sm:p-8 bg-quatrefoil overflow-hidden text-pink-50">
      {/* Delicate white lace corner embroidery from the poster */}
      <LaceCornerDecoration position="top-left" />
      <LaceCornerDecoration position="bottom-right" />
      <LaceCornerDecoration position="top-right" />
      <LaceCornerDecoration position="bottom-left" />

      {/* Atmospheric Stage Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-72 bg-gradient-to-b from-rose-600/30 via-pink-600/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-1/4 w-96 h-96 bg-red-950/40 blur-3xl pointer-events-none" />

      {/* Top Stage Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-pink-300/25">
        {/* Event Logo & Category */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/40 border border-white/40 shadow-md">
            <span className="text-xs font-script text-pink-200">uabc presents</span>
            <span className="font-matched text-sm font-black text-pink-100 tracking-wider matched-3d-text">
              JAB WE MATCHED
            </span>
          </div>

          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-rose-950/70 border border-pink-400/40 text-xs font-bold text-pink-200 tracking-wide uppercase font-mono">
            {activePoll.categoryLabel}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          {activePoll.status === 'active' && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-pink-400/60 shadow-lg shadow-red-950/60">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black text-pink-100 tracking-wider uppercase font-mono">
                💌 500 SPECTATOR BALLOT OPEN
              </span>
            </div>
          )}

          {activePoll.status === 'locked' && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/90 border border-pink-300 shadow-lg shadow-rose-950/60 animate-pulse">
              <Lock className="w-3.5 h-3.5 text-pink-300" />
              <span className="text-xs font-black text-pink-100 tracking-wider uppercase font-mono">
                ENVELOPE SEALED • TALLYING AUDIENCE VOTES
              </span>
            </div>
          )}

          {activePoll.status === 'revealed' && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/90 border border-amber-400 shadow-xl shadow-amber-950/50">
              <PartyPopper className="w-4 h-4 text-amber-300 animate-bounce" />
              <span className="text-xs font-black text-amber-200 tracking-wider uppercase font-mono">
                ENVELOPE UNSEALED • OFFICIAL MATCH VERDICT
              </span>
            </div>
          )}

          {/* Connected Spectators Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-pink-300/30 text-xs font-semibold text-pink-100">
            <Users className="w-3.5 h-3.5 text-pink-300" />
            <span className="font-bold text-white text-sm">{state.connectedAudienceCount}</span>
            <span className="text-pink-200/80 hidden sm:inline">in Hall</span>
          </div>

          {/* Quick Stage Controls */}
          <button
            id="stage-edit-question-btn"
            onClick={() => openEditModal(activePoll)}
            className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-rose-900/60 border border-pink-300/40 text-pink-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Edit Question Text, Options & PFPs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Edit Question</span>
          </button>

          <button
            id="stage-reset-votes-btn"
            onClick={async () => {
              setIsResettingStage(true);
              await resetPollVotes(activePoll.id);
              setIsResettingStage(false);
            }}
            disabled={isResettingStage}
            className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-rose-900/60 border border-pink-300/40 text-pink-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
            title="Reset votes for this question to 0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResettingStage ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">{isResettingStage ? 'Resetting...' : 'Reset Votes'}</span>
          </button>

          <button
            id="stage-toggle-qr-btn"
            onClick={() => setIsQrModalOpen(true)}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-pink-300/40 text-pink-200 hover:text-white transition-all"
            title="Show Spectator Join QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            id="stage-toggle-audio-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-pink-300/40 text-pink-200 hover:text-white transition-all"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            id="stage-toggle-fullscreen-btn"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-pink-300/40 text-pink-200 hover:text-white transition-all"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Center Stage Presentation */}
      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto py-6">
        {/* Poster Header Title Box */}
        <div className="text-center mb-6">
          <div className="text-sm font-script text-pink-200 tracking-widest drop-shadow mb-1">
            jab we matched • live auditorium ballot
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-display tracking-tight drop-shadow-lg max-w-4xl mx-auto leading-tight">
            {activePoll.title}
          </h1>

          <p className="text-pink-200/90 text-sm sm:text-base max-w-2xl mx-auto mt-2 font-medium">
            {activePoll.prompt}
          </p>

          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-black/40 border border-pink-400/30 text-xs font-bold text-pink-200 font-mono">
              <span>TOTAL AUDIENCE VOTES:</span>
              <span className="text-white text-base font-black">{totalVotes}</span>
            </div>
            {activePoll.requiresVoterInput && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-pink-300/30 text-xs font-semibold text-pink-200">
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                <span>Audience Hot Takes Attached</span>
              </div>
            )}
          </div>
        </div>

        {/* Dramatic Envelope Reveal Banner (When Locked or Revealed) */}
        {activePoll.status === 'locked' && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-red-950/90 via-rose-900/90 to-red-950/90 border-2 border-pink-300 shadow-2xl text-center max-w-2xl mx-auto relative overflow-hidden animate-pulse">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center mb-3 animate-heart-thump">
                <Heart className="w-8 h-8 text-pink-100 fill-pink-100" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-matched tracking-wider matched-3d-text">
                THE RED ENVELOPE IS SEALED
              </h2>
              <p className="text-sm text-pink-200 mt-1 max-w-md">
                500 spectator votes have been recorded! The hosts are preparing to reveal the official matchmaking verdict.
              </p>
              <button
                id="stage-reveal-winner-btn"
                onClick={() => updatePollStatus(activePoll.id, 'revealed')}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-600 to-red-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-sm tracking-wider uppercase shadow-lg shadow-pink-900/60 border border-white transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <MailOpen className="w-4 h-4" />
                <span>Unseal The Winner Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Revealed Grand Winner Spotlight */}
        {activePoll.status === 'revealed' && winnerOption && (
          <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#b91c1c] via-[#9f1239] to-[#4c0519] border-[3px] border-white shadow-2xl text-center max-w-3xl mx-auto relative overflow-hidden">
            {/* Lace corners on envelope */}
            <div className="absolute top-2 left-2 text-white/30 text-xs font-script">jab we matched</div>
            <div className="absolute top-2 right-2 text-white/30 text-xs font-script">official verdict</div>

            {/* Heart Seal Trophy Badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pink-100 border-2 border-white shadow-2xl mb-3 animate-heart-thump">
              <Trophy className="w-10 h-10 text-rose-600" />
            </div>

            <div className="text-xs font-mono font-black tracking-widest text-pink-200 uppercase mb-1">
              THE 500 SPECTATORS HAVE DECIDED
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white font-matched tracking-wide matched-3d-text-lg">
              {winnerOption.label}
            </h2>

            {winnerOption.description && (
              <p className="text-pink-100 text-sm sm:text-base max-w-xl mx-auto mt-2 font-medium">
                {winnerOption.description}
              </p>
            )}

            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <span className="px-4 py-1.5 rounded-full bg-white/20 border border-white text-white text-sm font-black font-mono">
                {winnerOption.votes} AUDIENCE VOTES ({totalVotes > 0 ? Math.round((winnerOption.votes / totalVotes) * 100) : 0}%)
              </span>
              {winnerOption.tag && (
                <span className="px-3 py-1.5 rounded-full bg-pink-400/30 border border-pink-200/40 text-pink-100 text-xs font-bold">
                  {winnerOption.tag}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Options Grid / Live Tally Bars */}
        <div className={`grid gap-4 ${sortedOptions.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {sortedOptions.map((option, idx) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isWinner = activePoll.status === 'revealed' && option.id === winnerOption?.id;

            return (
              <div
                key={option.id}
                className={`relative rounded-2xl p-5 transition-all overflow-hidden border-2 ${
                  isWinner
                    ? 'bg-gradient-to-b from-rose-700/90 to-red-900/90 border-white shadow-2xl scale-[1.02] ring-4 ring-pink-300/40'
                    : 'bg-[#40040f]/85 border-pink-300/30 hover:border-pink-300/60 shadow-lg'
                }`}
              >
                {/* Envelope fold corner style */}
                <div 
                  className="absolute top-0 right-0 w-8 h-8 bg-white/10 border-l border-b border-white/20"
                  style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                />

                {/* Top Badge: Rank or Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono ${
                    isWinner
                      ? 'bg-pink-100 text-rose-800'
                      : 'bg-black/40 text-pink-200 border border-pink-400/20'
                  }`}>
                    {activePoll.status === 'revealed' ? `#${idx + 1}` : `OPTION ${idx + 1}`}
                  </span>

                  {option.tag && (
                    <span className="text-[11px] font-semibold text-pink-200 truncate max-w-[130px]">
                      {option.tag}
                    </span>
                  )}
                </div>

                {/* Avatar / Photo if available */}
                {option.avatarUrl && (
                  <div className="mb-3 flex justify-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/60 shadow-md">
                      <img 
                        src={option.avatarUrl} 
                        alt={option.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                )}

                {/* Label & Description */}
                <h3 className="text-lg font-bold text-white leading-snug mb-1 font-display">
                  {option.label}
                </h3>

                {option.description && (
                  <p className="text-xs text-pink-200/80 line-clamp-2 mb-4 leading-relaxed">
                    {option.description}
                  </p>
                )}

                {/* Live Vote Progress Bar */}
                <div className="mt-auto pt-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
                    <span className="text-pink-200">
                      {option.votes} <span className="text-[10px] opacity-70">votes</span>
                    </span>
                    <span className="text-white text-sm font-black">{pct}%</span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-black/50 overflow-hidden p-0.5 border border-white/20">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isWinner
                          ? 'bg-gradient-to-r from-pink-400 via-rose-300 to-white shadow-md'
                          : 'bg-gradient-to-r from-red-600 via-rose-500 to-pink-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Auditorium Hot Takes Live Marquee Ticker */}
      <div className="relative z-10 pt-4 border-t border-pink-300/25">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-950/90 border border-pink-400/50 text-pink-200 text-xs font-black font-mono tracking-wider uppercase">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>500 SPECTATOR LIVE HOT TAKES</span>
          </div>

          {/* Marquee Content */}
          <div className="overflow-hidden whitespace-nowrap w-full">
            <div className="animate-marquee flex items-center gap-6 text-sm">
              {state.hotTakes.slice(0, 10).map((take) => (
                <div
                  key={take.id}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-pink-400/20 text-pink-100"
                >
                  <span className="font-bold text-pink-200 text-xs">{take.voterName}:</span>
                  <span className="text-slate-100 italic text-xs">"{take.hotTake}"</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-rose-900/60 text-pink-200 font-mono">
                    🌶️ {take.spiceLevel}/5
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
