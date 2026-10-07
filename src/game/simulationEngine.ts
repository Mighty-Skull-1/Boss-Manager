import type { 
  Boss, 
  Speedrunner, 
  GlitchIncident, 
  ActiveTrapInstance, 
  Particle, 
  DamageNumber, 
  Telegraph, 
  ChatMessage, 
  DarkLordMessage,
  BossAttack,
  QueuedAttack
} from '../types/game';
import { BOSS_ATTACKS } from './encounters';
import { soundManager } from '../audio/soundManager';

export interface GameSimulationState {
  boss: Boss;
  runners: Speedrunner[];
  devMana: number;
  maxDevMana: number;
  dramaticTension: number; // 0 to 100
  darkLordApproval: number; // 0 to 100
  raidTime: number; // seconds
  glitches: GlitchIncident[];
  traps: ActiveTrapInstance[];
  particles: Particle[];
  damageNumbers: DamageNumber[];
  telegraphs: Telegraph[];
  chatMessages: ChatMessage[];
  darkLordMessages: DarkLordMessage[];
  phase: 'briefing' | 'phase1' | 'phase2_transition' | 'phase2' | 'victory' | 'defeat';
  defeatReason?: string;
  selectedTrapType: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null;
  attackQueue: QueuedAttack[];
  bossAttackCooldowns: Record<string, number>;
  trapCooldowns: Record<string, number>;
  wantedStars: number; // GTA Wanted Level (1 to 5 Stars)
  comboCount: number; // Mortal Kombat Combo Counter
  comboTimer: number;
  announcerBanner?: string; // e.g. "FATALITY!", "BURST DENIED!", "FIGHT!"
}

// Distance helper
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Random speedrun chatter presets
const RUNNER_CHATTER = [
  'Sub-2 is still on pace!!',
  'Watch the telegraph, roll cancel!',
  'Stack the potion buffs now!',
  'Is the floor hitbox bugged?',
  'Burst him before the phase trigger!',
  'Corner clip setup in 3... 2...',
  'My i-frames felt late there lag??',
  'DPS CHECK DPS CHECK!!',
  'WHO GAVE THE BOSS WASD MOVEMENT?!',
  'HE IS SPRINTING DIRECTLY AT ME BRO!!',
  'KITE HIM AROUND THE PILLARS!!',
  'HE ROAMS LIKE AN ACTUAL PLAYER WTF?!',
  'Don’t let him monologue!',
  'Pop cooldowns!! SKIP TIME!!',
  'Wait who patched the collision?!',
];

export function updateBossPosition(state: GameSimulationState, x: number, y: number): GameSimulationState {
  return {
    ...state,
    boss: {
      ...state.boss,
      x: Math.max(120, Math.min(680, x)),
      y: Math.max(100, Math.min(500, y)),
    },
  };
}

const TWITCH_CHATTERS = [
  { user: 'SpeedyMcRoll', text: 'POG HE DID THE CLIP', color: '#38bdf8' },
  { user: 'RaidLeaderAndy', text: 'Sub 2 is ALIVE boys', color: '#4ade80' },
  { user: 'SaltMiner99', text: 'Devs fixing bugs live LOOOOL', color: '#f43f5e' },
  { user: 'GlitchHunter', text: 'NO WAY HE CAUGHT THE BUFFER OVERFLOW', color: '#fbbf24' },
  { user: 'MonologueHater', text: 'Please skip the cutscene ResidentSleeper', color: '#a855f7' },
  { user: 'LoreEnjoyer', text: 'LET THE BOSS FINISH HIS SPEECH BibleThump', color: '#ec4899' },
  { user: 'AnyPercentGod', text: 'DEAD RUN IF PHASE 2 STARTS', color: '#f97316' },
  { user: 'WipeIncoming', text: 'KEKW WIPE INCOMING', color: '#2dd4bf' },
];

