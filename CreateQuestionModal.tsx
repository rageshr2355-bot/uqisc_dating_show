import React, { useState } from 'react';
import { usePollContext } from './PollContext';
import { PollCategory } from './types';
import { JAB_WE_MATCHED_PRESETS, QuestionTemplate } from './questionBank';
import { 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  HelpCircle, 
  Heart, 
  Flame, 
  Check, 
  Send,
  BookOpen,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';

export function CreateQuestionModal() {
  const { 
    isCreateQuestionOpen, 
    setIsCreateQuestionOpen, 
    createNewPoll, 
    voterName,
    activeView
  } = usePollContext();

  const [activeTab, setActiveTab] = useState<'bank' | 'custom'>('bank');

  // Custom Form State
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState<PollCategory>('drama');
  const [newCategoryLabel, setNewCategoryLabel] = useState('🚩 RED FLAG OR BOLLYWOOD ROMANCE?');
  const [requiresInput, setRequiresInput] = useState(true);
  const [inputPrompt, setInputPrompt] = useState('Spectator Hot Take Required: State your reasoning for this vote');
  const [allowAudienceOptions, setAllowAudienceOptions] = useState(true);

  const [options, setOptions] = useState<
    { label: string; description: string; tag: string; requiresWriteIn: boolean }[]
  >([
    { label: '', description: '', tag: 'Match Option 1', requiresWriteIn: false },
    { label: '', description: '', tag: 'Match Option 2', requiresWriteIn: false },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isCreateQuestionOpen) return null;

  const handleCategoryChange = (cat: PollCategory) => {
    setNewCategory(cat);
    switch (cat) {
      case 'hideaway':
        setNewCategoryLabel('💌 THE RED ENVELOPE MATCH');
        break;
      case 'drama':
        setNewCategoryLabel('🚩 RED FLAG OR BOLLYWOOD ROMANCE?');
        break;
      case 'recoupling':
        setNewCategoryLabel('⚡ WILDCARD MATCHMAKER CEREMONY');
        break;
      case 'dumping':
        setNewCategoryLabel('💔 FRIENDZONE OR REALITY CHECK');
        break;
      case 'truth_or_dare':
        setNewCategoryLabel('💘 SOULMATE COMPATIBILITY TEST');
        break;
      default:
        setNewCategoryLabel('💌 JAB WE MATCHED BALLOT');
    }
  };

  const handleAddOptionField = () => {
    if (options.length >= 8) return;
    setOptions([
      ...options,
      { label: '', description: '', tag: `Option ${options.length + 1}`, requiresWriteIn: false },
    ]);
  };

  const handleRemoveOptionField = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (
    index: number,
    field: 'label' | 'description' | 'tag' | 'requiresWriteIn',
    value: unknown
  ) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  // Quick Option Templates
  const applyQuickTemplate = (templateType: 'binary_flag' | 'yes_no' | 'three_tier') => {
    if (templateType === 'binary_flag') {
      setNewCategory('drama');
      setNewCategoryLabel('🚩 RED FLAG OR BOLLYWOOD ROMANCE?');
      setOptions([
        { label: 'Major Red Flag 🚩 Instant Dealbreaker', description: 'Zero excuses; not acceptable in 2026', tag: 'Red Flag 🚩', requiresWriteIn: false },
        { label: 'Green Flag 🟢 Pure Romance / Harmless', description: 'Cute, vulnerable, or totally justified', tag: 'Green Flag 🟢', requiresWriteIn: false },
        { label: 'Audience Write-In: Your Spicy Verdict', description: 'Tell the stage hosts your verdict', tag: 'Write-In ✍️', requiresWriteIn: true },
      ]);
    } else if (templateType === 'yes_no') {
      setNewCategory('truth_or_dare');
      setNewCategoryLabel('💘 AUDIENCE TRUTH OR DARE');
      setOptions([
        { label: 'YES! 💯 Absolutely 100%', description: 'The audience stands firmly behind this choice', tag: 'Approved 💖', requiresWriteIn: false },
        { label: 'NO! 🙅 Strictly Forbidden', description: 'Under no circumstances should this happen', tag: 'Denied 🛑', requiresWriteIn: false },
      ]);
    } else if (templateType === 'three_tier') {
      setNewCategory('recoupling');
      setNewCategoryLabel('⚡ WILDCARD MATCHMAKER CEREMONY');
      setOptions([
        { label: 'Option A: Slow Burn Besties', description: 'Long-term trust and comforting energy', tag: 'Slow Burn 💕', requiresWriteIn: false },
        { label: 'Option B: Electric Sparks & Banter', description: 'High chemistry, thrilling unpredictability', tag: 'Spicy Sparks 🔥', requiresWriteIn: false },
        { label: 'Option C: Neither (Friendzone)', description: 'Better off as friendly study buddies', tag: 'Friendzone 💔', requiresWriteIn: false },
      ]);
    }
  };

  // Load Preset from Question Bank
  const handleSelectPreset = (preset: QuestionTemplate, launchImmediately = false) => {
    setNewTitle(preset.title);
    setNewPrompt(preset.prompt);
    setNewCategory(preset.category);
    setNewCategoryLabel(preset.categoryLabel);
    setRequiresInput(preset.requiresVoterInput);
    setInputPrompt(preset.inputPromptText);
    setAllowAudienceOptions(preset.allowAudienceOptions);
    setOptions(
      preset.options.map((o) => ({
        label: o.label,
        description: o.description || '',
        tag: o.tag || 'Nominee',
        requiresWriteIn: Boolean(o.requiresWriteIn),
      }))
    );

    if (launchImmediately) {
      handleDirectLaunch(preset);
    } else {
      setActiveTab('custom');
    }
  };

  const handleDirectLaunch = async (preset: QuestionTemplate) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const success = await createNewPoll({
      title: preset.title,
      prompt: preset.prompt,
      category: preset.category,
      categoryLabel: preset.categoryLabel,
      requiresVoterInput: preset.requiresVoterInput,
      inputPromptText: preset.inputPromptText,
      allowAudienceOptions: preset.allowAudienceOptions,
      options: preset.options,
    });

    setIsSubmitting(false);
    if (success) {
      setIsCreateQuestionOpen(false);
    } else {
      setErrorMessage('Failed to launch question. Please try again.');
    }
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMessage('Please enter a question title');
      return;
    }

    const validOptions = options.filter((o) => o.label.trim().length > 0);
    if (validOptions.length < 2) {
      setErrorMessage('At least 2 options with labels are required to create a ballot');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const success = await createNewPoll({
      title: newTitle.trim(),
      prompt: newPrompt.trim() || `Submitted live by spectator ${voterName}! Cast your official vote.`,
      category: newCategory,
      categoryLabel: newCategoryLabel,
      requiresVoterInput: requiresInput,
      inputPromptText: inputPrompt.trim(),
      allowAudienceOptions,
      options: validOptions,
    });

    setIsSubmitting(false);
    if (success) {
      setIsCreateQuestionOpen(false);
      // Reset form
      setNewTitle('');
      setNewPrompt('');
      setOptions([
        { label: '', description: '', tag: 'Option 1', requiresWriteIn: false },
        { label: '', description: '', tag: 'Option 2', requiresWriteIn: false },
      ]);
    } else {
      setErrorMessage('Failed to create question. Please verify your connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto rounded-3xl bg-gradient-to-b from-[#800f2f] via-[#5c0a1f] to-[#3a040e] border-[3px] border-white shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pink-300/30 bg-[#420412]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-rose-600 fill-rose-600 animate-heart-thump" />
            </div>
            <div>
              <div className="text-[11px] font-script text-pink-200 tracking-wider">
                uqisc presents • live audience stage interactive
              </div>
              <h2 className="text-lg sm:text-xl font-black font-matched tracking-wider uppercase matched-3d-text">
                Add Live Show Question
              </h2>
            </div>
          </div>

          <button
            id="btn-close-create-question-modal"
            type="button"
            onClick={() => setIsCreateQuestionOpen(false)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 border border-pink-400/30 text-pink-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Curated Bank vs Custom Builder */}
        <div className="flex items-center p-2 bg-[#2d030b] border-b border-pink-400/20 gap-2">
          <button
            id="tab-select-question-bank"
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              activeTab === 'bank'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md border border-white'
                : 'text-pink-300/70 hover:text-white hover:bg-black/30'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Preset Question Bank ({JAB_WE_MATCHED_PRESETS.length})</span>
          </button>

          <button
            id="tab-select-custom-builder"
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              activeTab === 'custom'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md border border-white'
                : 'text-pink-300/70 hover:text-white hover:bg-black/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Question</span>
          </button>
        </div>

        {/* TAB 1: PRESET QUESTION BANK */}
        {activeTab === 'bank' && (
          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-3">
            <p className="text-xs text-pink-200/90 font-medium">
              Pick a ready-to-air Bollywood or speed-dating dilemma. You can broadcast it straight to the 700 spectators or customize its options:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {JAB_WE_MATCHED_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="p-4 rounded-2xl bg-black/40 border border-pink-400/30 hover:border-pink-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-pink-200 border border-pink-400/40 font-mono">
                        {preset.categoryLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-pink-300 font-mono">
                        {preset.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base font-display">
                      {preset.title}
                    </h3>
                    <p className="text-xs text-pink-200/80 line-clamp-1 mt-0.5">
                      {preset.prompt}
                    </p>
                    <div className="text-[11px] text-pink-300/70 font-mono mt-1">
                      {preset.options.length} Candidate Choices • Hot Take Required
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      id={`btn-customize-preset-${preset.id}`}
                      onClick={() => handleSelectPreset(preset, false)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-pink-200 text-xs font-bold"
                    >
                      Edit & Customize
                    </button>
                    <button
                      type="button"
                      id={`btn-launch-preset-${preset.id}`}
                      onClick={() => handleDirectLaunch(preset)}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 border border-white text-white text-xs font-black uppercase tracking-wider shadow-md"
                    >
                      Launch to Stage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM QUESTION BUILDER */}
        {activeTab === 'custom' && (
          <form onSubmit={handleSubmitCustom} className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-4">
            {/* Quick Templates Buttons */}
            <div>
              <label className="block text-xs font-bold text-pink-200 mb-1.5 font-mono uppercase">
                Quick Option Formats:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('binary_flag')}
                  className="px-2.5 py-1 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-[11px] font-bold text-pink-200"
                >
                  🚩 Red Flag vs Green Flag
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('yes_no')}
                  className="px-2.5 py-1 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-[11px] font-bold text-pink-200"
                >
                  💘 Simple Yes / No
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('three_tier')}
                  className="px-2.5 py-1 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-[11px] font-bold text-pink-200"
                >
                  ⚡ Couple Dilemma (3 Choices)
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-pink-200 mb-1 font-mono uppercase">
                Segment / Category:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['drama', 'hideaway', 'recoupling', 'dumping', 'truth_or_dare'] as PollCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold font-mono transition-all text-center ${
                      newCategory === cat
                        ? 'bg-white text-rose-950 border-white shadow-md'
                        : 'bg-black/30 border-pink-400/20 text-pink-200 hover:bg-black/50'
                    }`}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-pink-200 mb-1">
                Question / Dilemma Title:
              </label>
              <input
                id="input-new-question-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Which speed-dating couple had the best on-stage chemistry tonight?"
                maxLength={140}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-pink-300/40 text-white placeholder-pink-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                required
                autoFocus
              />
              <div className="text-[11px] text-pink-300/60 font-mono text-right mt-0.5">
                {newTitle.length}/140 chars
              </div>
            </div>

            {/* Context / Prompt */}
            <div>
              <label className="block text-xs font-bold text-pink-200 mb-1">
                Context / Instructions for Spectators:
              </label>
              <input
                id="input-new-question-prompt"
                type="text"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="e.g. 700 spectators in the auditorium decide who unseals the grand prize date!"
                maxLength={200}
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-pink-300/40 text-white placeholder-pink-300/40 text-xs focus:outline-none focus:ring-1 focus:ring-pink-300"
              />
            </div>

            {/* Candidate Options Builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-pink-200 font-mono uppercase">
                <span>Ballot Options ({options.length}/8):</span>
                {options.length < 8 && (
                  <button
                    type="button"
                    id="btn-add-option-field"
                    onClick={handleAddOptionField}
                    className="flex items-center gap-1 text-pink-100 hover:text-white underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Option</span>
                  </button>
                )}
              </div>

              {options.map((opt, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-pink-400/25 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-800 border border-white text-white flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                      placeholder={`Option ${idx + 1} Name (e.g. Aryan & Simran)`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-pink-300/30 text-white text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={opt.tag}
                      onChange={(e) => handleOptionChange(idx, 'tag', e.target.value)}
                      placeholder="Tag (e.g. Best Match 💕)"
                      className="w-32 px-2.5 py-1.5 rounded-xl bg-black/50 border border-pink-300/30 text-white text-[11px]"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionField(idx)}
                        className="p-1.5 rounded-lg text-rose-300 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.description}
                      onChange={(e) => handleOptionChange(idx, 'description', e.target.value)}
                      placeholder="Bio / description for this choice (optional)"
                      className="flex-1 px-3 py-1 rounded-xl bg-black/50 border border-pink-300/20 text-white text-xs"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-pink-200 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={opt.requiresWriteIn}
                        onChange={(e) => handleOptionChange(idx, 'requiresWriteIn', e.target.checked)}
                        className="rounded border-pink-300 text-rose-600 focus:ring-0"
                      />
                      <span>Audience Write-In</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Voting Settings */}
            <div className="p-3.5 rounded-2xl bg-black/35 border border-pink-400/20 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-pink-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresInput}
                  onChange={(e) => setRequiresInput(e.target.checked)}
                  className="rounded border-pink-300 text-rose-600 focus:ring-0"
                />
                <span>Require Spectators to Provide Spicy Hot Take / Reasoning</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-pink-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowAudienceOptions}
                  onChange={(e) => setAllowAudienceOptions(e.target.checked)}
                  className="rounded border-pink-300 text-rose-600 focus:ring-0"
                />
                <span>Allow 700 Spectators to Nominate Additional Write-in Options Live</span>
              </label>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-300/20">
              <button
                type="button"
                onClick={() => setIsCreateQuestionOpen(false)}
                className="px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-bold text-pink-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-created-question"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 border border-white text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Broadcasting...' : 'Launch Question on Air'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
