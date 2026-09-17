import React from 'react';

interface BrandProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function JabWeMatchedBrand({ size = 'md', showSubtitle = true }: BrandProps) {
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2.5">
        {/* Compact Red Envelope Icon with Heart Seal */}
        <div className="relative w-9 h-7 rounded-md bg-gradient-to-br from-red-600 via-rose-600 to-rose-800 border border-white shadow-md flex items-center justify-center overflow-hidden">
          {/* Flap lines */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-red-700/80 border-b border-white/40 envelope-flap" />
          <div className="relative z-10 w-2.5 h-2.5 text-pink-200 fill-pink-200">
            <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-pink-200">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-script text-pink-300 -mb-1 leading-none tracking-wide">
            jab we
          </div>
          <div className="font-matched text-sm text-pink-100 tracking-wider matched-3d-text leading-tight">
            MATCHED
          </div>
        </div>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="relative mx-auto text-center py-4 px-6 max-w-lg">
        {/* Presenter label */}
        {showSubtitle && (
          <div className="text-sm font-script text-pink-200 mb-1 tracking-widest drop-shadow">
            uqisc presents...
          </div>
        )}

        {/* Big Envelope Box as in Poster — wrapped so the heart seal below
            can straddle the top edge without being clipped by this card's
            own overflow-hidden (needed for its rounded corners/flap). */}
        <div className="relative">
          <div className="relative rounded-2xl bg-gradient-to-b from-[#e11d48] to-[#9f1239] border-[3px] border-white shadow-2xl p-6 md:p-8 overflow-hidden">
            {/* Triangular flap highlight */}
            <div 
              className="absolute top-0 left-0 right-0 h-16 bg-[#be123c]/90 border-b-2 border-white/50"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
            />

            {/* Script "jab we" */}
            <div className="relative z-10 font-script text-4xl sm:text-5xl text-white drop-shadow-md -rotate-2 -mb-2 mt-4">
              jab we
            </div>

            {/* Heavy Block "MATCHED" with 3D drop shadow */}
            <div className="relative z-10 font-matched text-4xl sm:text-6xl md:text-7xl font-black tracking-widest text-[#fbcfe8] matched-3d-text uppercase">
              MATCHED
            </div>
          </div>

          {/* Central Heart Seal — sits outside the clipped card so it can
              fully straddle the top border, not just its bottom half. */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-8 h-8 rounded-full bg-pink-100/90 shadow-lg flex items-center justify-center border border-white animate-heart-thump">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-rose-600 text-rose-600">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default 'md'
  return (
    <div className="flex items-center gap-3">
      {/* Red Envelope Card Motif */}
      <div className="relative w-12 h-9 rounded-lg bg-gradient-to-b from-[#e11d48] to-[#9f1239] border-2 border-white shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
        <div 
          className="absolute top-0 left-0 right-0 h-4 bg-[#be123c]/90 border-b border-white/50"
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
        />
        <div className="relative z-10 w-3.5 h-3.5 mt-1">
          <svg viewBox="0 0 24 24" className="w-full h-full fill-pink-200 text-pink-200 animate-heart-thump">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      </div>
      <div>
        <div className="text-xs font-script text-pink-300 leading-none -mb-1">
          jab we
        </div>
        <div className="font-matched text-lg sm:text-xl text-pink-100 tracking-wider matched-3d-text leading-tight">
          MATCHED
        </div>
      </div>
    </div>
  );
}

// Ornate White Lace Corner Graphic for true poster fidelity
export function LaceCornerDecoration({ position }: { position: 'top-left' | 'bottom-right' | 'top-right' | 'bottom-left' }) {
  const transform = {
    'top-left': '',
    'top-right': 'scale-x-[-1]',
    'bottom-left': 'scale-y-[-1]',
    'bottom-right': 'scale-[-1]',
  }[position];

  return (
    <div className={`pointer-events-none absolute z-0 w-28 h-28 sm:w-36 sm:h-36 ${
      position.includes('top') ? 'top-0' : 'bottom-0'
    } ${
      position.includes('left') ? 'left-0' : 'right-0'
    } ${transform} opacity-75`}>
      <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Fine lace embroidery flowers and flourishes matching the poster */}
        <g stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.85">
          <path d="M0 0 L140 0 C130 15, 110 25, 90 20 C70 15, 60 40, 45 45 C30 50, 20 70, 15 90 C10 110, 0 130, 0 140 Z" fill="rgba(255,255,255,0.06)" />
          {/* Corner lace rosette */}
          <circle cx="28" cy="28" r="14" strokeDasharray="3 2" fill="rgba(255,255,255,0.12)" />
          <circle cx="28" cy="28" r="8" strokeDasharray="2 2" />
          <circle cx="28" cy="28" r="3" fill="#ffffff" />
          {/* Petals */}
          <path d="M28 14 C33 7, 42 12, 38 19" />
          <path d="M42 28 C49 33, 44 42, 37 38" />
          <path d="M28 42 C23 49, 14 44, 18 37" />
          <path d="M14 28 C7 23, 12 14, 19 18" />
          {/* Lace Scallops along edges */}
          <path d="M0 45 Q15 45 15 60 Q15 75 30 75 Q45 75 45 90 Q45 105 60 105" strokeWidth="1.5" />
          <path d="M45 0 Q45 15 60 15 Q75 15 75 30 Q75 45 90 45 Q105 45 105 60" strokeWidth="1.5" />
          {/* Delicate dots */}
          <circle cx="65" cy="28" r="2" fill="#ffffff" />
          <circle cx="28" cy="65" r="2" fill="#ffffff" />
          <circle cx="48" cy="48" r="2.5" fill="#ffffff" />
          <circle cx="85" cy="18" r="1.5" fill="#ffffff" />
          <circle cx="18" cy="85" r="1.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}