export function createInitialSimulation(
  bossMaxHp: number = 3000,
  phase2Threshold: number = 0.50,
  runnerTemplates = [
    { name: 'xX_GamerGlitch_Xx', className: 'rogue' as const, hp: 320, dps: 35, chatFrequency: 6 },
    { name: 'MinMaxGod', className: 'mage' as const, hp: 240, dps: 55, chatFrequency: 8 },
    { name: 'ParryGod69', className: 'tank' as const, hp: 480, dps: 20, chatFrequency: 7 },
    { name: 'TwitchChat_Andy', className: 'bard' as const, hp: 280, dps: 25, chatFrequency: 5 },
  ]
): GameSimulationState {
  const runners: Speedrunner[] = runnerTemplates.map((t, idx) => {
    const angle = (idx / runnerTemplates.length) * Math.PI * 2;
    const distance = 220;
    return {
      id: `runner_${idx}`,
      name: t.name,
      className: t.className,
      x: 400 + Math.cos(angle) * distance,
      y: 300 + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
      hp: t.hp,
      maxHp: t.hp,
      posture: 100,
      maxPosture: 100,
      isPostureBroken: false,
      dps: t.dps,
      isAlive: true,
      isStunned: false,
      stunTimer: 0,
      isRolling: false,
      rollTimer: 0,
      targetX: 400,
      targetY: 300,
      activeExploit: 'none',
      exploitProgress: 0,
      buffCount: 0,
      color: 
        t.className === 'rogue' ? '#10b981' : 
        t.className === 'mage' ? '#a855f7' : 
        t.className === 'tank' ? '#3b82f6' : '#f59e0b',
      chatFrequency: t.chatFrequency,
      lastChatTime: 0,
    };
  });

  return {
    boss: {
      name: 'Lord Ignis',
      title: 'The Sundered Pyrelord',
      hp: bossMaxHp,
      maxHp: bossMaxHp,
      phase2Threshold,
      phase: 1,
      x: 400,
      y: 300,
      currentAction: 'idle',
      currentAttack: null,
      actionTimer: 1.5,
      poise: 100,
      maxPoise: 100,
      posture: 100,
      maxPosture: 100,
      isInvulnerable: false,
      phase2Triggered: false,
    },
    runners: runners.map(r => ({
      ...r,
      posture: 100,
      maxPosture: 100,
      isPostureBroken: false,
    })),
    devMana: 100,
    maxDevMana: 100,
    dramaticTension: 40,
    darkLordApproval: 85,
    raidTime: 0,
    glitches: [],
    traps: [],
    particles: [],
    damageNumbers: [],
    telegraphs: [],
    chatMessages: [
      { id: '1', user: 'TwitchChat_Andy', text: 'Raid starting! Going for World Record pace!', color: '#f59e0b' },
      { id: '2', user: 'MinMaxGod', text: 'Hold burst at 55% to skip Phase 2 trigger!', color: '#a855f7' },
    ],
    darkLordMessages: [
      {
        id: 'dl_1',
        sender: 'Overlord_Xzar [CEO]',
        text: 'Malakor. The investors are watching this stream. If they skip Phase 2, you are getting transferred to Goblin Sanitation.',
        sentiment: 'neutral',
        timestamp: '00:00',
      },
    ],
    phase: 'phase1',
    selectedTrapType: null,
    attackQueue: [],
    bossAttackCooldowns: {},
    trapCooldowns: {},
    wantedStars: 1,
    comboCount: 0,
    comboTimer: 0,
    announcerBanner: 'ROUND 1: FIGHT!',
  };
}

// Update loop executed every frame with delta (in seconds)
export function updateSimulation(
  state: GameSimulationState,
  delta: number,
  glitchAggression: number = 2.0
): GameSimulationState {
  if (state.phase === 'victory' || state.phase === 'defeat') {
    return state;
  }

  const newState: GameSimulationState = {
    ...state,
    raidTime: state.raidTime + delta,
    devMana: Math.min(state.maxDevMana, state.devMana + 8 * delta),
    particles: [...state.particles],
    damageNumbers: [...state.damageNumbers],
    telegraphs: [...state.telegraphs],
    glitches: [...state.glitches],
    traps: [...state.traps],
    chatMessages: [...state.chatMessages],
    darkLordMessages: [...state.darkLordMessages],
    attackQueue: [...state.attackQueue],
    bossAttackCooldowns: { ...state.bossAttackCooldowns },
    trapCooldowns: { ...state.trapCooldowns },
    runners: state.runners.map(r => ({ ...r })),
    boss: { ...state.boss },
  };

  // Reduce cooldowns
  for (const k in newState.bossAttackCooldowns) {
    newState.bossAttackCooldowns[k] = Math.max(0, newState.bossAttackCooldowns[k] - delta);
  }
  for (const k in newState.trapCooldowns) {
    newState.trapCooldowns[k] = Math.max(0, newState.trapCooldowns[k] - delta);
  }

  // 1. Boss Logic & Attack execution
  updateBoss(newState, delta);

  // 2. Speedrunners AI
  updateSpeedrunners(newState, delta, glitchAggression);

  // 3. Glitches & Exploits Progress
  updateGlitches(newState, delta);

  // 4. Traps update (Lava pools, walls, etc.)
  updateTraps(newState, delta);

  // 5. Particles & Damage numbers
  updateParticlesAndNumbers(newState, delta);

  // 6. Check Win / Loss / Phase conditions
  checkPhaseAndGameConditions(newState);

  // 7. Twitch & Speedrunner banter injection
  updateChatter(newState, delta);

  return newState;
}

