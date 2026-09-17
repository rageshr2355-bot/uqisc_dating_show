import React, { useState } from 'react';
import { usePollContext } from './PollContext';
import { X, Mail, Send, CheckCircle2, AlertCircle, EyeOff } from 'lucide-react';

const MAX_LENGTH = 300;

export function ConfessionModal() {
  const { isConfessionModalOpen, setIsConfessionModalOpen, submitConfession } = usePollContext();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isConfessionModalOpen) return null;

  const close = () => {
    setIsConfessionModalOpen(false);
    // Reset a beat after the close animation so it doesn't flash while closing
    setTimeout(() => {
      setText('');
      setJustSubmitted(false);
      setErrorMessage(null);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    const success = await submitConfession(trimmed);
    setIsSubmitting(false);
    if (success) {
      setJustSubmitted(true);
      setText('');
    } else {
      setErrorMessage("Couldn't send that — check your connection and try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto rounded-3xl bg-gradient-to-b from-[#800f2f] via-[#5c0a1f] to-[#3a040e] border-[3px] border-white shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pink-300/30 bg-[#420412]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center shadow-md">
              <Mail className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-[11px] font-script text-pink-200 tracking-wider">
                totally anonymous • no name attached
              </div>
              <h2 className="text-lg sm:text-xl font-black font-matched tracking-wider uppercase matched-3d-text">
                Anonymous Confession
              </h2>
            </div>
          </div>

          <button
            id="btn-close-confession-modal"
            type="button"
            onClick={close}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 border border-pink-400/30 text-pink-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {justSubmitted ? (
            <div className="text-center py-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-400/40 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-300" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wide text-pink-100 mb-2">
                Sent to the envelope
              </h3>
              <p className="text-sm text-pink-200/90 mb-6 max-w-sm mx-auto leading-relaxed">
                Your confession is anonymous and now with the host for review — approved ones show up
                live on the big screen without any name attached.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setJustSubmitted(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-pink-300/30 text-pink-100 text-sm font-bold transition-colors"
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 border-2 border-white text-white text-sm font-black uppercase tracking-wide transition-transform hover:scale-[1.02]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-black/30 border border-pink-400/20 text-pink-200/90 text-xs leading-relaxed">
                <EyeOff className="w-4 h-4 flex-shrink-0 mt-0.5 text-pink-300" />
                <span>
                  No name, no login, nothing that identifies you is collected. The host reviews every
                  confession before it's shown — nothing posts automatically.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-pink-200 uppercase tracking-wider mb-1.5">
                  Your confession
                </label>
                <textarea
                  id="input-confession-text"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                  placeholder="Spill it... a secret crush, a red flag you spotted tonight, anything goes"
                  rows={4}
                  autoFocus
                  className="w-full px-3.5 py-3 rounded-xl bg-black/50 border border-pink-300/40 focus:border-pink-300 focus:ring-1 focus:ring-pink-300 text-white text-sm placeholder:text-pink-300/40 focus:outline-none resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-pink-300/60 font-mono">
                    {text.length}/{MAX_LENGTH}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                id="btn-submit-confession"
                type="submit"
                disabled={isSubmitting || !text.trim()}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg border-2 ${
                  text.trim()
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 border-white text-white cursor-pointer transform hover:scale-[1.01]'
                    : 'bg-rose-950/50 border-rose-900/50 text-pink-300/40 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending...' : 'Send Anonymously'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
