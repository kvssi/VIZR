export enum MusicalState {
  IDLE = 'IDLE',
  GROOVE_LOCKED = 'GROOVE_LOCKED',
  BUILDING = 'BUILDING',
  BREAKDOWN = 'BREAKDOWN',
  PRE_DROP_TENSION = 'PRE_DROP_TENSION',
  DROP_RELEASE = 'DROP_RELEASE',
  AFTERGLOW = 'AFTERGLOW'
}

export interface SignalFeatures {
  vol: number;
  low: number;
  mid: number;
  high: number;
  rawVol: number;
  flux: number; // Spectral flux (change in timbre)
  onset: number; // Raw onset strength
}

export interface MusicalEvents {
  kick: number;
  snare: number;
  hat: number;
  bass: number;
  isPhraseBoundary: boolean;
  intensity: number;
}

export interface MusicalContext {
  state: MusicalState;
  events: MusicalEvents;
  features: SignalFeatures;
  time: number;
  beatPhase: number; // 0-1 within a beat
  barPhase: number; // 0-1 within a 4-bar phrase
  energyTrend: number; // -1 to 1 (falling to rising)
  confidence: {
    groove: number;
    build: number;
    drop: number;
  };
}

export interface MaterialInstructions {
  pressure: number;
  viscosity: number;
  glitchSync: number;
  flow: number;
  shimmer: number;
  structuralTension: number;
  impact: number;
}
