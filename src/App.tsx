import { useRef, useEffect, useState, useCallback } from 'react';
import { soundManager } from './audio/soundManager';
import { Volume2, VolumeX, RotateCcw, Flame, Zap, Sparkles } from 'lucide-react';

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
  speechText: string;
  speechTimer: number;
  isAlive: boolean;
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

  // Player Boss 2D Position & Physics
  const player = useRef({
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 32,
    angle: 0,
    speed: 5.5,
    isSlashing: false,
    slashAngle: 0,
    slashProgress: 0,
    slamCooldown: 0,
    dashCooldown: 0,
    isDashing: false,
    dashTimer: 0,
  });

  const mousePos = useRef({ x: 400, y: 300 });
  const keys = useRef<Record<string, boolean>>({});
  const particles = useRef<Particle[]>([]);
  const slashWaves = useRef<SlashWave[]>([]);
  const shockwaves = useRef<{ x: number; y: number; radius: number; maxRadius: number; life: number }[]>([]);

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
      hp: 140,
      maxHp: 140,
      color: '#a855f7',
      exploit: 'potion_stack',
      exploitTimer: 0,
      speechText: 'Chugging buff potions!',
      speechTimer: 2.5,
      isAlive: true,
    },
    {
      id: 'r3',
      name: 'ParryGod69',
      className: 'tank',
      x: 200,
      y: 440,
      vx: 0,
      vy: 0,
      hp: 260,
      maxHp: 260,
      color: '#3b82f6',
      exploit: 'none',
      exploitTimer: 0,
      speechText: 'Holding aggro!',
      speechTimer: 2.5,
      isAlive: true,
    },
    {
      id: 'r4',
      name: 'TwitchChat_Andy',
      className: 'bard',
      x: 600,
      y: 440,
      vx: 0,
      vy: 0,
      hp: 160,
      maxHp: 160,
      color: '#f59e0b',
      exploit: 'none',
      exploitTimer: 0,
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
    setBossHp(1000);
    setIsPhase2(false);
    setCanPhase2(false);
    setIsGameOver(false);
    setGameResult(null);
    setDefeatReason('');
    setRunnersAlive(4);
    setRaidTime(0);

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
        hp: 140,
        maxHp: 140,
        color: '#a855f7',
        exploit: 'potion_stack',
        exploitTimer: 0,
        speechText: 'Chugging buff potions!',
        speechTimer: 2.5,
        isAlive: true,
      },
      {
        id: 'r3',
        name: 'ParryGod69',
        className: 'tank',
        x: 200,
        y: 440,
        vx: 0,
        vy: 0,
        hp: 260,
        maxHp: 260,
        color: '#3b82f6',
        exploit: 'none',
        exploitTimer: 0,
        speechText: 'Holding aggro!',
        speechTimer: 2.5,
        isAlive: true,
      },
      {
        id: 'r4',
        name: 'TwitchChat_Andy',
        className: 'bard',
        x: 600,
        y: 440,
        vx: 0,
        vy: 0,
        hp: 160,
        maxHp: 160,
        color: '#f59e0b',
        exploit: 'none',
        exploitTimer: 0,
        speechText: 'Sub 2 is ON PACE!',
        speechTimer: 2.5,
        isAlive: true,
      },
    ];

    soundManager.startBGM(1);
  }, []);

  // Trigger Phase 2 Metamorphosis
  const triggerPhase2 = useCallback(() => {
    if (isPhase2) return;
    setIsPhase2(true);
    setCanPhase2(false);
    setBossHp(prev => Math.min(bossMaxHp, prev + 350));
    soundManager.playPhase2Cutscene();
    soundManager.startBGM(2);

    // Blast particles around boss
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const spd = 6 + Math.random() * 8;
      particles.current.push({
        x: player.current.x,
        y: player.current.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.8,
        maxLife: 0.8,
        color: '#ec4899',
        size: 5 + Math.random() * 4,
      });
    }
  }, [isPhase2]);

  // Audio Mute Toggle
  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Player Actions
  const performSlash = useCallback(() => {
    const p = player.current;
    p.isSlashing = true;
    p.slashProgress = 0;
    p.slashAngle = p.angle;
    soundManager.playBossAttack();

    slashWaves.current.push({
      x: p.x,
      y: p.y,
      angle: p.angle,
      radius: isPhase2 ? 140 : 100,
      life: 0.2,
    });

    // Check hit against runners
    const hitRadius = isPhase2 ? 140 : 100;
    const slashDmg = isPhase2 ? 80 : 45;

    runners.current.forEach(runner => {
      if (!runner.isAlive) return;
      const d = Math.hypot(runner.x - p.x, runner.y - p.y);
      if (d <= hitRadius) {
        const angleToRunner = Math.atan2(runner.y - p.y, runner.x - p.x);
        let angleDiff = Math.abs(angleToRunner - p.angle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff < Math.PI / 1.8) {
          // Hit!
          runner.hp -= slashDmg;
          runner.vx = Math.cos(angleToRunner) * 8;
          runner.vy = Math.sin(angleToRunner) * 8;

          // Interrupt exploits
          if (runner.exploit !== 'none') {
            runner.exploit = 'none';
            runner.speechText = 'HOTFIXED! Exploit cancelled!';
            runner.speechTimer = 2.0;
            soundManager.playHotfixApplied();
          }

          // Sparks
          for (let i = 0; i < 12; i++) {
            particles.current.push({
              x: runner.x,
              y: runner.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 0.3,
              maxLife: 0.3,
              color: isPhase2 ? '#f43f5e' : '#f59e0b',
              size: 3 + Math.random() * 3,
            });
          }

          if (runner.hp <= 0) {
            runner.isAlive = false;
            soundManager.playRunnerKilled();
          }
        }
      }
    });
  }, [isPhase2]);

  const performGroundSlam = useCallback(() => {
    const p = player.current;
    if (p.slamCooldown > 0) return;
    p.slamCooldown = 1.5;
    soundManager.playHeavyImpact();

    const slamRadius = isPhase2 ? 220 : 150;
    const slamDmg = isPhase2 ? 110 : 60;

    shockwaves.current.push({
      x: p.x,
      y: p.y,
      radius: 10,
      maxRadius: slamRadius,
      life: 0.35,
    });

    runners.current.forEach(runner => {
      if (!runner.isAlive) return;
      const d = Math.hypot(runner.x - p.x, runner.y - p.y);
      if (d <= slamRadius) {
        runner.hp -= slamDmg;
        const angle = Math.atan2(runner.y - p.y, runner.x - p.x);
        runner.vx = Math.cos(angle) * 12;
        runner.vy = Math.sin(angle) * 12;

        if (runner.hp <= 0) {
          runner.isAlive = false;
          soundManager.playRunnerKilled();
        }
      }
    });
  }, [isPhase2]);

  // Keyboard & Mouse Listeners
  useEffect(() => {
    soundManager.startBGM(1);

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;

      // Space to Dash
      if (e.code === 'Space' && player.current.dashCooldown <= 0) {
        player.current.isDashing = true;
        player.current.dashTimer = 0.22;
        player.current.dashCooldown = 0.8;
        soundManager.playRunnerRoll();
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
  }, [canPhase2, isPhase2, triggerPhase2, performSlash, performGroundSlam]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const p = player.current;

      // 1. Player Physics & Input
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

      const currentSpeed = (p.isDashing ? 12 : p.speed) * (isPhase2 ? 1.25 : 1.0);
      if (moveX !== 0 || moveY !== 0) {
        const mag = Math.hypot(moveX, moveY);
        p.vx = (moveX / mag) * currentSpeed;
        p.vy = (moveY / mag) * currentSpeed;
      } else {
        p.vx *= 0.7;
        p.vy *= 0.7;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Arena walls clamp (canvas 800x600, borders 60..740 on X, 60..540 on Y)
      p.x = Math.max(70, Math.min(730, p.x));
      p.y = Math.max(70, Math.min(530, p.y));

      // Aim towards mouse
      p.angle = Math.atan2(mousePos.current.y - p.y, mousePos.current.x - p.x);

      // Dash fire trail
      if (p.isDashing) {
        particles.current.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 0.25,
          maxLife: 0.25,
          color: isPhase2 ? '#ec4899' : '#f97316',
          size: 6,
        });
      }

      // 2. Speedrunners AI & DPS
      let aliveCount = 0;
      runners.current.forEach(runner => {
        if (!runner.isAlive) return;
        aliveCount++;

        // Speech timer
        if (runner.speechTimer > 0) runner.speechTimer -= 0.016;

        // Friction
        runner.vx *= 0.85;
        runner.vy *= 0.85;
        runner.x += runner.vx;
        runner.y += runner.vy;

        // Runner movement AI: circle boss, maintain range or exploit
        const dToBoss = Math.hypot(p.x - runner.x, p.y - runner.y);

        if (runner.exploit === 'corner_clip') {
          // Move towards corner (80, 80)
          const angle = Math.atan2(80 - runner.y, 80 - runner.x);
          runner.x += Math.cos(angle) * 2.2;
          runner.y += Math.sin(angle) * 2.2;

          if (Math.hypot(80 - runner.x, 80 - runner.y) < 25) {
            // Dealing illegal corner DPS!
            setBossHp(prev => Math.max(0, prev - 1.2));
            runner.speechText = 'CLIPPING OUT OF BOUNDS!';
            runner.speechTimer = 1.0;
          }
        } else if (runner.exploit === 'potion_stack') {
          // Keep max distance and channel burst
          if (dToBoss < 280) {
            const angleAway = Math.atan2(runner.y - p.y, runner.x - p.x);
            runner.x += Math.cos(angleAway) * 2.5;
            runner.y += Math.sin(angleAway) * 2.5;
          }
          runner.exploitTimer += 0.016;
          if (runner.exploitTimer >= 3.5) {
            // Mega burst!
            runner.exploitTimer = 0;
            setBossHp(prev => Math.max(0, prev - 75));
            runner.speechText = 'POTION BURST! -75 HP!';
            runner.speechTimer = 2.0;
            soundManager.playHeavyImpact();
          }
        } else {
          // Normal combat kiting
          const targetDist = runner.className === 'tank' ? 90 : 200;
          if (dToBoss > targetDist + 20) {
            const a = Math.atan2(p.y - runner.y, p.x - runner.x);
            runner.x += Math.cos(a) * 2.0;
            runner.y += Math.sin(a) * 2.0;
          } else if (dToBoss < targetDist - 20) {
            const a = Math.atan2(runner.y - p.y, runner.x - p.x);
            runner.x += Math.cos(a) * 2.4;
            runner.y += Math.sin(a) * 2.4;
          }

          // Deal steady DPS to Boss
          const dps = runner.className === 'tank' ? 0.3 : 0.6;
          setBossHp(prev => Math.max(0, prev - dps * 0.016 * 60));
        }

        // Clamp inside arena
        runner.x = Math.max(80, Math.min(720, runner.x));
        runner.y = Math.max(80, Math.min(520, runner.y));
      });

      setRunnersAlive(aliveCount);

      // Check Phase 2 Threshold (50% HP = 500)
      setBossHp(currentHp => {
        if (currentHp <= 550 && !isPhase2) {
          setCanPhase2(true);
        }
        if (currentHp <= 0 && !isPhase2) {
          setIsGameOver(true);
          setGameResult('defeat');
          setDefeatReason('PHASE 2 SKIPPED! The speedrunners burst you down in Phase 1! You are FIRED by the Dark Lord!');
          soundManager.playFiredBuzzer();
          soundManager.stopBGM();
        }
        return currentHp;
      });

      if (aliveCount === 0 && !isGameOver) {
        setIsGameOver(true);
        setGameResult('victory');
        soundManager.playVictory();
        soundManager.stopBGM();
      }

      setRaidTime(prev => prev + 0.016);

      // 3. Render 2D Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Arena Floor
      ctx.fillStyle = isPhase2 ? '#1f0d19' : '#0d1322';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Arena Border
      ctx.strokeStyle = isPhase2 ? '#ec4899' : '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

      // Runic Central Circle
      ctx.beginPath();
      ctx.arc(400, 300, 140, 0, Math.PI * 2);
      ctx.strokeStyle = isPhase2 ? 'rgba(236, 72, 153, 0.25)' : 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Shockwaves
      for (let i = shockwaves.current.length - 1; i >= 0; i--) {
        const sw = shockwaves.current[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.2;
        sw.life -= 0.016;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isPhase2 ? `rgba(244, 63, 94, ${sw.life * 3})` : `rgba(245, 158, 11, ${sw.life * 3})`;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();

        if (sw.life <= 0) shockwaves.current.splice(i, 1);
      }

      // Slash Waves
      for (let i = slashWaves.current.length - 1; i >= 0; i--) {
        const sw = slashWaves.current[i];
        sw.life -= 0.016;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, sw.angle - Math.PI / 3, sw.angle + Math.PI / 3);
        ctx.strokeStyle = isPhase2 ? '#f43f5e' : '#f59e0b';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        if (sw.life <= 0) slashWaves.current.splice(i, 1);
      }

      // Speedrunners 2D
      runners.current.forEach(runner => {
        if (!runner.isAlive) {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(runner.x, runner.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('RIP', runner.x, runner.y + 3);
          return;
        }

        // Body
        ctx.fillStyle = runner.color;
        ctx.beginPath();
        ctx.arc(runner.x, runner.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // HP bar above head
        const barW = 38;
        const hpPct = Math.max(0, runner.hp / runner.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(runner.x - barW / 2, runner.y - 28, barW, 5);
        ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : '#ef4444';
        ctx.fillRect(runner.x - barW / 2, runner.y - 28, barW * hpPct, 5);

        // Name
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(runner.name, runner.x, runner.y - 33);

        // Speech bubble
        if (runner.speechTimer > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(runner.x - 65, runner.y + 22, 130, 16);
          ctx.strokeStyle = runner.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(runner.x - 65, runner.y + 22, 130, 16);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(runner.speechText, runner.x, runner.y + 33);
        }
      });

      // Boss (Player) 2D Model
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Phase 2 Flaming Wings
      if (isPhase2) {
        ctx.fillStyle = '#f43f5e';
        // Left Wing
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(-45, -50);
        ctx.lineTo(-5, -30);
        ctx.closePath();
        ctx.fill();
        // Right Wing
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.lineTo(-45, 50);
        ctx.lineTo(-5, 30);
        ctx.closePath();
        ctx.fill();
      }

      // Armored Body
      ctx.fillStyle = isPhase2 ? '#4c0519' : '#1e1b4b';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isPhase2 ? '#f43f5e' : '#f97316';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Glowing Molten Heart
      ctx.fillStyle = isPhase2 ? '#fb7185' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(6, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      // Sword
      ctx.fillStyle = isPhase2 ? '#ec4899' : '#f59e0b';
      ctx.fillRect(15, -6, 45, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, -3, 35, 6);

      ctx.restore();

      // Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const pt = particles.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.016;

        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2);
        ctx.fill();

        if (pt.life <= 0) particles.current.splice(i, 1);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPhase2, isGameOver]);

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Top HUD: Health & Phase Indicators */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-950 border border-rose-600 text-rose-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
              LORD IGNIS • BOSS CONTROLLER
            </div>
            <div className="text-xs text-slate-400">
              {isPhase2 ? 'PHASE 2 ACTIVE: ENRAGED' : 'PHASE 1: PREVENT SKIP'}
            </div>
          </div>
        </div>

        {/* Central Boss HP Bar with 50% Cutscene Trigger Marker */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="flex justify-between text-xs font-mono mb-1 font-bold">
            <span className="text-rose-400">BOSS HEALTH</span>
            <span>{Math.round(bossHp)} / {bossMaxHp}</span>
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
                PHASE 2 TRIGGER (50%)
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

        {/* FLASHING PHASE 2 CUTSCENE TRIGGER BUTTON */}
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

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-30 backdrop-blur-md p-6">
            <div className="max-w-md w-full bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
              <h2 className="text-2xl font-black uppercase tracking-wider mb-2 text-white">
                {gameResult === 'victory' ? 'RAID WIPED: VICTORY!' : 'TERMINATED: PHASE 2 SKIPPED!'}
              </h2>
              <p className="text-xs font-mono text-slate-400 mb-6 leading-relaxed">
                {gameResult === 'victory'
                  ? 'All speedrunners have been defeated! The Dark Lord is deeply pleased with your theatrical brutality.'
                  : defeatReason}
              </p>

              <button
                onClick={restartGame}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
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
          <span><strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">W A S D</strong> Move</span>
          <span><strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">MOUSE</strong> Aim</span>
          <span><strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">LEFT-CLICK</strong> Sword Slash</span>
          <span><strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">RIGHT-CLICK / E</strong> Ground Slam</span>
          <span><strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">SPACE</strong> Dash</span>
          <span><strong className="text-pink-400 bg-pink-950 px-1.5 py-0.5 rounded border border-pink-700 font-bold">R</strong> Trigger Phase 2 (at 50% HP)</span>
        </div>

        <div className="text-slate-400">
          Smack speedrunners to cancel their exploits!
        </div>
      </footer>
    </div>
  );
}

export default App;
