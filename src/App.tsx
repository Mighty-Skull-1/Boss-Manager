import { useRef, useEffect, useState, useCallback } from 'react';
import { soundManager } from './audio/soundManager';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, RotateCcw, Flame, Zap, Sparkles, Shield, Sword, Skull, Trophy } from 'lucide-react';

interface Runner {
  id: string;
  name: string;
  className: 'rogue' | 'mage' | 'tank' | 'bard';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
  exploit: 'none' | 'corner_clip' | 'potion_stack';
  exploitTimer: number;
  attackTimer: number;
  speechText: string;
  speechTimer: number;
  isAlive: boolean;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  life: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SlashWave {
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

interface Decal {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio mute
  const [isMuted, setIsMuted] = useState(false);

  // Game Core State
  const [bossHp, setBossHp] = useState(1000);
  const bossMaxHp = 1000;
  const [isPhase2, setIsPhase2] = useState(false);
  const [canPhase2, setCanPhase2] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  const [defeatReason, setDefeatReason] = useState('');
  const [runnersAlive, setRunnersAlive] = useState(4);
  const [raidTime, setRaidTime] = useState(0);

  // Dash & Slam Cooldowns for UI HUD
  const [dashCdPct, setDashCdPct] = useState(0);
  const [slamCdPct, setSlamCdPct] = useState(0);

  // Player Boss 2D Position & Physics
  const player = useRef({
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 34,
    angle: 0,
    speed: 5.6,
    isSlashing: false,
    slashProgress: 0,
    slashCooldown: 0,
    slamCooldown: 0,
    dashCooldown: 0,
    isDashing: false,
    dashTimer: 0,
  });

  const mousePos = useRef({ x: 400, y: 300 });
  const keys = useRef<Record<string, boolean>>({});
  const particles = useRef<Particle[]>([]);
  const slashWaves = useRef<SlashWave[]>([]);
  const shockwaves = useRef<Shockwave[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const decals = useRef<Decal[]>([]);
  const screenShake = useRef(0);
  const screenFlash = useRef(0);
  const nextId = useRef(1);

  // Speedrunners
  const runners = useRef<Runner[]>([
    {
      id: 'r1',
      name: 'xX_GamerGlitch_Xx',
      className: 'rogue',
      x: 180,
      y: 160,
      vx: 0,
      vy: 0,
      hp: 180,
      maxHp: 180,
      color: '#10b981',
      exploit: 'corner_clip',
      exploitTimer: 0,
      attackTimer: 1.0,
      speechText: 'Heading to corner clip!',
      speechTimer: 2.5,
      isAlive: true,
    },
    {
      id: 'r2',
      name: 'MinMaxGod',
      className: 'mage',
      x: 620,
      y: 160,
      vx: 0,
      vy: 0,
      hp: 150,
      maxHp: 150,
      color: '#a855f7',
      exploit: 'potion_stack',
      exploitTimer: 0,
      attackTimer: 1.5,
      speechText: 'Chugging buff potions!',
      speechTimer: 2.5,
      isAlive: true,
    },
    {
      id: 'r3',
      name: 'ParryGod69',
      className: 'tank',
      x: 220,
      y: 440,
      vx: 0,
      vy: 0,
      hp: 280,
      maxHp: 280,
      color: '#3b82f6',
      exploit: 'none',
      exploitTimer: 0,
      attackTimer: 0.8,
      speechText: 'Holding aggro!',
      speechTimer: 2.5,
      isAlive: true,
    },
    {
      id: 'r4',
      name: 'TwitchChat_Andy',
      className: 'bard',
      x: 580,
      y: 440,
      vx: 0,
      vy: 0,
      hp: 160,
      maxHp: 160,
      color: '#f59e0b',
      exploit: 'none',
      exploitTimer: 0,
      attackTimer: 1.2,
      speechText: 'Sub 2 is ON PACE!',
      speechTimer: 2.5,
      isAlive: true,
    },
  ]);

  // Restart / Reset
  const restartGame = useCallback(() => {
    player.current.x = 400;
    player.current.y = 300;
    player.current.vx = 0;
    player.current.vy = 0;
    player.current.dashCooldown = 0;
    player.current.slamCooldown = 0;
    player.current.slashCooldown = 0;
    player.current.isDashing = false;

    setBossHp(1000);
    setIsPhase2(false);
    setCanPhase2(false);
    setIsGameOver(false);
    setGameResult(null);
    setDefeatReason('');
    setRunnersAlive(4);
    setRaidTime(0);

    particles.current = [];
    slashWaves.current = [];
    shockwaves.current = [];
    projectiles.current = [];
    floatingTexts.current = [];
    decals.current = [];
    screenShake.current = 0;
    screenFlash.current = 0;

    runners.current = [
      {
        id: 'r1',
        name: 'xX_GamerGlitch_Xx',
        className: 'rogue',
        x: 180,
        y: 160,
        vx: 0,
        vy: 0,
        hp: 180,
        maxHp: 180,
        color: '#10b981',
        exploit: 'corner_clip',
        exploitTimer: 0,
        attackTimer: 1.0,
        speechText: 'Heading to corner clip!',
        speechTimer: 2.5,
        isAlive: true,
      },
      {
        id: 'r2',
        name: 'MinMaxGod',
        className: 'mage',
        x: 620,
        y: 160,
        vx: 0,
        vy: 0,
        hp: 150,
        maxHp: 150,
        color: '#a855f7',
        exploit: 'potion_stack',
        exploitTimer: 0,
        attackTimer: 1.5,
        speechText: 'Chugging buff potions!',
        speechTimer: 2.5,
        isAlive: true,
      },
      {
        id: 'r3',
        name: 'ParryGod69',
        className: 'tank',
        x: 220,
        y: 440,
        vx: 0,
        vy: 0,
        hp: 280,
        maxHp: 280,
        color: '#3b82f6',
        exploit: 'none',
        exploitTimer: 0,
        attackTimer: 0.8,
        speechText: 'Holding aggro!',
        speechTimer: 2.5,
        isAlive: true,
      },
      {
        id: 'r4',
        name: 'TwitchChat_Andy',
        className: 'bard',
        x: 580,
        y: 440,
        vx: 0,
        vy: 0,
        hp: 160,
        maxHp: 160,
        color: '#f59e0b',
        exploit: 'none',
        exploitTimer: 0,
        attackTimer: 1.2,
        speechText: 'Sub 2 is ON PACE!',
        speechTimer: 2.5,
        isAlive: true,
      },
    ];

    soundManager.startBGM(1);
  }, []);

  // Spawn floating combat text
  const addFloatingText = (x: number, y: number, text: string, color: string, size = 14) => {
    floatingTexts.current.push({
      id: nextId.current++,
      x,
      y,
      text,
      color,
      life: 0.9,
      maxLife: 0.9,
      size,
    });
  };

  // Trigger Phase 2 Metamorphosis
  const triggerPhase2 = useCallback(() => {
    if (isPhase2) return;
    setIsPhase2(true);
    setCanPhase2(false);
    setBossHp(prev => Math.min(bossMaxHp, prev + 350));
    soundManager.playPhase2Cutscene();
    soundManager.startBGM(2);

    screenShake.current = 24;
    screenFlash.current = 1.0;

    addFloatingText(player.current.x, player.current.y - 50, 'PHASE 2 AWAKENED! +350 HP', '#ec4899', 20);

    // Repel explosion pushing all speedrunners
    runners.current.forEach(runner => {
      if (!runner.isAlive) return;
      const angle = Math.atan2(runner.y - player.current.y, runner.x - player.current.x);
      runner.vx = Math.cos(angle) * 22;
      runner.vy = Math.sin(angle) * 22;
      runner.hp -= 40;
      runner.speechText = 'NANI?! PHASE 2 CINEMATIC!';
      runner.speechTimer = 3.0;
    });

    // Clear all projectiles on Phase 2 burst
    projectiles.current = [];

    // Blast particles around boss
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      const spd = 6 + Math.random() * 12;
      particles.current.push({
        x: player.current.x,
        y: player.current.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.9,
        maxLife: 0.9,
        color: Math.random() > 0.5 ? '#ec4899' : '#f43f5e',
        size: 5 + Math.random() * 6,
      });
    }

    shockwaves.current.push({
      x: player.current.x,
      y: player.current.y,
      radius: 10,
      maxRadius: 360,
      life: 0.5,
    });
  }, [isPhase2, bossMaxHp]);

  // Audio Mute Toggle
  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Player Actions: Sword Slash
  const performSlash = useCallback(() => {
    const p = player.current;
    if (p.slashCooldown > 0) return;
    p.slashCooldown = 0.22;
    p.isSlashing = true;
    p.slashProgress = 0;
    soundManager.playBossAttack();

    const slashRadius = isPhase2 ? 145 : 105;
    const slashDmg = isPhase2 ? 85 : 45;

    slashWaves.current.push({
      x: p.x,
      y: p.y,
      angle: p.angle,
      radius: slashRadius,
      life: 0.22,
    });

    screenShake.current = Math.max(screenShake.current, isPhase2 ? 8 : 4);

    // Deflect / destroy projectiles in slash path
    for (let i = projectiles.current.length - 1; i >= 0; i--) {
      const proj = projectiles.current[i];
      const d = Math.hypot(proj.x - p.x, proj.y - p.y);
      if (d <= slashRadius + 20) {
        const angleToProj = Math.atan2(proj.y - p.y, proj.x - p.x);
        let angleDiff = Math.abs(angleToProj - p.angle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff < Math.PI / 1.7) {
          // Deflect projectile!
          projectiles.current.splice(i, 1);
          addFloatingText(proj.x, proj.y, 'DEFLECTED!', '#38bdf8', 12);
          soundManager.playRunnerRoll();
          for (let k = 0; k < 6; k++) {
            particles.current.push({
              x: proj.x,
              y: proj.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 0.3,
              maxLife: 0.3,
              color: '#38bdf8',
              size: 4,
            });
          }
        }
      }
    }

    // Check hit against runners
    runners.current.forEach(runner => {
      if (!runner.isAlive) return;
      const d = Math.hypot(runner.x - p.x, runner.y - p.y);
      if (d <= slashRadius + 15) {
        const angleToRunner = Math.atan2(runner.y - p.y, runner.x - p.x);
        let angleDiff = Math.abs(angleToRunner - p.angle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff < Math.PI / 1.8) {
          // Hit!
          runner.hp -= slashDmg;
          runner.vx = Math.cos(angleToRunner) * 10;
          runner.vy = Math.sin(angleToRunner) * 10;

          addFloatingText(
            runner.x,
            runner.y - 20,
            isPhase2 ? `-${slashDmg} CRIT!` : `-${slashDmg}`,
            isPhase2 ? '#fb7185' : '#f59e0b',
            isPhase2 ? 16 : 13
          );

          // Interrupt exploits
          if (runner.exploit !== 'none') {
            runner.exploit = 'none';
            runner.speechText = 'HOTFIXED! Exploit cancelled!';
            runner.speechTimer = 2.0;
            addFloatingText(runner.x, runner.y - 36, 'HOTFIXED!', '#06b6d4', 15);
            soundManager.playHotfixApplied();
          }

          // Blood/Sparks particles
          for (let i = 0; i < 14; i++) {
            particles.current.push({
              x: runner.x,
              y: runner.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 0.35,
              maxLife: 0.35,
              color: isPhase2 ? '#f43f5e' : '#f59e0b',
              size: 3 + Math.random() * 4,
            });
          }

          if (runner.hp <= 0) {
            runner.isAlive = false;
            soundManager.playRunnerKilled();
            addFloatingText(runner.x, runner.y - 25, 'ELIMINATED!', '#ef4444', 16);
          }
        }
      }
    });
  }, [isPhase2]);

  // Player Actions: Seismic Ground Slam
  const performGroundSlam = useCallback(() => {
    const p = player.current;
    if (p.slamCooldown > 0) return;
    p.slamCooldown = 1.4;
    soundManager.playHeavyImpact();

    const slamRadius = isPhase2 ? 230 : 160;
    const slamDmg = isPhase2 ? 120 : 65;

    screenShake.current = 14;

    shockwaves.current.push({
      x: p.x,
      y: p.y,
      radius: 12,
      maxRadius: slamRadius,
      life: 0.38,
    });

    // Scorch crater decal
    decals.current.push({
      x: p.x,
      y: p.y,
      radius: slamRadius * 0.7,
      life: 6.0,
      maxLife: 6.0,
    });

    // Destroy all projectiles in slam radius
    for (let i = projectiles.current.length - 1; i >= 0; i--) {
      const proj = projectiles.current[i];
      if (Math.hypot(proj.x - p.x, proj.y - p.y) <= slamRadius) {
        projectiles.current.splice(i, 1);
      }
    }

    // Hit runners
    runners.current.forEach(runner => {
      if (!runner.isAlive) return;
      const d = Math.hypot(runner.x - p.x, runner.y - p.y);
      if (d <= slamRadius) {
        runner.hp -= slamDmg;
        const angle = Math.atan2(runner.y - p.y, runner.x - p.x);
        runner.vx = Math.cos(angle) * 15;
        runner.vy = Math.sin(angle) * 15;

        addFloatingText(
          runner.x,
          runner.y - 20,
          `-${slamDmg} SLAM!`,
          isPhase2 ? '#ec4899' : '#f97316',
          16
        );

        if (runner.exploit !== 'none') {
          runner.exploit = 'none';
          runner.speechText = 'STUNNED BY SLAM!';
          runner.speechTimer = 2.0;
        }

        if (runner.hp <= 0) {
          runner.isAlive = false;
          soundManager.playRunnerKilled();
          addFloatingText(runner.x, runner.y - 25, 'ELIMINATED!', '#ef4444', 16);
        }
      }
    });
  }, [isPhase2]);

  // Keyboard & Mouse Listeners
  useEffect(() => {
    soundManager.startBGM(1);

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;

      // Space to Dash (or restart if game over)
      if (e.code === 'Space') {
        if (isGameOver) {
          restartGame();
          return;
        }
        if (player.current.dashCooldown <= 0) {
          player.current.isDashing = true;
          player.current.dashTimer = 0.24;
          player.current.dashCooldown = 0.85;
          soundManager.playRunnerRoll();
        }
      }

      // Enter to restart if game over
      if (e.code === 'Enter' && isGameOver) {
        restartGame();
      }

      // R to Trigger Phase 2 Cutscene
      if (e.code === 'KeyR' && canPhase2 && !isPhase2) {
        triggerPhase2();
      }

      // E or Right click to Slam
      if (e.code === 'KeyE' && player.current.slamCooldown <= 0) {
        performGroundSlam();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mousePos.current.x = (e.clientX - rect.left) * scaleX;
      mousePos.current.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isGameOver) return;
      if (e.button === 0) {
        performSlash();
      } else if (e.button === 2) {
        e.preventDefault();
        performGroundSlam();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [canPhase2, isPhase2, isGameOver, triggerPhase2, performSlash, performGroundSlam, restartGame]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const p = player.current;

      // Update cooldown HUD states
      setDashCdPct(Math.max(0, p.dashCooldown / 0.85));
      setSlamCdPct(Math.max(0, p.slamCooldown / 1.4));

      // 1. Player Physics & Input (if alive)
      if (!isGameOver) {
        let moveX = 0;
        let moveY = 0;
        if (keys.current['KeyW'] || keys.current['ArrowUp']) moveY -= 1;
        if (keys.current['KeyS'] || keys.current['ArrowDown']) moveY += 1;
        if (keys.current['KeyA'] || keys.current['ArrowLeft']) moveX -= 1;
        if (keys.current['KeyD'] || keys.current['ArrowRight']) moveX += 1;

        // Dash logic
        if (p.isDashing) {
          p.dashTimer -= 0.016;
          if (p.dashTimer <= 0) p.isDashing = false;
        }
        if (p.dashCooldown > 0) p.dashCooldown -= 0.016;
        if (p.slamCooldown > 0) p.slamCooldown -= 0.016;
        if (p.slashCooldown > 0) p.slashCooldown -= 0.016;

        const currentSpeed = (p.isDashing ? 13 : p.speed) * (isPhase2 ? 1.25 : 1.0);
        if (moveX !== 0 || moveY !== 0) {
          const mag = Math.hypot(moveX, moveY);
          p.vx = (moveX / mag) * currentSpeed;
          p.vy = (moveY / mag) * currentSpeed;
        } else {
          p.vx *= 0.72;
          p.vy *= 0.72;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Arena walls clamp (canvas 800x600, borders 70..730 on X, 70..530 on Y)
        p.x = Math.max(70, Math.min(730, p.x));
        p.y = Math.max(70, Math.min(530, p.y));

        // Aim towards mouse
        p.angle = Math.atan2(mousePos.current.y - p.y, mousePos.current.x - p.x);

        // Dash fire trail
        if (p.isDashing) {
          particles.current.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 0.28,
            maxLife: 0.28,
            color: isPhase2 ? '#ec4899' : '#f97316',
            size: 7,
          });
        }

        // 2. Speedrunners AI, Projectiles & Exploits
        let aliveCount = 0;
        runners.current.forEach(runner => {
          if (!runner.isAlive) return;
          aliveCount++;

          if (runner.speechTimer > 0) runner.speechTimer -= 0.016;
          runner.attackTimer -= 0.016;

          // Friction & motion
          runner.vx *= 0.86;
          runner.vy *= 0.86;
          runner.x += runner.vx;
          runner.y += runner.vy;

          const dToBoss = Math.hypot(p.x - runner.x, p.y - runner.y);

          // Attack logic: fire projectiles towards boss
          if (runner.attackTimer <= 0) {
            const angleToBoss = Math.atan2(p.y - runner.y, p.x - runner.x);

            if (runner.className === 'mage') {
              runner.attackTimer = 2.2;
              // Arcane purple missile
              projectiles.current.push({
                id: nextId.current++,
                x: runner.x,
                y: runner.y,
                vx: Math.cos(angleToBoss) * 3.8,
                vy: Math.sin(angleToBoss) * 3.8,
                radius: 7,
                color: '#a855f7',
                damage: 22,
                life: 3.5,
              });
            } else if (runner.className === 'rogue') {
              runner.attackTimer = 1.8;
              // Poison green dagger
              projectiles.current.push({
                id: nextId.current++,
                x: runner.x,
                y: runner.y,
                vx: Math.cos(angleToBoss) * 5.2,
                vy: Math.sin(angleToBoss) * 5.2,
                radius: 5,
                color: '#10b981',
                damage: 15,
                life: 2.5,
              });
            } else if (runner.className === 'bard') {
              runner.attackTimer = 2.0;
              // Sonic yellow pulse
              projectiles.current.push({
                id: nextId.current++,
                x: runner.x,
                y: runner.y,
                vx: Math.cos(angleToBoss) * 3.2,
                vy: Math.sin(angleToBoss) * 3.2,
                radius: 8,
                color: '#f59e0b',
                damage: 18,
                life: 3.0,
              });
            } else if (runner.className === 'tank') {
              runner.attackTimer = 1.5;
              if (dToBoss < 80) {
                // Melee tank bash
                setBossHp(prev => Math.max(0, prev - 15));
                addFloatingText(p.x, p.y - 30, '-15 BASH', '#3b82f6', 14);
                soundManager.playTelegraph();
              }
            }
          }

          // Runner AI Movement & Exploits
          if (runner.exploit === 'corner_clip') {
            const angle = Math.atan2(90 - runner.y, 90 - runner.x);
            runner.x += Math.cos(angle) * 2.3;
            runner.y += Math.sin(angle) * 2.3;

            if (Math.hypot(90 - runner.x, 90 - runner.y) < 30) {
              setBossHp(prev => Math.max(0, prev - 1.4));
              runner.speechText = 'CORNER CLIPPING! SKIPPING P2!';
              runner.speechTimer = 1.0;
            }
          } else if (runner.exploit === 'potion_stack') {
            if (dToBoss < 280) {
              const angleAway = Math.atan2(runner.y - p.y, runner.x - p.x);
              runner.x += Math.cos(angleAway) * 2.4;
              runner.y += Math.sin(angleAway) * 2.4;
            }
            runner.exploitTimer += 0.016;
            if (runner.exploitTimer >= 3.5) {
              runner.exploitTimer = 0;
              setBossHp(prev => Math.max(0, prev - 80));
              runner.speechText = 'POTION OVERFLOW! -80 HP!';
              runner.speechTimer = 2.0;
              addFloatingText(p.x, p.y - 35, '-80 POTION OVERFLOW!', '#ec4899', 18);
              soundManager.playHeavyImpact();
              screenShake.current = 10;
            }
          } else {
            const targetDist = runner.className === 'tank' ? 85 : 220;
            if (dToBoss > targetDist + 25) {
              const a = Math.atan2(p.y - runner.y, p.x - runner.x);
              runner.x += Math.cos(a) * 2.1;
              runner.y += Math.sin(a) * 2.1;
            } else if (dToBoss < targetDist - 25) {
              const a = Math.atan2(runner.y - p.y, runner.x - p.x);
              runner.x += Math.cos(a) * 2.5;
              runner.y += Math.sin(a) * 2.5;
            }
          }

          // Clamp runners inside arena
          runner.x = Math.max(80, Math.min(720, runner.x));
          runner.y = Math.max(80, Math.min(520, runner.y));
        });

        setRunnersAlive(aliveCount);

        // 3. Projectile Updates & Collision with Boss
        for (let i = projectiles.current.length - 1; i >= 0; i--) {
          const proj = projectiles.current[i];
          proj.x += proj.vx;
          proj.y += proj.vy;
          proj.life -= 0.016;

          // Check hit boss
          const dToBoss = Math.hypot(p.x - proj.x, p.y - proj.y);
          if (dToBoss <= p.radius + proj.radius) {
            // If dashing, immune to damage!
            if (!p.isDashing) {
              setBossHp(prev => Math.max(0, prev - proj.damage));
              addFloatingText(p.x, p.y - 25, `-${proj.damage}`, '#ef4444', 13);
              soundManager.playTelegraph();
              screenShake.current = Math.max(screenShake.current, 5);

              for (let k = 0; k < 8; k++) {
                particles.current.push({
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  life: 0.25,
                  maxLife: 0.25,
                  color: proj.color,
                  size: 3,
                });
              }
            } else {
              addFloatingText(p.x, p.y - 25, 'DODGED!', '#38bdf8', 12);
            }
            projectiles.current.splice(i, 1);
            continue;
          }

          if (proj.life <= 0) {
            projectiles.current.splice(i, 1);
          }
        }

        // 4. Check Phase 2 Threshold (50% HP = 500)
        setBossHp(currentHp => {
          if (currentHp <= 500 && !isPhase2) {
            setCanPhase2(true);
          }
          if (currentHp <= 0) {
            setIsGameOver(true);
            if (!isPhase2) {
              setGameResult('defeat');
              setDefeatReason('PHASE 2 SKIPPED! The speedrunners burst you down in Phase 1 before you triggered Phase 2! The Dark Lord has FIRED you!');
            } else {
              setGameResult('defeat');
              setDefeatReason('DEFEAT: OVERWHELMED! Even with Phase 2 fury, the speedrunners chipped down your remaining health!');
            }
            soundManager.playFiredBuzzer();
            soundManager.stopBGM();
          }
          return currentHp;
        });

        // 5. Check Victory
        if (aliveCount === 0 && !isGameOver) {
          setIsGameOver(true);
          setGameResult('victory');
          soundManager.playVictory();
          soundManager.stopBGM();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        }

        setRaidTime(prev => prev + 0.016);
      }

      // Decrement screen shake & flash
      if (screenShake.current > 0) screenShake.current *= 0.9;
      if (screenFlash.current > 0) screenFlash.current -= 0.04;

      // 6. RENDER 2D CANVAS FRAME
      ctx.save();

      // Apply screen shake
      if (screenShake.current > 0.5) {
        const shakeAngle = Math.random() * Math.PI * 2;
        const shakeMag = screenShake.current;
        ctx.translate(Math.cos(shakeAngle) * shakeMag, Math.sin(shakeAngle) * shakeMag);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Arena Floor (Dungeon stone tiles with magma seams)
      ctx.fillStyle = isPhase2 ? '#180712' : '#080d1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floor grid tiles
      ctx.strokeStyle = isPhase2 ? 'rgba(244, 63, 94, 0.07)' : 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 60; x <= 740; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x, 540);
        ctx.stroke();
      }
      for (let y = 60; y <= 540; y += 40) {
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(740, y);
        ctx.stroke();
      }

      // Ground Scorch Decals
      for (let i = decals.current.length - 1; i >= 0; i--) {
        const d = decals.current[i];
        d.life -= 0.016;
        const alpha = Math.max(0, d.life / d.maxLife);
        ctx.save();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${alpha * 0.25})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        if (d.life <= 0) decals.current.splice(i, 1);
      }

      // Central Runic Pentagram Arena Sigil
      ctx.save();
      ctx.beginPath();
      ctx.arc(400, 300, 150, 0, Math.PI * 2);
      ctx.strokeStyle = isPhase2 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(400, 300, 80, 0, Math.PI * 2);
      ctx.strokeStyle = isPhase2 ? 'rgba(236, 72, 153, 0.2)' : 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Arena Wall Borders
      ctx.strokeStyle = isPhase2 ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 6;
      ctx.shadowColor = isPhase2 ? '#f43f5e' : '#0284c7';
      ctx.shadowBlur = 12;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
      ctx.shadowBlur = 0;

      // Ground Slam Shockwaves
      for (let i = shockwaves.current.length - 1; i >= 0; i--) {
        const sw = shockwaves.current[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.22;
        sw.life -= 0.016;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isPhase2 ? `rgba(244, 63, 94, ${sw.life * 3.5})` : `rgba(245, 158, 11, ${sw.life * 3.5})`;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        if (sw.life <= 0) shockwaves.current.splice(i, 1);
      }

      // Sword Slash Waves
      for (let i = slashWaves.current.length - 1; i >= 0; i--) {
        const sw = slashWaves.current[i];
        sw.life -= 0.016;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, sw.angle - Math.PI / 2.5, sw.angle + Math.PI / 2.5);
        ctx.strokeStyle = isPhase2 ? '#f43f5e' : '#f59e0b';
        ctx.lineWidth = 10;
        ctx.shadowColor = isPhase2 ? '#ec4899' : '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();

        if (sw.life <= 0) slashWaves.current.splice(i, 1);
      }

      // Render Speedrunners
      runners.current.forEach(runner => {
        if (!runner.isAlive) {
          // RIP Gravestone
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(runner.x, runner.y, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('RIP', runner.x, runner.y + 3);
          return;
        }

        // Speedrunner Body
        ctx.fillStyle = runner.color;
        ctx.beginPath();
        ctx.arc(runner.x, runner.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Class emblem inside body
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          runner.className === 'rogue' ? '🗡' :
          runner.className === 'mage' ? '✨' :
          runner.className === 'tank' ? '🛡' : '🎵',
          runner.x,
          runner.y
        );

        // Exploit aura indicator
        if (runner.exploit === 'corner_clip') {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(runner.x, runner.y, 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (runner.exploit === 'potion_stack') {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(runner.x, runner.y, 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // HP bar above head
        const barW = 42;
        const hpPct = Math.max(0, runner.hp / runner.maxHp);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(runner.x - barW / 2, runner.y - 30, barW, 6);
        ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : '#ef4444';
        ctx.fillRect(runner.x - barW / 2, runner.y - 30, barW * hpPct, 6);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(runner.x - barW / 2, runner.y - 30, barW, 6);

        // Runner Name
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(runner.name, runner.x, runner.y - 35);

        // Overhead Speech Bubble
        if (runner.speechTimer > 0) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = runner.color;
          ctx.lineWidth = 1.5;
          const textW = Math.max(100, ctx.measureText(runner.speechText).width + 16);
          ctx.fillRect(runner.x - textW / 2, runner.y + 22, textW, 18);
          ctx.strokeRect(runner.x - textW / 2, runner.y + 22, textW, 18);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(runner.speechText, runner.x, runner.y + 34);
        }
      });

      // Render Speedrunner Projectiles
      projectiles.current.forEach(proj => {
        ctx.save();
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Boss (Player: Lord Ignis)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Phase 2 Flaming Arch-Demon Wings
      if (isPhase2) {
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 18;

        // Dynamic wing flap angle
        const wingFlap = Math.sin(raidTime * 12) * 6;

        // Left Wing
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(-52, -58 + wingFlap);
        ctx.lineTo(-28, -32);
        ctx.lineTo(-58, -32 + wingFlap);
        ctx.lineTo(-8, -18);
        ctx.closePath();
        ctx.fill();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(-12, 12);
        ctx.lineTo(-52, 58 - wingFlap);
        ctx.lineTo(-28, 32);
        ctx.lineTo(-58, 32 - wingFlap);
        ctx.lineTo(-8, 18);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Demonic Horns
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(-6, -18);
      ctx.lineTo(-18, -30);
      ctx.lineTo(2, -22);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-6, 18);
      ctx.lineTo(-18, 30);
      ctx.lineTo(2, 22);
      ctx.closePath();
      ctx.fill();

      // Main Boss Armored Body
      ctx.fillStyle = isPhase2 ? '#4c0519' : '#1e1b4b';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isPhase2 ? '#f43f5e' : '#f97316';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Glowing Molten Core
      ctx.fillStyle = isPhase2 ? '#fb7185' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(8, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Fiery Eyes
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(20, -7, 3, 0, Math.PI * 2);
      ctx.arc(20, 7, 3, 0, Math.PI * 2);
      ctx.fill();

      // Greatsword
      const swordLen = isPhase2 ? 65 : 46;
      const swordW = isPhase2 ? 14 : 10;
      ctx.fillStyle = isPhase2 ? '#ec4899' : '#f59e0b';
      ctx.fillRect(16, -swordW / 2, swordLen, swordW);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22, -swordW / 4, swordLen - 8, swordW / 2);

      ctx.restore();

      // Render Fire & Impact Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const pt = particles.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.016;

        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.size * (pt.life / pt.maxLife)), 0, Math.PI * 2);
        ctx.fill();

        if (pt.life <= 0) particles.current.splice(i, 1);
      }

      // Render Floating Combat Text
      for (let i = floatingTexts.current.length - 1; i >= 0; i--) {
        const ft = floatingTexts.current[i];
        ft.y -= 0.65;
        ft.life -= 0.016;
        const alpha = Math.max(0, ft.life / ft.maxLife);

        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.life <= 0) floatingTexts.current.splice(i, 1);
      }

      // Render Screen Flash Overlay
      if (screenFlash.current > 0) {
        ctx.fillStyle = `rgba(244, 63, 94, ${screenFlash.current * 0.4})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPhase2, isGameOver, raidTime]);

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Top HUD: Health & Phase Indicators */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-950 border border-rose-600 text-rose-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <span>LORD IGNIS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {isPhase2 ? 'HELLFIRE SERAPH' : 'MOLTEN WARLORD'}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {isPhase2 ? 'PHASE 2 ACTIVE: ENRAGED' : 'PHASE 1: PREVENT THE SKIP'}
            </div>
          </div>
        </div>

        {/* Boss HP Gauge */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="flex justify-between text-xs font-mono mb-1 font-bold">
            <span className="text-rose-400 flex items-center gap-1">
              <Sword className="w-3.5 h-3.5" />
              BOSS HP
            </span>
            <span>
              {Math.round(bossHp)} / {bossMaxHp}
            </span>
          </div>

          <div className="relative w-full h-6 bg-slate-950 rounded-lg overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-75 ${
                isPhase2
                  ? 'bg-gradient-to-r from-fuchsia-600 to-rose-500'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600'
              }`}
              style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
            />

            {/* 50% Phase 2 Cutscene Marker */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-amber-400 shadow-[0_0_8px_#f59e0b]">
              <div className="absolute -top-1 -translate-x-1/2 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded">
                PHASE 2 (50%)
              </div>
            </div>
          </div>
        </div>

        {/* Status Badges & Mute */}
        <div className="flex items-center gap-4">
          <div className="text-right font-mono text-xs">
            <div className="text-slate-400 text-[10px]">TIME: {Math.floor(raidTime)}s</div>
            <div className="font-bold text-emerald-400">{runnersAlive} RUNNERS ALIVE</div>
          </div>

          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main 2D Battle Arena Canvas */}
      <main className="flex-1 flex items-center justify-center relative p-2 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="rounded-2xl border-4 border-slate-800 shadow-2xl bg-slate-900 cursor-crosshair block max-w-full max-h-[85vh] aspect-[4/3]"
        />

        {/* FLASHING PHASE 2 CUTSCENE TRIGGER PROMPT */}
        {canPhase2 && !isPhase2 && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
            <button
              onClick={triggerPhase2}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 text-white font-black text-sm tracking-widest border-2 border-pink-400 shadow-[0_0_35px_rgba(236,72,153,0.8)] cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
              PRESS [R] TO TRIGGER PHASE 2 CUTSCENE!
            </button>
          </div>
        )}

        {/* Game Over / Victory Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-30 backdrop-blur-md p-6">
            <div className="max-w-md w-full bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
              <div className="mb-4 inline-flex p-3 rounded-full bg-slate-800 border border-slate-700">
                {gameResult === 'victory' ? (
                  <Trophy className="w-10 h-10 text-yellow-400 animate-bounce" />
                ) : (
                  <Skull className="w-10 h-10 text-rose-500 animate-pulse" />
                )}
              </div>

              <h2 className="text-2xl font-black uppercase tracking-wider mb-2 text-white">
                {gameResult === 'victory' ? 'RAID WIPED: VICTORY!' : 'RAID FAILED: DEFEAT!'}
              </h2>

              <p className="text-xs font-mono text-slate-300 mb-6 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                {gameResult === 'victory'
                  ? 'All sweaty speedrunners neutralized! You successfully triggered Phase 2 and delivered maximum theatrical drama. Dark Lord bonus approved!'
                  : defeatReason}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs text-slate-400">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <div>SURVIVED</div>
                  <div className="text-lg font-bold text-white">{Math.floor(raidTime)}s</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <div>PHASE 2 STATUS</div>
                  <div className={`text-lg font-bold ${isPhase2 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPhase2 ? 'EXECUTED' : 'SKIPPED'}
                  </div>
                </div>
              </div>

              <button
                onClick={restartGame}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN (SPACE)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Controls HUD */}
      <footer className="bg-slate-900/90 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-slate-300 z-10">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>ROAM CONTROLS:</span>
        </div>

        <div className="flex items-center gap-4 text-slate-300 text-[11px]">
          <span>
            <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">W A S D</strong> Roam
          </span>
          <span>
            <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">MOUSE</strong> Aim
          </span>
          <span>
            <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">LEFT-CLICK</strong> Sword Slash (Deflects Attacks)
          </span>
          <span>
            <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              RIGHT-CLICK / E
            </strong>{' '}
            Ground Slam {slamCdPct > 0 && <span className="text-amber-400">({Math.ceil(slamCdPct * 1.4)}s)</span>}
          </span>
          <span>
            <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">SPACE</strong> Dash{' '}
            {dashCdPct > 0 && <span className="text-amber-400">({Math.ceil(dashCdPct * 0.85)}s)</span>}
          </span>
          <span>
            <strong className="text-pink-400 bg-pink-950 px-1.5 py-0.5 rounded border border-pink-700 font-bold">R</strong> Trigger Phase 2 (at 50% HP)
          </span>
        </div>

        <div className="text-slate-400 text-[11px] flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Smack speedrunners to hotfix exploits!</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
