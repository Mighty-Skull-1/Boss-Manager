import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Skull } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PhaseTransitionModalProps {
  bossName: string;
  onFinishCutscene: () => void;
}

const MONOLOGUE_LINES = [
  'FOOLS! YOU BELIEVED YOUR SWEATY ANIMATION-CANCELS COULD DEFEAT ME?!',
  'I WAS FORGED IN THE CRUCIBLE OF UNCHECKED BUFFER OVERFLOWS!',
  'WITNESS NOW THE UNBOUNDED MAJESTY OF MY TRUE PHASE 2 FORM!',
  'THE ARENA SHATTERS... AND YOUR SPEEDRUN ENDS HERE!',
];

export const PhaseTransitionModal: React.FC<PhaseTransitionModalProps> = ({
  bossName,
  onFinishCutscene,
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    // Fire celebratory cinematic sparks
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#ec4899', '#fbbf24'],
    });

    const interval = setInterval(() => {
      setCurrentLineIndex(prev => {
        if (prev < MONOLOGUE_LINES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-8 backdrop-blur-md select-none overflow-hidden animate-fade-in">
      {/* Top Cinematic Letterbox */}
      <div className="w-full flex items-center justify-between border-b border-rose-950/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-rose-600/20 text-rose-500 animate-pulse">
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-rose-500 font-bold">
              • CINEMATIC CUTSCENE ACTIVE • SPEEDRUN CLOCK FROZEN •
            </div>
            <div className="text-2xl font-black tracking-wider text-rose-100 uppercase">
              {bossName}: METAMORPHOSIS
            </div>
          </div>
        </div>

        <div className="px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-600 text-rose-300 font-mono text-xs font-bold animate-pulse">
          INVULNERABILITY WINDOW 100%
        </div>
      </div>

      {/* Center Cinematic Action */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-6 relative">
        {/* Swirling energy visual glow */}
        <div className="absolute w-96 h-96 rounded-full bg-gradient-to-tr from-rose-600/30 to-fuchsia-600/30 blur-3xl -z-10 animate-pulse" />

        <div className="p-4 rounded-full bg-rose-950/80 border-2 border-rose-500 shadow-2xl shadow-rose-900/50 mb-6">
          <Skull className="w-20 h-20 text-rose-400 animate-bounce" />
        </div>

        <div className="text-amber-400 font-mono text-sm tracking-widest uppercase mb-3">
          Phase 2 Orchestral Choir Solo In Progress
        </div>

        {/* Monologue Subtitle */}
        <div className="max-w-3xl min-h-[90px] flex items-center justify-center">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase leading-tight drop-shadow-md">
            "{MONOLOGUE_LINES[currentLineIndex]}"
          </h2>
        </div>

        <div className="flex items-center gap-3 mt-4 text-xs font-mono text-slate-400">
          <span className="text-emerald-400">✓ Cutscene Skip: DENIED</span>
          <span>•</span>
          <span className="text-pink-400">✓ Phase 2 Enrage: ACTIVATED</span>
          <span>•</span>
          <span className="text-amber-400">✓ Dark Lord Satisfaction: 100%</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full flex items-center justify-between border-t border-rose-950/60 pt-4">
        <div className="text-xs font-mono text-slate-400">
          Press when you are ready to unleash Phase 2 mechanics on the speedrunners.
        </div>

        <button
          onClick={onFinishCutscene}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black tracking-wider text-sm transition-all shadow-xl shadow-pink-900/40 flex items-center gap-2 cursor-pointer border border-pink-400/50 animate-pulse"
        >
          <Sparkles className="w-5 h-5" />
          COMMENCE PHASE 2 ASSAULT
        </button>
      </div>
    </div>
  );
};
