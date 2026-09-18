import React, { useState, useEffect } from 'react';
import { usePollContext } from './PollContext';
import { PollCategory, PollOption } from './types';
import { 
  X, 
  Trash2, 
  Sparkles, 
  Tag, 
  ImageOff, 
  Image as ImageIcon, 
  Check, 
  Save, 
  Plus, 
  AlertCircle,
  HelpCircle,
  Users
} from 'lucide-react';

export function EditQuestionModal() {
  const { 
    isEditQuestionOpen, 
    setIsEditQuestionOpen, 
    editingPoll, 
    updatePoll,
    removePfps
  } = usePollContext();

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<PollCategory>('drama');
  const [categoryLabel, setCategoryLabel] = useState('🚩 RED FLAG OR BOLLYWOOD ROMANCE?');
  const [requiresVoterInput, setRequiresVoterInput] = useState(true);
  const [inputPromptText, setInputPromptText] = useState('');
  const [allowAudienceOptions, setAllowAudienceOptions] = useState(true);
  
  const [options, setOptions] = useState<
    Array<{
      id?: string;
      label: string;
      description?: string;
      avatarUrl?: string;
      tag?: string;
      requiresWriteIn?: boolean;
      votes?: number;
    }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state whenever editingPoll changes or modal opens
  useEffect(() => {
    if (editingPoll) {
      setTitle(editingPoll.title || '');
      setPrompt(editingPoll.prompt || '');
      setCategory(editingPoll.category || 'drama');
      setCategoryLabel(editingPoll.categoryLabel || '💌 JAB WE MATCHED BALLOT');
      setRequiresVoterInput(Boolean(editingPoll.requiresVoterInput));
      setInputPromptText(editingPoll.inputPromptText || 'Add a comment for the big screen');
      setAllowAudienceOptions(Boolean(editingPoll.allowAudienceOptions));
      setOptions(
        editingPoll.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          description: opt.description || '',
          avatarUrl: opt.avatarUrl || '',
          tag: opt.tag || '',
          requiresWriteIn: Boolean(opt.requiresWriteIn),
          votes: opt.votes || 0,
        }))
      );
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [editingPoll, isEditQuestionOpen]);

  if (!isEditQuestionOpen || !editingPoll) return null;

  const handleCategoryChange = (cat: PollCategory) => {
    setCategory(cat);
    switch (cat) {
      case 'hideaway':
        setCategoryLabel('💌 THE RED ENVELOPE MATCH');
        break;
      case 'drama':
        setCategoryLabel('🚩 RED FLAG OR BOLLYWOOD ROMANCE?');
        break;
      case 'recoupling':
        setCategoryLabel('⚡ WILDCARD MATCHMAKER CEREMONY');
        break;
      case 'dumping':
        setCategoryLabel('💔 FRIENDZONE OR REALITY CHECK');
        break;
      case 'truth_or_dare':
        setCategoryLabel('💘 SOULMATE COMPATIBILITY TEST');
        break;
      case 'wildcard':
        setCategoryLabel('✨ WILD DRAMA MATCHMAKING VERDICT');
        break;
      default:
        setCategoryLabel('💌 JAB WE MATCHED BALLOT');
    }
  };

  const handleOptionChange = (
    index: number,
    field: 'label' | 'description' | 'avatarUrl' | 'tag' | 'requiresWriteIn',
    value: string | boolean
  ) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const handleRemoveOptionPfp = (index: number) => {
    const updated = [...options];
    updated[index] = { ...updated[index], avatarUrl: '' };
    setOptions(updated);
  };

  const handleRemoveAllPfps = () => {
    const updated = options.map((opt) => ({
      ...opt,
      avatarUrl: '',
    }));
    setOptions(updated);
  };

  const handleAddOption = () => {
    setOptions([
      ...options,
      {
        label: '',
        description: '',
        avatarUrl: '',
        tag: `Option ${options.length + 1}`,
        requiresWriteIn: false,
        votes: 0,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setErrorMessage('A poll question must have at least 2 options.');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Question title is required.');
      return;
    }

    const validOptions = options.filter((o) => o.label.trim().length > 0);
    if (validOptions.length < 2) {
      setErrorMessage('Please provide at least 2 options with labels.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const success = await updatePoll({
      pollId: editingPoll.id,
      title: title.trim(),
      prompt: prompt.trim() || 'Cast your live vote now!',
      category,
      categoryLabel,
      requiresVoterInput,
      inputPromptText: inputPromptText.trim(),
      allowAudienceOptions,
      options: validOptions.map((opt) => ({
        id: opt.id,
        label: opt.label.trim(),
        description: opt.description?.trim() || undefined,
        avatarUrl: opt.avatarUrl?.trim() || undefined,
        tag: opt.tag?.trim() || undefined,
        requiresWriteIn: Boolean(opt.requiresWriteIn),
        votes: opt.votes || 0,
      })),
    });

    setIsSubmitting(false);

    if (success) {
      setSuccessMessage('Question and ballot text updated successfully!');
      setTimeout(() => {
        setIsEditQuestionOpen(false);
      }, 700);
    } else {
      setErrorMessage('Failed to update question. Please try again.');
    }
  };

  const pfpCount = options.filter((o) => Boolean(o.avatarUrl && o.avatarUrl.trim())).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#800f2f] via-[#590d22] to-[#2b0008] border-2 border-white shadow-2xl text-white overflow-hidden my-auto">
        {/* Header */}
        <div className="relative p-5 sm:p-6 border-b border-pink-400/25 bg-black/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-950 border border-pink-400/40 text-[10px] font-bold uppercase text-pink-200">
                Host Backstage Editor
              </span>
              <span className="text-xs font-script text-pink-200">jab we matched</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-1">
              Edit Question & Ballot Text
            </h2>
            <p className="text-xs text-pink-200/90 mt-0.5">
              Modify the on-stage title, audience prompt, option labels, and manage candidate profile photos.
            </p>
          </div>

          <button
            id="btn-close-edit-modal"
            onClick={() => setIsEditQuestionOpen(false)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-pink-200 hover:text-white transition-colors border border-pink-300/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick PFP Strip Banner if any PFPs exist */}
          {pfpCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-400/40 flex items-center justify-between gap-3 flex-wrap shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <ImageOff className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-200">
                    {pfpCount} Profile Picture{pfpCount > 1 ? 's' : ''} Active on this Ballot
                  </div>
                  <div className="text-[11px] text-amber-100/80">
                    You can remove individual PFPs below or strip all of them in one click for a clean text ballot.
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-remove-all-pfps-edit"
                onClick={handleRemoveAllPfps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-700/80 hover:bg-red-600 text-white text-xs font-bold border border-white/50 transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove All PFPs</span>
              </button>
            </div>
          )}

          {/* Segment / Category */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-pink-200 uppercase tracking-wider">
              Show Segment / Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['hideaway', 'drama', 'recoupling', 'dumping', 'truth_or_dare', 'wildcard'] as PollCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left truncate ${
                    category === cat
                      ? 'bg-white text-rose-950 border-white shadow-md'
                      : 'bg-black/30 border-pink-400/20 text-pink-200 hover:bg-black/50'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Banner Title */}
          <div>
            <label className="block text-xs font-bold text-pink-200 mb-1">
              Banner Category Label (Displayed above Question):
            </label>
            <input
              type="text"
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-pink-300/30 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-pink-300"
              required
            />
          </div>

          {/* Question Title */}
          <div>
            <label className="block text-xs font-bold text-pink-200 mb-1">
              Question title:
            </label>
            <textarea
              id="edit-poll-title-input"
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Which couple deserves the grand candlelit date night?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-pink-300/40 text-white text-sm sm:text-base font-display font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300"
              required
            />
          </div>

          {/* Context / Prompt */}
          <div>
            <label className="block text-xs font-bold text-pink-200 mb-1">
              Question Context / Host Prompt for Audience:
            </label>
            <input
              id="edit-poll-prompt-input"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Explain the stakes or context of this decision..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-pink-300/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
            />
          </div>

          {/* Options & PFPs Management */}
          <div className="space-y-3 pt-2 border-t border-pink-400/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                  <span>Ballot Options ({options.length})</span>
                </h3>
                <p className="text-[11px] text-pink-200/80">
                  Edit candidate names, bios, badges, or remove/change their profile pictures.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {pfpCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveAllPfps}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-red-900/60 border border-pink-400/30 text-pink-200 hover:text-white text-[11px] font-semibold transition-all"
                  >
                    <ImageOff className="w-3 h-3 text-rose-400" />
                    <span>Strip All PFPs</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-add-option-in-edit"
                  onClick={handleAddOption}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-white text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Option</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {options.map((opt, idx) => {
                const hasPfp = Boolean(opt.avatarUrl && opt.avatarUrl.trim().length > 0);

                return (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-black/45 border border-pink-400/30 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-pink-400/15 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-700/80 text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-pink-100 font-display">
                          Option {idx + 1}
                        </span>
                        {typeof opt.votes === 'number' && opt.votes > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-black/60 border border-pink-500/30 text-[10px] text-pink-300">
                            {opt.votes} votes
                          </span>
                        )}
                      </div>

                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-950/60 hover:bg-red-800 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-bold transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Label and Tag */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-pink-200 mb-0.5">
                          Candidate Label / Option Name:
                        </label>
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                          placeholder="e.g. Kabir & Ananya"
                          className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-pink-300/40 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-pink-300"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-pink-200 mb-0.5">
                          Badge / Tag (Optional):
                        </label>
                        <input
                          type="text"
                          value={opt.tag || ''}
                          onChange={(e) => handleOptionChange(idx, 'tag', e.target.value)}
                          placeholder="e.g. Slow Burn 💕"
                          className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-pink-300/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[11px] font-bold text-pink-200 mb-0.5">
                        Description / Bio (Optional):
                      </label>
                      <input
                        type="text"
                        value={opt.description || ''}
                        onChange={(e) => handleOptionChange(idx, 'description', e.target.value)}
                        placeholder="Short explanation or funny back-story..."
                        className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-pink-300/30 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
                      />
                    </div>

                    {/* Profile Picture (PFP) Manager for Option */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-pink-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        {hasPfp ? (
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                              <img
                                src={opt.avatarUrl}
                                alt={opt.label || 'PFP'}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="absolute -bottom-1 -right-1 p-0.5 bg-pink-200 rounded-full text-[8px] text-white">
                              ✓
                            </span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-black/60 border border-pink-400/30 flex items-center justify-center flex-shrink-0 text-pink-300/60">
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-bold text-pink-100 flex items-center gap-1.5">
                            <span>Candidate Profile Picture (PFP)</span>
                            {hasPfp ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-pink-200 text-rose-900 border border-white">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/50 text-pink-300/80 border border-pink-500/30">
                                NO PFP
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-pink-200/70">
                            {hasPfp 
                              ? 'Profile picture is shown on audience ballots & stage cards' 
                              : 'Ballot renders text-only for this candidate'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {hasPfp ? (
                          <button
                            type="button"
                            id={`btn-remove-pfp-${idx}`}
                            onClick={() => handleRemoveOptionPfp(idx)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-800/80 hover:bg-red-700 text-white text-xs font-bold border border-white/60 shadow-sm transition-all"
                            title="Remove this profile picture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove PFP</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                            <input
                              type="url"
                              value={opt.avatarUrl || ''}
                              onChange={(e) => handleOptionChange(idx, 'avatarUrl', e.target.value)}
                              placeholder="Paste image URL..."
                              className="px-2.5 py-1 rounded-lg bg-black/60 border border-pink-400/30 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-pink-300 w-full sm:w-48"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voter Hot Take & Audience Permissions */}
          <div className="p-4 rounded-2xl bg-black/30 border border-pink-400/20 space-y-3">
            <h4 className="text-xs font-bold text-pink-100 uppercase tracking-wider">
              Audience Interaction Rules
            </h4>

            <label className="flex items-center gap-2.5 text-xs font-bold text-pink-200 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresVoterInput}
                onChange={(e) => setRequiresVoterInput(e.target.checked)}
                className="rounded border-pink-300 text-rose-600 focus:ring-0 w-4 h-4"
              />
              <span>Show an optional comment box (comments appear on the stage ticker)</span>
            </label>

            {requiresVoterInput && (
              <div>
                <label className="block text-[11px] font-bold text-pink-200 mb-1">
                  Comment box label (shown on phones):
                </label>
                <input
                  type="text"
                  value={inputPromptText}
                  onChange={(e) => setInputPromptText(e.target.value)}
                  placeholder="e.g. State your reasoning for this vote"
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-pink-300/30 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
                />
              </div>
            )}

            <label className="flex items-center gap-2.5 text-xs font-bold text-pink-200 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAudienceOptions}
                onChange={(e) => setAllowAudienceOptions(e.target.checked)}
                className="rounded border-pink-300 text-rose-600 focus:ring-0 w-4 h-4"
              />
              <span>Let the audience nominate extra options</span>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/90 border border-rose-500 text-rose-200 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-pink-200 border border-white text-rose-900 text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-pink-300/20">
            <button
              type="button"
              onClick={() => setIsEditQuestionOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-bold text-pink-200 border border-pink-500/20 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-save-question-changes"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-xs font-black text-white border-2 border-white shadow-lg shadow-rose-950/70 uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Live...' : 'Save & Broadcast Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
