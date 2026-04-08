
import React, { MutableRefObject } from 'react';
import { Play, Pause, Square, Maximize, Zap, Dices } from 'lucide-react';
import { ToggleSwitch } from './ToggleSwitch';
import { VisualEngine } from '../engine/VisualEngine';
import { sliderLabels, toggleConfigs } from './controlConfig';

export interface LiveControlsProps {
  showUI: boolean;
  livePage: 'controls' | 'performance' | 'overlay';
  setLivePage: (page: 'controls' | 'performance' | 'overlay') => void;
  handleStop: () => void;
  audioMode: 'mic' | 'ambient' | 'screen' | 'file';
  filePlaying: boolean;
  setFilePlaying: (val: boolean) => void;
  fileVolume: number;
  setFileVolume: (val: number) => void;
  handleShuffle: () => void;
  handleRandomize: () => void;
  toggleFullscreen: () => void;
  visualMode: string;
  globalEffects: number;
  setGlobalEffects: (val: number) => void;
  flickerAmount: number;
  setFlickerAmount: (val: number) => void;
  motionAmount: number;
  setMotionAmount: (val: number) => void;
  eventDensity: number;
  setEventDensity: (val: number) => void;
  transitionSpeed: number;
  setTransitionSpeed: (val: number) => void;
  enableGlitch: boolean;
  setEnableGlitch: (val: boolean) => void;
  enableVHS: boolean;
  setEnableVHS: (val: boolean) => void;
  enableCurvature: boolean;
  setEnableCurvature: (val: boolean) => void;
  enableNoise: boolean;
  setEnableNoise: (val: boolean) => void;
  enableFlicker: boolean;
  setEnableFlicker: (val: boolean) => void;
  enableRGBSplit: boolean;
  setEnableRGBSplit: (val: boolean) => void;
  enableDriftOffset: boolean;
  setEnableDriftOffset: (val: boolean) => void;
  enableBlobDynamics: boolean;
  setEnableBlobDynamics: (val: boolean) => void;
  overlaySettings: any;
  setOverlaySettings: any;
  engineRef: MutableRefObject<VisualEngine | null>;
}

