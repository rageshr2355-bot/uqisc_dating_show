import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { usePollContext } from './PollContext';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  QrCode, 
  Heart, 
  Smartphone, 
  Sparkles, 
  RotateCcw,
  Sliders,
  Tv
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function JoinQrCodeModal() {
  const { 
    isQrModalOpen, 
    setIsQrModalOpen, 
    joinUrl, 
    setJoinUrl,
    showStageCornerQr,
    setShowStageCornerQr,
    publicWebsiteUrl,
    state
  } = usePollContext();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedWebsiteUrl, setCopiedWebsiteUrl] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [inputUrl, setInputUrl] = useState(joinUrl);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync inputUrl if joinUrl updates from outside
  useEffect(() => {
    setInputUrl(joinUrl);
  }, [joinUrl]);

  // Generate QR Code data URL whenever joinUrl changes
  useEffect(() => {
    if (!joinUrl) return;
    setIsGenerating(true);

    QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'H',
      width: 720,
      margin: 2,
      color: {
        dark: '#1e050c',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        setIsGenerating(false);
      });
  }, [joinUrl]);

  const handleCopyLink = async () => {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Could not copy link:', err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'jab-we-matched-join-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      setJoinUrl(inputUrl.trim());
      setIsCustomizing(false);
    }
  };

  const handleResetUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const defaultUrl = `${origin}${path}?view=audience`;
    setInputUrl(defaultUrl);
    setJoinUrl(defaultUrl);
  };

  return (
    <AnimatePresence>
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#800f2f] via-[#590d22] to-[#2b050f] border-[3px] border-white/90 p-5 sm:p-8 text-center shadow-2xl text-white my-auto"
          >
            {/* Close Button */}
            <button
              id="close-qr-code-modal"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-pink-200 hover:text-white transition-all border border-pink-400/20"
              title="Close QR Code View"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Brand */}
            <div className="flex items-center justify-center gap-1 text-xs font-script text-pink-200 tracking-widest mb-1">
              <Heart className="w-3.5 h-3.5 fill-pink-300 text-pink-300" />
              <span>jab we matched</span>
              <Heart className="w-3.5 h-3.5 fill-pink-300 text-pink-300" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black font-display text-pink-100">
              SCAN TO JOIN & VOTE
            </h3>

            {/* Zero Friction / No Sign-in Highlight */}
            <div className="mt-1 mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-200 border border-white text-rose-900 text-[11px] sm:text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-pink-300 animate-pulse" />
              <span>100% Free & Open • No Sign-In Required</span>
            </div>

            <p className="text-xs sm:text-sm text-pink-200/90 mb-4 max-w-sm mx-auto leading-relaxed">
              Open your phone camera to scan. No app download and no login needed — anyone can vote immediately!
            </p>

            {/* The Actual Real Scannable QR Code */}
            <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 p-3.5 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-rose-500/90 group">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-2 text-rose-900 font-bold text-sm">
                  <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
                  <span>Generating Code...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="Audience Join QR Code for Jab We Matched"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  {/* Subtle Center Heart Badge that doesn't disrupt scanner reading (QR Error Correction is High) */}
                  <div className="absolute inset-0 m-auto w-12 h-12 rounded-2xl bg-white p-1 shadow-lg flex items-center justify-center border-2 border-rose-600 pointer-events-none">
                    <div className="w-full h-full bg-gradient-to-tr from-rose-600 to-pink-500 rounded-xl flex items-center justify-center shadow-inner">
                      <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Error generating QR code</div>
              )}
            </div>

            {/* Quick Helper Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-pink-200">
              <span className="w-2 h-2 rounded-full bg-pink-300 animate-ping" />
              <span className="font-semibold text-rose-900">Live & Ready to Scan</span>
              <span>•</span>
              <span>Auditorium Session ({state.connectedAudienceCount} in Hall)</span>
            </div>

            {/* Join URL Display & Copy */}
            <div className="mt-4 p-2 sm:p-2.5 rounded-2xl bg-black/50 border border-pink-400/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 pl-2 overflow-hidden text-left min-w-0">
                <Smartphone className="w-4 h-4 text-pink-400 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-pink-100 truncate select-all">
                  {joinUrl}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  id="btn-copy-join-link"
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    copied 
                      ? 'bg-pink-200 text-white' 
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                  }`}
                  title="Copy Audience Join URL to Clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-pink-200 hover:text-white border border-pink-400/20 transition-all"
                  title="Test Link (Open in New Tab)"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Live Website URL Info Box */}
            <div className="mt-4 p-3 rounded-2xl bg-black/60 border border-pink-400/40 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                  🌐 Live Event Website URL
                </span>
                <span className="text-[10px] text-rose-900 font-medium">Public • Anyone Can Join</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/70 border border-pink-500/30">
                <span className="text-xs text-pink-100 truncate select-all">{publicWebsiteUrl}</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(publicWebsiteUrl);
                      }
                      setCopiedWebsiteUrl(true);
                      setTimeout(() => setCopiedWebsiteUrl(false), 2500);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-pink-900/60 hover:bg-pink-800 text-pink-100 text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                >
                  {copiedWebsiteUrl ? <Check className="w-3 h-3 text-rose-900" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWebsiteUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-pink-300/80">QR Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setJoinUrl(`${publicWebsiteUrl}?view=audience`);
                    setInputUrl(`${publicWebsiteUrl}?view=audience`);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-pink-400/30 text-pink-200 transition-colors"
                >
                  Public Cloud (Phones)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    setJoinUrl(`${origin}?view=audience`);
                    setInputUrl(`${origin}?view=audience`);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-black/50 hover:bg-black/80 border border-pink-400/30 text-pink-200 transition-colors"
                >
                  Current Browser
                </button>
              </div>
            </div>

            {/* Secondary Action Toolbar */}
            <div className="mt-4 pt-3 border-t border-rose-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  id="btn-download-join-qr"
                  onClick={handleDownloadQr}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-pink-200 hover:text-white font-medium transition-all"
                  title="Download High-Res PNG QR Code"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>

                <button
                  id="btn-toggle-custom-url"
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-pink-400/30 text-pink-200 hover:text-white font-medium transition-all"
                  title="Customize domain / URL for local router or custom shortlink"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isCustomizing ? 'Hide URL Setting' : 'Edit URL'}</span>
                </button>
              </div>

              {/* Pin on Stage Screen Toggle */}
              <button
                id="btn-toggle-stage-corner-qr"
                onClick={() => setShowStageCornerQr(!showStageCornerQr)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  showStageCornerQr
                    ? 'bg-amber-600/90 border-amber-300 text-white shadow-md'
                    : 'bg-black/40 hover:bg-black/60 border-pink-400/30 text-pink-300 hover:text-white'
                }`}
                title="Show or hide mini QR code in the corner of Stage screen"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{showStageCornerQr ? 'Corner QR: ON' : 'Pin to Stage'}</span>
              </button>
            </div>

            {/* Custom URL Drawer */}
            {isCustomizing && (
              <form onSubmit={handleApplyUrl} className="mt-3 p-3 rounded-2xl bg-black/60 border border-rose-500/40 text-left">
                <label className="block text-[11px] font-bold text-pink-200 uppercase tracking-wider mb-1">
                  Custom Spectator Join Address:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://your-domain.com?view=audience"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/80 border border-pink-400/40 text-white text-xs focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={handleResetUrl}
                    title="Reset to current browser domain"
                    className="p-1.5 rounded-xl bg-black/50 hover:bg-black/80 text-pink-300 border border-pink-400/30"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-pink-300/80 mt-1">
                  Tip: If presenting in an auditorium with local Wi-Fi IP or custom shortlink, paste it here to regenerate the QR code immediately.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
