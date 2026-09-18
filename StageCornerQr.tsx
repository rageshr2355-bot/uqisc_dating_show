import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { usePollContext } from './PollContext';
import { QrCode, X, Maximize2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function StageCornerQr() {
  const { 
    showStageCornerQr, 
    setShowStageCornerQr, 
    joinUrl, 
    setIsQrModalOpen 
  } = usePollContext();

  const [miniQrUrl, setMiniQrUrl] = useState<string>('');

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      width: 256,
      margin: 1,
      color: {
        dark: '#1e050c',
        light: '#ffffff',
      },
    })
      .then((url) => setMiniQrUrl(url))
      .catch((err) => console.error('Corner QR error:', err));
  }, [joinUrl]);

  if (!showStageCornerQr) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className="fixed bottom-6 left-6 z-40 p-2.5 rounded-2xl bg-gradient-to-br from-[#590d22] to-[#2b050f] border-2 border-white/80 shadow-2xl backdrop-blur-md flex items-center gap-3 text-white cursor-pointer group hover:border-pink-300 transition-all"
        onClick={() => setIsQrModalOpen(true)}
        title="Click to view full-screen join QR code"
      >
        {/* Real Mini Scannable QR */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-xl shadow-md flex-shrink-0 flex items-center justify-center">
          {miniQrUrl ? (
            <img src={miniQrUrl} alt="Scan to join" className="w-full h-full object-contain rounded-lg" />
          ) : (
            <QrCode className="w-8 h-8 text-rose-900 animate-pulse" />
          )}
          <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-rose-600 flex items-center justify-center pointer-events-none">
            <Heart className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        </div>

        {/* Text Call to Action */}
        <div className="flex flex-col text-left pr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-pink-300">
              AUDIENCE LIVE
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black font-display text-white tracking-tight">
            SCAN TO VOTE
          </span>
          <span className="text-[10px] text-pink-200/80 flex items-center gap-1 mt-0.5 font-medium">
            <span>Tap for full view</span>
            <Maximize2 className="w-2.5 h-2.5 text-pink-300" />
          </span>
        </div>

        {/* Dismiss Corner Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowStageCornerQr(false);
          }}
          className="self-start p-1 rounded-full bg-black/40 hover:bg-black/70 text-pink-300 hover:text-white transition-colors"
          title="Dismiss corner badge"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