export const LiveControls = ({
  showUI, livePage, setLivePage, handleStop, audioMode, filePlaying, setFilePlaying,
  fileVolume, setFileVolume, handleShuffle, handleRandomize, toggleFullscreen,
  visualMode, globalEffects, setGlobalEffects, flickerAmount, setFlickerAmount,
  motionAmount, setMotionAmount, eventDensity, setEventDensity, transitionSpeed,
  setTransitionSpeed, enableGlitch, setEnableGlitch, enableVHS, setEnableVHS,
  enableCurvature, setEnableCurvature, enableNoise, setEnableNoise, enableFlicker,
  setEnableFlicker, enableRGBSplit, setEnableRGBSplit, enableDriftOffset, setEnableDriftOffset,
  enableBlobDynamics, setEnableBlobDynamics, overlaySettings, setOverlaySettings,
  engineRef
}: LiveControlsProps) => {
  const toggleValues = {
    enableGlitch,
    enableVHS,
    enableCurvature,
    enableNoise,
    enableFlicker,
    enableRGBSplit,
    enableDriftOffset,
    enableBlobDynamics
  };

  const toggleSetters = {
    enableGlitch: setEnableGlitch,
    enableVHS: setEnableVHS,
    enableCurvature: setEnableCurvature,
    enableNoise: setEnableNoise,
    enableFlicker: setEnableFlicker,
    enableRGBSplit: setEnableRGBSplit,
    enableDriftOffset: setEnableDriftOffset,
    enableBlobDynamics: setEnableBlobDynamics
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className={`absolute bottom-0 sm:bottom-6 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-auto max-w-[95vw] flex flex-col gap-4 bg-vizr-onyx/90 border-t border-white/10 sm:border border-white/5 backdrop-blur-2xl p-6 sm:rounded-sm transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] ${showUI ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}`}
    >
      {/* Top Row: System Controls */}
      <div className="flex items-center justify-between gap-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleStop}
            className="p-2.5 text-vizr-signal hover:bg-vizr-signal/10 rounded-sm transition-all active:scale-95"
            title="Terminate Engine"
          >
            <Square size={20} fill="currentColor" />
          </button>
          
          <div className="h-4 w-px bg-white/10" />
          
          {/* NAVIGATION MODES */}
          <div className="flex bg-black/40 border border-white/5 p-0.5">
            <button
              onClick={() => setLivePage('controls')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                livePage === 'controls' ? 'bg-vizr-signal text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              Visuals
            </button>
            <button
              onClick={() => setLivePage('overlay')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                livePage === 'overlay' ? 'bg-vizr-signal text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              Overlay
            </button>
            <button
              onClick={() => setLivePage('performance')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                livePage === 'performance' ? 'bg-vizr-signal text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              Performance
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {audioMode === 'file' && (
            <div className="flex items-center gap-4 px-4 bg-white/5 border border-white/5 py-1 rounded-sm mr-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (engineRef.current && engineRef.current.audioAnalyzer) {
                    engineRef.current.audioAnalyzer.togglePlayPause();
                    setFilePlaying(engineRef.current.audioAnalyzer.isFilePlaying());
                  }
                }}
                className="text-white hover:text-vizr-signal transition-colors p-1"
              >
                {filePlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Gain</span>
                <input 
                  type="range" min="0" max="1" step="0.01"
                  value={fileVolume}
                  onChange={(e) => {
                    e.stopPropagation();
                    const v = parseFloat(e.target.value);
                    setFileVolume(v);
                    if (engineRef.current && engineRef.current.audioAnalyzer) {
                      engineRef.current.audioAnalyzer.setVolume(v);
                    }
                  }}
                  className="w-16 accent-vizr-signal h-1 bg-black/50 appearance-none outline-none"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); handleShuffle(); }}
              className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
              title="Shuffle"
            >
              <Zap size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleRandomize(); }}
              className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
              title="Randomize"
            >
              <Dices size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
              title="Fullscreen"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>

      {livePage === 'controls' ? (
        <div className="space-y-6 pt-2">
          {/* Primary Calibration */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            {[
              { label: sliderLabels[0], value: globalEffects, setter: setGlobalEffects },
              { label: sliderLabels[1], value: flickerAmount, setter: setFlickerAmount },
              { label: sliderLabels[2], value: motionAmount, setter: setMotionAmount },
              { label: sliderLabels[3], value: eventDensity, setter: setEventDensity },
              { label: sliderLabels[4], value: transitionSpeed, setter: setTransitionSpeed },
            ].map((s, idx) => (
              <div key={idx} className="space-y-2.5">
                <div className="flex justify-between items-center group">
                  <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.15em] transition-colors group-hover:text-vizr-signal leading-tight">{s.label}</span>
                  <span className="text-[9px] font-black text-neutral-400 bg-black/40 px-1 py-0.5 border border-white/5">{(s.value * 100).toFixed(0)}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.01"
                  value={s.value}
                  onChange={(e) => s.setter(parseFloat(e.target.value))}
                  className="w-full accent-vizr-signal h-1 bg-white/5 appearance-none outline-none cursor-pointer hover:bg-white/10 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Logic Modules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-white/5">
            {toggleConfigs.map((toggle) => {
              const isBlobToggle = toggle.key === 'enableBlobDynamics';
              const isDisabled = isBlobToggle && visualMode !== 'lava-space';
              return (
                <div key={toggle.key} className={isDisabled ? 'opacity-40' : ''}>
                  <ToggleSwitch
                    label={toggle.label}
                    checked={toggleValues[toggle.key]}
                    onChange={isDisabled ? (() => {}) : toggleSetters[toggle.key]}
                  />
                </div>
              );
            })}
          </div>
          
        </div>
      ) : livePage === 'overlay' ? (
        <div className="space-y-6 pt-2">
          {visualMode !== 'represent' ? (
            <div className="space-y-4">
              <ToggleSwitch 
                label="LENS OVERLAY" 
                checked={overlaySettings[visualMode]?.enabled ?? true} 
                onChange={(val) => setOverlaySettings((prev: any) => ({ ...prev, [visualMode]: { ...prev[visualMode], enabled: val } }))} 
              />
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest whitespace-nowrap">Luminance</span>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={overlaySettings[visualMode]?.opacity ?? 100}
                  onChange={(e) => setOverlaySettings((prev: any) => ({ ...prev, [visualMode]: { ...prev[visualMode], opacity: parseInt(e.target.value, 10) } }))}
                  className="w-full accent-vizr-signal h-1 bg-white/5 appearance-none outline-none"
                />
                <span className="text-[9px] font-black text-neutral-400 bg-black/40 px-1 py-0.5 border border-white/5 min-w-10 text-center">
                  {overlaySettings[visualMode]?.opacity ?? 100}
                </span>
              </div>
              <div className="flex bg-black/40 border border-white/5 p-0.5">
                {['black', 'white', 'normal'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setOverlaySettings((prev: any) => ({ ...prev, [visualMode]: { ...prev[visualMode], mode } }))}
                    className={`flex-1 text-[9px] font-black uppercase tracking-widest py-3 transition-all ${
                      (overlaySettings[visualMode]?.mode ?? 'normal') === mode ? 'bg-vizr-signal text-white shadow-xl' : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 border border-white/5 bg-white/5 px-4 py-6 text-center">
              Overlay controls are not used in represent mode.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 pt-2">
          {/* MACRO TRIGGER CLUSTER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'buildUp', label: 'Inversion' },
              { id: 'tension', label: 'Pressure' },
              { id: 'drop', label: 'Release' },
              { id: 'extraBounce', label: 'Impact' },
            ].map(macro => (
              <button
                key={macro.id}
                onPointerDown={() => engineRef.current?.setMacro(macro.id, true)}
                onPointerUp={() => engineRef.current?.setMacro(macro.id, false)}
                onPointerLeave={() => engineRef.current?.setMacro(macro.id, false)}
                className="h-20 bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 hover:bg-vizr-signal/5 active:bg-vizr-signal active:text-white transition-all flex flex-col items-center justify-center gap-2 group select-none"
              >
                <div className="w-1.5 h-1.5 bg-neutral-700 group-active:bg-white rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{macro.label}</span>
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-bold text-neutral-700 uppercase tracking-[0.3em]">
             <span>Performance Mode /// Active Output</span>
             <span className="text-vizr-signal font-black">Live Data Stream</span>
          </div>
        </div>
      )}
    </div>
  );
};
