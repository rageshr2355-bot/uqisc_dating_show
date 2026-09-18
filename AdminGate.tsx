import React, { useState } from 'react';
import { usePollContext } from './PollContext';
import { JabWeMatchedBrand, LaceCornerDecoration } from './JabWeMatchedBrand';
import { Lock, Tv, Sliders, Smartphone, AlertCircle, KeyRound } from 'lucide-react';

export function AdminGate({ view }: { view: 'stage' | 'host' }) {
  const { loginAdmin, setActiveView } = usePollContext();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const viewLabel = view === 'stage' ? 'Stage Screen' : 'Host Console';
  const ViewIcon = view === 'stage' ? Tv : Sliders;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const success = await loginAdmin(passphrase.trim());
    setIsSubmitting(false);
    if (!success) {
      setError('Incorrect admin passphrase. Please try again.');
      setPassphrase('');
    }
  };

  const goToAudiencePad = () => {
    setActiveView('audience');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'audience');
      window.history.replaceState(null, '', url.toString());
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative min-h-[90vh] bg-quatrefoil flex items-center justify-center p-4 overflow-hidden">
      <LaceCornerDecoration position="top-left" />
      <LaceCornerDecoration position="top-right" />
      <LaceCornerDecoration position="bottom-left" />
      <LaceCornerDecoration position="bottom-right" />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-[#800f2f] via-[#590d22] to-[#2b050f] border-2 border-white/90 p-6 sm:p-8 shadow-2xl text-center text-white">
        <div className="flex justify-center mb-3">
          <JabWeMatchedBrand size="md" />
        </div>

        <div className="mx-auto w-14 h-14 rounded-2xl bg-black/40 border border-pink-400/40 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-pink-200" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-pink-400/30 text-pink-200 text-[11px] font-bold uppercase tracking-wider mb-3">
          <ViewIcon className="w-3.5 h-3.5" />
          <span>{viewLabel} · Admin Only</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black font-display text-pink-100 mb-2">
          Enter Admin Passphrase
        </h2>
        <p className="text-xs sm:text-sm text-pink-200/90 mb-5 max-w-sm mx-auto leading-relaxed">
          The {viewLabel} controls the live show for every device in the room, so it's locked to the
          event host. Enter the shared passphrase to continue — it's shown in your server's
          startup logs (or whatever you set <code className=" text-pink-100">ADMIN_KEY</code> to).
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <label className="block text-[11px] font-bold text-pink-200 uppercase tracking-wider">
            Passphrase
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/50 border border-pink-300/40 focus-within:border-pink-300 focus-within:ring-1 focus-within:ring-pink-300">
            <KeyRound className="w-4 h-4 text-pink-300 flex-shrink-0" />
            <input
              id="input-admin-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              autoFocus
              className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-pink-300/40"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="btn-admin-login"
            type="submit"
            disabled={isSubmitting || !passphrase.trim()}
            className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg border-2 ${
              passphrase.trim()
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 border-white text-white cursor-pointer transform hover:scale-[1.01]'
                : 'bg-rose-950/50 border-rose-900/50 text-pink-300/40 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Checking...' : `Unlock ${viewLabel}`}
          </button>
        </form>

        <button
          type="button"
          onClick={goToAudiencePad}
          className="mt-5 flex items-center gap-1.5 mx-auto text-xs text-pink-300/80 hover:text-white transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Not the host? Go to the Audience Pad instead</span>
        </button>
      </div>
    </div>
  );
}
