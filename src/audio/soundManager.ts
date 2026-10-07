// Web Audio procedural sound synthesizer for Encounter Engineer

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private currentBgmPhase: 1 | 2 | 0 = 0;
  private bgmInterval: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgmGain) {
      this.bgmGain.gain.value = this.isMuted ? 0 : 0.15;
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Play a simple frequency envelope
  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, freqSlide?: number) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (freqSlide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqSlide), this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay or web audio context error ignored gracefully
    }
  }

  // SFX: Attack windup telegraph
  public playTelegraph() {
    this.playTone(220, 'sine', 0.25, 0.08, 440);
  }

  // SFX: Boss physical slam / slash
  public playBossAttack() {
    this.playTone(110, 'sawtooth', 0.4, 0.2, 40);
    setTimeout(() => {
      this.playTone(60, 'triangle', 0.3, 0.25, 20);
    }, 100);
  }

  // SFX: Glitch / Exploit detected alert
  public playGlitchAlert() {
    this.playTone(880, 'square', 0.1, 0.15);
    setTimeout(() => this.playTone(1200, 'square', 0.15, 0.15), 100);
  }

  // SFX: Hotpatch successfully applied
  public playHotfixApplied() {
    this.playTone(523.25, 'sine', 0.08, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.08, 0.15), 60); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.12, 0.15), 120); // G5
    setTimeout(() => this.playTone(1046.5, 'sine', 0.2, 0.2), 180); // C6
  }

  // SFX: Speedrunner roll i-frame
  public playRunnerRoll() {
    this.playTone(300, 'sine', 0.15, 0.05, 150);
  }

  // SFX: Speedrunner chugging potion
  public playPotionSip() {
    this.playTone(400, 'triangle', 0.08, 0.06, 600);
    setTimeout(() => this.playTone(550, 'triangle', 0.08, 0.06, 800), 70);
  }

  // SFX: Speedrunner downed / killed
  public playRunnerKilled() {
    this.playTone(400, 'sawtooth', 0.2, 0.12, 100);
  }

  // SFX: Arena Trap placed (pillar, spike, lava)
  public playTrapPlaced() {
    this.playTone(180, 'sawtooth', 0.25, 0.12, 90);
  }

  // SFX: The epic Phase 2 Cutscene trigger!
  public playPhase2Cutscene() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Thunderous explosion + ascending dramatic choir
    const chord = [130.81, 196.0, 261.63, 311.13, 392.0]; // C minor epic
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 1.5, 0.12, freq * 1.5);
      }, idx * 100);
    });

    setTimeout(() => {
      this.playTone(65.41, 'triangle', 2.0, 0.3, 30); // Sub-bass boom
    }, 500);
  }

  // SFX: Apocalypse Laser beam
  public playLaser() {
    this.playTone(800, 'sawtooth', 0.8, 0.15, 200);
  }

  // SFX: Victory / Speedrunners wiped
  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.4, 0.18), idx * 180);
    });
  }

  // SFX: Skipped Phase 2 Defeat / Fired buzzer
  public playFiredBuzzer() {
    this.playTone(150, 'sawtooth', 0.6, 0.25, 80);
    setTimeout(() => this.playTone(110, 'sawtooth', 0.8, 0.3, 55), 300);
  }

  // Procedural BGM engine
  public startBGM(phase: 1 | 2) {
    if (this.currentBgmPhase === phase && this.isBgmPlaying) return;
    this.stopBGM();

    this.initContext();
    if (!this.ctx) return;

    this.currentBgmPhase = phase;
    this.isBgmPlaying = true;

    let step = 0;
    // Simple procedural arpeggiator / bass loop
    const phase1Notes = [110, 130.81, 146.83, 164.81, 130.81, 110, 98, 110]; // A minor dungeon
    const phase2Notes = [130.81, 155.56, 174.61, 196.0, 220, 261.63, 233.08, 196.0]; // Intense C minor Phrygian

    const notes = phase === 1 ? phase1Notes : phase2Notes;
    const tempo = phase === 1 ? 260 : 160; // ms per beat

    this.bgmInterval = window.setInterval(() => {
      if (!this.isBgmPlaying || this.isMuted) return;
      const noteFreq = notes[step % notes.length];
      
      // Bass line
      this.playTone(noteFreq / 2, phase === 1 ? 'triangle' : 'sawtooth', 0.2, phase === 1 ? 0.04 : 0.06);

      // Lead melody pulse
      if (step % 2 === 0) {
        this.playTone(noteFreq * (phase === 1 ? 1 : 1.5), 'sine', 0.15, phase === 1 ? 0.03 : 0.05);
      }

      // Phase 2 hi-hat/snare synthetic noise
      if (phase === 2 && step % 4 === 2) {
        this.playTone(350, 'square', 0.06, 0.03, 100);
      }

      step++;
    }, tempo);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    this.currentBgmPhase = 0;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