function updateBoss(state: GameSimulationState, delta: number) {
  const { boss } = state;

  // Slowly recover poise
  if (boss.poise < boss.maxPoise && boss.currentAction !== 'staggered') {
    boss.poise = Math.min(boss.maxPoise, boss.poise + 10 * delta);
  }

  // Boss state machine
  if (boss.currentAction === 'staggered') {
    boss.actionTimer -= delta;
    if (boss.actionTimer <= 0) {
      boss.currentAction = 'idle';
      boss.poise = boss.maxPoise;
    }
    return;
  }

  if (boss.currentAction === 'cutscene') {
    // Invulnerable during cutscene
    boss.isInvulnerable = true;
    return;
  }

  if (boss.currentAction === 'idle') {
    boss.actionTimer -= delta;
    // Check if attack queue has next attack or pick auto attack
    if (state.attackQueue.length > 0 && boss.actionTimer <= 0) {
      const nextQueued = state.attackQueue.shift()!;
      startBossAttack(state, nextQueued.attack);
    } else if (boss.actionTimer <= 0) {
      // Pick a default attack if idle for too long
      const availableAttacks = BOSS_ATTACKS.filter(
        a => (a.phaseRequired <= boss.phase) && (state.bossAttackCooldowns[a.id] || 0) <= 0
      );
      if (availableAttacks.length > 0) {
        const chosen = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
        startBossAttack(state, chosen);
      } else {
        boss.actionTimer = 0.5;
      }
    }
  } else if (boss.currentAction === 'windup') {
    boss.actionTimer -= delta;
    if (boss.currentAttack) {
      boss.currentAttack.timeRemaining = boss.actionTimer;
    }

    // Update telegraph progress
    if (state.telegraphs.length > 0 && boss.currentAttack) {
      const progress = 1 - (boss.actionTimer / boss.currentAttack.totalTime);
      state.telegraphs[0].progress = Math.min(1, Math.max(0, progress));
    }

    if (boss.actionTimer <= 0) {
      // Execute the attack!
      executeBossAttack(state);
    }
  } else if (boss.currentAction === 'attacking') {
    boss.actionTimer -= delta;
    if (boss.actionTimer <= 0) {
      boss.currentAction = 'idle';
      boss.actionTimer = 0.8; // Brief recovery window
      boss.currentAttack = null;
      state.telegraphs = [];
    }
  }
}

function startBossAttack(state: GameSimulationState, attack: BossAttack) {
  state.boss.currentAction = 'windup';
  state.boss.actionTimer = attack.windupTime;
  state.boss.currentAttack = {
    attack,
    timeRemaining: attack.windupTime,
    totalTime: attack.windupTime,
  };
  state.bossAttackCooldowns[attack.id] = attack.cooldown;

  soundManager.playTelegraph();

  // Create visual telegraph on floor
  state.telegraphs = [{
    type: attack.rangeType,
    x: state.boss.x,
    y: state.boss.y,
    radius: attack.radius,
    progress: 0,
    color: attack.phaseRequired === 2 ? '#ec4899' : '#ef4444',
  }];
}

function executeBossAttack(state: GameSimulationState) {
  const { boss } = state;
  if (!boss.currentAttack) return;

  const attack = boss.currentAttack.attack;
  boss.currentAction = 'attacking';
  boss.actionTimer = 0.4; // Impact recovery

  soundManager.playBossAttack();

  // Screen shake / attack effect particles
  createExplosionParticles(state, boss.x, boss.y, attack.radius, attack.phaseRequired === 2 ? '#f43f5e' : '#f97316');

  // Check which runners are caught in the blast
  for (const runner of state.runners) {
    if (!runner.isAlive) continue;

    const d = dist(boss.x, boss.y, runner.x, runner.y);
    let hit = false;

    if (attack.rangeType === 'circle' && d <= attack.radius) {
      hit = true;
    } else if (attack.rangeType === 'full_arena') {
      hit = true;
    } else if (attack.rangeType === 'cone' && d <= attack.radius) {
      hit = true;
    } else if (attack.rangeType === 'line' && d <= attack.radius) {
      hit = true;
    }

    if (hit) {
      // If speedrunner is rolling, check if they successfully i-framed it!
      if (runner.isRolling) {
        state.damageNumbers.push({
          x: runner.x,
          y: runner.y - 20,
          value: 'i-FRAMED!',
          color: '#38bdf8',
          life: 0.8,
        });
        state.dramaticTension = Math.min(100, state.dramaticTension + 3);
      } else {
        // Runner gets smacked!
        const damage = Math.round(attack.damage * (boss.phase === 2 ? 1.4 : 1.0));
        runner.hp = Math.max(0, runner.hp - damage);
        runner.isStunned = true;
        runner.stunTimer = 0.5;

        state.damageNumbers.push({
          x: runner.x,
          y: runner.y - 20,
          value: `-${damage}`,
          color: '#f87171',
          life: 1.0,
          isCrit: true,
        });

        // Dramatic tension increases when players take massive hits!
        state.dramaticTension = Math.min(100, state.dramaticTension + 6);

        if (runner.hp <= 0) {
          runner.isAlive = false;
          soundManager.playRunnerKilled();
          state.damageNumbers.push({
            x: runner.x,
            y: runner.y - 40,
            value: 'WIPED!',
            color: '#ef4444',
            life: 1.5,
          });
          state.darkLordApproval = Math.min(100, state.darkLordApproval + 10);
        }
      }
    }
  }

  // Clear telegraph
  state.telegraphs = [];
}

