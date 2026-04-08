import React, { MutableRefObject } from 'react';
import { Upload, Mic, MicOff, Play, Maximize, Image as ImageIcon, MonitorUp, FileAudio, Info, Wifi, Activity } from 'lucide-react';
import { ToggleSwitch } from './ToggleSwitch';
import { AudioLevelMeter } from '../AudioLevelMeter';
import type { AssetItem } from '../assets/assetTypes';
import { sliderLabels, toggleConfigs } from './controlConfig';

export interface SetupViewProps {
  APP_VERSION: string;
  assets: AssetItem[];
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  audioFileInputRef: MutableRefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowAssetInfoModal: (b: boolean) => void;
  setView: (v: 'setup' | 'editor' | 'visualizer') => void;
  audioMode: 'mic' | 'ambient' | 'screen' | 'file';
  setAudioMode: (m: 'mic' | 'ambient' | 'screen' | 'file') => void;
  audioFile?: File;
  setAudioFile: (f?: File) => void;
  devices: MediaDeviceInfo[];
  deviceId: string;
  setDeviceId: (id: string) => void;
  audioError: string;
  setAudioError: (e: string) => void;
  visualMode: string;
  setVisualMode: (m: string) => void;
  colorMode: string;
  setColorMode: (m: string) => void;
  globalEffects: number;
  setGlobalEffects: (n: number) => void;
  flickerAmount: number;
  setFlickerAmount: (n: number) => void;
  motionAmount: number;
  setMotionAmount: (n: number) => void;
  eventDensity: number;
  setEventDensity: (n: number) => void;
  transitionSpeed: number;
  setTransitionSpeed: (n: number) => void;
  enableGlitch: boolean;
  setEnableGlitch: (b: boolean) => void;
  enableVHS: boolean;
  setEnableVHS: (b: boolean) => void;
  enableCurvature: boolean;
  setEnableCurvature: (b: boolean) => void;
  enableNoise: boolean;
  setEnableNoise: (b: boolean) => void;
  enableFlicker: boolean;
  setEnableFlicker: (b: boolean) => void;
  enableRGBSplit: boolean;
  setEnableRGBSplit: (b: boolean) => void;
  enableDriftOffset: boolean;
  setEnableDriftOffset: (b: boolean) => void;
  enableBlobDynamics: boolean;
  setEnableBlobDynamics: (b: boolean) => void;
  overlaySettings: any;
  setOverlaySettings: any;
  handleStart: () => void;
  setShowRemoteModal: (b: boolean) => void;
  setShowFaqModal: (b: boolean) => void;
  setShowAboutModal: (b: boolean) => void;
  setShowContactModal: (b: boolean) => void;
  setShowImpressumModal: (b: boolean) => void;
}

