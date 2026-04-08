import type { ToggleState } from '../types';

export const sliderLabels = [
  'Global Effects',
  'Flicker Amount',
  'Motion Amount',
  'Event Density',
  'Transition Speed'
] as const;

export const toggleConfigs: Array<{ key: keyof ToggleState; label: string }> = [
  { key: 'enableGlitch', label: 'Glitch' },
  { key: 'enableVHS', label: 'VHS Overlay' },
  { key: 'enableCurvature', label: 'Curvature' },
  { key: 'enableNoise', label: 'Noise' },
  { key: 'enableFlicker', label: 'Flicker' },
  { key: 'enableRGBSplit', label: 'RGB Split' },
  { key: 'enableDriftOffset', label: 'Drift Offset' },
  { key: 'enableBlobDynamics', label: 'Blob Dynamics' }
];