function updateSpeedrunners(state: GameSimulationState, delta: number, glitchAggression: number) {
  const { boss } = state;

  for (const runner of state.runners) {
    if (!runner.isAlive) continue;

    // Stun logic
    if (runner.isStunned) {
      runner.stunTimer -= delta;
      if (runner.stunTimer <= 0) {
        runner.isStunned = false;
      }
      continue;
    }

    // Roll timer
    if (runner.isRolling) {
      runner.rollTimer -= delta;
      if (runner.rollTimer <= 0) {
        runner.isRolling = false;
      }
    }

    // Exploit trigger AI check
    if (runner.activeExploit === 'none' && Math.random() < 0.008 * glitchAggression) {
      triggerRunnerExploit(state, runner);
    }

    // Movement AI
    const dToBoss = dist(runner.x, runner.y, boss.x, boss.y);
    const idealDist = runner.className === 'rogue' || runner.className === 'tank' ? 90 : 240;

    // If boss is winding up an attack and runner is in range, roll away!
    if (boss.currentAction === 'windup' && dToBoss < 160 && !runner.isRolling && Math.random() < 0.05) {
      runner.isRolling = true;
      runner.rollTimer = 0.4;
      soundManager.playRunnerRoll();
      // Dash away
      const angle = Math.atan2(runner.y - boss.y, runner.x - boss.x);
      runner.vx = Math.cos(angle) * 220;
      runner.vy = Math.sin(angle) * 220;
    } else {
      // Normal circling / positioning
      let targetX = boss.x;
      let targetY = boss.y;

      if (runner.activeExploit === 'wall_clip') {
        // Head straight for the arena top-left or bottom-right corner!
        targetX = 140;
        targetY = 140;
      } else {
        const orbitAngle = state.raidTime * 0.8 + parseInt(runner.id.slice(-1)) * 1.5;
        targetX = boss.x + Math.cos(orbitAngle) * idealDist;
        targetY = boss.y + Math.sin(orbitAngle) * idealDist;
      }

      const moveAngle = Math.atan2(targetY - runner.y, targetX - runner.x);
      const speed = runner.isRolling ? 220 : 110;
      runner.vx = Math.cos(moveAngle) * speed;
      runner.vy = Math.sin(moveAngle) * speed;
    }

    // Apply movement with arena boundary limits (100 to 700 on X, 80 to 520 on Y)
    runner.x += runner.vx * delta;
    runner.y += runner.vy * delta;
    runner.x = Math.max(120, Math.min(680, runner.x));
    runner.y = Math.max(100, Math.min(500, runner.y));

    // Deal DPS to Boss (unless boss is invulnerable or in cutscene)
    if (!boss.isInvulnerable && boss.currentAction !== 'cutscene') {
      let damagePerSec = runner.dps;
      
      // If buffed by potion stacking
      if (runner.buffCount > 0) {
        damagePerSec *= (1 + runner.buffCount * 0.6);
      }

      const frameDamage = damagePerSec * delta;
      boss.hp -= frameDamage;

      // Boss poise reduction
      boss.poise -= 4 * delta;
      if (boss.poise <= 0 && boss.currentAction !== 'windup') {
        boss.currentAction = 'staggered';
        boss.actionTimer = 1.0;
        state.damageNumbers.push({
          x: boss.x,
          y: boss.y - 40,
          value: 'STAGGERED!',
          color: '#fbbf24',
          life: 0.8,
        });
      }

      // Damage number popup occasionally
      if (Math.random() < 0.15) {
        state.damageNumbers.push({
          x: boss.x + (Math.random() - 0.5) * 60,
          y: boss.y + (Math.random() - 0.5) * 40,
          value: `-${Math.round(frameDamage * 6)}`,
          color: runner.buffCount > 0 ? '#ec4899' : '#e2e8f0',
          life: 0.6,
        });
      }
    }
  }
}