export const SetupView = ({
  APP_VERSION, assets, fileInputRef, audioFileInputRef, handleFileChange, handleAudioFileChange, setShowAssetInfoModal, setView,
  audioMode, setAudioMode, audioFile, setAudioFile, devices, deviceId, setDeviceId,
  audioError, setAudioError, visualMode, setVisualMode, colorMode, setColorMode,
  globalEffects, setGlobalEffects, flickerAmount, setFlickerAmount, motionAmount,
  setMotionAmount, eventDensity, setEventDensity, transitionSpeed, setTransitionSpeed,
  enableGlitch, setEnableGlitch, enableVHS, setEnableVHS, enableCurvature,
  setEnableCurvature, enableNoise, setEnableNoise, enableFlicker, setEnableFlicker,
  enableRGBSplit, setEnableRGBSplit, enableDriftOffset, setEnableDriftOffset,
  enableBlobDynamics, setEnableBlobDynamics, overlaySettings, setOverlaySettings,
  handleStart, setShowRemoteModal, setShowFaqModal, setShowAboutModal,
  setShowContactModal, setShowImpressumModal
}: SetupViewProps) => {
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
    <div className="min-h-screen bg-vizr-onyx text-neutral-300 font-mono flex flex-col p-4 sm:p-6 lg:p-10 selection:bg-vizr-signal selection:text-white overflow-hidden">
      <div className="w-full flex-1 border border-white/5 p-8 bg-vizr-onyx relative flex flex-col shadow-2xl">
        
        {/* Top Navigation / Status Area */}
        <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-[-0.05em] uppercase text-white flex items-center gap-3">
              VIZR <span className="text-[10px] bg-vizr-signal text-white px-2 py-0.5 tracking-widest font-black rounded-sm">V{APP_VERSION}</span>
            </h1>
            <p className="text-[10px] text-neutral-600 uppercase tracking-[0.3em] font-bold">Synchronized Visual Instrumentation</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
               <button onClick={() => setShowFaqModal(true)} className="hover:text-vizr-signal transition-colors">Documentation</button>
               <button onClick={() => setShowAboutModal(true)} className="hover:text-vizr-signal transition-colors">Core</button>
               <button onClick={() => setShowContactModal(true)} className="hover:text-vizr-signal transition-colors">Support</button>
            </div>
            <div className="h-8 w-px bg-white/5 mx-2"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-vizr-surface border border-white/5 rounded-sm">
               <div className="w-1.5 h-1.5 rounded-full bg-vizr-signal animate-pulse"></div>
               <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">System Ready</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Column 1 */}
          <div className="space-y-8">
            {/* File Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-2 block">01 / Material Intake</label>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 p-10 border border-white/5 hover:border-vizr-signal/30 group transition-all bg-vizr-surface/30 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-vizr-signal/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Upload size={24} className="group-hover:text-vizr-signal transition-colors" />
              <span className="text-[11px] uppercase tracking-[0.15em] font-bold group-hover:text-white transition-colors">
                {assets.length > 0 ? `${assets.length} Identifiers Loaded` : 'Load Image Collection'}
              </span>
            </button>
            <div className="flex items-center justify-between text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-3 px-1">
              <span className="flex items-center gap-2"><div className="w-1 h-1 bg-vizr-signal rounded-full"></div> {assets.length > 0 ? `Inventory: ${assets.length}` : 'Empty'}</span>
              <button 
                onClick={() => setShowAssetInfoModal(true)}
                className="text-neutral-600 hover:text-vizr-signal transition-colors"
              >
                Naming Protocol
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple 
              accept="image/*"
              className="hidden"
            />
            {assets.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto border border-white/5 bg-vizr-surface/20 p-2 space-y-2">
                {assets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between text-[9px] text-neutral-400">
                    <span className="truncate w-1/2">{asset.file.name}</span>
                    <div className="flex gap-2">
                      <span className="px-1.5 py-0.5 bg-white/5 rounded">{asset.metadata.type}</span>
                      <span className="px-1.5 py-0.5 bg-white/5 rounded">{asset.metadata.behavior}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asset Editor Button */}
          <button 
            onClick={() => setView('editor')}
            className="w-full flex items-center justify-center gap-3 p-4 border border-white/5 text-neutral-500 hover:border-vizr-signal/20 hover:text-white bg-vizr-surface/10 text-[11px] font-bold uppercase tracking-[0.2em] transition-all group"
          >
            <ImageIcon size={16} className="group-hover:text-vizr-signal transition-colors" />
            Asset Configuration
          </button>

          {/* Audio Mode */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">02 / Signal Intake</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setAudioMode('ambient')}
                className={`flex items-center justify-center gap-3 p-4 border text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                  audioMode === 'ambient' 
                    ? 'border-vizr-signal text-white bg-vizr-signal/10' 
                    : 'border-white/5 text-neutral-600 hover:border-white/20 hover:text-neutral-300 bg-vizr-surface/5'
                }`}
              >
                <MicOff size={14} /> Ambient
              </button>
              <button 
                onClick={() => setAudioMode('mic')}
                className={`flex items-center justify-center gap-3 p-4 border text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                  audioMode === 'mic' 
                    ? 'border-vizr-signal text-white bg-vizr-signal/10' 
                    : 'border-white/5 text-neutral-600 hover:border-white/20 hover:text-neutral-300 bg-vizr-surface/5'
                }`}
              >
                <Mic size={14} /> Mic
              </button>
              <button 
                onClick={() => setAudioMode('screen')}
                className={`flex items-center justify-center gap-3 p-4 border text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                  audioMode === 'screen' 
                    ? 'border-vizr-signal text-white bg-vizr-signal/10' 
                    : 'border-white/5 text-neutral-600 hover:border-white/20 hover:text-neutral-300 bg-vizr-surface/5'
                }`}
              >
                <MonitorUp size={14} /> Screen
              </button>
              <button 
                onClick={() => setAudioMode('file')}
                className={`flex items-center justify-center gap-3 p-4 border text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                  audioMode === 'file' 
                    ? 'border-vizr-signal text-white bg-vizr-signal/10' 
                    : 'border-white/5 text-neutral-600 hover:border-white/20 hover:text-neutral-300 bg-vizr-surface/5'
                }`}
              >
                <FileAudio size={14} /> File
              </button>
            </div>
            
            {audioMode === 'mic' && devices.length > 0 && (
              <select 
                value={deviceId} 
                onChange={e => setDeviceId(e.target.value)}
                className="w-full p-2 bg-vizr-surface border border-white/5 text-[10px] text-neutral-300 outline-none focus:border-vizr-signal"
              >
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            )}

            {audioMode === 'file' && (
              <div className="space-y-3">
                <button
                  onClick={() => audioFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 p-4 border border-white/5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400 hover:text-white hover:border-vizr-signal/30 bg-vizr-surface/10 transition-all"
                >
                  <FileAudio size={14} />
                  {audioFile ? 'Replace Audio File' : 'Load Audio File'}
                </button>
                <input
                  type="file"
                  ref={audioFileInputRef}
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />
              </div>
            )}
            
            {((audioMode === 'file' && audioFile) || audioMode !== 'file') && (
              <AudioLevelMeter 
                mode={audioMode} 
                file={audioFile} 
                analyzer={null}
                onClearFile={() => {
                  setAudioFile(undefined);
                  if (audioFileInputRef.current) {
                    audioFileInputRef.current.value = '';
                  }
                }}
              />
            )}
          </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-8">
            {/* Visual Mode */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">03 / Engine Logic</label>
              <div className="relative group">
                <select 
                  value={visualMode} 
                  onChange={e => {
                    const newMode = e.target.value as 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope';
                    setVisualMode(newMode);
                    if (newMode === 'signal-glitch') setColorMode('mostly-mono');
                    else if (newMode === 'lava-space') setColorMode('cosmic-flow');
                    else if (newMode === 'contour') setColorMode('print-black');
                    else if (newMode === 'kaleidoscope') setColorMode('mostly-mono');
                    else setColorMode('atmospheric');
                  }}
                  className="w-full p-4 bg-vizr-surface border border-white/5 text-[11px] font-bold uppercase tracking-[0.1em] text-white outline-none focus:border-vizr-signal appearance-none cursor-pointer"
                >
                  <option value="signal-glitch">Signal Glitch (Precision)</option>
                  <option value="lava-space">Lava Space (Dynamic)</option>
                  <option value="represent">Represent (Structural)</option>
                  <option value="contour">Contour (Cartographic)</option>
                  <option value="kaleidoscope">Kaleidoscope (Symmetric)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-vizr-signal">
                   <div className="w-1.5 h-1.5 bg-vizr-signal rotate-45 group-hover:animate-ping"></div>
                </div>
              </div>
            </div>

            {/* Color Mode */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">04 / Chromatic Array</label>
              <div className="relative group">
                <select 
                  value={colorMode} 
                  onChange={e => setColorMode(e.target.value)}
                  className="w-full p-4 bg-vizr-surface border border-white/5 text-[11px] font-bold uppercase tracking-[0.1em] text-white outline-none focus:border-vizr-signal appearance-none cursor-pointer"
                >
                  {visualMode === 'represent' ? (
                    <>
                      <option value="atmospheric">Atmospheric Neutrals</option>
                    </>
                  ) : visualMode === 'signal-glitch' ? (
                    <>
                      <option value="mostly-mono">Monochromatic (Onyx)</option>
                      <option value="mono-accent">Mono + Signal Pink</option>
                      <option value="mixed">Mixed High-Con</option>
                      <option value="spectral-rgb">Spectral RGB</option>
                    </>
                  ) : visualMode === 'contour' ? (
                    <>
                      <option value="print-black">Technical Black</option>
                      <option value="topo-relief">Topographic Relief</option>
                      <option value="spectral-contour">Spectral Variance</option>
                    </>
                  ) : visualMode === 'kaleidoscope' ? (
                    <>
                      <option value="prism">Refractive Prism</option>
                      <option value="tube-light">Luminous Tube</option>
                      <option value="glass-bloom">Crystalline Bloom</option>
                      <option value="chroma-wheel">Chromatic Rotation</option>
                    </>
                  ) : (
                    <>
                      <option value="cosmic-flow">Cosmic Radiance</option>
                      <option value="dual-lava">Dual Volcanic</option>
                      <option value="spectral-flow">Spectral Fluidity</option>
                    </>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-vizr-signal">
                   <div className="w-1.5 h-1.5 bg-vizr-signal rotate-45 group-hover:animate-ping"></div>
                </div>
              </div>
            </div>

            {/* Parameter Calibration */}
            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">05 / Calibration</label>
            
              <div className="space-y-5">
                {[
                  { label: sliderLabels[0], value: globalEffects, setter: setGlobalEffects },
                  { label: sliderLabels[1], value: flickerAmount, setter: setFlickerAmount },
                  { label: sliderLabels[2], value: motionAmount, setter: setMotionAmount },
                  { label: sliderLabels[3], value: eventDensity, setter: setEventDensity },
                  { label: sliderLabels[4], value: transitionSpeed, setter: setTransitionSpeed },
                ].map((slider, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center group">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest transition-colors group-hover:text-vizr-signal">{slider.label}</span>
                      <span className="text-[10px] font-black text-white bg-vizr-surface px-1.5 py-0.5 rounded-xs border border-white/5">{(slider.value * 100).toFixed(0)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.01"
                      value={slider.value}
                      onChange={(e) => slider.setter(parseFloat(e.target.value))}
                      className="w-full accent-vizr-signal h-1 bg-white/5 appearance-none outline-none cursor-pointer hover:bg-white/10 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-8 flex flex-col h-full">
            {/* Logic Toggles */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">06 / Logic Gateways</label>
            
            <div className="grid grid-cols-1 gap-2">
              {toggleConfigs.map(({ key, label }) => {
                const toggleKey = key;
                const isBlobToggle = toggleKey === 'enableBlobDynamics';
                const isDisabled = isBlobToggle && visualMode !== 'lava-space';
                return (
                  <div key={toggleKey} className={isDisabled ? 'opacity-40' : ''}>
                    <ToggleSwitch
                      label={label}
                      checked={toggleValues[toggleKey]}
                      onChange={isDisabled ? (() => {}) : toggleSetters[toggleKey]}
                    />
                  </div>
                );
              })}
            </div>
          </div>

            {/* Overlay Grid */}
            {visualMode !== 'represent' && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">07 / Lens Overlay</label>
                <div className="space-y-4 p-4 bg-vizr-surface border border-white/5">
                  <ToggleSwitch 
                    label="Active Overlay" 
                    checked={overlaySettings[visualMode]?.enabled ?? true} 
                    onChange={(val) => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], enabled: val } }))} 
                  />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Luminance</span>
                      <span className="text-[10px] font-black text-white">{overlaySettings[visualMode]?.opacity ?? 100}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" step="1"
                      value={overlaySettings[visualMode]?.opacity ?? 100}
                      onChange={(e) => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], opacity: parseInt(e.target.value) } }))}
                      className="w-full accent-vizr-signal h-1 bg-white/5 appearance-none outline-none cursor-pointer"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex bg-vizr-onyx border border-white/5 p-0.5">
                      {['black', 'white', 'normal'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: m } }))}
                          className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2 transition-all ${
                            (overlaySettings[visualMode]?.mode ?? 'normal') === m ? 'bg-vizr-signal text-white shadow-xl' : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto space-y-3 pt-8 pb-4">
              {/* Hardware Execution Cluster */}
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handleStart}
                  disabled={assets.length === 0}
                  className="group relative w-full flex flex-col items-center justify-center gap-2 p-8 bg-vizr-signal text-white font-black uppercase tracking-[0.3em] overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <Play size={28} fill="currentColor" className="relative z-10" /> 
                  <span className="text-[13px] relative z-10">Initialize Engine</span>
                </button>

                <button 
                  onClick={() => setShowRemoteModal(true)}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-vizr-surface border border-white/5 text-neutral-400 font-bold uppercase tracking-[0.2em] hover:text-vizr-signal hover:border-vizr-signal/30 transition-all"
                >
                  <Wifi size={18} />
                  <span className="text-[11px]">VIZR Remote Linked</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Console / Status Footer */}
        <div className="mt-12 border-t border-white/5 pt-6 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.3em] text-neutral-700">
          <div className="flex gap-8">
             <span>Protocol: WebGL-2.0</span>
             <span>Audio: {audioMode.toUpperCase()}</span>
             <span>Network: Localhost-3000</span>
          </div>
          <div className="flex gap-4">
             <span>VIZR Instrumentation © 2026</span>
             <span className="text-vizr-signal">Operational</span>
          </div>
        </div>

      </div>
    </div>
  );
};
