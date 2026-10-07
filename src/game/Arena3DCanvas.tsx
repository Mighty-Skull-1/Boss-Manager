import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { GameSimulationState } from './simulationEngine';
import type { BossAttack } from '../types/game';
import { BOSS_ATTACKS } from './encounters';
import { 
  Footprints, 
  Sparkles, 
  Zap, 
  Compass
} from 'lucide-react';

interface Arena3DCanvasProps {
  simulationState: GameSimulationState;
  onCanvasClick: (x: number, y: number) => void;
  selectedTrap: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null;
  onQueueAttack?: (attack: BossAttack) => void;
  onTriggerPhase2?: () => void;
  onDeployHotfix?: (incidentId: string) => void;
  onUpdateBossPos?: (x: number, y: number) => void;
}

// Coordinate mapping: 2D simulation space (x: 100..700, y: 100..500) <-> 3D space (-21..21, -14..14)
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(simulationState);

  useEffect(() => {
    stateRef.current = simulationState;
  }, [simulationState]);

  // Player Roaming & Avatar State
  const [avatarMode, setAvatarMode] = useState<'boss' | 'engineer'>('boss');
  const [cameraMode, setCameraMode] = useState<'third_person' | 'tactical' | 'cinematic' | 'orbit'>('third_person');

  // Input keys tracking
  const keysPressed = useRef<Record<string, boolean>>({});

  // 3D Player Physics / Position
  const playerPos = useRef<{ x: number; y: number; z: number; vy: number; isGrounded: boolean; rotation: number }>({
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    isGrounded: true,
    rotation: 0,
  });

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is typing elsewhere
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      keysPressed.current[e.code] = true;

      // Hotkeys for attacks when roaming
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
        // Toggle camera
        setCameraMode(prev => 
          prev === 'third_person' ? 'tactical' :
          prev === 'tactical' ? 'cinematic' :
          prev === 'cinematic' ? 'orbit' : 'third_person'
        );
      } else if (e.code === 'KeyV') {
        // Toggle avatar
        setAvatarMode(prev => prev === 'boss' ? 'engineer' : 'boss');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onQueueAttack, onTriggerPhase2]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060814);
    scene.fog = new THREE.FogExp2(0x060814, 0.016);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = 640;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(0, 24, 28);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
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
    renderer.toneMappingExposure = 1.25;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x28203f, 1.3);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xfff0dd, 1.8);
    mainSun.position.set(20, 40, 25);
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
    const bossLight = new THREE.PointLight(0xff5500, 3.5, 22);
    bossLight.position.set(0, 3, 0);
    scene.add(bossLight);

    // 4 Corner Torch Lights
    const brazierPositions = [
      [-16, 4, -14],
      [16, 4, -14],
      [-16, 4, 14],
      [16, 4, 14],
    ];
    brazierPositions.forEach(([bx, by, bz]) => {
      const bLight = new THREE.PointLight(0xff7700, 1.5, 18);
      bLight.position.set(bx, by, bz);
      scene.add(bLight);
    });

    // 5. Build Arena Platform
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // Platform Octagon
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

    // Glowing Runic Circles
    const runeRingGeo = new THREE.RingGeometry(8, 8.4, 32);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
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
      opacity: 0.45,
    });
    const outerRuneRing = new THREE.Mesh(outerRuneRingGeo, outerRuneRingMat);
    outerRuneRing.rotation.x = -Math.PI / 2;
    outerRuneRing.position.y = 0.02;
    arenaGroup.add(outerRuneRing);

    // Outer Lava Abyss
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

    // 8 Gothic Dark Stone Pillars with Flames
    const pillarPositions: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const px = Math.cos(angle) * 20.2;
      const pz = Math.sin(angle) * 20.2;
      pillarPositions.push(new THREE.Vector3(px, 0, pz));

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

    // 6. 3D Procedural Boss Model (Lord Ignis)
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

    // Greatsword
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

    // Phase 2 Flaming Wings
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

    // 7. 3D Procedural Encounter Engineer Avatar ("Malakor")
    const engineerGroup = new THREE.Group();
    engineerGroup.visible = false;
    scene.add(engineerGroup);

    // Hazmat Tech Body
    const engBodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
    const engBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5 });
    const engBody = new THREE.Mesh(engBodyGeo, engBodyMat);
    engBody.position.y = 1.0;
    engBody.castShadow = true;
    engineerGroup.add(engBody);

    // Tech Helmet / Goggles
    const engHeadGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const engHeadMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
    const engHead = new THREE.Mesh(engHeadGeo, engHeadMat);
    engHead.position.y = 2.1;
    engineerGroup.add(engHead);

    const goggleGeo = new THREE.BoxGeometry(0.5, 0.18, 0.2);
    const goggleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const goggles = new THREE.Mesh(goggleGeo, goggleMat);
    goggles.position.set(0, 2.1, 0.38);
    engineerGroup.add(goggles);

    // Glowing Tech Wrench / Debug Staff
    const wrenchGroup = new THREE.Group();
    const wrenchHandleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2);
    const wrenchHandleMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const wrenchHandle = new THREE.Mesh(wrenchHandleGeo, wrenchHandleMat);
    wrenchGroup.add(wrenchHandle);

    const wrenchHeadGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16, Math.PI * 1.5);
    const wrenchHeadMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const wrenchHead = new THREE.Mesh(wrenchHeadGeo, wrenchHeadMat);
    wrenchHead.position.y = 1.1;
    wrenchGroup.add(wrenchHead);

    wrenchGroup.position.set(0.7, 1.1, 0.3);
    wrenchGroup.rotation.x = 0.5;
    engineerGroup.add(wrenchGroup);

    // 8. Speedrunner 3D Models
    const runnerMeshes = new Map<string, THREE.Group>();
    const runnerGlitches = new Map<string, THREE.Mesh>();

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

      return g;
    };

    // 9. Telegraphs & Laser
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

    // Traps Map
    const trapMeshes = new Map<string, THREE.Object3D>();

    // Embers Particle System
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

    // Mouse / Raycaster Controls
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
      }
    };

    const handlePointerUp = () => {
      isMouseDown = false;
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mousedown', handlePointerDown);
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

    // 10. Core Animation Loop with Physics & Roaming
    let animId: number;
    let clock = 0;

    const render = () => {
      clock += 0.016;
      const sim = stateRef.current;
      const isPhase2 = sim.boss.phase === 2;
      const keys = keysPressed.current;

      // ==========================================
      // A. PLAYER WASD ROAMING MOVEMENT & PHYSICS
      // ==========================================
      const p = playerPos.current;
      let moveX = 0;
      let moveZ = 0;

      if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

      const isMoving = moveX !== 0 || moveZ !== 0;
      const isSprinting = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
      const speed = (isSprinting ? 14 : 9) * 0.016;

      if (isMoving) {
        // Normalize movement vector
        const mag = Math.hypot(moveX, moveZ);
        const dirX = (moveX / mag) * speed;
        const dirZ = (moveZ / mag) * speed;

        p.x += dirX;
        p.z += dirZ;

        // Smooth rotation towards movement direction
        const targetRot = Math.atan2(dirX, dirZ);
        p.rotation = THREE.MathUtils.lerp(p.rotation, targetRot, 0.2);
      }

      // Jump / Gravity
      if (keys['Space'] && p.isGrounded) {
        p.vy = 6.5;
        p.isGrounded = false;
      }

      if (!p.isGrounded) {
        p.vy -= 18 * 0.016; // gravity
        p.y += p.vy * 0.016;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = 0;
          p.isGrounded = true;
        }
      }

      // Arena boundary clamp (keep inside octagonal platform ~ 19.5 radius)
      const distFromCenter = Math.hypot(p.x, p.z);
      if (distFromCenter > 19.0) {
        const clampAngle = Math.atan2(p.z, p.x);
        p.x = Math.cos(clampAngle) * 19.0;
        p.z = Math.sin(clampAngle) * 19.0;
      }

      // Sync roamed player position to Boss or Engineer in simulation
      if (avatarMode === 'boss') {
        const sim2D = to2D(p.x, p.z);
        if (onUpdateBossPos) {
          onUpdateBossPos(sim2D.x, sim2D.y);
        }
      }

      // ==========================================
      // B. CAMERA POSITIONING & BEHAVIORS
      // ==========================================
      if (sim.phase === 'phase2_transition') {
        // Dramatic close-up cutscene shot!
        const cutsceneCamTarget = new THREE.Vector3(p.x, p.y + 4, p.z + 9);
        camera.position.lerp(cutsceneCamTarget, 0.05);
        camera.lookAt(p.x, p.y + 3.5, p.z);
      } else if (cameraMode === 'third_person') {
        // Over-the-shoulder action chase camera following your character!
        const camDistance = avatarMode === 'boss' ? 14 : 9;
        const camHeight = avatarMode === 'boss' ? 9 : 5.5;

        // Position camera behind player rotation
        const camTargetX = p.x - Math.sin(p.rotation) * camDistance;
        const camTargetZ = p.z - Math.cos(p.rotation) * camDistance;
        const camTargetY = p.y + camHeight;

        camera.position.lerp(new THREE.Vector3(camTargetX, camTargetY, camTargetZ), 0.1);
        camera.lookAt(p.x, p.y + 2.5, p.z);
      } else if (cameraMode === 'tactical') {
        // Elevated isometric commander view looking at player
        const tacticalPos = new THREE.Vector3(p.x, 26, p.z + 24);
        camera.position.lerp(tacticalPos, 0.05);
        camera.lookAt(p.x, 1, p.z);
      } else if (cameraMode === 'cinematic') {
        // Sweeping orbit around the active combat
        const camX = p.x + Math.sin(clock * 0.4) * 22;
        const camZ = p.z + Math.cos(clock * 0.4) * 22;
        camera.position.lerp(new THREE.Vector3(camX, 15, camZ), 0.05);
        camera.lookAt(p.x, 2.5, p.z);
      }

      // ==========================================
      // C. RENDER AVATARS (BOSS & ENGINEER)
      // ==========================================
      // 1. Boss Model
      if (avatarMode === 'boss') {
        bossGroup.position.set(p.x, p.y, p.z);
        bossGroup.rotation.y = p.rotation;
        engineerGroup.visible = false;
      } else {
        // If controlling Engineer, Boss runs on sim AI, Engineer takes player pos
        const bPos = to3D(sim.boss.x, sim.boss.y);
        bossGroup.position.set(bPos.x, 0, bPos.z);
        bossGroup.rotation.y = Math.sin(clock) * 0.2;

        engineerGroup.visible = true;
        engineerGroup.position.set(p.x, p.y, p.z);
        engineerGroup.rotation.y = p.rotation;
      }

      // Boss Combat Animations & Greatsword
      if (sim.boss.currentAction === 'windup') {
        swordGroup.rotation.x = 2.4 + Math.sin(clock * 30) * 0.18;
        swordGroup.position.y = 4.4;
        torso.rotation.x = -0.2;
      } else if (sim.boss.currentAction === 'attacking') {
        swordGroup.rotation.x = -0.8;
        swordGroup.position.y = 1.0;
        torso.rotation.x = 0.35;
      } else if (sim.boss.currentAction === 'staggered') {
        torso.rotation.x = -0.4;
        bossGroup.rotation.z = Math.sin(clock * 20) * 0.15;
      } else {
        torso.position.y = 3.4 + Math.sin(clock * 3) * 0.1;
        swordGroup.rotation.x = 0.4 + (isMoving ? Math.sin(clock * 12) * 0.2 : 0);
        swordGroup.position.y = 2.6;
        bossGroup.rotation.z = 0;
      }

      // Phase 2 Wings & Floating
      if (isPhase2) {
        wingGroup.visible = true;
        if (p.isGrounded && avatarMode === 'boss') {
          bossGroup.position.y = p.y + 1.2 + Math.sin(clock * 4) * 0.3;
        }
        leftWing.rotation.z = Math.sin(clock * 6) * 0.25;
        rightWing.rotation.z = -Math.sin(clock * 6) * 0.25;
      } else {
        wingGroup.visible = false;
      }

      // ==========================================
      // D. SPEEDRUNNERS DYNAMIC REACTIVE AI
      // ==========================================
      sim.runners.forEach(runner => {
        let rGroup = runnerMeshes.get(runner.id);
        if (!rGroup) {
          const colorHex =
            runner.className === 'rogue' ? 0x10b981 :
            runner.className === 'mage' ? 0x8b5cf6 :
            runner.className === 'tank' ? 0x3b82f6 : 0xf59e0b;
          rGroup = createRunnerModel(runner.className, colorHex);
          scene.add(rGroup);
          runnerMeshes.set(runner.id, rGroup);

          const wfGeo = new THREE.BoxGeometry(1.6, 2.8, 1.6);
          const wfMat = new THREE.MeshBasicMaterial({ color: 0xe11d48, wireframe: true });
          const wfMesh = new THREE.Mesh(wfGeo, wfMat);
          wfMesh.visible = false;
          rGroup.add(wfMesh);
          runnerGlitches.set(runner.id, wfMesh);
        }

        if (!runner.isAlive) {
          rGroup.rotation.z = Math.PI / 2;
          rGroup.position.y = 0.2;
          return;
        }

        const rPos = to3D(runner.x, runner.y);
        rGroup.position.x = rPos.x;
        rGroup.position.z = rPos.z;

        // Reactive facing towards Boss or Engineer
        const angle = Math.atan2(p.x - rPos.x, p.z - rPos.z);
        rGroup.rotation.y = angle;

        // Reactive Panic Dodge Roll if player roams too close!
        const distToPlayer = Math.hypot(p.x - rPos.x, p.z - rPos.z);
        if (distToPlayer < 5.0 && !runner.isRolling && Math.random() < 0.04) {
          runner.isRolling = true;
          runner.rollTimer = 0.4;
        }

        // 3D Roll tumbling
        if (runner.isRolling) {
          rGroup.rotation.x += 0.45;
          rGroup.position.y = 0.6 + Math.sin(clock * 20) * 0.4;
        } else {
          rGroup.rotation.x = 0;
          rGroup.position.y = Math.sin(clock * 10 + parseInt(runner.id.slice(-1))) * 0.12;
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

      // Update 3D Telegraphs & Laser
      if (sim.telegraphs.length > 0) {
        const tele = sim.telegraphs[0];
        telegraphMesh.visible = true;
        telegraphMesh.position.set(p.x, 0.05, p.z);
        const teleRadius3D = tele.radius * 0.07;

        telegraphMesh.geometry.dispose();
        telegraphMesh.geometry = new THREE.RingGeometry(0.1, teleRadius3D, 32);

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
  }, [onCanvasClick, cameraMode, avatarMode, onUpdateBossPos]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-[640px] block select-none cursor-crosshair focus:outline-none"
        tabIndex={0}
      />

      {/* TOP CONTROLS & CAMERA BAR */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Avatar Mode Pill */}
        <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-xl backdrop-blur-md pointer-events-auto shadow-lg text-xs font-mono">
          <span className="text-slate-400 text-[10px] font-bold uppercase pl-1.5">CONTROL AVATAR:</span>
          <button
            onClick={() => setAvatarMode('boss')}
            className={`px-3 py-1 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer ${
              avatarMode === 'boss'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            LORD IGNIS (BOSS)
          </button>
          <button
            onClick={() => setAvatarMode('engineer')}
            className={`px-3 py-1 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer ${
              avatarMode === 'engineer'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            MALAKOR (DEV)
          </button>
        </div>

        {/* Camera Selector */}
        <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-xl backdrop-blur-md pointer-events-auto shadow-lg text-xs font-mono">
          <span className="text-slate-400 text-[10px] font-bold uppercase px-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            CAM:
          </span>
          <button
            onClick={() => setCameraMode('third_person')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              cameraMode === 'third_person'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3rd Person
          </button>
          <button
            onClick={() => setCameraMode('tactical')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              cameraMode === 'tactical'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setCameraMode('cinematic')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              cameraMode === 'cinematic'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cinematic
          </button>
          <button
            onClick={() => setCameraMode('orbit')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              cameraMode === 'orbit'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Free Orbit
          </button>
        </div>
      </div>

      {/* Selected Trap Alert */}
      {selectedTrap && (
        <div className="absolute top-16 left-3 bg-sky-950/90 text-sky-200 border border-sky-400 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm pointer-events-none flex items-center gap-2 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          CLICK ANYWHERE ON 3D ARENA TO PLACE: {selectedTrap.toUpperCase().replace('_', ' ')}
        </div>
      )}

      {/* BOTTOM ROAMING & ABILITY HOTBAR HUD */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
        {/* Keyboard Roaming Instructions */}
        <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl backdrop-blur-md text-xs font-mono text-slate-300 pointer-events-auto shadow-xl flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-amber-300">ROAM CONTROLS:</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">W</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">A</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">S</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">D</span>
            <span className="text-slate-400 mr-2">Move</span>

            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">SHIFT</span>
            <span className="text-slate-400 mr-2">Sprint</span>

            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">SPACE</span>
            <span className="text-slate-400 mr-2">Jump</span>

            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">C</span>
            <span className="text-slate-400 mr-2">Cam</span>

            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-bold">V</span>
            <span className="text-slate-400">Avatar</span>
          </div>
        </div>

        {/* Quick Action Ability Hotbar */}
        <div className="bg-slate-950/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md pointer-events-auto shadow-xl flex items-center gap-1.5">
          {BOSS_ATTACKS.slice(0, 4).map((atk, idx) => {
            const isPhaseLocked = atk.phaseRequired > simulationState.boss.phase;
            const cd = simulationState.bossAttackCooldowns[atk.id] || 0;
            const canAfford = simulationState.devMana >= atk.manaCost;

            return (
              <button
                key={atk.id}
                onClick={() => onQueueAttack && onQueueAttack(atk)}
                disabled={isPhaseLocked || cd > 0 || !canAfford}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between w-24 h-16 transition cursor-pointer relative overflow-hidden ${
                  isPhaseLocked || cd > 0 || !canAfford
                    ? 'bg-slate-900/60 border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-t from-slate-900 to-slate-800 hover:border-amber-500 border-slate-700 text-white shadow-md'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold text-amber-400">[{idx + 1}]</span>
                  <span className="font-mono text-[9px] text-sky-400">{atk.manaCost}MP</span>
                </div>
                <div className="text-[10px] font-bold truncate leading-tight">{atk.name}</div>
                {cd > 0 && (
                  <div className="text-[9px] font-mono text-rose-400 font-bold">{cd.toFixed(1)}s</div>
                )}
              </button>
            );
          })}

          {/* SACRED PHASE 2 HOTKEY BUTTON */}
          <button
            onClick={() => onTriggerPhase2 && onTriggerPhase2()}
            disabled={simulationState.boss.phase2Triggered || (simulationState.boss.hp / simulationState.boss.maxHp) > 0.65}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between w-28 h-16 transition relative overflow-hidden ${
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
      </div>
    </div>
  );
};
