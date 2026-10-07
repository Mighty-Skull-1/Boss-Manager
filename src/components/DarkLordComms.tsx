import type { DarkLordMessage } from '../types/game';
import { Skull } from 'lucide-react';

interface DarkLordCommsProps {
  messages: DarkLordMessage[];
}

export const DarkLordComms: React.FC<DarkLordCommsProps> = ({ messages }) => {
  const latestMessage = messages[messages.length - 1];

  if (!latestMessage) return null;

  return (
    <div className={`p-3 rounded-xl border flex items-start gap-3 shadow-lg select-none transition-all ${
      latestMessage.sentiment === 'panicked' || latestMessage.sentiment === 'angry'
        ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
        : latestMessage.sentiment === 'satisfied'
        ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
        : 'bg-slate-900 border-slate-700 text-slate-200'
    }`}>
      <div className="p-2 rounded-lg bg-black/40 border border-slate-700 shrink-0">
        <Skull className={`w-5 h-5 ${
          latestMessage.sentiment === 'panicked' || latestMessage.sentiment === 'angry'
            ? 'text-rose-500 animate-bounce'
            : latestMessage.sentiment === 'satisfied'
            ? 'text-emerald-400'
            : 'text-amber-400'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs tracking-wider text-amber-300">
              {latestMessage.sender}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
              DIRECT DISCORD DM
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{latestMessage.timestamp}</span>
        </div>

        <p className="text-xs font-sans leading-relaxed text-slate-300">
          "{latestMessage.text}"
        </p>
      </div>
    </div>
  );
};
