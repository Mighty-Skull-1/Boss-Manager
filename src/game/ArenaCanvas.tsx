import { useRef, useEffect } from 'react';
import type { GameSimulationState } from './simulationEngine';

interface ArenaCanvasProps {
  simulationState: GameSimulationState;
  onCanvasClick: (x: number, y: number) => void;
  selectedTrap: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null;
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  simulationState,
  onCanvasClick,
  selectedTrap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const { boss, runners, traps, telegraphs, particles, damageNumbers, phase, glitches } = simulationState;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // 2. Render Arena Floor (Phase 1 vs Phase 2)
      renderArenaFloor(ctx, width, height, phase === 'phase2' || phase === 'phase2_transition');

      // 3. Render Traps
      renderTraps(ctx, traps);

      // 4. Render Telegraphs
      renderTelegraphs(ctx, telegraphs);

      // 5. Render Glitch Rifts on floor
      renderGlitchZones(ctx, glitches);

      // 6. Render Boss
      renderBoss(ctx, boss);

      // 7. Render Speedrunners
      renderSpeedrunners(ctx, runners);

      // 8. Render Particles & Effects
      renderParticles(ctx, particles);

      // 9. Render Damage Numbers
      renderDamageNumbers(ctx, damageNumbers);

      // 10. Trap placement preview cursor
      if (selectedTrap) {
        // Will be drawn if mouse position is available, or indicated via canvas style
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [simulationState, selectedTrap]);

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    onCanvasClick(x, y);
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handlePointerDown}
        className={`w-full h-auto cursor-crosshair select-none block ${
          selectedTrap ? 'cursor-pointer' : ''
        }`}
      />
      {selectedTrap && (
        <div className="absolute top-3 left-3 bg-indigo-900/90 text-indigo-200 border border-indigo-400 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm pointer-events-none flex items-center gap-2 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          CLICK ANYWHERE ON ARENA TO PLACE: {selectedTrap.toUpperCase().replace('_', ' ')}
        </div>
      )}
    </div>
  );
};

