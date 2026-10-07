import type { GameSimulationState } from '../game/simulationEngine';
import { formatTime } from '../game/simulationEngine';
import { 
  ShieldAlert, 
  Flame, 
  Volume2, 
  VolumeX, 
  Zap, 
  TrendingUp, 
  Smile, 
  Frown,
  Sparkles
} from 'lucide-react';

interface ConsoleHeaderProps {
  state: GameSimulationState;
  onTriggerPhase2: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  state,
  onTriggerPhase2,
  isMuted,
  onToggleMute,
}) => {
  const { boss, devMana, maxDevMana, dramaticTension, darkLordApproval, raidTime } = state;
  const hpPercent = Math.max(0, (boss.hp / boss.maxHp) * 100);
  const phase2ThresholdPercent = boss.phase2Threshold * 100;
  const isNearPhase2 = hpPercent <= 60 && !boss.phase2Triggered;
  const isCriticalBurstZone = hpPercent <= 52 && !boss.phase2Triggered;

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 shadow-xl select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Top Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-950/80 border border-rose-600/50 rounded-lg text-rose-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-wider text-slate-100 flex items-center gap-2">
                  ENCOUNTER ENGINEER
                  <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 font-mono">
                    TERMINAL v2.4
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Current Boss: <span className="text-amber-400 font-semibold">{boss.name}</span> — {boss.title}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6">
            {/* Dark Lord Approval */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              {darkLordApproval >= 60 ? (
                <Smile className="w-5 h-5 text-emerald-400" />
              ) : (
                <Frown className="w-5 h-5 text-rose-500 animate-bounce" />
              )}
              <div className="text-xs">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Dark Lord Approval</div>
                <div className={`font-mono font-bold ${darkLordApproval >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Math.round(darkLordApproval)}%
                </div>
              </div>
            </div>

            {/* Dramatic Tension */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <div className="text-xs">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Dramatic Tension</div>
                <div className="font-mono font-bold text-amber-300">
                  {Math.round(dramaticTension)}%
                </div>
              </div>
            </div>

            {/* Dev Mana / Hotfix Budget */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Zap className="w-5 h-5 text-sky-400" />
              <div className="text-xs">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Dev Mana</div>
                <div className="font-mono font-bold text-sky-300">
                  {Math.round(devMana)} / {maxDevMana}
                </div>
              </div>
            </div>

            {/* Raid Clock */}
            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Raid Elapsed</div>
              <div className="text-lg font-bold text-slate-200">{formatTime(raidTime)}</div>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Boss Boss Health Bar with Phase 2 Threshold & Sacred Trigger Button */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 relative">
          <div className="flex justify-between items-center mb-1.5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 tracking-wide">{boss.name} HEALTH</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                boss.phase === 2 ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-600' : 'bg-slate-800 text-slate-300'
              }`}>
                Phase {boss.phase} {boss.isInvulnerable && '• INVULNERABLE'}
              </span>
            </div>
            <div className="font-bold text-slate-200">
              {Math.round(boss.hp)} / {boss.maxHp} ({hpPercent.toFixed(1)}%)
            </div>
          </div>

          {/* Health Bar Track */}
          <div className="relative w-full h-7 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            {/* Health fill */}
            <div
              className={`h-full transition-all duration-150 ${
                boss.phase === 2
                  ? 'bg-gradient-to-r from-fuchsia-600 to-rose-500'
                  : hpPercent <= 52 && !boss.phase2Triggered
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 animate-pulse'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
            />

            {/* Phase 2 Cutscene Marker Line (50%) */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_8px_#f59e0b] z-10"
              style={{ left: `${phase2ThresholdPercent}%` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded">
                PHASE 2 CUTSCENE TRIGGER (50%)
              </div>
            </div>

            {/* Burst Danger Warning Zone (50% to 55%) */}
            {!boss.phase2Triggered && (
              <div
                className="absolute top-0 bottom-0 bg-red-500/20 pointer-events-none border-l border-red-500/40"
                style={{ left: `${phase2ThresholdPercent}%`, width: '10%' }}
              />
            )}
          </div>

          {/* SACRED TRIGGER PHASE 2 BUTTON */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>
                {boss.phase2Triggered
                  ? 'Phase 2 transition is ACTIVE. Enraged mechanics deployed!'
                  : isCriticalBurstZone
                  ? 'CRITICAL! Speedrunners attempting to burst skip! TRIGGER CUTSCENE NOW!'
                  : isNearPhase2
                  ? 'Boss HP is within the transition window. Prepare the cutscene trigger.'
                  : 'Weaken speedrunners and protect boss HP until the 50% threshold.'}
              </span>
            </div>

            {!boss.phase2Triggered ? (
              <button
                onClick={onTriggerPhase2}
                disabled={hpPercent > 65}
                className={`px-5 py-2 rounded-lg font-bold text-sm tracking-wide transition-all shadow-lg flex items-center gap-2 ${
                  hpPercent <= 65
                    ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white border border-pink-400/50 shadow-pink-500/30 animate-pulse cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                TRIGGER PHASE 2 TRANSITION
                {hpPercent <= 65 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono">READY</span>}
              </button>
            ) : (
              <div className="px-4 py-1.5 rounded-lg bg-fuchsia-950/80 border border-fuchsia-600 text-fuchsia-300 text-xs font-mono font-bold">
                ✓ PHASE 2 ACTIVE (CUTSCENE COMPLETED)
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
