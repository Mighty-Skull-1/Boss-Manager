import { useEffect } from 'react';
import type { GameSimulationState } from '../game/simulationEngine';
import { formatTime } from '../game/simulationEngine';
import { 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  Skull
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  state: GameSimulationState;
  onRestart: () => void;
  onNextAct?: () => void;
  hasNextAct: boolean;
}

export const GameOverModal = ({
  state,
  onRestart,
  onNextAct,
  hasNextAct,
}: GameOverModalProps) => {
  const isVictory = state.phase === 'victory';

  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    }
  }, [isVictory]);

  // Determine Letter Grade
  let grade = 'B';
  if (!isVictory) {
    grade = 'FIRED';
  } else if (state.dramaticTension >= 85 && state.darkLordApproval >= 80) {
    grade = 'S+';
  } else if (state.dramaticTension >= 70) {
    grade = 'A';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md select-none animate-fade-in">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className={`absolute top-0 left-0 right-0 h-2 ${
          isVictory ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-600 to-amber-600'
        }`} />

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-full mb-3 shadow-lg" style={{
            background: isVictory ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isVictory ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          }}>
            {isVictory ? (
              <Trophy className="w-12 h-12 text-emerald-400" />
            ) : (
              <Skull className="w-12 h-12 text-rose-500 animate-bounce" />
            )}
          </div>

          <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-1">
            {isVictory ? 'RAID ENCOUNTER MASTERCLASS' : 'TERMINATED BY DARK LORD HR'}
          </h2>

          <p className="text-xs font-mono text-slate-400">
            {isVictory
              ? 'The speedrunners have rage-quit. The Twitch stream is in mourning.'
              : state.defeatReason || 'You let the sweaty speedrunners skip Phase 2!'}
          </p>
        </div>

        {/* Performance Scorecard */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Performance Grade</div>
            <div className={`text-3xl font-black font-mono mt-0.5 ${
              grade === 'S+' ? 'text-amber-400' : grade === 'A' ? 'text-emerald-400' : 'text-rose-500'
            }`}>
              {grade}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Raid Duration</div>
            <div className="text-3xl font-black font-mono mt-0.5 text-slate-200">
              {formatTime(state.raidTime)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Peak Dramatic Tension</div>
            <div className="text-2xl font-bold font-mono mt-0.5 text-amber-300">
              {Math.round(state.dramaticTension)}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Phase 2 Status</div>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${
              state.boss.phase2Triggered ? 'text-emerald-400' : 'text-rose-500'
            }`}>
              {state.boss.phase2Triggered ? 'EXECUTED' : 'SKIPPED!'}
            </div>
          </div>
        </div>

        {/* Dark Lord Final Memo */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 text-xs text-slate-300">
          <span className="font-mono font-bold text-amber-400 block mb-1">
            Memo from Overlord Xzar [CEO]:
          </span>
          {isVictory ? (
            <p className="italic">
              "Outstanding performance, Malakor. You safeguarded my Phase 2 violin solo, punished their greedy corner clips, and delivered pure cinematic drama. Your annual soul bonus is approved."
            </p>
          ) : (
            <p className="italic text-rose-300">
              "Do you know how much I paid Hans Zimmer for that 3-minute Phase 2 orchestral drop?! And you let a Rogue named 'xX_GamerGlitch_Xx' burst him down in Phase 1?! Clean out your terminal. You are now Goblin Sanitation."
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            RETRY RAID
          </button>

          {isVictory && hasNextAct && onNextAct && (
            <button
              onClick={onNextAct}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-900/30"
            >
              NEXT RAID ACT
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