function triggerRunnerExploit(state: GameSimulationState, runner: Speedrunner) {
  let exploitType: 'wall_clip' | 'stagger_loop' | 'buff_stack' | 'dps_skip' = 'wall_clip';
  let title = '';
  let desc = '';

  if (runner.className === 'rogue') {
    exploitType = 'wall_clip';
    title = 'OUT-OF-BOUNDS CORNER CLIP';
    desc = `${runner.name} is attempting to clip through the corner collision mesh to DPS safely from out of bounds!`;
  } else if (runner.className === 'mage') {
    exploitType = 'buff_stack';
    title = 'UNCHECKED POTION OVERFLOW';
    desc = `${runner.name} is chugging illegal potion stacks to achieve a 1-shot burst build to skip Phase 2!`;
    runner.buffCount += 3;
    soundManager.playPotionSip();
  } else if (runner.className === 'tank') {
    exploitType = 'stagger_loop';
    title = 'INFINITE ANIMATION STAGGER LOCK';
    desc = `${runner.name} found an animation-cancel frame exploit to lock the Boss in infinite hitstun!`;
  } else {
    exploitType = 'dps_skip';
    title = 'COORDINATED DPS SKIP PROTOCOL';
    desc = `${runner.name} is rallying the speedrun party to burst Boss HP past the 50% cutscene threshold!`;
  }

  runner.activeExploit = exploitType;
  runner.exploitProgress = 0;

  soundManager.playGlitchAlert();

  const incident: GlitchIncident = {
    id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type: exploitType,
    runnerId: runner.id,
    runnerName: runner.name,
    title,
    description: desc,
    costMana: 25,
    timeLimit: 7.0, // 7 seconds before exploit succeeds!
    timeRemaining: 7.0,
    x: runner.x,
    y: runner.y,
    resolved: false,
  };

  state.glitches.push(incident);

  state.chatMessages.push({
    id: `chat_${Date.now()}`,
    user: runner.name,
    text: `Gonna exploit ${title}! Watch this clip!`,
    color: runner.color,
  });
}

function updateGlitches(state: GameSimulationState, delta: number) {
  for (let i = state.glitches.length - 1; i >= 0; i--) {
    const glitch = state.glitches[i];
    if (glitch.resolved) continue;

    glitch.timeRemaining -= delta;
    const runner = state.runners.find(r => r.id === glitch.runnerId);

    if (runner) {
      runner.exploitProgress = (1 - (glitch.timeRemaining / glitch.timeLimit)) * 100;
    }

    // Exploit timed out and SUCCEEDED!
    if (glitch.timeRemaining <= 0) {
      glitch.resolved = true;
      if (runner) {
        runner.activeExploit = 'none';
        runner.exploitProgress = 0;
      }

      // Exploit consequence
      if (glitch.type === 'dps_skip' || glitch.type === 'buff_stack') {
        // Massive burst damage dealt to boss
        state.boss.hp -= 400;
        state.damageNumbers.push({
          x: state.boss.x,
          y: state.boss.y - 50,
          value: 'CHEESE BURST! -400 HP',
          color: '#ef4444',
          life: 1.5,
          isCrit: true,
        });
      }

      state.darkLordApproval = Math.max(0, state.darkLordApproval - 20);
      state.dramaticTension = Math.max(0, state.dramaticTension - 15);

      state.chatMessages.push({
        id: `chat_${Date.now()}`,
        user: 'AnyPercentGod',
        text: 'LMAOOO EXPLOIT WENT THROUGH!! DEVS ARE ASLEEP!!',
        color: '#f97316',
      });
    }
  }

  // Remove resolved glitches after a bit
  state.glitches = state.glitches.filter(g => !g.resolved || g.timeRemaining > -2);
}

