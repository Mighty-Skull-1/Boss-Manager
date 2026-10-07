import type { GlitchIncident } from '../types/game';
import { ARENA_TRAPS } from '../game/encounters';
import { 
  Terminal, 
  AlertOctagon, 
  CheckCircle2, 
  Flame, 
  Shield, 
  AlertTriangle,
  Zap
} from 'lucide-react';

interface HotpatchTerminalProps {
  glitches: GlitchIncident[];
  devMana: number;
  onDeployHotfix: (incidentId: string) => void;
  selectedTrap: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null;
  onSelectTrap: (trapType: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null) => void;
}

const TRAP_ICONS: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-4 h-4 text-orange-400" />,
  Shield: <Shield className="w-4 h-4 text-sky-400" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4 text-rose-400" />,
};

export const HotpatchTerminal: React.FC<HotpatchTerminalProps> = ({
  glitches,
  devMana,
  onDeployHotfix,
  selectedTrap,
  onSelectTrap,
}) => {
  const unresolvedGlitches = glitches.filter(g => !g.resolved);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-300 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          Hotpatch Terminal & Exploit Triage
        </h2>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
          unresolvedGlitches.length > 0
            ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse'
            : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
        }`}>
          {unresolvedGlitches.length} EXPLOIT{unresolvedGlitches.length !== 1 ? 'S' : ''} DETECTED
        </span>
      </div>

      {/* Active Incidents List */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {unresolvedGlitches.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-80" />
            <div className="text-xs font-mono text-emerald-300 font-semibold">
              All Collision Meshes & Logic Trees Normal
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Speedrunners are searching for collision leaks...
            </div>
          </div>
        ) : (
          unresolvedGlitches.map(glitch => {
            const timeRatio = Math.max(0, glitch.timeRemaining / glitch.timeLimit);
            const canAfford = devMana >= glitch.costMana;

            return (
              <div
                key={glitch.id}
                className="p-3 rounded-lg bg-rose-950/30 border border-rose-600/60 flex flex-col gap-2 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-500 animate-bounce" />
                    <div>
                      <div className="text-xs font-mono font-bold text-rose-200">
                        {glitch.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: <span className="text-amber-300 font-semibold">{glitch.runnerName}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeployHotfix(glitch.id)}
                    disabled={!canAfford}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                      canAfford
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    PATCH ({glitch.costMana} MP)
                  </button>
                </div>

                <p className="text-[10px] text-slate-300 leading-tight">
                  {glitch.description}
                </p>

                {/* Progress countdown to exploit execution */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-rose-500 transition-all duration-100"
                    style={{ width: `${timeRatio * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>EXPLOIT EXECUTION IN:</span>
                  <span className="text-rose-400 font-bold">{glitch.timeRemaining.toFixed(1)}s</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Arena Floor Manipulator Traps */}
      <div className="border-t border-slate-800 pt-3">
        <div className="text-xs uppercase font-mono font-bold text-slate-300 mb-2 flex items-center justify-between">
          <span>Arena Floor Manipulators</span>
          <span className="text-[10px] text-slate-400">Select & click arena to place</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ARENA_TRAPS.map(trap => {
            const isSelected = selectedTrap === trap.type;
            const canAfford = devMana >= trap.cost;

            return (
              <button
                key={trap.id}
                onClick={() => onSelectTrap(isSelected ? null : trap.type)}
                disabled={!canAfford && !isSelected}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950 border-sky-400 text-white shadow-lg shadow-sky-900/30 ring-2 ring-sky-500'
                    : !canAfford
                    ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-700 hover:border-slate-500 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {TRAP_ICONS[trap.icon] || <Shield className="w-4 h-4 text-sky-400" />}
                  <span className="text-xs font-bold truncate">{trap.name}</span>
                </div>

                <p className="text-[9px] text-slate-400 line-clamp-2 mb-2 leading-tight">
                  {trap.description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-1 mt-auto">
                  <span className="text-sky-400 font-bold">{trap.cost} MP</span>
                  <span className={isSelected ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {isSelected ? 'ARMED' : 'ARM'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
