import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { GameSimulationState } from './simulationEngine';

interface Arena3DCanvasProps {
  simulationState: GameSimulationState;
  onCanvasClick: (x: number, y: number) => void;
  selectedTrap: 'lava_pool' | 'invisible_wall' | 'anti_roll_spikes' | null;
}

// Coordinate mapping: 2D simulation space (x: 100..700, y: 100..500) -> 3D space (-20..20, -13..13)
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(simulationState);

  useEffect(() => {
    stateRef.current = simulationState;
  }, [simulationState]);

  const [cameraMode, setCameraMode] = useState<'tactical' | 'cinematic' | 'orbit'>('tactical');

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.018);

    // 2. Camera Setup
    const width = container.clientWidth || 800;
    const height = 600;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 28, 30);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
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
    renderer.toneMappingExposure = 1.2;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x28203f, 1.2);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffecd2, 1.6);
    mainSun.position.set(15, 35, 20);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 1024;
    mainSun.shadow.mapSize.height = 1024;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 80;
    mainSun.shadow.camera.left = -25;
    mainSun.shadow.camera.right = 25;
    mainSun.shadow.camera.top = 25;
    mainSun.shadow.camera.bottom = -25;
    scene.add(mainSun);

    // Boss Core PointLight
    const bossLight = new THREE.PointLight(0xff5500, 3, 20);
    bossLight.position.set(0, 3, 0);
    scene.add(bossLight);

    // 4 Corner Braziers Lights
    const brazierPositions = [
      [-16, 4, -14],
      [16, 4, -14],
      [-16, 4, 14],
      [16, 4, 14],
    ];
    brazierPositions.forEach(([bx, by, bz]) => {
      const bLight = new THREE.PointLight(0xff7700, 1.2, 16);
      bLight.position.set(bx, by, bz);
      scene.add(bLight);
    });

    // 5. Build Arena Environment
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // 5a. Central Octagonal Stone Platform
    const platformGeo = new THREE.CylinderGeometry(20, 21, 2, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x131826,
      roughness: 0.8,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -1;
    platform.receiveShadow = true;
    arenaGroup.add(platform);

    // Runic Ring Inlay
    const runeRingGeo = new THREE.RingGeometry(8, 8.4, 32);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.02;
    arenaGroup.add(runeRing);

    // Outer Runic Ring Inlay
    const outerRuneRingGeo = new THREE.RingGeometry(16, 16.5, 32);
    const outerRuneRingMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const outerRuneRing = new THREE.Mesh(outerRuneRingGeo, outerRuneRingMat);
    outerRuneRing.rotation.x = -Math.PI / 2;
    outerRuneRing.position.y = 0.02;
    arenaGroup.add(outerRuneRing);

    // 5b. Outer Boiling Lava Sea
    const lavaGeo = new THREE.PlaneGeometry(120, 120, 16, 16);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xaa1100,
      emissive: 0xdd2200,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    });
    const lava = new THREE.Mesh(lavaGeo, lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = -2.5;
    scene.add(lava);

    // 5c. 8 Gothic Dark Stone Pillars
    const pillars: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const px = Math.cos(angle) * 19.5;
      const pz = Math.sin(angle) * 19.5;

      const pGeo = new THREE.CylinderGeometry(1.0, 1.3, 7, 6);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const pillar = new THREE.Mesh(pGeo, pMat);
      pillar.position.set(px, 2.5, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      arenaGroup.add(pillar);
      pillars.push(pillar);

      // Brazier flame on top
      const fGeo = new THREE.OctahedronGeometry(0.5, 0);
      const fMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const flame = new THREE.Mesh(fGeo, fMat);
      flame.position.set(px, 6.3, pz);
      arenaGroup.add(flame);
    }

    // 6. 3D Procedural Boss Model (Lord Ignis)
    const bossGroup = new THREE.Group();
    scene.add(bossGroup);

    // Boss Torso
    const torsoGeo = new THREE.BoxGeometry(2.4, 3.2, 1.8);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x181424,
      roughness: 0.3,
      metalness: 0.8,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 3.2;
    torso.castShadow = true;
    bossGroup.add(torso);

    // Glowing Magma Heart
    const heartGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(0, 3.4, 0.9);
    bossGroup.add(heart);

    // Boss Head & Horned Helmet
    const headGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0f0b1a, metalness: 0.9, roughness: 0.2 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 5.4, 0.1);
    head.castShadow = true;
    bossGroup.add(head);

    // Horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.5 });
    const hornGeo = new THREE.ConeGeometry(0.3, 1.8, 6);
    // Left Horn
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-1.0, 6.2, 0);
    leftHorn.rotation.z = 0.5;
    bossGroup.add(leftHorn);
    // Right Horn
    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(1.0, 6.2, 0);
    rightHorn.rotation.z = -0.5;
    bossGroup.add(rightHorn);

    // Visor Eye Glow
    const visorGeo = new THREE.BoxGeometry(0.9, 0.2, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 5.4, 0.82);
    bossGroup.add(visor);

    // Boss Shoulders (Pauldrons)
    const pldGeo = new THREE.BoxGeometry(1.6, 1.2, 1.6);
    const pldMat = new THREE.MeshStandardMaterial({ color: 0x241d38, roughness: 0.4, metalness: 0.7 });
    const leftPld = new THREE.Mesh(pldGeo, pldMat);
    leftPld.position.set(-2.0, 4.4, 0);
    leftPld.rotation.z = -0.3;
    leftPld.castShadow = true;
    bossGroup.add(leftPld);

    const rightPld = new THREE.Mesh(pldGeo, pldMat);
    rightPld.position.set(2.0, 4.4, 0);
    rightPld.rotation.z = 0.3;
    rightPld.castShadow = true;
    bossGroup.add(rightPld);

    // Giant Flaming Greatsword
    const swordGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.6, 6.5, 0.2);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf97316,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 3.0;
    blade.castShadow = true;
    swordGroup.add(blade);

    const guardGeo = new THREE.BoxGeometry(2.0, 0.4, 0.6);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    swordGroup.add(guard);

    swordGroup.position.set(2.6, 2.5, 0.8);
    swordGroup.rotation.x = 0.4;
    swordGroup.rotation.z = -0.3;
    bossGroup.add(swordGroup);

    // Phase 2 Flaming Wings
    const wingGroup = new THREE.Group();
    wingGroup.visible = false;
    bossGroup.add(wingGroup);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(4, 6, 8, 5);
    wingShape.quadraticCurveTo(6, 2, 8, -2);
    wingShape.quadraticCurveTo(3, -1, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.2, 4.0, -0.6);
    leftWing.rotation.y = Math.PI - 0.3;
    wingGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.2, 4.0, -0.6);
    rightWing.rotation.y = 0.3;
    wingGroup.add(rightWing);

    // 7. Speedrunner 3D Models Map
    const runnerMeshes = new Map<string, THREE.Group>();
    const runnerGlitches = new Map<string, THREE.Mesh>();

    const createRunnerModel = (className: string, colorHex: number) => {
      const g = new THREE.Group();
      // Body
      const bGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8);
      const bMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
      const body = new THREE.Mesh(bGeo, bMat);
      body.position.y = 0.9;
      body.castShadow = true;
      g.add(body);

      // Head
      const hGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const hMat = new THREE.MeshStandardMaterial({ color: 0xffddaa });
      const headMesh = new THREE.Mesh(hGeo, hMat);
      headMesh.position.y = 1.8;
      headMesh.castShadow = true;
      g.add(headMesh);

      // Weapon / Gear by class
      if (className === 'rogue') {
        // Daggers
        const dGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const dMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const d1 = new THREE.Mesh(dGeo, dMat);
        d1.position.set(0.5, 0.8, 0.4);
        d1.rotation.x = 1.0;
        g.add(d1);
        const d2 = new THREE.Mesh(dGeo, dMat);
        d2.position.set(-0.5, 0.8, 0.4);
        d2.rotation.x = 1.0;
        g.add(d2);
      } else if (className === 'mage') {
        // Staff + Hat
        const hatGeo = new THREE.ConeGeometry(0.6, 1.0, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 2.2;
        g.add(hat);

        const staffGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0.6, 1.2, 0.3);
        g.add(staff);
      } else if (className === 'tank') {
        // Tower Shield
        const sGeo = new THREE.BoxGeometry(0.8, 1.5, 0.15);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8 });
        const shield = new THREE.Mesh(sGeo, sMat);
        shield.position.set(0.6, 1.0, 0.4);
        g.add(shield);
      }

      // Overhead nameplate placeholder
      return g;
    };

    // 8. 3D Telegraphs & FX Objects
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

    // Laser Beam for Phase 2
    const laserMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 45, 12),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.85 })
    );
    laserMesh.rotation.x = Math.PI / 2;
    laserMesh.position.set(0, 1.5, 0);
    laserMesh.visible = false;
    scene.add(laserMesh);

    // 3D Trap Visuals
    const trapMeshes = new Map<string, THREE.Object3D>();

    // 9. Floating Particle System
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 45;
      particlePos[i + 1] = Math.random() * 18;
      particlePos[i + 2] = (Math.random() - 0.5) * 45;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf97316,
      size: 0.25,
      transparent: true,
      opacity: 0.8,
    });
    const embers = new THREE.Points(particleGeo, particleMat);
    scene.add(embers);

    // Mouse Interaction / Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown && cameraMode === 'orbit') {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        camera.position.x -= deltaX * 0.05;
        camera.position.y += deltaY * 0.05;
        camera.position.y = Math.max(10, Math.min(50, camera.position.y));
        camera.lookAt(0, 0, 0);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (e.button === 0) {
        // Left click: Raycast against arena floor to get 2D coordinates for traps/clicks
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(platform);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          const pos2D = to2D(pt.x, pt.z);
          onCanvasClick(pos2D.x, pos2D.y);
        }
      }
    };

    const handlePointerUp = () => {
      isMouseDown = false;
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let animId: number;
    let clock = 0;

    const render = () => {
      clock += 0.016;
      const sim = stateRef.current;
      const isPhase2 = sim.boss.phase === 2;

      // Camera Animation / Behavior
      if (sim.phase === 'phase2_transition') {
        // Cinematic Zoom during cutscene
        camera.position.lerp(new THREE.Vector3(0, 8, 14), 0.05);
        camera.lookAt(0, 4, 0);
      } else if (cameraMode === 'tactical') {
        // Smooth isometric tactical angle
        const targetPos = new THREE.Vector3(0, 26, 28);
        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(0, 1, 0);
      } else if (cameraMode === 'cinematic') {
        // Dramatic dynamic orbit
        const camX = Math.sin(clock * 0.3) * 26;
        const camZ = Math.cos(clock * 0.3) * 26;
        camera.position.lerp(new THREE.Vector3(camX, 16, camZ), 0.05);
        camera.lookAt(0, 2, 0);
      }

      // Update Embers / Particles floating up
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += 0.05;
        if (positions[i] > 20) {
          positions[i] = 0;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Update Arena & Lighting for Phase 2
      if (isPhase2) {
        lavaMat.emissive.setHex(0x990033);
        mainSun.color.setHex(0xff77aa);
        bossLight.color.setHex(0xf43f5e);
        bossLight.intensity = 4.5 + Math.sin(clock * 8) * 1.5;
        runeRingMat.color.setHex(0xec4899);
      } else {
        bossLight.intensity = 2.5 + Math.sin(clock * 4) * 0.8;
      }

      // Update Boss 3D Position & Animations
      const bPos = to3D(sim.boss.x, sim.boss.y);
      bossGroup.position.x = bPos.x;
      bossGroup.position.z = bPos.z;

      // Boss Idle Breathing & Attack animations
      if (sim.boss.currentAction === 'windup') {
        // Raise sword high and shake with energy!
        swordGroup.rotation.x = 2.4 + Math.sin(clock * 30) * 0.15;
        swordGroup.position.y = 4.2;
        torso.rotation.x = -0.2;
      } else if (sim.boss.currentAction === 'attacking') {
        // Slam sword down into arena!
        swordGroup.rotation.x = -0.8;
        swordGroup.position.y = 1.0;
        torso.rotation.x = 0.3;
      } else if (sim.boss.currentAction === 'staggered') {
        torso.rotation.x = -0.4;
        bossGroup.rotation.z = Math.sin(clock * 20) * 0.15;
      } else {
        // Normal breathing
        torso.position.y = 3.2 + Math.sin(clock * 3) * 0.1;
        swordGroup.rotation.x = 0.4 + Math.sin(clock * 3) * 0.05;
        swordGroup.position.y = 2.5;
        bossGroup.rotation.z = 0;
      }

      // Phase 2 Wings flapping & hovering
      if (isPhase2) {
        wingGroup.visible = true;
        bossGroup.position.y = 1.5 + Math.sin(clock * 4) * 0.4; // Hovering
        leftWing.rotation.z = Math.sin(clock * 6) * 0.25;
        rightWing.rotation.z = -Math.sin(clock * 6) * 0.25;
      } else {
        wingGroup.visible = false;
        bossGroup.position.y = 0;
      }

      // Update Telegraphs in 3D
      if (sim.telegraphs.length > 0) {
        const tele = sim.telegraphs[0];
        telegraphMesh.visible = true;
        const telePos = to3D(tele.x, tele.y);
        telegraphMesh.position.set(telePos.x, 0.05, telePos.z);
        const teleRadius3D = tele.radius * 0.07;

        telegraphMesh.geometry.dispose();
        telegraphMesh.geometry = new THREE.RingGeometry(0.1, teleRadius3D, 32);

        // Pulsing color
        const tMat = telegraphMesh.material as THREE.MeshBasicMaterial;
        tMat.color.set(isPhase2 ? 0xec4899 : 0xef4444);
        tMat.opacity = 0.35 + Math.sin(clock * 12) * 0.15;

        // Laser telegraph in Phase 2
        if (tele.type === 'line') {
          laserMesh.visible = true;
          laserMesh.position.set(bPos.x, 2, bPos.z);
          laserMesh.rotation.y = clock * 1.5;
        } else {
          laserMesh.visible = false;
        }
      } else {
        telegraphMesh.visible = false;
        laserMesh.visible = false;
      }

      // Update Speedrunners in 3D
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

          // Add Glitch wireframe box
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

        // Facing direction toward boss
        const angle = Math.atan2(bPos.x - rPos.x, bPos.z - rPos.z);
        rGroup.rotation.y = angle;

        // Roll Flip Animation
        if (runner.isRolling) {
          rGroup.rotation.x += 0.4;
          rGroup.position.y = 0.5 + Math.sin(clock * 20) * 0.3;
        } else {
          rGroup.rotation.x = 0;
          rGroup.position.y = Math.sin(clock * 10 + parseInt(runner.id.slice(-1))) * 0.1;
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
              emissiveIntensity: 1.2,
            });
            tMesh = new THREE.Mesh(geo, mat);
          } else if (trap.type === 'invisible_wall') {
            const geo = new THREE.BoxGeometry(trap.radius * 0.12, 4, trap.radius * 0.12);
            const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
            tMesh = new THREE.Mesh(geo, mat);
            tMesh.position.y = 2;
          } else {
            // Spikes
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

      // Remove expired trap meshes
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
  }, [onCanvasClick, cameraMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-[600px] block select-none cursor-grab active:cursor-grabbing ${
          selectedTrap ? 'cursor-crosshair' : ''
        }`}
      />

      {/* 3D Camera Controls Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-xl backdrop-blur-md text-xs font-mono">
        <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">CAMERA:</span>
        <button
          onClick={() => setCameraMode('tactical')}
          className={`px-2.5 py-1 rounded-lg transition ${
            cameraMode === 'tactical'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Tactical
        </button>
        <button
          onClick={() => setCameraMode('cinematic')}
          className={`px-2.5 py-1 rounded-lg transition ${
            cameraMode === 'cinematic'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Cinematic
        </button>
        <button
          onClick={() => setCameraMode('orbit')}
          className={`px-2.5 py-1 rounded-lg transition ${
            cameraMode === 'orbit'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Free Orbit
        </button>
      </div>

      {/* Trap Placement Helper */}
      {selectedTrap && (
        <div className="absolute top-3 left-3 bg-sky-950/90 text-sky-200 border border-sky-400 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm pointer-events-none flex items-center gap-2 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          CLICK ANYWHERE ON 3D ARENA TO PLACE: {selectedTrap.toUpperCase().replace('_', ' ')}
        </div>
      )}

      {/* 3D Instructions Badge */}
      <div className="absolute bottom-3 left-3 bg-black/60 text-slate-400 text-[10px] font-mono px-2.5 py-1 rounded border border-slate-800 pointer-events-none">
        🎮 3D RAID CHAMBER • Left-click: Place traps / target • Drag: Orbit camera
      </div>
    </div>
  );
};
