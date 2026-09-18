import React, { useState, useEffect } from 'react';
import { usePollContext } from './PollContext';
import { PollOption } from './types';
import { JabWeMatchedBrand, LaceCornerDecoration } from './JabWeMatchedBrand';
import {
  PlusCircle,
  Lock,
  Trophy,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Heart,
  Mail,
  Check,
  Users,
  Clock,
} from 'lucide-react';

const HOT_TAKE_MAX = 240;

function WaitingScreen({ title, body }: { title: string; body: string }) {
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
        <h2 className="text-2xl font-bold font-display text-white mb-2">{title}</h2>
        <p className="text-sm text-pink-50/90 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export function AudienceView() {
  const { activePoll, myVotes, castVote, addAudienceOption, state, setIsConfessionModalOpen } = usePollContext();

  const currentVote = activePoll ? myVotes[activePoll.id] : undefined;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(currentVote?.optionId || null);
  const [hotTakeInput, setHotTakeInput] = useState<string>(currentVote?.userRequiredInput?.hotTake || '');
  const [showHotTake, setShowHotTake] = useState<boolean>(Boolean(currentVote?.userRequiredInput?.hotTake));
  const [writeInInput, setWriteInInput] = useState<string>(currentVote?.userRequiredInput?.customWriteIn || '');

  // Keep the form in step with the live question and this phone's recorded vote
  useEffect(() => {
    if (activePoll) {
      const vote = myVotes[activePoll.id];
      setSelectedOptionId(vote?.optionId || null);
      setHotTakeInput(vote?.userRequiredInput?.hotTake || '');
      setShowHotTake(Boolean(vote?.userRequiredInput?.hotTake));
      setWriteInInput(vote?.userRequiredInput?.customWriteIn || '');
      setValidationError(null);
    }
  }, [activePoll?.id, myVotes]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);

  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');
  const [newOptionError, setNewOptionError] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Phones only show a question once the host has pushed it to the stage.
  if (state.waitingScreenActive || !activePoll) {
    return (
      <WaitingScreen
        title="Hang tight"
        body="The next question will appear here as soon as it's up on the big screen."
      />
    );
  }

  const isPollLocked = activePoll.status === 'locked' || activePoll.status === 'revealed';
  const selectedOption = activePoll.options.find((o) => o.id === selectedOptionId);
  const hasVoted = Boolean(currentVote);
  const showResults = hasVoted || isPollLocked;

  const handleSelectOption = (option: PollOption) => {
    if (isPollLocked) return;
    setSelectedOptionId(option.id);
    setValidationError(null);
  };

  const handleCastVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId || !activePoll) return;

    if (selectedOption?.requiresWriteIn && !writeInInput.trim()) {
      setValidationError('Please enter the name for your write-in nominee.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    const success = await castVote(activePoll.id, selectedOptionId, {
      hotTake: hotTakeInput.trim() || undefined,
      customWriteIn: selectedOption?.requiresWriteIn ? writeInInput.trim() : undefined,
    });

    setIsSubmitting(false);
    if (!success) {
      setValidationError("Couldn't record your vote. Check your connection and try again.");
    }
  };

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionLabel.trim()) {
      setNewOptionError('Please enter a name');
      return;
    }

    setIsAddingOption(true);
    setNewOptionError(null);

    const success = await addAudienceOption({
      pollId: activePoll.id,
      label: newOptionLabel.trim(),
      description: newOptionDesc.trim() || undefined,
    });

    setIsAddingOption(false);
    if (success) {
      setNewOptionLabel('');
      setNewOptionDesc('');
      setShowAddOptionModal(false);
    } else {
      setNewOptionError("Couldn't add that nominee — you may have already nominated one, or voting is closed.");
    }
  };

  const percent = (option: PollOption) =>
    activePoll.totalVotes > 0 ? Math.round((option.votes / activePoll.totalVotes) * 100) : 0;

  return (
    <div className="relative min-h-[90vh] bg-quatrefoil py-6 px-3 sm:px-6 overflow-hidden">
      <LaceCornerDecoration position="top-left" />
      <LaceCornerDecoration position="top-right" />
      <LaceCornerDecoration position="bottom-left" />
      <LaceCornerDecoration position="bottom-right" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-5">
        {/* Question envelope */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#b91c1c] via-[#9f1239] to-[#580a14] border-[3px] border-white shadow-2xl p-5 sm:p-7 overflow-hidden text-center">
          <div
            className="absolute top-0 left-0 right-0 h-12 bg-[#881337]/90 border-b border-white/40"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
          />

          <div className="relative z-10 mx-auto w-10 h-10 -mt-1 mb-2 rounded-full bg-pink-100 border-2 border-white shadow-lg flex items-center justify-center animate-heart-thump">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
          </div>

          <div className="relative z-10 flex items-center justify-center gap-2 mb-3">
            <span className="font-script text-3xl sm:text-4xl text-white drop-shadow -rotate-2">jab we</span>
            <span className="font-matched text-3xl sm:text-5xl text-[#fbcfe8] tracking-widest matched-3d-text uppercase">MATCHED</span>
          </div>

          <div className="relative z-10 inline-flex items-center px-3 py-1 rounded-full bg-black/40 border border-pink-300/40 text-pink-200 text-[11px] font-bold uppercase tracking-wider mb-3">
            {activePoll.categoryLabel}
          </div>

          <h1 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-bold text-white font-display leading-snug drop-shadow-md max-w-xl mx-auto">
            {activePoll.title}
          </h1>

          {activePoll.prompt && (
            <p className="relative z-10 text-xs sm:text-sm text-pink-100/90 mt-2 max-w-lg mx-auto font-medium">{activePoll.prompt}</p>
          )}

          <div className="relative z-10 flex items-center justify-center gap-3 mt-4 text-xs text-pink-200">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20">
              <Users className="w-3.5 h-3.5 text-pink-300" />
              {state.connectedAudienceCount} in hall
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20">
              <Mail className="w-3.5 h-3.5 text-pink-300" />
              {activePoll.totalVotes} votes
            </span>
          </div>
        </div>

        {activePoll.status === 'locked' && (
          <div className="p-4 rounded-2xl bg-rose-950/90 border-2 border-pink-300 shadow-xl flex items-center gap-3 text-pink-100 animate-pulse">
            <div className="p-2 rounded-full bg-rose-800 border border-white">
              <Lock className="w-5 h-5 text-pink-200" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white font-display">Voting is closed</h4>
              <p className="text-xs text-pink-200">The envelope is sealed — watch the stage for the reveal.</p>
            </div>
          </div>
        )}

        {activePoll.status === 'revealed' && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-rose-900/90 to-amber-950/90 border-2 border-amber-300 shadow-xl text-center text-amber-100">
            <div className="inline-flex p-2 rounded-full bg-amber-400 text-rose-950 mb-2">
              <Trophy className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold font-display text-white">The winner is unsealed!</h4>
            <p className="text-xs text-pink-100 max-w-md mx-auto mt-1">Thanks for voting — check the stage for the result.</p>
          </div>
        )}

        {/* Ballot */}
        <form onSubmit={handleCastVote} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-pink-200 px-1 uppercase tracking-wider">
              <span>Pick one</span>
              {activePoll.allowAudienceOptions && !isPollLocked && (
                <button
                  type="button"
                  id="btn-open-nominate-modal"
                  onClick={() => setShowAddOptionModal(true)}
                  className="flex items-center gap-1 text-pink-100 hover:text-white underline font-semibold normal-case tracking-normal"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nominate someone</span>
                </button>
              )}
            </div>

            {activePoll.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isVotedThis = currentVote?.optionId === option.id;
              const isWinner = activePoll.status === 'revealed' && option.id === activePoll.winnerOptionId;

              return (
                <div
                  key={option.id}
                  id={`option-card-${option.id}`}
                  onClick={() => handleSelectOption(option)}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-red-800/95 to-rose-900/95 border-white shadow-xl ring-2 ring-pink-300'
                      : 'bg-[#3b040e]/90 border-pink-300/30 hover:border-pink-300/60 shadow-md'
                  } ${isPollLocked ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 flex-shrink-0">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isSelected ? 'bg-white border-white text-rose-700' : 'border-pink-300/50 bg-black/30'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>

                    {option.avatarUrl && (
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white flex-shrink-0 shadow-md">
                        <img src={option.avatarUrl} alt={option.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-white text-base sm:text-lg font-display leading-tight">{option.label}</h3>
                        {option.tag && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-900/70 border border-pink-400/40 text-pink-200">
                            {option.tag}
                          </span>
                        )}
                        {isVotedThis && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-200 text-rose-900">YOUR VOTE</span>
                        )}
                        {isWinner && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-rose-950 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> WINNER
                          </span>
                        )}
                      </div>

                      {option.description && (
                        <p className="text-xs sm:text-sm text-pink-200/90 leading-relaxed font-medium">{option.description}</p>
                      )}

                      {option.requiresWriteIn && isSelected && !isPollLocked && (
                        <div className="mt-3 pt-3 border-t border-pink-300/30" onClick={(e) => e.stopPropagation()}>
                          <label className="block text-xs font-bold text-pink-200 mb-1">Who are you nominating?</label>
                          <input
                            id="input-custom-write-in"
                            type="text"
                            value={writeInInput}
                            onChange={(e) => setWriteInInput(e.target.value)}
                            placeholder="e.g. Aryan & Simran from Table 6"
                            maxLength={60}
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-pink-400 text-white text-sm placeholder-pink-300/50 focus:outline-none focus:ring-1 focus:ring-pink-300"
                          />
                        </div>
                      )}

                      {showResults && (
                        <div className="mt-3 pt-2 border-t border-pink-300/20">
                          <div className="flex items-center justify-between text-xs font-bold text-pink-200 mb-1">
                            <span>{option.votes} votes</span>
                            <span>{percent(option)}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 via-rose-400 to-pink-300 transition-all duration-500"
                              style={{ width: `${percent(option)}%` }}
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

          {/* Optional comment for the stage ticker — only when the host enabled it for this question */}
          {activePoll.requiresVoterInput && !isPollLocked && (
            <div className="rounded-2xl bg-[#35040d]/90 border border-pink-300/30 shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHotTake((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-pink-100"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-300" />
                  {activePoll.inputPromptText || 'Add a comment for the big screen'}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-300/70">optional</span>
                </span>
                {showHotTake ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showHotTake && (
                <div className="px-4 pb-4">
                  <textarea
                    id="textarea-voter-hottake"
                    value={hotTakeInput}
                    onChange={(e) => setHotTakeInput(e.target.value)}
                    rows={3}
                    maxLength={HOT_TAKE_MAX}
                    placeholder="Keep it short — it may be shown on the stage screen."
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-pink-300/40 text-white placeholder-pink-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                  />
                  <div className="text-right text-[11px] text-pink-300/70 mt-1">
                    {hotTakeInput.length}/{HOT_TAKE_MAX}
                  </div>
                </div>
              )}
            </div>
          )}

          {validationError && (
            <div className="p-3.5 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {!isPollLocked && (
            <button
              id="btn-submit-vote"
              type="submit"
              disabled={isSubmitting || !selectedOptionId}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 border-2 ${
                selectedOptionId
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 border-white text-white shadow-rose-950/60 cursor-pointer'
                  : 'bg-rose-950/50 border-rose-900/50 text-pink-300/40 cursor-not-allowed'
              }`}
            >
              <Mail className="w-5 h-5" />
              <span>{isSubmitting ? 'Sending…' : hasVoted ? 'Change my vote' : 'Seal my vote'}</span>
            </button>
          )}
        </form>

        {hasVoted && (
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#800f2f] to-[#4c0519] border-2 border-white shadow-2xl text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center mb-3 shadow-lg animate-heart-thump">
              <Heart className="w-6 h-6 text-rose-600 fill-rose-600" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold font-display text-white">Your vote is sealed</h4>
            <p className="text-xs text-pink-100 mt-1">
              You picked <span className="font-bold text-white">{activePoll.options.find((o) => o.id === currentVote?.optionId)?.label}</span>
              {!isPollLocked && ' — you can change it until voting closes.'}
            </p>
          </div>
        )}

        {/* Anonymous confessions — send only; the list is host-curated and only ever shown on stage */}
        <div className="p-4 rounded-3xl bg-[#2b0309]/90 border border-pink-300/25 text-center">
          <p className="text-xs font-bold text-pink-200 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
            <Mail className="w-4 h-4 text-pink-300" />
            Got a confession?
          </p>
          <button
            type="button"
            onClick={() => setIsConfessionModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-300/40 text-pink-100 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send an anonymous confession</span>
          </button>
        </div>
      </div>

      {showAddOptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#800f2f] to-[#4c0519] border-2 border-white p-6 shadow-2xl text-white">
            <h3 className="text-xl font-bold font-display mb-1">Nominate someone</h3>
            <p className="text-xs text-pink-200 mb-4">Add a name to tonight's ballot. One nomination per person.</p>

            <form onSubmit={handleCreateOption} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-pink-200 mb-1">Name</label>
                <input
                  id="input-nominee-label"
                  type="text"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="e.g. Sid & Kiara (Table 3)"
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-pink-300/40 text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-300"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pink-200 mb-1">Why? (optional)</label>
                <input
                  id="input-nominee-desc"
                  type="text"
                  value={newOptionDesc}
                  onChange={(e) => setNewOptionDesc(e.target.value)}
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-pink-300/40 text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-300"
                />
              </div>

              {newOptionError && <div className="text-xs text-red-300 font-medium">{newOptionError}</div>}

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
                  {isAddingOption ? 'Adding…' : 'Add to ballot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
