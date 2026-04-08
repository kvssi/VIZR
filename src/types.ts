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
  // Raw pulses (fast decay, high impact)
  rawKick: number;
  rawSnare: number;
  rawHat: number;
  rawBass: number;
  
  // Smoothed envelopes (slow decay, continuous motion)
  smoothedKick: number;
  smoothedSnare: number;
  smoothedHat: number;
  smoothedBass: number;
  
  // Legacy aliases (mapped to smoothed by default to prevent breaking changes, but we'll update usages)
  kick: number;
  snare: number;
  hat: number;
  bass: number;
  
  isPhraseBoundary: boolean;
  beatAccent: number; // 0: normal, 1: 4th beat, 2: 8th beat, 3: 16th beat
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

export type VisualMode = 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope';

export interface ToggleState {
  enableGlitch: boolean;
  enableVHS: boolean;
  enableCurvature: boolean;
  enableNoise: boolean;
  enableFlicker: boolean;
  enableRGBSplit: boolean;
  enableDriftOffset: boolean;
  enableBlobDynamics: boolean;
}

export interface SliderState {
  globalEffects: number;
  flickerAmount: number;
  motionAmount: number;
  eventDensity: number;
  transitionSpeed: number;
}

export interface ControlState {
  visualMode: VisualMode;
  colorMode: string;
  toggles: Record<VisualMode, ToggleState>;
  sliders: SliderState;
  overlaySettings: Record<string, {
    enabled: boolean;
    mode: 'normal' | 'black' | 'white';
    opacity: number;
  }>;
}

export const defaultToggleState: ToggleState = {
  enableGlitch: false,
  enableVHS: false,
  enableCurvature: false,
  enableNoise: false,
  enableFlicker: false,
  enableRGBSplit: false,
  enableDriftOffset: false,
  enableBlobDynamics: false,
};

export const defaultSliderState: SliderState = {
  globalEffects: 0.5,
  flickerAmount: 0.5,
  motionAmount: 0.5,
  eventDensity: 0.5,
  transitionSpeed: 0.5,
};

export const defaultControlState: ControlState = {
  visualMode: 'signal-glitch',
  colorMode: 'mostly-mono',
  toggles: {
    'signal-glitch': { ...defaultToggleState },
    'lava-space': { ...defaultToggleState },
    'represent': { ...defaultToggleState },
    'contour': { ...defaultToggleState },
    'kaleidoscope': { ...defaultToggleState },
  },
  sliders: { ...defaultSliderState },
  overlaySettings: {
    'signal-glitch': { enabled: false, mode: 'normal', opacity: 50 },
    'lava-space': { enabled: false, mode: 'normal', opacity: 50 },
    'represent': { enabled: false, mode: 'normal', opacity: 50 },
    'contour': { enabled: false, mode: 'normal', opacity: 50 },
    'kaleidoscope': { enabled: false, mode: 'normal', opacity: 50 },
  }
};
