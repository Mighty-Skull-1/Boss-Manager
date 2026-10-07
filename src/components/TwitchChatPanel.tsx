import { useRef, useEffect } from 'react';
import type { ChatMessage } from '../types/game';
import { MessageSquare, Flame } from 'lucide-react';

interface TwitchChatPanelProps {
  messages: ChatMessage[];
}

export const TwitchChatPanel: React.FC<TwitchChatPanelProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col h-full shadow-xl select-none backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            SpeedrunStream Live Chat
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          248,190 VIEWERS
        </div>
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-2 flex flex-col gap-1.5 pr-1 text-xs font-sans font-medium"
      >
        {messages.map(msg => (
          <div key={msg.id} className="leading-snug break-words">
            <span
              className="font-bold font-mono mr-1.5 cursor-pointer hover:underline text-[11px]"
              style={{ color: msg.color || '#38bdf8' }}
            >
              {msg.user}:
            </span>
            <span className="text-slate-300 text-[11px]">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Hype Meter Footer */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1 text-amber-400 font-semibold">
          <Flame className="w-3.5 h-3.5" />
          <span>HYPE TRAIN LVL 4</span>
        </div>
        <span>EMOTES ONLY</span>
      </div>
    </div>
  );
};
