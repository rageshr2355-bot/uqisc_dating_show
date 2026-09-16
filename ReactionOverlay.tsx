import React from 'react';
import { usePollContext } from './PollContext';

export function ReactionOverlay() {
  const { activeBursts } = usePollContext();

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {activeBursts.map((burst) => (
        <div
          key={burst.id}
          className="absolute bottom-6 flex flex-col items-center select-none"
          style={{
            left: `${burst.x}%`,
            animation: 'floatParticle 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
          }}
        >
          <span className="text-4xl sm:text-5xl filter drop-shadow-lg transform transition-transform hover:scale-125">
            {burst.emoji}
          </span>
          {burst.label && (
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 mt-1 rounded-full bg-black/60 backdrop-blur-md text-rose-300 border border-rose-500/30">
              {burst.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
