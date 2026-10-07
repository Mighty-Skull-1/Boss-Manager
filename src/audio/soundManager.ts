// Web Audio procedural sound synthesizer for Encounter Engineer: Kombat / Souls / GTA Edition

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private currentBgmPhase: 1 | 2 | 0 = 0;
  private currentRadioStation: number = 0; // 0: Synthwave, 1: Elden Gothic, 2: Cyber Drill
  private bgmInterval: number | null = null;

  constructor() {
    // Initialized on first user click
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
      // Audio context catch
    }
  }

  // Mortal Kombat Heavy Hit-Stop Impact
  public playHeavyImpact() {
    this.playTone(85, 'sawtooth', 0.25, 0.25, 30);
    setTimeout(() => this.playTone(45, 'triangle', 0.35, 0.3, 15), 50);
  }

  // Elden Ring Critical Riposte / Visceral Execution Stab
  public playCriticalRiposte() {
    this.playTone(440, 'triangle', 0.8, 0.3, 220); // High bell strike
    setTimeout(() => this.playTone(110, 'sawtooth', 0.5, 0.35, 35), 150); // Flesh rend
    setTimeout(() => this.playTone(55, 'triangle', 0.8, 0.4, 20), 250); // Deep bass resonance
  }

  // Mortal Kombat Announcer "FATALITY!"
  public playAnnouncerFatality() {
    const speechTones = [180, 150, 120, 90];
    speechTones.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.25, 0.25), idx * 120);
    });
  }

  // Mortal Kombat Announcer "FIGHT!"
  public playAnnouncerFight() {
    this.playTone(150, 'sawtooth', 0.15, 0.2);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.3, 0.25, 80), 120);
  }

  // Elden Ring Posture Break Gong
  public playPostureBreak() {
    this.playTone(330, 'sine', 1.0, 0.3, 165);
    setTimeout(() => this.playTone(660, 'sine', 0.6, 0.2, 330), 80);
  }

  // GTA 5 Wanted Star Siren Blip
  public playWantedSirens() {
    this.playTone(600, 'square', 0.15, 0.12);
    setTimeout(() => this.playTone(850, 'square', 0.2, 0.12), 160);
  }

  // GTA "WASTED" Sub-Bass Boom
  public playWasted() {
    this.playTone(110, 'sine', 2.0, 0.4, 25);
    setTimeout(() => this.playTone(55, 'triangle', 2.5, 0.4, 15), 400);
  }

  // Radio Station Next
  public nextRadioStation(): string {
    const stations = ['LOS SANTOS SYNTHWAVE', 'ELDEN GOTHIC CHOIR', 'SPEEDRUN CYBER DRILL'];
    this.currentRadioStation = (this.currentRadioStation + 1) % stations.length;
    this.playTone(700, 'sine', 0.08, 0.1);
    setTimeout(() => this.playTone(1050, 'sine', 0.1, 0.12), 60);

    if (this.isBgmPlaying) {
      this.startBGM(this.currentBgmPhase as 1 | 2);
    }

    return stations[this.currentRadioStation];
  }

  public getCurrentStationName(): string {
    const stations = ['LOS SANTOS SYNTHWAVE', 'ELDEN GOTHIC CHOIR', 'SPEEDRUN CYBER DRILL'];
    return stations[this.currentRadioStation];
  }

  // Standard Attacks & FX
  public playTelegraph() {
    this.playTone(220, 'sine', 0.25, 0.08, 440);
  }

  public playBossAttack() {
    this.playTone(110, 'sawtooth', 0.4, 0.2, 40);
  }

  public playGlitchAlert() {
    this.playTone(880, 'square', 0.1, 0.15);
    setTimeout(() => this.playTone(1200, 'square', 0.15, 0.15), 100);
  }

  public playHotfixApplied() {
    this.playTone(523.25, 'sine', 0.08, 0.15);
    setTimeout(() => this.playTone(659.25, 'sine', 0.08, 0.15), 60);
    setTimeout(() => this.playTone(783.99, 'sine', 0.12, 0.15), 120);
    setTimeout(() => this.playTone(1046.5, 'sine', 0.2, 0.2), 180);
  }

  public playRunnerRoll() {
    this.playTone(300, 'sine', 0.15, 0.05, 150);
  }

  public playPotionSip() {
    this.playTone(400, 'triangle', 0.08, 0.06, 600);
  }

  public playRunnerKilled() {
    this.playTone(400, 'sawtooth', 0.2, 0.12, 100);
  }

  public playTrapPlaced() {
    this.playTone(180, 'sawtooth', 0.25, 0.12, 90);
  }

  public playPhase2Cutscene() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const chord = [130.81, 196.0, 261.63, 311.13, 392.0];
    chord.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 1.5, 0.12, freq * 1.5), idx * 100);
    });
    setTimeout(() => this.playTone(65.41, 'triangle', 2.0, 0.3, 30), 500);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.4, 0.18), idx * 180);
    });
  }

  public playFiredBuzzer() {
    this.playWasted();
  }

  // Dynamic Radio Station BGM
  public startBGM(phase: 1 | 2) {
    if (this.currentBgmPhase === phase && this.isBgmPlaying) return;
    this.stopBGM();

    this.initContext();
    if (!this.ctx) return;

    this.currentBgmPhase = phase;
    this.isBgmPlaying = true;

    let step = 0;
    // Station melodies
    const synthNotes = [110, 130.81, 146.83, 164.81, 130.81, 110, 98, 110];
    const eldenNotes = [82.41, 98, 110, 123.47, 98, 82.41, 73.42, 82.41]; // Deep E minor
    const drillNotes = [146.83, 174.61, 196, 220, 261.63, 220, 196, 174.61];

    const stationNotes = 
      this.currentRadioStation === 1 ? eldenNotes :
      this.currentRadioStation === 2 ? drillNotes : synthNotes;

    const tempo = phase === 1 ? 240 : 150;

    this.bgmInterval = window.setInterval(() => {
      if (!this.isBgmPlaying || this.isMuted) return;
      const noteFreq = stationNotes[step % stationNotes.length];

      // Bass line
      this.playTone(noteFreq / 2, phase === 1 ? 'triangle' : 'sawtooth', 0.2, phase === 1 ? 0.04 : 0.07);

      // Lead melody pulse
      if (step % 2 === 0) {
        this.playTone(noteFreq * (phase === 1 ? 1 : 1.5), 'sine', 0.15, phase === 1 ? 0.03 : 0.05);
      }

      // Snare / Hi-hat
      if (step % 4 === 2) {
        this.playTone(320, 'square', 0.06, 0.03, 90);
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
