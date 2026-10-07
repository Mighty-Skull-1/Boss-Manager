import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameSimulationState } from './game/simulationEngine';
import { 
  createInitialSimulation, 
  updateSimulation, 
  queueBossAttack, 
  deployArenaTrap, 
  resolveHotpatch, 
  triggerPhase2Transition, 
  finishPhase2Cutscene 
} from './game/simulationEngine';
import { ENCOUNTERS } from './game/encounters';
import type { BossAttack } from './types/game';
import { ArenaCanvas } from './game/ArenaCanvas';
import { ConsoleHeader } from './components/ConsoleHeader';
import { ScriptSequencer } from './components/ScriptSequencer';
import { HotpatchTerminal } from './components/HotpatchTerminal';
import { TwitchChatPanel } from './components/TwitchChatPanel';
import { DarkLordComms } from './components/DarkLordComms';
import { PhaseTransitionModal } from './components/PhaseTransitionModal';
import { GameOverModal } from './components/GameOverModal';
import { soundManager } from './audio/soundManager';
import { Play, Flame, Layers } from 'lucide-react';

export function App() {
  const [currentEncounterIndex, setCurrentEncounterIndex] = useState(0);
  const encounter = ENCOUNTERS[currentEncounterIndex];

  const [simulationState, setSimulationState] = useState<GameSimulationState>(() =>
    createInitialSimulation(encounter.bossMaxHp, encounter.phase2HpThreshold, encounter.runners)
  );

  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTrap, setSelectedTrap] = useState<'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null>(null);

  // References for requestAnimationFrame loop
  const stateRef = useRef<GameSimulationState>(simulationState);
  stateRef.current = simulationState;

  const lastTimeRef = useRef<number>(performance.now());

  // Reset or switch encounter
  const loadEncounter = useCallback((index: number) => {
    const enc = ENCOUNTERS[index];
    setCurrentEncounterIndex(index);
    const initial = createInitialSimulation(enc.bossMaxHp, enc.phase2HpThreshold, enc.runners);
    initial.boss.name = enc.bossName;
    initial.boss.title = enc.bossTitle;
    setSimulationState(initial);
    stateRef.current = initial;
    soundManager.startBGM(1);
  }, []);

  // Main animation frame loop
  useEffect(() => {
    if (!isGameStarted) return;

    soundManager.startBGM(1);

    let animationFrameId: number;

    const gameLoop = (now: number) => {
      const delta = Math.min(0.1, (now - lastTimeRef.current) / 1000); // Clamp delta
      lastTimeRef.current = now;

      const currentState = stateRef.current;
      const nextState = updateSimulation(currentState, delta, encounter.glitchAggression);

      setSimulationState(nextState);
      stateRef.current = nextState;

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isGameStarted, encounter]);

  // Handle canvas click to place trap or interact
  const handleCanvasClick = (x: number, y: number) => {
    if (selectedTrap) {
      setSimulationState(prev => deployArenaTrap(prev, selectedTrap, x, y));
      setSelectedTrap(null);
    }
  };

  const handleQueueAttack = (attack: BossAttack) => {
    setSimulationState(prev => queueBossAttack(prev, attack));
  };

  const handleDeployHotfix = (incidentId: string) => {
    setSimulationState(prev => resolveHotpatch(prev, incidentId));
  };

  const handleTriggerPhase2 = () => {
    setSimulationState(prev => triggerPhase2Transition(prev));
  };

  const handleFinishCutscene = () => {
    setSimulationState(prev => finishPhase2Cutscene(prev));
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleRestart = () => {
    loadEncounter(currentEncounterIndex);
  };

  const handleNextAct = () => {
    if (currentEncounterIndex < ENCOUNTERS.length - 1) {
      loadEncounter(currentEncounterIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Start Game Overlay */}
      {!isGameStarted && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-amber-600/60 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 inline-flex mb-4">
              <Flame className="w-12 h-12 text-amber-500 animate-pulse" />
            </div>

            <h1 className="text-3xl font-black tracking-wider text-white uppercase mb-2">
              ENCOUNTER ENGINEER
            </h1>
            <p className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold mb-4">
              Don't Let Them Skip Phase 2 • Boss Tech Support
            </p>

            <div className="text-left text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mb-6 font-mono leading-relaxed">
              <p>
                <strong className="text-amber-400">YOUR MISSION:</strong> You are the technical director for a multi-phase RPG raid boss. A sweaty group of AI speedrunners has entered the arena attempting corner-clips, potion overflows, and 1-shot burst skips!
              </p>
              <p>
                <strong className="text-rose-400">THE GOLDEN RULE:</strong> You <strong className="text-white underline">MUST</strong> trigger the <strong>Phase 2 Cutscene at 50% HP</strong> before they burst him down. If they defeat the boss in Phase 1, you are <strong className="text-rose-400">FIRED</strong> by the Dark Lord!
              </p>
              <p>
                <strong className="text-sky-400">YOUR TOOLKIT:</strong> Script boss attacks, patch exploits in real-time, place arena floor traps, and maintain cinematic tension!
              </p>
            </div>

            <button
              onClick={() => setIsGameStarted(true)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 hover:from-amber-500 hover:to-pink-500 text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer border border-amber-400/50 animate-pulse"
            >
              <Play className="w-5 h-5" />
              START ENCOUNTER ENGINEER CONSOLE
            </button>
          </div>
        </div>
      )}

      {/* Main Console Header */}
      <ConsoleHeader
        state={simulationState}
        onTriggerPhase2={handleTriggerPhase2}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Encounter Act Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              SELECT RAID ACT:
            </span>
          </div>

          <div className="flex items-center gap-2">
            {ENCOUNTERS.map((enc, idx) => (
              <button
                key={enc.id}
                onClick={() => loadEncounter(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  currentEncounterIndex === idx
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {enc.title} ({enc.difficulty})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Dark Lord real-time DM alert banner */}
        <DarkLordComms messages={simulationState.darkLordMessages} />

        {/* Center Grid: Arena Battlefield (Left) + Live Stream Chat (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Main 2D Arena Canvas (3 Columns) */}
          <div className="lg:col-span-3 flex flex-col items-center">
            <ArenaCanvas
              simulationState={simulationState}
              onCanvasClick={handleCanvasClick}
              selectedTrap={selectedTrap}
            />
          </div>

          {/* Twitch Live Stream Chat (1 Column) */}
          <div className="lg:col-span-1 h-[600px]">
            <TwitchChatPanel messages={simulationState.chatMessages} />
          </div>
        </div>

        {/* Bottom Operations Deck: Script Sequencer + Hotpatch Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
          <ScriptSequencer
            phase={simulationState.boss.phase}
            devMana={simulationState.devMana}
            attackQueue={simulationState.attackQueue}
            cooldowns={simulationState.bossAttackCooldowns}
            onQueueAttack={handleQueueAttack}
          />

          <HotpatchTerminal
            glitches={simulationState.glitches}
            devMana={simulationState.devMana}
            onDeployHotfix={handleDeployHotfix}
            selectedTrap={selectedTrap}
            onSelectTrap={setSelectedTrap}
          />
        </div>
      </main>

      {/* Dramatic Phase 2 Metamorphosis Monologue Modal */}
      {simulationState.phase === 'phase2_transition' && (
        <PhaseTransitionModal
          bossName={simulationState.boss.name}
          onFinishCutscene={handleFinishCutscene}
        />
      )}

      {/* Game Over / Post-Raid Performance Review Modal */}
      {(simulationState.phase === 'victory' || simulationState.phase === 'defeat') && (
        <GameOverModal
          state={simulationState}
          onRestart={handleRestart}
          onNextAct={handleNextAct}
          hasNextAct={currentEncounterIndex < ENCOUNTERS.length - 1}
        />
      )}
    </div>
  );
}

export default App;
