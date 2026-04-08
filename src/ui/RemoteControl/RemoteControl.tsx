import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Upload, Shuffle, Zap, Activity, Dices, RefreshCw } from 'lucide-react';
import { ControlState } from '../../types';
import { ToggleSwitch } from '../ToggleSwitch';
import { ContactModal, ImpressumModal, AboutModal, FaqModal } from '../Modals';
import { sliderLabels, toggleConfigs } from '../controlConfig';

export const RemoteControl = ({ roomId }: { roomId: string }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ControlState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const [livePage, setLivePage] = useState<'controls' | 'overlay' | 'performance'>('controls');
  const [activeModal, setActiveModal] = useState<'about' | 'faq' | 'contact' | 'impressum' | null>(null);

  useEffect(() => {
    const s = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    setSocket(s);

    s.on('connect', () => {
      setConnectionState('CONNECTED');
      s.emit('join-room', roomId, 'remote');
    });

    s.on('disconnect', () => {
      setConnectionState('DISCONNECTED');
    });

    s.on('connect_error', () => {
      setConnectionState('DISCONNECTED');
    });

    s.on('host-connected', () => {
      s.emit('join-room', roomId, 'remote');
    });

    s.on('state-update', (newState: ControlState) => {
      setState(newState);
    });

    return () => { s.disconnect(); };
  }, [roomId]);

  const sendCommand = (action: string, value?: any) => {
    if (socket) {
      socket.emit('send-command', roomId, { action, value });
      // Optimistic update
      if (value !== undefined && state) {
        let stateKey = action;
        if (action === 'speed') stateKey = 'motionAmount';
        if (action === 'intensity') stateKey = 'globalEffects';
        if (action === 'complexity') stateKey = 'eventDensity';
        if (action === 'glitch') stateKey = 'flickerAmount';
        
        if (['motionAmount', 'globalEffects', 'eventDensity', 'flickerAmount', 'transitionSpeed'].includes(stateKey)) {
          setState((prev: any) => prev ? ({ ...prev, sliders: { ...(prev.sliders || {}), [stateKey]: value } }) : prev);
        } else if (['enableGlitch', 'enableVHS', 'enableCurvature', 'enableNoise', 'enableFlicker', 'enableRGBSplit', 'enableDriftOffset', 'enableBlobDynamics'].includes(stateKey)) {
          setState((prev: any) => {
            if (!prev) return prev;
            const activeMode = prev.visualMode;
            return {
              ...prev,
              toggles: {
                ...(prev.toggles || {}),
                [activeMode]: {
                  ...(prev.toggles?.[activeMode] || {}),
                  [stateKey]: value
                }
              }
            };
          });
        } else if (stateKey === 'overlaySettings') {
          setState((prev: any) => prev ? ({ ...prev, overlaySettings: value }) : prev);
        } else if (['visualMode', 'colorMode'].includes(stateKey)) {
          setState((prev: any) => prev ? ({ ...prev, [stateKey]: value }) : prev);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !socket) return;

    setUploading(true);
    let processed = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          socket.emit('upload-image', roomId, {
            name: file.name,
            type: file.type,
            data: ev.target.result
          });
        }
        processed++;
        if (processed === files.length) {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen bg-vizr-onyx text-neutral-300 font-mono p-4 sm:p-8 flex flex-col selection:bg-vizr-signal selection:text-white">
      <div className="max-w-md mx-auto w-full space-y-10 flex-1 flex flex-col">
        
        {/* Remote Header */}
        <div className="space-y-4 border-b border-white/5 pb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-[-0.05em] uppercase text-white flex items-center gap-3">
              VIZR <span className="text-[9px] bg-vizr-signal text-white px-2 py-0.5 tracking-widest font-black rounded-sm">REMOTE</span>
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1.5 bg-vizr-surface border border-white/5 rounded-sm`}>
               <div className={`w-1.5 h-1.5 rounded-full ${connectionState === 'CONNECTED' ? 'bg-vizr-signal animate-pulse' : 'bg-neutral-600'}`}></div>
               <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">
                 {connectionState === 'CONNECTED' ? `ID: ${roomId}` : 'STANDBY'}
               </span>
            </div>
          </div>
          <p className="text-[9px] text-neutral-600 uppercase tracking-[0.3em] font-bold">Encrypted Control Link Layer</p>
        </div>

        <div className={`relative space-y-8 flex-1 ${!state ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
          
          {!state && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 space-y-4">
              <Activity size={32} className="animate-pulse text-vizr-signal" />
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                Synchronizing Data Stream...
              </div>
            </div>
          )}
          
          {/* NAVIGATION MODES */}
          <div className="flex bg-black/40 border border-white/5 p-0.5">
            <button
              onClick={() => setLivePage('controls')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                livePage === 'controls' ? 'bg-vizr-signal text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              Visuals
            </button>
            <button
              onClick={() => setLivePage('overlay')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                livePage === 'overlay' ? 'bg-vizr-signal text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              Overlay
            </button>
            <button
              onClick={() => setLivePage('performance')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                livePage === 'performance' ? 'bg-vizr-signal text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              Performance
            </button>
          </div>

          {livePage === 'controls' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Sliders Cluster */}
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700 block">05 / Calibration</label>
                
                {[
                  { label: sliderLabels[0], value: state?.sliders?.globalEffects ?? 0.5, action: 'intensity' },
                  { label: sliderLabels[1], value: state?.sliders?.flickerAmount ?? 0.5, action: 'glitch' },
                  { label: sliderLabels[2], value: state?.sliders?.motionAmount ?? 0.5, action: 'speed' },
                  { label: sliderLabels[3], value: state?.sliders?.eventDensity ?? 0.5, action: 'complexity' },
                  { label: sliderLabels[4], value: state?.sliders?.transitionSpeed ?? 0.5, action: 'transitionSpeed' },
                ].map((s, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-center group">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest transition-colors group-hover:text-vizr-signal">{s.label}</span>
                      <span className="text-[10px] font-black text-white bg-vizr-surface px-1.5 py-0.5 rounded-xs border border-white/5">{(s.value * 100).toFixed(0)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={s.value} 
                      onChange={e => sendCommand(s.action, parseFloat(e.target.value))} 
                      className="w-full accent-vizr-signal h-1 bg-white/5 appearance-none outline-none cursor-pointer" 
                    />
                  </div>
                ))}
              </div>

              {/* Toggles Cluster */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700 block">02 / Logic Matrix</label>
                <div className="grid grid-cols-2 gap-2">
                  {toggleConfigs.map((toggle) => {
                    const isBlobToggle = toggle.key === 'enableBlobDynamics';
                    const isDisabled = isBlobToggle && state?.visualMode !== 'lava-space';
                    const checked = state?.visualMode ? (state?.toggles?.[state.visualMode]?.[toggle.key] ?? false) : false;
                    return (
                      <div key={toggle.key} className={isDisabled ? 'opacity-40' : ''}>
                        <ToggleSwitch
                          label={toggle.label}
                          checked={checked}
                          onChange={isDisabled ? (() => {}) : (v => sendCommand(toggle.key, v))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/5">
                <button 
                  onClick={() => sendCommand('shuffle')} 
                  className="flex flex-col items-center justify-center gap-2 p-5 bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 text-neutral-400 hover:text-white transition-all group"
                >
                  <Zap size={20} className="group-hover:text-vizr-signal" />
                  <span className="text-[9px] uppercase tracking-widest font-black">Shuffle</span>
                </button>
                <button 
                  onClick={() => sendCommand('randomize')} 
                  className="flex flex-col items-center justify-center gap-2 p-5 bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 text-neutral-400 hover:text-white transition-all group"
                >
                  <Dices size={20} className="group-hover:text-vizr-signal" />
                  <span className="text-[9px] uppercase tracking-widest font-black">Random</span>
                </button>
                <button 
                  onClick={() => sendCommand('reset')} 
                  className="flex flex-col items-center justify-center gap-2 p-5 bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 text-neutral-400 hover:text-white transition-all group"
                >
                  <RefreshCw size={20} className="group-hover:text-vizr-signal" />
                  <span className="text-[9px] uppercase tracking-widest font-black">Reset</span>
                </button>
              </div>

              {/* Intake Trigger */}
              <div className="pt-6 border-t border-white/5">
                <label className={`flex flex-col items-center justify-center w-full p-8 border border-white/5 bg-vizr-surface/30 hover:bg-vizr-surface/50 transition-all cursor-pointer group ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                  <Upload size={28} className={`mb-3 transition-colors ${uploading ? 'text-vizr-signal animate-bounce' : 'text-neutral-600 group-hover:text-vizr-signal'}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 group-hover:text-white transition-colors">
                    {uploading ? 'Injecting Material...' : 'Inject Imagery'}
                  </span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
          ) : livePage === 'overlay' ? (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {state?.visualMode !== 'represent' ? (
                <>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700 block">Lens Overlay</label>
                  <ToggleSwitch 
                    label="Active Overlay" 
                    checked={state?.visualMode ? (state?.overlaySettings?.[state.visualMode]?.enabled ?? true) : true} 
                    onChange={v => state?.visualMode && sendCommand('overlaySettings', { ...state.overlaySettings, [state.visualMode]: { ...state.overlaySettings?.[state.visualMode], enabled: v } })} 
                  />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Luminance</span>
                      <span className="text-[10px] font-black text-white">{state?.visualMode ? (state?.overlaySettings?.[state.visualMode]?.opacity ?? 100) : 100}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="1" 
                      value={state?.visualMode ? (state?.overlaySettings?.[state.visualMode]?.opacity ?? 100) : 100} 
                      onChange={e => state?.visualMode && sendCommand('overlaySettings', { ...state.overlaySettings, [state.visualMode]: { ...state.overlaySettings?.[state.visualMode], opacity: parseInt(e.target.value, 10) } })} 
                      className="w-full accent-vizr-signal h-1 bg-white/5 appearance-none outline-none" 
                    />
                  </div>
                  <div className="pt-2">
                    <div className="flex bg-black/40 border border-white/5 p-0.5">
                      {['black', 'white', 'normal'].map((m) => (
                        <button
                          key={m}
                          onClick={() => state?.visualMode && sendCommand('overlaySettings', { ...state.overlaySettings, [state.visualMode]: { ...state.overlaySettings?.[state.visualMode], mode: m } })}
                          className={`flex-1 text-[9px] font-black uppercase tracking-widest py-3 transition-all ${
                            (state?.visualMode ? (state?.overlaySettings?.[state.visualMode]?.mode ?? 'normal') : 'normal') === m ? 'bg-vizr-signal text-white shadow-xl' : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 border border-white/5 bg-white/5 px-4 py-6 text-center">
                  Overlay controls are not used in represent mode.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-10 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700 block">Performance Calibrations</label>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      <span>Intensity</span>
                      <span className="text-white">{(state?.sliders?.globalEffects ?? 0.9) * 100}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01"
                      value={state?.sliders?.globalEffects ?? 0.9}
                      onChange={(e) => sendCommand('intensity', parseFloat(e.target.value))}
                      className="w-full h-2 accent-vizr-signal bg-white/5 appearance-none outline-none rounded-full"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      <span>Motion</span>
                      <span className="text-white">{(state?.sliders?.motionAmount ?? 0.6) * 100}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01"
                      value={state?.sliders?.motionAmount ?? 0.6}
                      onChange={(e) => sendCommand('speed', parseFloat(e.target.value))}
                      className="w-full h-2 accent-vizr-signal bg-white/5 appearance-none outline-none rounded-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'buildUp', label: 'Inversion' },
                  { id: 'tension', label: 'Pressure' },
                  { id: 'drop', label: 'Release' },
                  { id: 'extraBounce', label: 'Impact' },
                ].map(macro => (
                  <button
                    key={macro.id}
                    onPointerDown={() => sendCommand('macro', { name: macro.id, active: true })}
                    onPointerUp={() => sendCommand('macro', { name: macro.id, active: false })}
                    onPointerLeave={() => sendCommand('macro', { name: macro.id, active: false })}
                    className="h-28 bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 active:bg-vizr-signal active:text-white transition-all flex flex-col items-center justify-center gap-3 group select-none"
                  >
                    <div className="w-2 h-2 bg-neutral-800 group-active:bg-white rounded-full"></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{macro.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-neutral-700">
                 <span>Sync Latency: 12ms</span>
                 <span className="text-vizr-signal animate-pulse">Live Link Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Remote Footer */}
        <footer className="mt-auto py-10 border-t border-white/5 space-y-8">
          <div className="flex justify-center gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">
            <button onClick={() => setActiveModal('faq')} className="hover:text-vizr-signal transition-colors">Documentation</button>
            <button onClick={() => setActiveModal('about')} className="hover:text-white transition-colors">Core</button>
            <button onClick={() => setActiveModal('contact')} className="hover:text-white transition-colors">Support</button>
          </div>
          <div className="text-[8px] text-neutral-800 font-mono tracking-[0.4em] text-center flex flex-col gap-1">
            <span>VIZR COMMAND PROTOCOL © 2026</span>
            <span>HARDWARE LINK ESTABLISHED</span>
          </div>
        </footer>

        {activeModal === 'contact' && <ContactModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'impressum' && <ImpressumModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'about' && <AboutModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'faq' && <FaqModal onClose={() => setActiveModal(null)} />}
      </div>
    </div>
  );
};