function updateTraps(state: GameSimulationState, delta: number) {
  for (let i = state.traps.length - 1; i >= 0; i--) {
    const trap = state.traps[i];
    trap.duration -= delta;

    // Trap effect on runners
    for (const runner of state.runners) {
      if (!runner.isAlive) continue;
      if (dist(trap.x, trap.y, runner.x, runner.y) <= trap.radius) {
        if (trap.type === 'lava_pool') {
          runner.hp -= 18 * delta;
          runner.vx *= 0.5;
          runner.vy *= 0.5;
        } else if (trap.type === 'anti_roll_spikes') {
          if (runner.isRolling) {
            runner.isRolling = false;
            runner.hp -= 30;
            runner.isStunned = true;
            runner.stunTimer = 0.8;
            state.damageNumbers.push({
              x: runner.x,
              y: runner.y - 30,
              value: 'ROLL PUNISHED!',
              color: '#ef4444',
              life: 1.0,
            });
          }
        }
      }
    }

    if (trap.duration <= 0) {
      state.traps.splice(i, 1);
    }
  }
}

function updateParticlesAndNumbers(state: GameSimulationState, delta: number) {
  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.life -= delta;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  // Damage numbers
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const dn = state.damageNumbers[i];
    dn.y -= 30 * delta;
    dn.life -= delta;
    if (dn.life <= 0) {
      state.damageNumbers.splice(i, 1);
    }
  }
}

function checkPhaseAndGameConditions(state: GameSimulationState) {
  const { boss } = state;
  const hpPercent = boss.hp / boss.maxHp;

  // 1. Did speedrunners kill the boss BEFORE triggering Phase 2?
  if (boss.hp <= 0 && !boss.phase2Triggered) {
    state.phase = 'defeat';
    state.defeatReason = 'PHASE 2 WAS SKIPPED! The speedrunners nuked the boss before the transition cutscene! You have been FIRED by the Dark Lord!';
    soundManager.playFiredBuzzer();
    soundManager.stopBGM();
    return;
  }

  // 2. Are all speedrunners dead?
  const allRunnersDead = state.runners.every(r => !r.isAlive);
  if (allRunnersDead) {
    state.phase = 'victory';
    soundManager.playVictory();
    soundManager.stopBGM();
    return;
  }

  // 3. Did boss die in Phase 2?
  if (boss.hp <= 0 && boss.phase2Triggered) {
    if (state.dramaticTension >= 60) {
      state.phase = 'victory'; // Cinematic heroic defeat that thrilled the audience!
      soundManager.playVictory();
      soundManager.stopBGM();
    } else {
      state.phase = 'defeat';
      state.defeatReason = 'The boss fell in Phase 2, but the fight lacked dramatic tension! The Dark Lord was bored.';
      soundManager.playFiredBuzzer();
      soundManager.stopBGM();
    }
    return;
  }

  // 4. Warning when nearing 50% without Phase 2 triggered
  if (hpPercent <= 0.55 && !boss.phase2Triggered && state.darkLordMessages.length <= 2) {
    state.darkLordMessages.push({
      id: `dl_warning_${Date.now()}`,
      sender: 'Overlord_Xzar [CEO]',
      text: 'ALERT: Boss HP is at 55%! PREPARE THE PHASE 2 TRANSITION IMMEDIATELY! DO NOT LET THEM BURST HIM DOWN!',
      sentiment: 'panicked',
      timestamp: formatTime(state.raidTime),
    });
  }
}

function updateChatter(state: GameSimulationState, delta: number) {
  // Random twitch chat message
  if (Math.random() < 0.04) {
    const randomMsg = TWITCH_CHATTERS[Math.floor(Math.random() * TWITCH_CHATTERS.length)];
    state.chatMessages.push({
      id: `twitch_${Date.now()}_${Math.random()}`,
      user: randomMsg.user,
      text: randomMsg.text,
      color: randomMsg.color,
    });
    if (state.chatMessages.length > 50) {
      state.chatMessages.shift();
    }
  }

  // Random runner chatter
  for (const runner of state.runners) {
    if (!runner.isAlive) continue;
    runner.lastChatTime += delta;
    if (runner.lastChatTime >= runner.chatFrequency) {
      runner.lastChatTime = 0;
      const text = RUNNER_CHATTER[Math.floor(Math.random() * RUNNER_CHATTER.length)];
      state.chatMessages.push({
        id: `runner_chat_${Date.now()}_${runner.id}`,
        user: runner.name,
        text,
        color: runner.color,
      });
    }
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function createExplosionParticles(
  state: GameSimulationState,
  x: number,
  y: number,
  radius: number,
  color: string
) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * (radius * 0.8);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 3 + Math.random() * 5,
      alpha: 1,
    });
  }
}

