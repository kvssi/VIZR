import { MusicalState, SignalFeatures, MusicalContext, MusicalEvents } from './types';

export class Conductor {
  private state: MusicalState = MusicalState.IDLE;
  private confidence = { groove: 0, build: 0, drop: 0 };
  private energyTrend: number = 0;
  private lastKickTime: number = 0;
  private lastSnareTime: number = 0;
  private lastHatTime: number = 0;
  private lastPhraseBoundaryTime: number = 0;
  private beatInterval: number = 0.5; // Default 120BPM
  private lastBeatTime: number = 0;
  private beatCount: number = 0;
  private barCount: number = 0;
  private cooldowns: Record<string, number> = {};
  private repetitionMemory: Record<string, number> = {};
  private lastMusicalContextTime: number = 0;

  private smoothedKick: number = 0;
  private smoothedSnare: number = 0;
  private smoothedHat: number = 0;
  private smoothedBass: number = 0;

  constructor() {}

  update(features: SignalFeatures, time: number): MusicalContext {
    const dt = time - (this.lastMusicalContextTime || time);
    this.lastMusicalContextTime = time;

    // 1. Update Cooldowns & Memory Decay (Frame-based, no setTimeout)
    for (const key in this.cooldowns) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    }
    for (const key in this.repetitionMemory) {
      this.repetitionMemory[key] = Math.max(0, this.repetitionMemory[key] - dt * 0.5);
    }

    // 2. Musical Event Extraction (Probabilistic with Dynamic Threshold)
    const kick = this.detectKick(features, time);
    const snare = this.detectSnare(features, time);
    const hat = this.detectHat(features, time);
    const bass = features.low;

    this.smoothedKick += (kick - this.smoothedKick) * 0.25;
    this.smoothedSnare += (snare - this.smoothedSnare) * 0.25;
    this.smoothedHat += (hat - this.smoothedHat) * 0.25;
    this.smoothedBass += (bass - this.smoothedBass) * 0.15;

    // 3. Timing & Beat Tracking (PLL-like sync)
    if (kick > 0.8 && time - this.lastKickTime > 0.3) {
      const interval = time - this.lastKickTime;
      if (Math.abs(interval - this.beatInterval) < 0.15 || Math.abs(interval - this.beatInterval * 2) < 0.15) {
        this.confidence.groove = Math.min(1, this.confidence.groove + 0.15);
        const targetInterval = Math.abs(interval - this.beatInterval * 2) < 0.15 ? interval / 2 : interval;
        this.beatInterval = (this.beatInterval * 0.85) + (targetInterval * 0.15);
      } else {
        this.confidence.groove = Math.max(0, this.confidence.groove - 0.08);
      }
      this.lastKickTime = time;
      this.lastBeatTime = time;
      this.beatCount = (this.beatCount + 1) % 4;
      if (this.beatCount === 0) this.barCount = (this.barCount + 1) % 4;
    }

    const beatPhase = Math.min(1, (time - this.lastBeatTime) / this.beatInterval);
    const barPhase = (this.barCount + beatPhase) / 4;

    // 4. Energy Trend & State Detection
    const volDelta = features.vol - 0.3;
    this.energyTrend += volDelta * dt * 0.5; // Slower, more stable trend
    this.energyTrend = Math.max(-1, Math.min(1, this.energyTrend));

    this.updateState(features, time);

    // 5. Phrase Boundary Detection
    let isPhraseBoundary = false;
    if (this.barCount === 0 && this.beatCount === 0 && beatPhase < 0.05 && time - this.lastPhraseBoundaryTime > 2) {
      isPhraseBoundary = true;
      this.lastPhraseBoundaryTime = time;
    }

    return {
      state: this.state,
      events: {
        kick: this.smoothedKick,
        snare: this.smoothedSnare,
        hat: this.smoothedHat,
        bass: this.smoothedBass,
        isPhraseBoundary,
        intensity: features.vol * (1 + this.confidence.build * 0.6)
      },
      features,
      time,
      beatPhase,
      barPhase,
      energyTrend: this.energyTrend,
      confidence: this.confidence
    };
  }

  private detectKick(features: SignalFeatures, time: number): number {
    // Dynamic threshold based on average low energy
    const threshold = 0.5 + (this.smoothedBass * 0.2);
    if (features.low > threshold && features.onset > 0.45 && time - this.lastKickTime > 0.28) {
      return 1.0;
    }
    return 0;
  }

  private detectSnare(features: SignalFeatures, time: number): number {
    if (features.mid > 0.45 && features.flux > 0.35 && time - this.lastSnareTime > 0.22) {
      this.lastSnareTime = time;
      return 1.0;
    }
    return 0;
  }

  private detectHat(features: SignalFeatures, time: number): number {
    if (features.high > 0.25 && features.flux > 0.25 && time - this.lastHatTime > 0.12) {
      this.lastHatTime = time;
      return 1.0;
    }
    return 0;
  }

  private updateState(features: SignalFeatures, time: number) {
    const lowEnergy = features.low < 0.25;
    const highActivity = features.mid > 0.45 || features.high > 0.45;
    const rising = this.energyTrend > 0.25;
    const falling = this.energyTrend < -0.25;

    // State Machine with Hysteresis
    switch (this.state) {
      case MusicalState.IDLE:
        if (features.vol > 0.2) this.state = MusicalState.GROOVE_LOCKED;
        break;
      case MusicalState.GROOVE_LOCKED:
        if (lowEnergy && highActivity && rising) this.state = MusicalState.BUILDING;
        if (falling && features.vol < 0.2) this.state = MusicalState.BREAKDOWN;
        if (features.vol < 0.05) this.state = MusicalState.IDLE;
        break;
      case MusicalState.BUILDING:
        this.confidence.build = Math.min(1, this.confidence.build + 0.005);
        if (this.confidence.build > 0.75 && features.flux > 0.6) this.state = MusicalState.PRE_DROP_TENSION;
        if (falling || features.vol < 0.2) this.state = MusicalState.BREAKDOWN;
        break;
      case MusicalState.PRE_DROP_TENSION:
        if (features.low > 0.65 || this.confidence.build < 0.1) {
          this.state = MusicalState.DROP_RELEASE;
          this.confidence.drop = 1.0;
          this.confidence.build = 0;
        }
        break;
      case MusicalState.DROP_RELEASE:
        this.confidence.drop *= 0.96;
        if (this.confidence.drop < 0.05) this.state = MusicalState.GROOVE_LOCKED;
        break;
      case MusicalState.BREAKDOWN:
        if (features.low > 0.45 && !falling) this.state = MusicalState.GROOVE_LOCKED;
        if (features.vol < 0.05) this.state = MusicalState.IDLE;
        break;
    }
  }

  // Tastefulness Engine: Check if an event should trigger
  shouldTrigger(eventId: string, priority: number, threshold: number = 0.5, cooldownTime: number = 0.5): boolean {
    const cooldown = this.cooldowns[eventId] || 0;
    if (cooldown > 0) return false;

    const memory = this.repetitionMemory[eventId] || 0;
    // Memory makes it harder to trigger the same event repeatedly
    const adjustedThreshold = threshold + (memory * 0.15);

    if (priority > adjustedThreshold) {
      this.cooldowns[eventId] = cooldownTime;
      this.repetitionMemory[eventId] = (this.repetitionMemory[eventId] || 0) + 1.0;
      return true;
    }
    return false;
  }
}
