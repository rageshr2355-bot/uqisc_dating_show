import React, { useState } from 'react';
import { usePollContext } from './PollContext';
import { JabWeMatchedBrand } from './JabWeMatchedBrand';
import { 
  Tv, 
  Smartphone, 
  Sliders, 
  Users, 
  Sparkles, 
  Check, 
  Radio,
  QrCode,
  Globe,
  Copy,
  ExternalLink,
  Mail
} from 'lucide-react';

export function Header() {
  const { 
    activeView, 
    setActiveView, 
    state,
    isConnected,
    isAdmin,
    setIsConfessionModalOpen,
    setIsQrModalOpen,
    publicWebsiteUrl,
    joinUrl
  } = usePollContext();

  const [copiedSite, setCopiedSite] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rose-800/50 bg-[#4c0519]/95 backdrop-blur-xl shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Event Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <JabWeMatchedBrand size="md" />
            
            <div className="hidden sm:flex flex-col ml-2 border-l border-rose-700/50 pl-2.5">
              <span className="text-[10px] font-black tracking-widest text-pink-300 uppercase flex items-center gap-1 font-mono">
                <Radio className="w-2.5 h-2.5 text-red-400 animate-pulse" /> LIVE STAGE POLL
              </span>
              <span className="text-[11px] text-pink-100 font-medium">
                Speed Dating & Matchmaking Special
              </span>
            </div>
          </div>

          {/* Quick Audience Counter for Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-pink-200 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-pink-300" />
              <span>{state.connectedAudienceCount} in Hall</span>
            </div>
          </div>
        </div>

        {/* Center View Selector Tabs — Stage & Host only ever render here
            once the admin passphrase has been entered on this device. A
            non-admin visitor (e.g. anyone who scanned the QR code) sees
            nothing here — no badge, no button, no way to reach the other
            views. */}
        {isAdmin && (
          <div className="flex items-center p-1 rounded-xl bg-[#30030a]/80 border border-pink-400/30 shadow-inner">
            <button
              id="tab-audience-view"
              onClick={() => setActiveView('audience')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeView === 'audience'
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-md shadow-rose-900/50'
                  : 'text-pink-200/80 hover:text-white hover:bg-rose-900/40'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Audience Pad</span>
            </button>

            <button
              id="tab-stage-view"
              onClick={() => setActiveView('stage')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeView === 'stage'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-red-600 text-white shadow-md shadow-amber-900/50'
                  : 'text-pink-200/80 hover:text-white hover:bg-rose-900/40'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Stage Big Screen</span>
            </button>

            <button
              id="tab-host-view"
              onClick={() => setActiveView('host')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeView === 'host'
                  ? 'bg-gradient-to-r from-purple-700 via-rose-600 to-pink-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-pink-200/80 hover:text-white hover:bg-rose-900/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Host Console</span>
            </button>
          </div>
        )}

        {/* Right Info, Profile & Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Active Audience Connection indicator (Designed for 700 spectators) */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#35040d]/90 border border-pink-400/30 text-pink-100 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <Users className="w-3.5 h-3.5 text-pink-300" />
            <span className="font-bold text-white text-sm">{state.connectedAudienceCount}</span>
            <span className="text-pink-200/80 text-[11px]">Spectators</span>
          </div>

          {/* Public Website URL Copy Button */}
          <button
            id="header-btn-copy-website"
            onClick={async () => {
              try {
                const urlToCopy = publicWebsiteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(urlToCopy);
                }
                setCopiedSite(true);
                setTimeout(() => setCopiedSite(false), 2500);
              } catch (e) {
                console.error(e);
              }
            }}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              copiedSite
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-black/40 hover:bg-black/70 border-pink-400/30 text-pink-200 hover:text-white'
            }`}
            title={`Copy Live Website URL (${publicWebsiteUrl})`}
          >
            {copiedSite ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5 text-pink-300" />}
            <span>{copiedSite ? 'Site Copied!' : 'Website Link'}</span>
          </button>

          {/* Join QR Code Button */}
          <button
            id="header-btn-qr-code"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/70 border border-pink-400/40 text-pink-200 hover:text-white text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
            title="Show Spectator Join QR Code for Mobile Phones"
          >
            <QrCode className="w-3.5 h-3.5 text-pink-300" />
            <span className="hidden sm:inline">Join QR</span>
          </button>

          {/* Anonymous Confession Button — visible to everyone, no admin needed */}
          <button
            id="header-btn-confessions"
            onClick={() => setIsConfessionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/70 border border-pink-400/40 text-pink-200 hover:text-white text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
            title="Send an anonymous confession"
          >
            <Mail className="w-3.5 h-3.5 text-pink-300" />
            <span className="hidden sm:inline">Confessions</span>
          </button>

        </div>
      </div>
    </header>
  );
}
