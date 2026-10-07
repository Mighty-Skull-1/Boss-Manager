export type GamePhase = 'briefing' | 'phase1' | 'phase2_transition' | 'phase2' | 'victory' | 'defeat';

export type RunnerClass = 'rogue' | 'mage' | 'tank' | 'bard';

export interface Speedrunner {
  id: string;
  name: string;
  className: RunnerClass;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  posture: number; // Elden Ring Posture / Stagger meter (0 to 100)
  maxPosture: number;
  isPostureBroken: boolean;
  dps: number;
  isAlive: boolean;
  isStunned: boolean;
  stunTimer: number;
  isRolling: boolean;
  rollTimer: number;
  targetX: number;
  targetY: number;
  activeExploit: 'none' | 'wall_clip' | 'stagger_loop' | 'buff_stack' | 'dps_skip';
  exploitProgress: number; // 0 to 100
  buffCount: number;
  color: string;
  chatFrequency: number;
  lastChatTime: number;
}

export type AttackType = 
  | 'flame_cleave' 
  | 'inferno_slam' 
  | 'magma_pillar' 
  | 'shockwave_jump' 
  | 'summon_imps'
  | 'visceral_riposte'
  | 'hotfix_fatality'
  // Phase 2 Exclusive Attacks
  | 'apocalypse_laser' 
  | 'meteor_shower' 
  | 'supernova';

export interface BossAttack {
  id: AttackType;
  name: string;
  phaseRequired: 1 | 2;
  manaCost: number;
  cooldown: number;
  currentCooldown: number;
  windupTime: number;
  damage: number;
  description: string;
  rangeType: 'cone' | 'circle' | 'line' | 'full_arena';
  radius: number;
  icon: string;
}

export interface QueuedAttack {
  attack: BossAttack;
  timeRemaining: number;
  totalTime: number;
}

export interface Boss {
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  posture: number; // Souls posture
  maxPosture: number;
  phase2Threshold: number; // 0.50 (50%)
  phase: 1 | 2;
  x: number;
  y: number;
  currentAction: 'idle' | 'windup' | 'attacking' | 'cutscene' | 'staggered' | 'fatality';
  currentAttack: QueuedAttack | null;
  actionTimer: number;
  poise: number;
  maxPoise: number;
  isInvulnerable: boolean;
  phase2Triggered: boolean;
}

export interface GlitchIncident {
  id: string;
  type: 'wall_clip' | 'stagger_loop' | 'buff_stack' | 'dps_skip';
  runnerId: string;
  runnerName: string;
  title: string;
  description: string;
  costMana: number;
  timeLimit: number;
  timeRemaining: number;
  x: number;
  y: number;
  resolved: boolean;
}

export interface ArenaTrap {
  id: string;
  name: string;
  cost: number;
  cooldown: number;
  currentCooldown: number;
  type: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes';
  description: string;
  icon: string;
}

export interface ActiveTrapInstance {
  id: string;
  type: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes';
  x: number;
  y: number;
  radius: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: string;
  color: string;
  life: number;
  isCrit?: boolean;
}

export interface Telegraph {
  type: 'cone' | 'circle' | 'line' | 'full_arena';
  x: number;
  y: number;
  radius: number;
  angle?: number;
  progress: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  badge?: string;
  color?: string;
  isSub?: boolean;
}

export interface DarkLordMessage {
  id: string;
  sender: string;
  text: string;
  sentiment: 'angry' | 'panicked' | 'satisfied' | 'neutral';
  timestamp: string;
}

export interface EncounterConfig {
  id: string;
  title: string;
  bossName: string;
  bossTitle: string;
  difficulty: 'Casual Any%' | 'WR Pace' | 'TAS Insanity';
  bossMaxHp: number;
  phase2HpThreshold: number;
  runners: {
    name: string;
    className: RunnerClass;
    hp: number;
    dps: number;
    chatFrequency: number;
  }[];
  glitchAggression: number;
  description: string;
  targetFightTime: number;
}
