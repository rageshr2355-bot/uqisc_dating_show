import React, { useState, useEffect } from 'react';
import { usePollContext } from './PollContext';
import { PollOption } from './types';
import { JabWeMatchedBrand, LaceCornerDecoration } from './JabWeMatchedBrand';
import { 
  CheckCircle2, 
  Send, 
  PlusCircle, 
  Lock, 
  Trophy, 
  Sparkles, 
  HelpCircle, 
  AlertCircle,
  MessageSquare,
  Ticket,
  RotateCcw,
  Heart,
  Mail,
  MailCheck,
  Check,
  Users,
  Radio,
  QrCode,
  Copy,
  ExternalLink,
  Smartphone,
  Clock
} from 'lucide-react';

export function AudienceView() {
  const { 
    activePoll, 
    voterName, 
    myVotes, 
    castVote, 
    addAudienceOption, 
    state,
    setIsConfessionModalOpen,
    setIsQrModalOpen,
    joinUrl,
    publicWebsiteUrl
  } = usePollContext();

  const currentVote = activePoll ? myVotes[activePoll.id] : undefined;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    currentVote?.optionId || null
  );

  // Required voter inputs
  const [hotTakeInput, setHotTakeInput] = useState<string>(
    currentVote?.userRequiredInput?.hotTake || ''
  );
  const [writeInInput, setWriteInInput] = useState<string>(
    currentVote?.userRequiredInput?.customWriteIn || ''
  );
  const [spiceLevel, setSpiceLevel] = useState<number>(
    currentVote?.userRequiredInput?.spiceLevel || 5
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(voterName);

  // Synchronize state when active poll switches
  useEffect(() => {
    if (activePoll) {
      const vote = myVotes[activePoll.id];
      setSelectedOptionId(vote?.optionId || null);
      setHotTakeInput(vote?.userRequiredInput?.hotTake || '');
      setWriteInInput(vote?.userRequiredInput?.customWriteIn || '');
      setSpiceLevel(vote?.userRequiredInput?.spiceLevel || 5);
      setValidationError(null);
    }
  }, [activePoll?.id, myVotes]);

  // Form error state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);

  // New option submission form
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');
  const [newOptionTag, setNewOptionTag] = useState('Audience Nominee 🌟');
  const [newOptionError, setNewOptionError] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Tab for hot takes feed vs ballot

  // Host-controlled waiting screen — takes over the whole Audience Pad
  // whenever there's nothing live to vote on (between segments, etc.)
  if (state.waitingScreenActive) {
    return (
      <div className="relative min-h-[90vh] bg-quatrefoil flex items-center justify-center p-6 overflow-hidden">
        <LaceCornerDecoration position="top-left" />
        <LaceCornerDecoration position="top-right" />
        <LaceCornerDecoration position="bottom-left" />
        <LaceCornerDecoration position="bottom-right" />

        <div className="relative z-10 text-center max-w-md">
          <div className="flex justify-center mb-5">
            <JabWeMatchedBrand size="lg" />
          </div>
          <div className="mx-auto w-16 h-16 rounded-full bg-black/40 border-2 border-white/70 flex items-center justify-center mb-5 animate-pulse-glow">
            <Clock className="w-7 h-7 text-pink-100" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-matched text-white matched-3d-text uppercase tracking-wide mb-2">
            Hang Tight
          </h2>
          <p className="text-sm text-pink-50/90 leading-relaxed mb-6">
            The next ballot is coming up shortly — keep your eyes on the stage!
          </p>

          {/* Confessions stay open even while waiting — send only, no list to browse */}
          <div className="p-4 rounded-3xl bg-[#2b0309]/90 border border-purple-300/25 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200 font-mono uppercase tracking-wider mb-3 justify-center">
              <Mail className="w-4 h-4 text-purple-300" />
              <span>Got a Confession?</span>
            </div>
            <button
              type="button"
              onClick={() => setIsConfessionModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-pink-600 hover:from-purple-600 hover:to-pink-500 border border-white/80 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all hover:scale-[1.01]"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send an Anonymous Confession</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activePoll) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-pink-200">
        <p>No active question found. Waiting for show host...</p>
      </div>
    );
  }

  const isPollLocked = activePoll.status === 'locked' || activePoll.status === 'revealed';
  const selectedOption = activePoll.options.find((o) => o.id === selectedOptionId);
  const hasVoted = Boolean(currentVote);

  const handleSelectOption = (option: PollOption) => {
    if (isPollLocked) return;
    setSelectedOptionId(option.id);
    setValidationError(null);
  };

  const handleCastVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId || !activePoll) return;

    // Strict validation for required user input!
    if (activePoll.requiresVoterInput && !hotTakeInput.trim()) {
      setValidationError('Required: Enter your spicy reasoning / hot take to seal your vote in the envelope!');
      return;
    }

    if (selectedOption?.requiresWriteIn && !writeInInput.trim()) {
      setValidationError('Required: Please enter the name or details for your write-in couple nominee!');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    const success = await castVote(activePoll.id, selectedOptionId, {
      voterName,
      hotTake: hotTakeInput.trim(),
      customWriteIn: selectedOption?.requiresWriteIn ? writeInInput.trim() : undefined,
      spiceLevel,
    });

    setIsSubmitting(false);
    if (!success) {
      setValidationError('Failed to record vote. Please check your connection and try again.');
    }
  };

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionLabel.trim()) {
      setNewOptionError('Please enter a couple or option name');
      return;
    }

    setIsAddingOption(true);
    setNewOptionError(null);

    const success = await addAudienceOption({
      pollId: activePoll.id,
      label: newOptionLabel.trim(),
      description: newOptionDesc.trim() || undefined,
      tag: newOptionTag.trim() || 'Audience Nominee 🌟',
      createdBy: voterName,
    });

    setIsAddingOption(false);
    if (success) {
      setNewOptionLabel('');
      setNewOptionDesc('');
      setShowAddOptionModal(false);
    } else {
      setNewOptionError('Failed to add nominee. Voting may be closed.');
    }
  };

  return (
    <div className="relative min-h-[90vh] bg-quatrefoil py-6 px-3 sm:px-6 overflow-hidden">
      {/* Delicate white lace corners in the background */}
      <LaceCornerDecoration position="top-left" />
      <LaceCornerDecoration position="top-right" />
      <LaceCornerDecoration position="bottom-left" />
      <LaceCornerDecoration position="bottom-right" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        {/* Spectator Instant Access Strip */}
        <div className="p-3 sm:p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-pink-400/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 text-[11px] font-bold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  No Sign-In Required • Guest Access
                </span>
                <span className="text-xs text-pink-300/90 font-mono">
                  Voting as: <strong className="text-white">{voterName}</strong>
                </span>
              </div>
              <p className="text-xs text-pink-200/80 mt-0.5">
                Anyone on this website can cast live votes with zero signup or barriers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              id="audience-share-qr-btn"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              title="Show QR Code for someone next to you to scan"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Share QR</span>
            </button>

            <button
              id="audience-copy-link-btn"
              onClick={async () => {
                try {
                  const target = publicWebsiteUrl || joinUrl;
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(target);
                  }
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                } catch (e) {
                  console.error(e);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                copiedLink 
                  ? 'bg-emerald-600 border-emerald-400 text-white' 
                  : 'bg-black/40 hover:bg-black/60 border-pink-400/30 text-pink-200 hover:text-white'
              }`}
              title="Copy Website Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied URL!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Anonymous Confession Send Card — audience can only submit here,
            never browse what others have sent. The full list only ever
            appears on the Stage Screen's host-curated Confessions Board. */}
        <div className="p-4 rounded-3xl bg-[#2b0309]/90 border border-purple-300/25">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200 font-mono uppercase tracking-wider mb-3">
            <Mail className="w-4 h-4 text-purple-300" />
            <span>Anonymous Confession</span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfessionModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-pink-600 hover:from-purple-600 hover:to-pink-500 border border-white/80 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all hover:scale-[1.01]"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send an Anonymous Confession</span>
          </button>
        </div>

        {/* Poster Styled Top Envelope Card */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#b91c1c] via-[#9f1239] to-[#580a14] border-[3px] border-white shadow-2xl p-5 sm:p-7 overflow-hidden text-center">
          {/* Triangular flap highlight */}
          <div 
            className="absolute top-0 left-0 right-0 h-12 bg-[#881337]/90 border-b border-white/40"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
          />

          {/* Center Heart Seal on Envelope */}
          <div className="relative z-10 mx-auto w-10 h-10 -mt-1 mb-2 rounded-full bg-pink-100 border-2 border-white shadow-lg flex items-center justify-center animate-heart-thump">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
          </div>

          <div className="relative z-10 text-xs font-script text-pink-200 tracking-widest drop-shadow mb-0.5">
            uqisc presents...
          </div>

          <div className="relative z-10 flex items-center justify-center gap-2 mb-2">
            <span className="font-script text-3xl sm:text-4xl text-white drop-shadow -rotate-2">
              jab we
            </span>
            <span className="font-matched text-3xl sm:text-5xl text-[#fbcfe8] font-black tracking-widest matched-3d-text uppercase">
              MATCHED
            </span>
          </div>

          {/* Current Poll Category Badge */}
          <div className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-pink-300/40 text-pink-200 text-xs font-mono font-bold uppercase mb-3">
            <span>{activePoll.categoryLabel}</span>
          </div>

          {/* Main Question Title */}
          <h1 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-bold text-white font-display leading-snug drop-shadow-md max-w-xl mx-auto">
            {activePoll.title}
          </h1>

          <p className="relative z-10 text-xs sm:text-sm text-pink-100/90 mt-2 max-w-lg mx-auto font-medium">
            {activePoll.prompt}
          </p>

          {/* Total Votes and Connected Spectators bar */}
          <div className="relative z-10 flex items-center justify-center gap-4 mt-4 text-xs text-pink-200 font-mono">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20">
              <Users className="w-3.5 h-3.5 text-pink-300" />
              <span>{state.connectedAudienceCount} in Hall</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20">
              <Mail className="w-3.5 h-3.5 text-pink-300" />
              <span>{activePoll.totalVotes} Total Votes</span>
            </span>
          </div>
        </div>

        {/* Status Alert if Locked or Revealed */}
        {activePoll.status === 'locked' && (
          <div className="p-4 rounded-2xl bg-rose-950/90 border-2 border-pink-300 shadow-xl flex items-center gap-3 text-pink-100 animate-pulse">
            <div className="p-2 rounded-full bg-rose-800 border border-white">
              <Lock className="w-5 h-5 text-pink-200" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white font-matched uppercase">
                The Red Envelope Is Sealed!
              </h4>
              <p className="text-xs text-pink-200">
                Voting is officially locked while the hosts count the 700 spectator votes. Watch the stage screen for the grand reveal!
              </p>
            </div>
          </div>
        )}

        {activePoll.status === 'revealed' && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-rose-900/90 to-amber-950/90 border-2 border-amber-300 shadow-xl text-center text-amber-100">
            <div className="inline-flex p-2 rounded-full bg-amber-400 text-rose-950 mb-2">
              <Trophy className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black font-matched text-white uppercase tracking-wider">
              OFFICIAL MATCH WINNER UNSEALED!
            </h4>
            <p className="text-xs text-pink-100 max-w-md mx-auto mt-1">
              Check out the official stage screen results below. Thank you for voting!
            </p>
          </div>
        )}

        {/* Voting Form / Ballot */}
        <form onSubmit={handleCastVote} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-pink-200 px-1 font-mono uppercase tracking-wider">
              <span>Step 1: Select Your Match ({activePoll.options.length} Nominees)</span>
              {activePoll.allowAudienceOptions && !isPollLocked && (
                <button
                  type="button"
                  id="btn-open-nominate-modal"
                  onClick={() => setShowAddOptionModal(true)}
                  className="flex items-center gap-1 text-pink-100 hover:text-white underline font-semibold normal-case"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Nominate New Couple</span>
                </button>
              )}
            </div>

            {/* Candidate Options Radio List */}
            {activePoll.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isVotedThis = currentVote?.optionId === option.id;
              const isWinner = activePoll.status === 'revealed' && option.id === activePoll.winnerOptionId;

              return (
                <div
                  key={option.id}
                  id={`option-card-${option.id}`}
                  onClick={() => handleSelectOption(option)}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-red-800/95 to-rose-900/95 border-white shadow-xl ring-2 ring-pink-300'
                      : 'bg-[#3b040e]/90 border-pink-300/30 hover:border-pink-300/60 shadow-md'
                  } ${isPollLocked ? 'cursor-default' : ''}`}
                >
                  {/* Outer edge white line accent */}
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox / Radio Circle */}
                    <div className="mt-0.5 flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isSelected
                          ? 'bg-white border-white text-rose-700'
                          : 'border-pink-300/50 bg-black/30'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Avatar if exists */}
                    {option.avatarUrl && (
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white flex-shrink-0 shadow-md">
                        <img 
                          src={option.avatarUrl} 
                          alt={option.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}

                    {/* Option Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-white text-base sm:text-lg font-display leading-tight">
                          {option.label}
                        </h3>
                        {option.tag && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-900/70 border border-pink-400/40 text-pink-200">
                            {option.tag}
                          </span>
                        )}
                        {isVotedThis && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 font-mono">
                            YOUR VOTE
                          </span>
                        )}
                        {isWinner && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-rose-950 font-mono flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> OFFICIAL WINNER
                          </span>
                        )}
                      </div>

                      {option.description && (
                        <p className="text-xs sm:text-sm text-pink-200/90 leading-relaxed font-medium">
                          {option.description}
                        </p>
                      )}

                      {/* Write-in dynamic nominee note */}
                      {option.requiresWriteIn && isSelected && !isPollLocked && (
                        <div className="mt-3 pt-3 border-t border-pink-300/30">
                          <label className="block text-xs font-bold text-pink-200 mb-1">
                            Nominate Your Custom Couple or Match:
                          </label>
                          <input
                            id="input-custom-write-in"
                            type="text"
                            value={writeInInput}
                            onChange={(e) => setWriteInInput(e.target.value)}
                            placeholder="e.g. Aryan & Simran from Table 6"
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-pink-400 text-white text-xs placeholder-pink-300/50 focus:outline-none focus:ring-1 focus:ring-pink-300"
                          />
                        </div>
                      )}

                      {/* Vote Count & Percentages (Visible after voting or if locked/revealed) */}
                      {(hasVoted || isPollLocked) && (
                        <div className="mt-3 pt-2 border-t border-pink-300/20">
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-pink-200 mb-1">
                            <span>{option.votes} votes</span>
                            <span>
                              {activePoll.totalVotes > 0 
                                ? Math.round((option.votes / activePoll.totalVotes) * 100) 
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 via-rose-400 to-pink-300 transition-all duration-500"
                              style={{
                                width: `${
                                  activePoll.totalVotes > 0 
                                    ? Math.round((option.votes / activePoll.totalVotes) * 100) 
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 2: Required Voter Hot Take / Reasoning */}
          {activePoll.requiresVoterInput && (
            <div className="p-5 rounded-3xl bg-[#35040d]/90 border-2 border-pink-300/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center border border-white text-white text-xs font-black">
                    2
                  </div>
                  <span className="font-bold text-white text-sm font-display">
                    {activePoll.inputPromptText || 'Spectator Hot Take (Required to Vote)'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-900/90 text-pink-200 border border-pink-400/40 font-mono">
                  MANDATORY INPUT
                </span>
              </div>

              <div>
                <textarea
                  id="textarea-voter-hottake"
                  value={hotTakeInput}
                  onChange={(e) => {
                    setHotTakeInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isPollLocked}
                  rows={3}
                  maxLength={240}
                  placeholder="Explain why this couple belongs together (or why you're dumping them!). Your hot take will be screened on the main stage ticker!"
                  className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-pink-300/40 text-white placeholder-pink-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none disabled:opacity-60"
                />
                <div className="flex items-center justify-between text-[11px] text-pink-300/70 mt-1 font-mono">
                  <span>Broadcasts to the auditorium big screen</span>
                  <span>{hotTakeInput.length}/240 chars</span>
                </div>
              </div>

              {/* Spice Meter Rating */}
              <div>
                <label className="block text-xs font-bold text-pink-200 mb-2">
                  Spice / Drama Rating:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSpiceLevel(lvl)}
                      disabled={isPollLocked}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                        spiceLevel >= lvl
                          ? 'bg-rose-600 border-white text-white shadow-md'
                          : 'bg-black/30 border-pink-400/20 text-pink-300/60'
                      }`}
                    >
                      🌶️ {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-200 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Submit Vote Button */}
          {!isPollLocked && (
            <button
              id="btn-submit-vote"
              type="submit"
              disabled={isSubmitting || !selectedOptionId}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 border-2 ${
                selectedOptionId
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 border-white text-white shadow-rose-950/60 cursor-pointer transform hover:scale-[1.01]'
                  : 'bg-rose-950/50 border-rose-900/50 text-pink-300/40 cursor-not-allowed'
              }`}
            >
              <Mail className="w-5 h-5" />
              <span>
                {hasVoted 
                  ? 'Update My Sealed Vote in Envelope' 
                  : 'Seal & Submit My Official Vote'}
              </span>
            </button>
          )}
        </form>

        {/* Sealed VIP Matchmaker Confirmation Card */}
        {hasVoted && (
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#800f2f] to-[#4c0519] border-2 border-white shadow-2xl text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="mx-auto w-12 h-12 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center mb-3 shadow-lg animate-heart-thump">
                <Heart className="w-6 h-6 text-rose-600 fill-rose-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold font-matched text-white uppercase tracking-wider matched-3d-text">
                Your Vote is Sealed in the Red Envelope!
              </h4>
              <p className="text-xs text-pink-100 mt-1 max-w-md mx-auto">
                Nominated: <span className="font-bold text-white font-display text-sm underline">{selectedOption?.label}</span>
              </p>
              {hotTakeInput && (
                <div className="mt-3 p-3 rounded-xl bg-black/40 border border-pink-300/30 text-xs italic text-pink-100 max-w-lg mx-auto">
                  "{hotTakeInput}"
                </div>
              )}
              <div className="mt-3 text-[11px] font-mono text-pink-200">
                Audience Ticket: #JAB-WE-MATCHED-VOTE-{(activePoll.id).substring(0, 6)} • Keep watching the stage screen!
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Nominate New Option Modal */}
      {showAddOptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#800f2f] to-[#4c0519] border-2 border-white p-6 shadow-2xl text-white">
            <h3 className="text-xl font-bold font-display mb-1">Nominate a New Couple</h3>
            <p className="text-xs text-pink-200 mb-4">
              Add a custom couple or dramatic twist option to tonight's live ballot!
            </p>

            <form onSubmit={handleCreateOption} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-pink-200 mb-1">
                  Couple / Option Name:
                </label>
                <input
                  id="input-nominee-label"
                  type="text"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="e.g. Sid & Kiara (Table 3)"
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-pink-300/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pink-200 mb-1">
                  Description / Match Reason:
                </label>
                <input
                  id="input-nominee-desc"
                  type="text"
                  value={newOptionDesc}
                  onChange={(e) => setNewOptionDesc(e.target.value)}
                  placeholder="Why should the 700 spectators vote for them?"
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-pink-300/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
                />
              </div>

              {newOptionError && (
                <div className="text-xs text-red-300 font-medium">
                  {newOptionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOptionModal(false)}
                  className="px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-bold text-pink-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingOption}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-xs font-bold text-white border border-white shadow-md hover:from-red-500 hover:to-rose-500"
                >
                  {isAddingOption ? 'Adding...' : 'Add to Ballot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
