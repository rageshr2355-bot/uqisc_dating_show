import React, { useState } from 'react';
import { usePollContext } from './PollContext';
import { JabWeMatchedBrand } from './JabWeMatchedBrand';
import { Tv, Sliders, Users, Check, Radio, QrCode, Globe } from 'lucide-react';

export function Header() {
  const {
    activeView,
    setActiveView,
    state,
    isConnected,
    isAdmin,
    setIsQrModalOpen,
    publicWebsiteUrl,
  } = usePollContext();

  const [copiedSite, setCopiedSite] = useState(false);

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
      active
        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-md shadow-rose-900/50'
        : 'text-pink-200/80 hover:text-white hover:bg-rose-900/40'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-rose-800/50 bg-[#4c0519]/95 backdrop-blur-xl shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <JabWeMatchedBrand size="md" />
          <div className="hidden sm:flex flex-col ml-2 border-l border-rose-700/50 pl-2.5">
            <span className="text-[10px] font-black tracking-widest text-pink-300 uppercase flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-red-400 animate-pulse" /> Live
            </span>
            <span className="text-[11px] text-pink-100 font-medium">Speed Dating & Matchmaking Special</span>
          </div>
        </div>

        {/* Stage / Host switcher — admins only. Audience phones never see a
            way to reach the other views. */}
        {isAdmin && (
          <div className="hidden md:flex items-center p-1 rounded-xl bg-[#30030a]/80 border border-pink-400/30 shadow-inner">
            <button id="tab-stage-view" onClick={() => setActiveView('stage')} className={tabClass(activeView === 'stage')}>
              <Tv className="w-3.5 h-3.5" />
              <span>Stage Screen</span>
            </button>
            <button id="tab-host-view" onClick={() => setActiveView('host')} className={tabClass(activeView === 'host')}>
              <Sliders className="w-3.5 h-3.5" />
              <span>Host Console</span>
            </button>
          </div>
        )}

        {/* Right: audience count + controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#35040d]/90 border border-pink-400/30 text-pink-100 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-pink-300 animate-pulse' : 'bg-amber-400'}`} />
            <Users className="w-3.5 h-3.5 text-pink-300" />
            <span className="font-bold text-white">{state.connectedAudienceCount}</span>
            <span className="hidden sm:inline text-pink-200/80">in hall</span>
          </div>

          {isAdmin && (
            <>
              <button
                id="header-btn-copy-website"
                onClick={async () => {
                  try {
                    const urlToCopy = publicWebsiteUrl || window.location.origin;
                    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(urlToCopy);
                    setCopiedSite(true);
                    setTimeout(() => setCopiedSite(false), 2500);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                  copiedSite
                    ? 'bg-pink-200 border-white text-rose-900'
                    : 'bg-black/40 hover:bg-black/70 border-pink-400/30 text-pink-200 hover:text-white'
                }`}
                title={`Copy audience link (${publicWebsiteUrl})`}
              >
                {copiedSite ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5 text-pink-300" />}
                <span>{copiedSite ? 'Copied!' : 'Audience Link'}</span>
              </button>

              <button
                id="header-btn-qr-code"
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/70 border border-pink-400/40 text-pink-200 hover:text-white text-xs font-bold transition-all shadow-sm"
                title="Show the join QR code"
              >
                <QrCode className="w-3.5 h-3.5 text-pink-300" />
                <span className="hidden sm:inline">Join QR</span>
              </button>
            </>
          )}

        </div>
      </div>
    </header>
  );
}