// User Actions
export function resolveHotpatch(state: GameSimulationState, incidentId: string): GameSimulationState {
  const incidentIndex = state.glitches.findIndex(g => g.id === incidentId);
  if (incidentIndex === -1) return state;

  const incident = state.glitches[incidentIndex];
  if (state.devMana < incident.costMana) return state; // Not enough mana

  const newState = { ...state };
  newState.devMana -= incident.costMana;

  // Mark incident resolved
  newState.glitches[incidentIndex] = { ...incident, resolved: true };

  // Reset runner exploit
  const runner = newState.runners.find(r => r.id === incident.runnerId);
  if (runner) {
    runner.activeExploit = 'none';
    runner.exploitProgress = 0;
    runner.buffCount = 0; // Cleared potion buff stack
    runner.isStunned = true;
    runner.stunTimer = 1.0; // Stunned by the hotfix!
  }

  soundManager.playHotfixApplied();

  newState.damageNumbers.push({
    x: incident.x,
    y: incident.y - 30,
    value: 'HOTFIX DEPLOYED!',
    color: '#10b981',
    life: 1.2,
  });

  newState.dramaticTension = Math.min(100, newState.dramaticTension + 8);
  newState.darkLordApproval = Math.min(100, newState.darkLordApproval + 5);

  newState.chatMessages.push({
    id: `chat_hotfix_${Date.now()}`,
    user: 'SystemAdmin',
    text: `[HOTPATCH] Successfully patched ${incident.title}. Exploit nullified.`,
    color: '#10b981',
  });

  return newState;
}

export function deployArenaTrap(
  state: GameSimulationState,
  trapType: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes',
  x: number,
  y: number
): GameSimulationState {
  const cost = trapType === 'invisible_wall' ? 25 : trapType === 'lava_pool' ? 20 : 15;
  if (state.devMana < cost) return state;

  soundManager.playTrapPlaced();

  const newState = { ...state };
  newState.devMana -= cost;
  newState.traps.push({
    id: `trap_${Date.now()}`,
    type: trapType,
    x,
    y,
    radius: trapType === 'lava_pool' ? 65 : 45,
    duration: 12.0, // seconds
  });

  return newState;
}

export function queueBossAttack(
  state: GameSimulationState,
  attack: BossAttack
): GameSimulationState {
  if (state.devMana < attack.manaCost) return state;
  if (attack.phaseRequired > state.boss.phase) return state;
  if ((state.bossAttackCooldowns[attack.id] || 0) > 0) return state;

  const newState = { ...state };
  newState.devMana -= attack.manaCost;
  newState.attackQueue.push({
    attack,
    timeRemaining: attack.windupTime,
    totalTime: attack.windupTime,
  });
  newState.bossAttackCooldowns[attack.id] = attack.cooldown;

  return newState;
}

// THE SACRED BUTTON: Trigger Phase 2 Transition!
export function triggerPhase2Transition(state: GameSimulationState): GameSimulationState {
  if (state.boss.phase2Triggered) return state;

  const newState = { ...state };
  newState.boss.phase = 2;
  newState.boss.phase2Triggered = true;
  newState.boss.isInvulnerable = true;
  newState.boss.currentAction = 'cutscene';
  newState.phase = 'phase2_transition';
  newState.dramaticTension = 100; // Peak drama!
  newState.darkLordApproval = 100;

  soundManager.playPhase2Cutscene();

  // Reset boss HP to 65% for Phase 2 epic battle
  newState.boss.hp = Math.round(newState.boss.maxHp * 0.65);

  // Push epic dark lord communication
  newState.darkLordMessages.push({
    id: `dl_phase2_${Date.now()}`,
    sender: 'Overlord_Xzar [CEO]',
    text: 'MAGNIFICENT! THE ORCHESTRAL TRACK IS POPPING OFF! NOW UNLEASH THE APOCALYPSE LASER AND CRUSH THEM!',
    sentiment: 'satisfied',
    timestamp: formatTime(newState.raidTime),
  });

  return newState;
}

// Complete Phase 2 Cutscene and start Phase 2 Combat
export function finishPhase2Cutscene(state: GameSimulationState): GameSimulationState {
  const newState = { ...state };
  newState.phase = 'phase2';
  newState.boss.isInvulnerable = false;
  newState.boss.currentAction = 'idle';
  newState.boss.actionTimer = 1.0;
  
  soundManager.startBGM(2);

  return newState;
}

