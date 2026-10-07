import type { BossAttack, QueuedAttack } from '../types/game';
import { BOSS_ATTACKS } from '../game/encounters';
import { 
  Sword, 
  Flame, 
  Radio, 
  Zap, 
  Users, 
  Crosshair, 
  Sparkles, 
  Sun,
  Lock,
  Plus,
  Clock
} from 'lucide-react';

interface ScriptSequencerProps {
  phase: 1 | 2;
  devMana: number;
  attackQueue: QueuedAttack[];
  cooldowns: Record<string, number>;
  onQueueAttack: (attack: BossAttack) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Sword: <Sword className="w-4 h-4" />,
  Flame: <Flame className="w-4 h-4" />,
  Radio: <Radio className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Crosshair: <Crosshair className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Sun: <Sun className="w-4 h-4" />,
};

export const ScriptSequencer: React.FC<ScriptSequencerProps> = ({
  phase,
  devMana,
  attackQueue,
  cooldowns,
  onQueueAttack,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Boss Action Script Queue ({attackQueue.length}/3)
        </h2>
        <span className="text-[10px] text-slate-400 font-mono">
          Inject attacks to disrupt speedrunner rhythm
        </span>
      </div>

      {/* Live Action Queue Preview */}
      <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 min-h-[52px]">
        {attackQueue.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono italic mx-auto">
            Queue empty — Boss running auto-attack loop
          </div>
        ) : (
          attackQueue.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900 border border-amber-600/40 text-xs font-mono text-amber-300"
            >
              <span className="text-slate-500 font-bold">{idx + 1}.</span>
              <span>{item.attack.name}</span>
              <span className="text-[10px] text-slate-400">({item.attack.windupTime}s)</span>
            </div>
          ))
        )}
      </div>

      {/* Available Attack Deck */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {BOSS_ATTACKS.map(attack => {
          const isLocked = attack.phaseRequired > phase;
          const currentCd = cooldowns[attack.id] || 0;
          const isOnCooldown = currentCd > 0;
          const canAfford = devMana >= attack.manaCost;
          const isQueueFull = attackQueue.length >= 3;
          const isDisabled = isLocked || isOnCooldown || !canAfford || isQueueFull;

          return (
            <button
              key={attack.id}
              onClick={() => onQueueAttack(attack)}
              disabled={isDisabled}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                isLocked
                  ? 'bg-slate-950/60 border-slate-800/60 opacity-40 cursor-not-allowed'
                  : isOnCooldown
                  ? 'bg-slate-950 border-slate-800 opacity-60 cursor-not-allowed'
                  : !canAfford
                  ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                  : attack.phaseRequired === 2
                  ? 'bg-gradient-to-br from-fuchsia-950/40 to-slate-900 border-fuchsia-600/40 hover:border-fuchsia-500 hover:shadow-lg hover:shadow-fuchsia-900/20 text-slate-200 cursor-pointer'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-amber-500/80 hover:shadow-lg hover:shadow-amber-900/20 text-slate-200 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className={attack.phaseRequired === 2 ? 'text-fuchsia-400' : 'text-amber-400'}>
                    {ICON_MAP[attack.icon] || <Sword className="w-4 h-4" />}
                  </span>
                  <span className="truncate max-w-[120px]">{attack.name}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <span className="text-sky-400 font-semibold">{attack.manaCost} MP</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                {attack.description}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-1.5 mt-auto">
                <span className="text-rose-400 font-semibold">Dmg: {attack.damage}</span>
                <span className="text-slate-400">Windup: {attack.windupTime}s</span>

                {isLocked ? (
                  <span className="text-fuchsia-400 flex items-center gap-0.5 font-bold">
                    <Lock className="w-3 h-3" /> P2 REQ
                  </span>
                ) : isOnCooldown ? (
                  <span className="text-amber-400 font-bold">
                    {currentCd.toFixed(1)}s CD
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
                    <Plus className="w-3 h-3" /> QUEUE
                  </span>
                )}
              </div>

              {/* Cooldown overlay bar */}
              {isOnCooldown && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/80"
                  style={{ width: `${(currentCd / attack.cooldown) * 100}%` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