// Sub-renderers
function renderArenaFloor(ctx: CanvasRenderingContext2D, w: number, h: number, isPhase2: boolean) {
  const cx = w / 2;
  const cy = h / 2;
  const arenaRadius = 270;

  // Outer void / lava pit
  if (isPhase2) {
    const lavaGrad = ctx.createRadialGradient(cx, cy, 240, cx, cy, 380);
    lavaGrad.addColorStop(0, '#7f1d1d');
    lavaGrad.addColorStop(0.6, '#ef4444');
    lavaGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, w, h);
  }

  // Stone Platform Octagon
  ctx.save();
  ctx.beginPath();
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI * 2) / sides;
    const px = cx + Math.cos(angle) * arenaRadius;
    const py = cy + Math.sin(angle) * arenaRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Arena floor gradient
  const floorGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, arenaRadius);
  if (isPhase2) {
    floorGrad.addColorStop(0, '#26122b');
    floorGrad.addColorStop(0.8, '#1e1022');
    floorGrad.addColorStop(1, '#4a044e');
  } else {
    floorGrad.addColorStop(0, '#1e293b');
    floorGrad.addColorStop(0.7, '#0f172a');
    floorGrad.addColorStop(1, '#020617');
  }
  ctx.fillStyle = floorGrad;
  ctx.fill();

  // Border runic ring
  ctx.strokeStyle = isPhase2 ? '#ec4899' : '#f97316';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Grid lines / floor runes
  ctx.strokeStyle = isPhase2 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(249, 115, 22, 0.12)';
  ctx.lineWidth = 1;
  for (let r = 70; r < arenaRadius; r += 70) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Central summoning glyph
  ctx.beginPath();
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.strokeStyle = isPhase2 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(251, 146, 60, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function renderTraps(ctx: CanvasRenderingContext2D, traps: GameSimulationState['traps']) {
  traps.forEach(trap => {
    ctx.save();
    if (trap.type === 'lava_pool') {
      const grad = ctx.createRadialGradient(trap.x, trap.y, 5, trap.x, trap.y, trap.radius);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.7, '#ea580c');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (trap.type === 'invisible_wall') {
      // Cybernetic Dev Hotfix Wireframe Barrier
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(trap.x - trap.radius, trap.y - trap.radius, trap.radius * 2, trap.radius * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(trap.x - trap.radius, trap.y - trap.radius, trap.radius * 2, trap.radius * 2);
      // Hotfix watermark text
      ctx.fillStyle = '#bae6fd';
      ctx.font = '9px monospace';
      ctx.fillText('[PATCH 1.04 BARRIER]', trap.x - 45, trap.y + 4);
    } else if (trap.type === 'anti_roll_spikes') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fee2e2';
      ctx.font = '10px sans-serif';
      ctx.fillText('▲ SPIKES ▲', trap.x - 26, trap.y + 4);
    }
    ctx.restore();
  });
}

function renderTelegraphs(ctx: CanvasRenderingContext2D, telegraphs: GameSimulationState['telegraphs']) {
  telegraphs.forEach(tele => {
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.strokeStyle = tele.color;
    ctx.lineWidth = 2;

    if (tele.type === 'circle') {
      // Outer border
      ctx.beginPath();
      ctx.arc(tele.x, tele.y, tele.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Expanding danger ring indicating timing!
      ctx.beginPath();
      ctx.arc(tele.x, tele.y, tele.radius * tele.progress, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fill();
    } else if (tele.type === 'cone') {
      ctx.beginPath();
      ctx.moveTo(tele.x, tele.y);
      ctx.arc(tele.x, tele.y, tele.radius, -Math.PI / 3, Math.PI / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tele.type === 'full_arena') {
      ctx.beginPath();
      ctx.arc(tele.x, tele.y, tele.radius * tele.progress, 0, Math.PI * 2);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (tele.type === 'line') {
      ctx.beginPath();
      ctx.rect(tele.x - 20, tele.y - tele.radius, 40, tele.radius * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  });
}

function renderGlitchZones(ctx: CanvasRenderingContext2D, glitches: GameSimulationState['glitches']) {
  glitches.forEach(glitch => {
    if (glitch.resolved) return;
    ctx.save();
    // Glitching wireframe box indicating speedrunner exploit
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(glitch.x - 30, glitch.y - 30, 60, 60);

    ctx.fillStyle = 'rgba(225, 29, 72, 0.25)';
    ctx.fillRect(glitch.x - 30, glitch.y - 30, 60, 60);

    // Label
    ctx.fillStyle = '#fda4af';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('! EXPLOIT !', glitch.x - 25, glitch.y - 35);

    // Countdown bar
    const progress = Math.max(0, glitch.timeRemaining / glitch.timeLimit);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(glitch.x - 25, glitch.y + 35, 50, 6);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(glitch.x - 25, glitch.y + 35, 50 * progress, 6);

    ctx.restore();
  });
}

function renderBoss(ctx: CanvasRenderingContext2D, boss: GameSimulationState['boss']) {
  ctx.save();
  const { x, y, phase, currentAction, isInvulnerable } = boss;

  // Phase 2 Flaming Wings
  if (phase === 2) {
    ctx.save();
    const wingFlap = Math.sin(Date.now() * 0.006) * 10;
    ctx.fillStyle = 'rgba(236, 72, 153, 0.6)';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 10);
    ctx.quadraticCurveTo(x - 90, y - 70 + wingFlap, x - 110, y - 20);
    ctx.quadraticCurveTo(x - 70, y + 10, x - 20, y + 10);
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 10);
    ctx.quadraticCurveTo(x + 90, y - 70 + wingFlap, x + 110, y - 20);
    ctx.quadraticCurveTo(x + 70, y + 10, x + 20, y + 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Invulnerability / Cutscene Bubble
  if (isInvulnerable) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 65, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('INVULNERABLE (CUTSCENE)', x - 70, y - 75);
    ctx.restore();
  }

  // Boss Body Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x, y + 35, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Boss Armored Body
  ctx.fillStyle = phase === 2 ? '#4c0519' : '#1e1b4b';
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = phase === 2 ? '#f43f5e' : '#f97316';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Magma Core in chest
  ctx.fillStyle = phase === 2 ? '#fb7185' : '#fb923c';
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();

  // Horns / Crown
  ctx.fillStyle = phase === 2 ? '#f43f5e' : '#ea580c';
  // Left Horn
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 25);
  ctx.lineTo(x - 38, y - 55);
  ctx.lineTo(x - 12, y - 32);
  ctx.closePath();
  ctx.fill();
  // Right Horn
  ctx.beginPath();
  ctx.moveTo(x + 22, y - 25);
  ctx.lineTo(x + 38, y - 55);
  ctx.lineTo(x + 12, y - 32);
  ctx.closePath();
  ctx.fill();

  // Boss Flaming Broadsword
  ctx.save();
  ctx.translate(x + 38, y - 10);
  ctx.rotate(0.3);
  ctx.fillStyle = phase === 2 ? '#ec4899' : '#f59e0b';
  ctx.fillRect(-5, -45, 10, 50);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-8, 5, 16, 6);
  ctx.restore();

  // Name & Action Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, x, y - 50);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  let actionText = 'IDLE';
  if (currentAction === 'windup') actionText = `WINDUP: ${boss.currentAttack?.attack.name.toUpperCase()}`;
  else if (currentAction === 'attacking') actionText = 'ATTACKING!';
  else if (currentAction === 'staggered') actionText = 'STAGGERED!!';
  else if (currentAction === 'cutscene') actionText = 'DRAMATIC MONOLOGUE';
  ctx.fillText(`[${actionText}]`, x, y + 55);

  ctx.restore();
}

function renderSpeedrunners(ctx: CanvasRenderingContext2D, runners: GameSimulationState['runners']) {
  runners.forEach(runner => {
    if (!runner.isAlive) {
      // Draw tombstone / downed indicator
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(runner.x, runner.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RIP', runner.x, runner.y + 3);
      ctx.restore();
      return;
    }

    ctx.save();
    const { x, y, color, isRolling, activeExploit, name, hp, maxHp, buffCount } = runner;

    // Rolling ghost trail
    if (isRolling) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(x - runner.vx * 0.05, y - runner.vy * 0.05, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Runner body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isRolling ? '#38bdf8' : '#ffffff';
    ctx.lineWidth = isRolling ? 3 : 1.5;
    ctx.stroke();

    // Class icon / weapon representation
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    let icon = '🗡️';
    if (runner.className === 'mage') icon = '🔮';
    else if (runner.className === 'tank') icon = '🛡️';
    else if (runner.className === 'bard') icon = '🎶';
    ctx.fillText(icon, x, y + 4);

    // Overhead Health Bar
    const barWidth = 36;
    const barHeight = 4;
    const hpRatio = Math.max(0, hp / maxHp);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - barWidth / 2, y - 24, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
    ctx.fillRect(x - barWidth / 2, y - 24, barWidth * hpRatio, barHeight);

    // Runner Name
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px monospace';
    ctx.fillText(name, x, y - 28);

    // Exploit or Buff Tag
    if (activeExploit !== 'none') {
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('! EXPLOIT !', x, y + 24);
    } else if (buffCount > 0) {
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`POTIONS x${buffCount}`, x, y + 24);
    }

    ctx.restore();
  });
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: GameSimulationState['particles']) {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function renderDamageNumbers(ctx: CanvasRenderingContext2D, numbers: GameSimulationState['damageNumbers']) {
  numbers.forEach(num => {
    ctx.save();
    ctx.fillStyle = num.color;
    ctx.font = num.isCrit ? 'bold 14px monospace' : '11px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(num.value, num.x, num.y);
    ctx.restore();
  });
}