// Mortal Kombat / Elden Ring: Melee Combo Hit
export function performMeleeComboHit(state: GameSimulationState): GameSimulationState {
  const newState = { ...state };
  const { boss } = newState;

  // Find nearest speedrunner
  let nearestRunner: Speedrunner | null = null;
  let minDist = 90; // Melee reach

  for (const runner of newState.runners) {
    if (!runner.isAlive) continue;
    const d = dist(boss.x, boss.y, runner.x, runner.y);
    if (d < minDist) {
      minDist = d;
      nearestRunner = runner;
    }
  }

  if (nearestRunner) {
    // Crunch sound
    soundManager.playHeavyImpact();

    // Damage & Posture Damage
    const hitDamage = Math.round(25 + Math.random() * 15);
    nearestRunner.hp = Math.max(0, nearestRunner.hp - hitDamage);
    nearestRunner.posture = Math.max(0, nearestRunner.posture - 28);

    // Knockback
    const angle = Math.atan2(nearestRunner.y - boss.y, nearestRunner.x - boss.x);
    nearestRunner.vx = Math.cos(angle) * 160;
    nearestRunner.vy = Math.sin(angle) * 160;

    // Increment combo
    newState.comboCount = (newState.comboCount || 0) + 1;
    newState.comboTimer = 2.5;

    // Check wanted stars
    if (newState.comboCount >= 8) newState.wantedStars = Math.min(5, Math.max(newState.wantedStars, 4));
    else if (newState.comboCount >= 4) newState.wantedStars = Math.min(5, Math.max(newState.wantedStars, 3));
    else if (newState.comboCount >= 2) newState.wantedStars = Math.min(5, Math.max(newState.wantedStars, 2));

    // Blood / Spark Particles
    createExplosionParticles(newState, nearestRunner.x, nearestRunner.y, 45, '#ef4444');
    createExplosionParticles(newState, nearestRunner.x, nearestRunner.y, 30, '#f59e0b');

    // Pop damage number with Mortal Kombat font vibe
    newState.damageNumbers.push({
      x: nearestRunner.x,
      y: nearestRunner.y - 25,
      value: `${hitDamage} DMG! [${newState.comboCount}x COMBO]`,
      color: '#fbbf24',
      life: 0.8,
      isCrit: true,
    });

    // Check Posture Break (Elden Ring)
    if (nearestRunner.posture <= 0 && !nearestRunner.isPostureBroken) {
      nearestRunner.isPostureBroken = true;
      nearestRunner.isStunned = true;
      nearestRunner.stunTimer = 4.0;
      soundManager.playPostureBreak();

      newState.damageNumbers.push({
        x: nearestRunner.x,
        y: nearestRunner.y - 45,
        value: 'POSTURE BROKEN! [PRESS E TO EXECUTE]',
        color: '#f43f5e',
        life: 2.5,
        isCrit: true,
      });
    }

    if (nearestRunner.hp <= 0) {
      nearestRunner.isAlive = false;
      soundManager.playRunnerKilled();
      newState.damageNumbers.push({
        x: nearestRunner.x,
        y: nearestRunner.y - 40,
        value: 'FATALITY!',
        color: '#ef4444',
        life: 1.8,
      });
    }
  }

  return newState;
}

// Elden Ring Visceral Riposte / Mortal Kombat FATALITY Finisher
export function executeVisceralRiposte(state: GameSimulationState): GameSimulationState {
  const newState = { ...state };
  const { boss } = newState;

  // Find nearest posture broken runner
  const brokenRunner = newState.runners.find(
    r => r.isAlive && r.isPostureBroken && dist(boss.x, boss.y, r.x, r.y) < 120
  );

  if (brokenRunner) {
    brokenRunner.hp = 0;
    brokenRunner.isAlive = false;
    brokenRunner.isPostureBroken = false;

    soundManager.playCriticalRiposte();
    soundManager.playAnnouncerFatality();

    newState.devMana = Math.min(newState.maxDevMana, newState.devMana + 35);
    newState.dramaticTension = Math.min(100, newState.dramaticTension + 20);
    newState.comboCount += 5;
    newState.announcerBanner = 'FATALITY! EXPLOITER TERMINATED!';

    // Screen-clearing explosion particles
    createExplosionParticles(newState, brokenRunner.x, brokenRunner.y, 100, '#dc2626');
    createExplosionParticles(newState, brokenRunner.x, brokenRunner.y, 80, '#facc15');

    newState.damageNumbers.push({
      x: brokenRunner.x,
      y: brokenRunner.y - 40,
      value: 'HOTFIX FATALITY! 9999 DMG',
      color: '#dc2626',
      life: 2.5,
      isCrit: true,
    });

    newState.chatMessages.push({
      id: `chat_fatality_${Date.now()}`,
      user: 'TwitchChat_Andy',
      text: 'HE HIT THE FATALITY ON MAIN STAGE POGGGGG',
      color: '#ec4899',
    });
  }

  return newState;
}
