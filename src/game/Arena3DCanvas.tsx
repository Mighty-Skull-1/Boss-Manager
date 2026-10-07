import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { GameSimulationState } from './simulationEngine';
import type { BossAttack } from '../types/game';
import { BOSS_ATTACKS } from './encounters';
import { soundManager } from '../audio/soundManager';
import { 
  Footprints, 
  Zap, 
  Radio, 
  Flame, 
  Star 
} from 'lucide-react';

interface Arena3DCanvasProps {
  simulationState: GameSimulationState;
  onCanvasClick: (x: number, y: number) => void;
  selectedTrap: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null;
  onQueueAttack?: (attack: BossAttack) => void;
  onTriggerPhase2?: () => void;
  onDeployHotfix?: (incidentId: string) => void;
  onUpdateBossPos?: (x: number, y: number) => void;
  onMeleeComboHit?: () => void;
  onExecuteRiposte?: () => void;
}

function to3D(x: number, y: number): { x: number; z: number } {
  return {
    x: (x - 400) * 0.07,
    z: (y - 300) * 0.07,
  };
}

function to2D(x3d: number, z3d: number): { x: number; y: number } {
  return {
    x: x3d / 0.07 + 400,
    y: z3d / 0.07 + 300,
  };
}

export const Arena3DCanvas: React.FC<Arena3DCanvasProps> = ({
  simulationState,
  onCanvasClick,
  selectedTrap,
  onQueueAttack,
  onTriggerPhase2,
  onDeployHotfix,
  onUpdateBossPos,
  onMeleeComboHit,
  onExecuteRiposte,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(simulationState);

  useEffect(() => {
    stateRef.current = simulationState;
  }, [simulationState]);

  // Mode States
  const [avatarMode, setAvatarMode] = useState<'boss' | 'engineer'>('boss');
  const [cameraMode, setCameraMode] = useState<'third_person' | 'tactical' | 'cinematic' | 'orbit'>('third_person');
  const [isLockedOn, setIsLockedOn] = useState(false);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const [showWeaponWheel, setShowWeaponWheel] = useState(false);
  const [currentStationName, setCurrentStationName] = useState('LOS SANTOS SYNTHWAVE');
  const [showStationBanner, setShowStationBanner] = useState(false);

  // Input keys tracking
  const keysPressed = useRef<Record<string, boolean>>({});

  // 3D Player Physics
  const playerPos = useRef<{ 
    x: number; 
    y: number; 
    z: number; 
    vx: number; 
    vz: number; 
    vy: number; 
    isGrounded: boolean; 
    rotation: number;
    hitStopFrames: number;
    attackComboStep: number;
    attackCooldown: number;
  }>({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    isGrounded: true,
    rotation: 0,
    hitStopFrames: 0,
    attackComboStep: 0,
    attackCooldown: 0,
  });

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      keysPressed.current[e.code] = true;

      // GTA Weapon Wheel hold (Tab / Q)
      if (e.code === 'Tab' || e.code === 'KeyQ') {
        e.preventDefault();
        setShowWeaponWheel(true);
      }

      // Elden Ring Lock-On toggle (T)
      if (e.code === 'KeyT') {
        setIsLockedOn(prev => {
          if (!prev) {
            const living = stateRef.current.runners.find(r => r.isAlive);
            if (living) setLockedTargetId(living.id);
            return true;
          } else {
            setLockedTargetId(null);
            return false;
          }
        });
      }

      // Elden Ring Visceral Riposte / Mortal Kombat Fatality Execution (E / F)
      if (e.code === 'KeyE' || e.code === 'KeyF') {
        if (onExecuteRiposte) onExecuteRiposte();
      }

      // GTA Radio Station switch (G)
      if (e.code === 'KeyG') {
        const nextStation = soundManager.nextRadioStation();
        setCurrentStationName(nextStation);
        setShowStationBanner(true);
        setTimeout(() => setShowStationBanner(false), 2200);
      }

      // Hotkeys for attacks
      if (e.code === 'Digit1') {
        const atk = BOSS_ATTACKS.find(a => a.id === 'flame_cleave');
        if (atk && onQueueAttack) onQueueAttack(atk);
      } else if (e.code === 'Digit2') {
        const atk = BOSS_ATTACKS.find(a => a.id === 'inferno_slam');
        if (atk && onQueueAttack) onQueueAttack(atk);
      } else if (e.code === 'Digit3') {
        const atk = BOSS_ATTACKS.find(a => a.id === 'magma_pillar');
        if (atk && onQueueAttack) onQueueAttack(atk);
      } else if (e.code === 'Digit4') {
        const atk = BOSS_ATTACKS.find(a => a.id === 'shockwave_jump');
        if (atk && onQueueAttack) onQueueAttack(atk);
      } else if (e.code === 'KeyR') {
        if (onTriggerPhase2) onTriggerPhase2();
      } else if (e.code === 'KeyC') {
        setCameraMode(prev => 
          prev === 'third_person' ? 'tactical' :
          prev === 'tactical' ? 'cinematic' :
          prev === 'cinematic' ? 'orbit' : 'third_person'
        );
      } else if (e.code === 'KeyV') {
        setAvatarMode(prev => prev === 'boss' ? 'engineer' : 'boss');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.code === 'Tab' || e.code === 'KeyQ') {
        setShowWeaponWheel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onQueueAttack, onTriggerPhase2, onExecuteRiposte]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050711);
    scene.fog = new THREE.FogExp2(0x050711, 0.015);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = 640;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);
    camera.position.set(0, 24, 28);
    camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x2d1f42, 1.4);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xfff0dd, 2.0);
    mainSun.position.set(22, 42, 26);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 1024;
    mainSun.shadow.mapSize.height = 1024;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 90;
    mainSun.shadow.camera.left = -28;
    mainSun.shadow.camera.right = 28;
    mainSun.shadow.camera.top = 28;
    mainSun.shadow.camera.bottom = -28;
    scene.add(mainSun);

    // Boss Core PointLight
    const bossLight = new THREE.PointLight(0xff5500, 3.8, 24);
    bossLight.position.set(0, 3, 0);
    scene.add(bossLight);

    // Torches
    const brazierPositions = [
      [-16, 4, -14],
      [16, 4, -14],
      [-16, 4, 14],
      [16, 4, 14],
    ];
    brazierPositions.forEach(([bx, by, bz]) => {
      const bLight = new THREE.PointLight(0xff7700, 1.6, 20);
      bLight.position.set(bx, by, bz);
      scene.add(bLight);
    });

    // 5. Arena Environment
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // Octagonal Stone Platform
    const platformGeo = new THREE.CylinderGeometry(21, 22, 2.2, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.8,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -1.1;
    platform.receiveShadow = true;
    arenaGroup.add(platform);

    // Runic Rings
    const runeRingGeo = new THREE.RingGeometry(8, 8.4, 32);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.02;
    arenaGroup.add(runeRing);

    const outerRuneRingGeo = new THREE.RingGeometry(17, 17.5, 32);
    const outerRuneRingMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const outerRuneRing = new THREE.Mesh(outerRuneRingGeo, outerRuneRingMat);
    outerRuneRing.rotation.x = -Math.PI / 2;
    outerRuneRing.position.y = 0.02;
    arenaGroup.add(outerRuneRing);

    // Lava Abyss
    const lavaGeo = new THREE.PlaneGeometry(130, 130, 16, 16);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xaa1100,
      emissive: 0xdd2200,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    });
    const lava = new THREE.Mesh(lavaGeo, lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = -2.6;
    scene.add(lava);

    // 8 Pillars
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const px = Math.cos(angle) * 20.2;
      const pz = Math.sin(angle) * 20.2;

      const pGeo = new THREE.CylinderGeometry(1.1, 1.4, 8, 6);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const pillar = new THREE.Mesh(pGeo, pMat);
      pillar.position.set(px, 3.0, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      arenaGroup.add(pillar);

      const fGeo = new THREE.OctahedronGeometry(0.55, 0);
      const fMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const flame = new THREE.Mesh(fGeo, fMat);
      flame.position.set(px, 7.3, pz);
      arenaGroup.add(flame);
    }

    // 6. Boss 3D Model (Lord Ignis)
    const bossGroup = new THREE.Group();
    scene.add(bossGroup);

    const torsoGeo = new THREE.BoxGeometry(2.6, 3.4, 2.0);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x181424,
      roughness: 0.3,
      metalness: 0.8,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 3.4;
    torso.castShadow = true;
    bossGroup.add(torso);

    const heartGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(0, 3.6, 1.05);
    bossGroup.add(heart);

    const headGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0f0b1a, metalness: 0.9, roughness: 0.2 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 5.8, 0.1);
    head.castShadow = true;
    bossGroup.add(head);

    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.6 });
    const hornGeo = new THREE.ConeGeometry(0.35, 2.0, 6);
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-1.1, 6.7, 0);
    leftHorn.rotation.z = 0.5;
    bossGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(1.1, 6.7, 0);
    rightHorn.rotation.z = -0.5;
    bossGroup.add(rightHorn);

    const visorGeo = new THREE.BoxGeometry(1.0, 0.25, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 5.8, 0.9);
    bossGroup.add(visor);

    // Flaming Greatsword
    const swordGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.65, 7.0, 0.25);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf97316,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 3.2;
    blade.castShadow = true;
    swordGroup.add(blade);

    const guardGeo = new THREE.BoxGeometry(2.2, 0.45, 0.7);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    swordGroup.add(guard);

    swordGroup.position.set(2.8, 2.6, 0.8);
    swordGroup.rotation.x = 0.4;
    swordGroup.rotation.z = -0.3;
    bossGroup.add(swordGroup);

    // Flaming Wings
    const wingGroup = new THREE.Group();
    wingGroup.visible = false;
    bossGroup.add(wingGroup);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(4, 7, 9, 6);
    wingShape.quadraticCurveTo(7, 2, 9, -2);
    wingShape.quadraticCurveTo(3, -1, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.4, 4.4, -0.7);
    leftWing.rotation.y = Math.PI - 0.3;
    wingGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.4, 4.4, -0.7);
    rightWing.rotation.y = 0.3;
    wingGroup.add(rightWing);

    // 7. Speedrunner 3D Models
    const runnerMeshes = new Map<string, THREE.Group>();
    const runnerGlitches = new Map<string, THREE.Mesh>();
    const runnerReticles = new Map<string, THREE.Mesh>();

    const createRunnerModel = (className: string, colorHex: number) => {
      const g = new THREE.Group();
      const bGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.5, 8);
      const bMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
      const body = new THREE.Mesh(bGeo, bMat);
      body.position.y = 1.0;
      body.castShadow = true;
      g.add(body);

      const hGeo = new THREE.SphereGeometry(0.38, 12, 12);
      const hMat = new THREE.MeshStandardMaterial({ color: 0xffddaa });
      const headMesh = new THREE.Mesh(hGeo, hMat);
      headMesh.position.y = 2.0;
      headMesh.castShadow = true;
      g.add(headMesh);

      if (className === 'rogue') {
        const dGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
        const dMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const d1 = new THREE.Mesh(dGeo, dMat);
        d1.position.set(0.55, 0.9, 0.4);
        d1.rotation.x = 1.0;
        g.add(d1);
        const d2 = new THREE.Mesh(dGeo, dMat);
        d2.position.set(-0.55, 0.9, 0.4);
        d2.rotation.x = 1.0;
        g.add(d2);
      } else if (className === 'mage') {
        const hatGeo = new THREE.ConeGeometry(0.65, 1.1, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 2.5;
        g.add(hat);

        const staffGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.6);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0.65, 1.3, 0.35);
        g.add(staff);
      } else if (className === 'tank') {
        const sGeo = new THREE.BoxGeometry(0.9, 1.6, 0.2);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8 });
        const shield = new THREE.Mesh(sGeo, sMat);
        shield.position.set(0.65, 1.1, 0.45);
        g.add(shield);
      }

      // Elden Ring Posture Break Critical Dot
      const rDotGeo = new THREE.RingGeometry(0.4, 0.55, 16);
      const rDotMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
      const rDot = new THREE.Mesh(rDotGeo, rDotMat);
      rDot.position.set(0, 1.2, 0.6);
      rDot.visible = false;
      g.add(rDot);

      return { group: g, reticle: rDot };
    };

    // 8. Telegraph & Laser FX
    const telegraphMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 10, 32),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
    );
    telegraphMesh.rotation.x = -Math.PI / 2;
    telegraphMesh.position.y = 0.04;
    telegraphMesh.visible = false;
    scene.add(telegraphMesh);

    const laserMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 48, 12),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.85 })
    );
    laserMesh.rotation.x = Math.PI / 2;
    laserMesh.position.set(0, 2, 0);
    laserMesh.visible = false;
    scene.add(laserMesh);

    // Traps
    const trapMeshes = new Map<string, THREE.Object3D>();

    // Embers
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 45;
      particlePos[i + 1] = Math.random() * 20;
      particlePos[i + 2] = (Math.random() - 0.5) * 45;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf97316,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    const embers = new THREE.Points(particleGeo, particleMat);
    scene.add(embers);

    // Mouse / Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown && (cameraMode === 'orbit' || cameraMode === 'tactical')) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        camera.position.x -= deltaX * 0.05;
        camera.position.y += deltaY * 0.05;
        camera.position.y = Math.max(10, Math.min(50, camera.position.y));
        camera.lookAt(playerPos.current.x, 2, playerPos.current.z);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (e.button === 0) {
        // Left Click: Melee Attack Combo Chain!
        if (onMeleeComboHit) {
          onMeleeComboHit();
          playerPos.current.attackComboStep = (playerPos.current.attackComboStep + 1) % 3;
          playerPos.current.attackCooldown = 0.35;
        }

        // Raycast against floor
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(platform);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          const pos2D = to2D(pt.x, pt.z);
          onCanvasClick(pos2D.x, pos2D.y);

          if (onDeployHotfix) {
            const nearbyGlitch = stateRef.current.glitches.find(
              g => !g.resolved && Math.hypot(g.x - pos2D.x, g.y - pos2D.y) < 70
            );
            if (nearbyGlitch) {
              onDeployHotfix(nearbyGlitch.id);
            }
          }
        }
      } else if (e.button === 2) {
        // Right Click: Charged Jump Slam (Elden Ring style Heavy)
        const atk = BOSS_ATTACKS.find(a => a.id === 'inferno_slam');
        if (atk && onQueueAttack) {
          onQueueAttack(atk);
          playerPos.current.vy = 8.0;
          playerPos.current.isGrounded = false;
        }
      }
    };

    const handlePointerUp = () => {
      isMouseDown = false;
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mouseup', handlePointerUp);

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let clock = 0;

    const render = () => {
      clock += 0.016;
      const sim = stateRef.current;
      const isPhase2 = sim.boss.phase === 2;
      const keys = keysPressed.current;

      // Mortal Kombat Hit-Stop Effect (frame freeze on crunch)
      if (playerPos.current.hitStopFrames > 0) {
        playerPos.current.hitStopFrames--;
        renderer.render(scene, camera);
        animId = requestAnimationFrame(render);
        return;
      }

      // WASD Movement Physics
      const p = playerPos.current;
      let moveX = 0;
      let moveZ = 0;

      if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

      const isMoving = moveX !== 0 || moveZ !== 0;
      const isSprinting = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
      const speed = (isSprinting ? 15 : 9.5) * 0.016;

      if (isMoving) {
        const mag = Math.hypot(moveX, moveZ);
        const dirX = (moveX / mag) * speed;
        const dirZ = (moveZ / mag) * speed;

        p.x += dirX;
        p.z += dirZ;

        const targetRot = Math.atan2(dirX, dirZ);
        p.rotation = THREE.MathUtils.lerp(p.rotation, targetRot, 0.22);
      }

      // Jump / Gravity
      if (keys['Space'] && p.isGrounded) {
        p.vy = 7.0;
        p.isGrounded = false;
      }

      if (!p.isGrounded) {
        p.vy -= 20 * 0.016;
        p.y += p.vy * 0.016;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = 0;
          p.isGrounded = true;
        }
      }

      // Arena boundary clamp
      const distFromCenter = Math.hypot(p.x, p.z);
      if (distFromCenter > 19.2) {
        const clampAngle = Math.atan2(p.z, p.x);
        p.x = Math.cos(clampAngle) * 19.2;
        p.z = Math.sin(clampAngle) * 19.2;
      }

      // Sync position to simulation
      if (avatarMode === 'boss' && onUpdateBossPos) {
        const sim2D = to2D(p.x, p.z);
        onUpdateBossPos(sim2D.x, sim2D.y);
      }

      // Camera Positioning
      if (sim.phase === 'phase2_transition') {
        const cutsceneCamTarget = new THREE.Vector3(p.x, p.y + 4.5, p.z + 10);
        camera.position.lerp(cutsceneCamTarget, 0.05);
        camera.lookAt(p.x, p.y + 4.0, p.z);
      } else if (isLockedOn && lockedTargetId) {
        // Elden Ring Lock-On Target Camera Tracking
        const targetRunner = sim.runners.find(r => r.id === lockedTargetId && r.isAlive);
        if (targetRunner) {
          const tPos = to3D(targetRunner.x, targetRunner.y);
          const midX = (p.x + tPos.x) / 2;
          const midZ = (p.z + tPos.z) / 2;
          const camTargetX = p.x - Math.sin(p.rotation) * 12;
          const camTargetZ = p.z - Math.cos(p.rotation) * 12;
          camera.position.lerp(new THREE.Vector3(camTargetX, p.y + 8, camTargetZ), 0.1);
          camera.lookAt(midX, p.y + 2, midZ);
        } else {
          setIsLockedOn(false);
        }
      } else if (cameraMode === 'third_person') {
        // Action Third-Person Follow Camera
        const camDistance = 14;
        const camHeight = 8.5;
        const camTargetX = p.x - Math.sin(p.rotation) * camDistance;
        const camTargetZ = p.z - Math.cos(p.rotation) * camDistance;
        const camTargetY = p.y + camHeight;

        camera.position.lerp(new THREE.Vector3(camTargetX, camTargetY, camTargetZ), 0.12);
        camera.lookAt(p.x, p.y + 2.5, p.z);
      } else if (cameraMode === 'tactical') {
        const tacticalPos = new THREE.Vector3(p.x, 26, p.z + 24);
        camera.position.lerp(tacticalPos, 0.05);
        camera.lookAt(p.x, 1, p.z);
      } else if (cameraMode === 'cinematic') {
        const camX = p.x + Math.sin(clock * 0.4) * 22;
        const camZ = p.z + Math.cos(clock * 0.4) * 22;
        camera.position.lerp(new THREE.Vector3(camX, 15, camZ), 0.05);
        camera.lookAt(p.x, 2.5, p.z);
      }

      // Boss Model & Greatsword Swing Attack Animation
      bossGroup.position.set(p.x, p.y, p.z);
      bossGroup.rotation.y = p.rotation;

      if (p.attackCooldown > 0) {
        p.attackCooldown -= 0.016;
        // Mortal Kombat Melee Swing Arc
        swordGroup.rotation.x = -1.2 + Math.sin(clock * 35) * 0.8;
        swordGroup.rotation.y = Math.sin(clock * 30) * 1.5;
        swordGroup.position.y = 1.2;
      } else if (sim.boss.currentAction === 'windup') {
        swordGroup.rotation.x = 2.4 + Math.sin(clock * 30) * 0.18;
        swordGroup.position.y = 4.4;
      } else if (sim.boss.currentAction === 'attacking') {
        swordGroup.rotation.x = -0.8;
        swordGroup.position.y = 1.0;
      } else {
        torso.position.y = 3.4 + Math.sin(clock * 3) * 0.1;
        swordGroup.rotation.x = 0.4 + (isMoving ? Math.sin(clock * 12) * 0.2 : 0);
        swordGroup.rotation.y = 0;
        swordGroup.position.y = 2.6;
      }

      // Phase 2 Wings
      if (isPhase2) {
        wingGroup.visible = true;
        if (p.isGrounded) {
          bossGroup.position.y = p.y + 1.2 + Math.sin(clock * 4) * 0.3;
        }
        leftWing.rotation.z = Math.sin(clock * 6) * 0.25;
        rightWing.rotation.z = -Math.sin(clock * 6) * 0.25;
      } else {
        wingGroup.visible = false;
      }

      // Speedrunners Update & Reticles
      sim.runners.forEach(runner => {
        let entry = runnerMeshes.get(runner.id);
        if (!entry) {
          const colorHex =
            runner.className === 'rogue' ? 0x10b981 :
            runner.className === 'mage' ? 0x8b5cf6 :
            runner.className === 'tank' ? 0x3b82f6 : 0xf59e0b;
          const created = createRunnerModel(runner.className, colorHex);
          scene.add(created.group);
          runnerMeshes.set(runner.id, created.group);
          runnerReticles.set(runner.id, created.reticle);

          const wfGeo = new THREE.BoxGeometry(1.6, 2.8, 1.6);
          const wfMat = new THREE.MeshBasicMaterial({ color: 0xe11d48, wireframe: true });
          const wfMesh = new THREE.Mesh(wfGeo, wfMat);
          wfMesh.visible = false;
          created.group.add(wfMesh);
          runnerGlitches.set(runner.id, wfMesh);
          entry = created.group;
        }

        if (!runner.isAlive) {
          entry.rotation.z = Math.PI / 2;
          entry.position.y = 0.2;
          return;
        }

        const rPos = to3D(runner.x, runner.y);
        entry.position.x = rPos.x;
        entry.position.z = rPos.z;

        const angle = Math.atan2(p.x - rPos.x, p.z - rPos.z);
        entry.rotation.y = angle;

        // Elden Ring Posture Break Critical Dot
        const reticle = runnerReticles.get(runner.id);
        if (reticle) {
          reticle.visible = runner.isPostureBroken;
          if (reticle.visible) {
            reticle.rotation.z += 0.08;
          }
        }

        // 3D Roll tumbling
        if (runner.isRolling) {
          entry.rotation.x += 0.45;
          entry.position.y = 0.6 + Math.sin(clock * 20) * 0.4;
        } else {
          entry.rotation.x = 0;
          entry.position.y = Math.sin(clock * 10 + parseInt(runner.id.slice(-1))) * 0.12;
        }

        // Glitch Indicator Box
        const glitchMesh = runnerGlitches.get(runner.id);
        if (glitchMesh) {
          glitchMesh.visible = runner.activeExploit !== 'none';
          if (glitchMesh.visible) {
            glitchMesh.rotation.y += 0.05;
          }
        }
      });

      // Update Telegraphs
      if (sim.telegraphs.length > 0) {
        const tele = sim.telegraphs[0];
        telegraphMesh.visible = true;
        telegraphMesh.position.set(p.x, 0.05, p.z);
        telegraphMesh.geometry.dispose();
        telegraphMesh.geometry = new THREE.RingGeometry(0.1, tele.radius * 0.07, 32);

        const tMat = telegraphMesh.material as THREE.MeshBasicMaterial;
        tMat.color.set(isPhase2 ? 0xec4899 : 0xef4444);
        tMat.opacity = 0.35 + Math.sin(clock * 14) * 0.15;

        if (tele.type === 'line') {
          laserMesh.visible = true;
          laserMesh.position.set(p.x, 2, p.z);
          laserMesh.rotation.y = clock * 1.6;
        } else {
          laserMesh.visible = false;
        }
      } else {
        telegraphMesh.visible = false;
        laserMesh.visible = false;
      }

      // Update 3D Traps
      sim.traps.forEach(trap => {
        let tMesh = trapMeshes.get(trap.id);
        if (!tMesh) {
          const tPos = to3D(trap.x, trap.y);
          if (trap.type === 'lava_pool') {
            const geo = new THREE.CylinderGeometry(trap.radius * 0.07, trap.radius * 0.07, 0.2, 16);
            const mat = new THREE.MeshStandardMaterial({
              color: 0xff3300,
              emissive: 0xff2200,
              emissiveIntensity: 1.3,
            });
            tMesh = new THREE.Mesh(geo, mat);
          } else if (trap.type === 'invisible_wall') {
            const geo = new THREE.BoxGeometry(trap.radius * 0.12, 4, trap.radius * 0.12);
            const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
            tMesh = new THREE.Mesh(geo, mat);
            tMesh.position.y = 2;
          } else {
            const geo = new THREE.ConeGeometry(0.3, 1.0, 6);
            const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9 });
            tMesh = new THREE.Mesh(geo, mat);
            tMesh.position.y = 0.5;
          }
          tMesh.position.x = tPos.x;
          tMesh.position.z = tPos.z;
          scene.add(tMesh);
          trapMeshes.set(trap.id, tMesh);
        }
      });

      trapMeshes.forEach((mesh, id) => {
        if (!sim.traps.some(t => t.id === id)) {
          scene.remove(mesh);
          trapMeshes.delete(id);
        }
      });

      // ==========================================
      // GTA 5 MINI-MAP RADAR CANVAS DRAWING
      // ==========================================
      const radar = radarCanvasRef.current;
      if (radar) {
        const rctx = radar.getContext('2d');
        if (rctx) {
          const rw = radar.width;
          const rh = radar.height;
          const rcx = rw / 2;
          const rcy = rh / 2;
          const radarRadius = rw / 2 - 4;

          // Clear & Dark radar base
          rctx.clearRect(0, 0, rw, rh);
          rctx.fillStyle = 'rgba(8, 12, 22, 0.85)';
          rctx.beginPath();
          rctx.arc(rcx, rcy, radarRadius, 0, Math.PI * 2);
          rctx.fill();
          rctx.strokeStyle = '#38bdf8';
          rctx.lineWidth = 2.5;
          rctx.stroke();

          // Radar grid rings
          rctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
          rctx.lineWidth = 1;
          [0.35, 0.7].forEach(ratio => {
            rctx.beginPath();
            rctx.arc(rcx, rcy, radarRadius * ratio, 0, Math.PI * 2);
            rctx.stroke();
          });

          // Draw Speedrunner Blips on Radar
          const radarScale = radarRadius / 22; // 22 is arena world radius
          sim.runners.forEach(runner => {
            if (!runner.isAlive) return;
            const r3D = to3D(runner.x, runner.y);
            const bx = rcx + (r3D.x - p.x) * radarScale;
            const by = rcy + (r3D.z - p.z) * radarScale;

            if (Math.hypot(bx - rcx, by - rcy) <= radarRadius - 2) {
              rctx.fillStyle = runner.isPostureBroken ? '#f59e0b' : runner.color;
              rctx.beginPath();
              rctx.arc(bx, by, 4, 0, Math.PI * 2);
              rctx.fill();
            }
          });

          // Draw Player Icon at center (GTA arrow triangle)
          rctx.save();
          rctx.translate(rcx, rcy);
          rctx.rotate(-p.rotation);
          rctx.fillStyle = '#ef4444';
          rctx.beginPath();
          rctx.moveTo(0, -7);
          rctx.lineTo(5, 6);
          rctx.lineTo(0, 3);
          rctx.lineTo(-5, 6);
          rctx.closePath();
          rctx.fill();
          rctx.restore();
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [onCanvasClick, cameraMode, avatarMode, onUpdateBossPos, onMeleeComboHit, onDeployHotfix, onQueueAttack, isLockedOn, lockedTargetId]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950 select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-[640px] block cursor-crosshair focus:outline-none"
        tabIndex={0}
      />

      {/* TOP HEADER: MORTAL KOMBAT COMBO + GTA WANTED STARS */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
        {/* Mortal Kombat Combo Counter */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          {simulationState.comboCount > 0 ? (
            <div className="p-2.5 rounded-xl bg-black/85 border border-amber-500/70 shadow-2xl backdrop-blur-md animate-bounce">
              <div className="text-2xl font-black italic tracking-wider text-amber-400 drop-shadow-[0_0_10px_#f59e0b]">
                {simulationState.comboCount} HITS!
              </div>
              <div className="text-[10px] font-mono uppercase font-black text-rose-500 tracking-widest">
                {simulationState.comboCount >= 8 ? '★ BRUTALITY PACE! ★' : simulationState.comboCount >= 4 ? 'COMBO BREAKER!' : 'KOMBAT STRIKE'}
              </div>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-lg bg-black/70 border border-slate-800 text-[10px] font-mono text-slate-400">
              LMB: MELEE COMBO • RMB: HEAVY SLAM
            </div>
          )}
        </div>

        {/* Mortal Kombat Center Announcer Banner */}
        {simulationState.announcerBanner && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 pointer-events-none">
            <h1 className="text-3xl md:text-4xl font-black italic tracking-widest uppercase bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse">
              {simulationState.announcerBanner}
            </h1>
          </div>
        )}

        {/* GTA 5 Wanted Level Stars (1 to 5 Stars) */}
        <div className="flex flex-col items-end gap-1 pointer-events-auto">
          <div className="flex items-center gap-1 bg-black/85 border border-slate-700 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-2xl">
            <span className="text-[10px] font-mono font-bold text-slate-300 mr-1">WANTED:</span>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= simulationState.wantedStars
                    ? 'text-amber-400 fill-amber-400 animate-pulse'
                    : 'text-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono text-rose-400">
            {simulationState.wantedStars >= 4 ? 'TAS BOTS SUMMONED!' : 'SPEEDRUN RAID PATROL'}
          </span>
        </div>
      </div>

      {/* GTA 5 RADIO STATION POPUP BANNER */}
      {showStationBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/90 border border-amber-500 px-6 py-2 rounded-xl text-center shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none z-30">
          <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>RADIO: {currentStationName}</span>
          </div>
        </div>
      )}

      {/* GTA 5 WEAPON & ABILITY WHEEL OVERLAY (HOLD TAB / Q) */}
      {showWeaponWheel && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="relative w-80 h-80 rounded-full border-4 border-amber-500/80 bg-slate-950/90 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center">
              <Flame className="w-10 h-10 text-amber-400 animate-bounce mb-2" />
              <div className="text-sm font-black text-white uppercase tracking-wider">
                WEAPON / ABILITY WHEEL
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Release key to select • Press 1-4 for quickfire
              </div>
            </div>

            {/* Quick Wheel Segments */}
            {BOSS_ATTACKS.slice(0, 4).map((atk, idx) => {
              const angle = (idx / 4) * Math.PI * 2;
              const wx = Math.cos(angle) * 110;
              const wy = Math.sin(angle) * 110;
              return (
                <button
                  key={atk.id}
                  onClick={() => {
                    if (onQueueAttack) onQueueAttack(atk);
                    setShowWeaponWheel(false);
                  }}
                  className="absolute p-2.5 rounded-xl bg-slate-900 border border-amber-500 text-xs font-mono font-bold text-white hover:bg-amber-600 transition shadow-lg -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ left: `calc(50% + ${wx}px)`, top: `calc(50% + ${wy}px)` }}
                >
                  [{idx + 1}] {atk.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: GTA 5 CIRCULAR GPS RADAR */}
      <div className="absolute bottom-3 left-3 pointer-events-auto flex items-end gap-3 z-20">
        <div className="relative w-28 h-28 rounded-full shadow-2xl border border-sky-400/60 overflow-hidden bg-slate-950">
          <canvas ref={radarCanvasRef} width={112} height={112} className="w-full h-full block" />
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-sky-400">
            GPS
          </div>
        </div>

        {/* Roam & Kombat Controls Bar */}
        <div className="bg-slate-950/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md text-[10px] font-mono text-slate-300 shadow-xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            <span>KOMBAT / SOULS CONTROLS:</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="font-bold text-white">[WASD]</span> Move •{' '}
            <span className="font-bold text-white">[LMB]</span> Combo Slash •{' '}
            <span className="font-bold text-white">[RMB]</span> Heavy Slam •{' '}
            <span className="font-bold text-white">[SPACE]</span> Dodge Roll
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-amber-400 font-bold">[E]</span> Visceral Execution •{' '}
            <span className="text-amber-400 font-bold">[TAB]</span> Weapon Wheel •{' '}
            <span className="text-amber-400 font-bold">[G]</span> Radio
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT: ELDEN RING POSTURE RIPOSTE & ABILITIES */}
      <div className="absolute bottom-3 right-3 pointer-events-auto flex items-center gap-2 z-20">
        {/* Elden Ring Visceral Execution Action Button */}
        {simulationState.runners.some(r => r.isAlive && r.isPostureBroken) && (
          <button
            onClick={() => onExecuteRiposte && onExecuteRiposte()}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white font-black text-xs font-mono uppercase tracking-widest border-2 border-amber-400 shadow-[0_0_25px_rgba(244,63,94,0.8)] animate-bounce cursor-pointer flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            [E] HOTFIX FATALITY RIPOSTE!
          </button>
        )}

        {/* Phase 2 Transition Button */}
        <button
          onClick={() => onTriggerPhase2 && onTriggerPhase2()}
          disabled={simulationState.boss.phase2Triggered || (simulationState.boss.hp / simulationState.boss.maxHp) > 0.65}
          className={`px-4 py-3 rounded-xl border text-left flex flex-col justify-between transition relative overflow-hidden ${
            simulationState.boss.phase2Triggered
              ? 'bg-fuchsia-950 border-fuchsia-600 text-fuchsia-300 opacity-80 cursor-default'
              : (simulationState.boss.hp / simulationState.boss.maxHp) <= 0.65
              ? 'bg-gradient-to-br from-rose-600 to-pink-600 hover:from-rose-500 text-white border-pink-400 shadow-lg shadow-pink-900/40 animate-pulse cursor-pointer'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[10px] font-bold text-pink-200">[R]</span>
            <span className="font-mono text-[9px] text-white">TRANSITION</span>
          </div>
          <div className="text-[10px] font-black truncate leading-tight">PHASE 2 CUTSCENE</div>
        </button>
      </div>

      {/* Selected Trap Alert */}
      {selectedTrap && (
        <div className="absolute top-16 left-3 bg-sky-950/90 text-sky-200 border border-sky-400 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm pointer-events-none flex items-center gap-2 shadow-lg animate-pulse z-30">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          CLICK ANYWHERE ON 3D ARENA TO PLACE: {selectedTrap.toUpperCase().replace('_', ' ')}
        </div>
      )}
    </div>
  );
};
