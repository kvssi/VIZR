import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Upload, Shuffle, Zap, Settings2, Activity, Dices, X } from 'lucide-react';

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <label 
    className="flex items-center justify-between gap-3 cursor-pointer py-2 px-3 bg-neutral-800/80 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors w-full"
    onClick={(e) => e.stopPropagation()}
  >
    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">{label}</span>
    <div className="relative inline-flex items-center">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-8 h-4 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
    </div>
  </label>
);

export const RemoteControl = ({ roomId }: { roomId: string }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);

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

    s.on('state-update', (newState) => {
      setState(newState);
    });

    return () => { s.disconnect(); };
  }, [roomId]);

  const sendCommand = (action: string, value?: any) => {
    if (socket) {
      socket.emit('send-command', roomId, { action, value });
      // Optimistic update for sliders and toggles
      if (value !== undefined) {
        let stateKey = action;
        if (action === 'speed') stateKey = 'motionAmount';
        if (action === 'intensity') stateKey = 'globalEffects';
        if (action === 'complexity') stateKey = 'eventDensity';
        if (action === 'glitch') stateKey = 'flickerAmount';
        setState((prev: any) => ({ ...prev, [stateKey]: value }));
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
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tighter uppercase">VIZR Remote</h1>
          <p className={`text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 ${connectionState === 'CONNECTED' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {connectionState === 'CONNECTED' ? (
              <><Activity size={12} className="animate-pulse" /> Connected to: {roomId}</>
            ) : connectionState === 'CONNECTING' ? (
              <><Activity size={12} className="animate-pulse opacity-50" /> Connecting...</>
            ) : (
              <><Activity size={12} className="opacity-50" /> Reconnecting...</>
            )}
          </p>
        </div>

        <div className="space-y-6 bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
          
          {/* Sliders */}
          <div className="space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-4">FX Settings</h2>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex justify-between">
                <span>Global</span>
                <span>{state.globalEffects?.toFixed(2) || '0.80'}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={state.globalEffects || 0.8} 
                onChange={e => sendCommand('intensity', parseFloat(e.target.value))} 
                className="w-full mt-2 accent-white" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex justify-between">
                <span>Motion Speed</span>
                <span>{state.motionAmount?.toFixed(2) || '0.50'}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={state.motionAmount || 0.5} 
                onChange={e => sendCommand('speed', parseFloat(e.target.value))} 
                className="w-full mt-2 accent-white" 
              />
            </div>
            
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex justify-between">
                <span>Event Density</span>
                <span>{state.eventDensity?.toFixed(2) || '0.50'}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={state.eventDensity || 0.5} 
                onChange={e => sendCommand('complexity', parseFloat(e.target.value))} 
                className="w-full mt-2 accent-white" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex justify-between">
                <span>Transition Speed</span>
                <span>{state.transitionSpeed?.toFixed(2) || '0.50'}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={state.transitionSpeed || 0.5} 
                onChange={e => sendCommand('transitionSpeed', parseFloat(e.target.value))} 
                className="w-full mt-2 accent-white" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex justify-between">
                <span>Flicker Amount</span>
                <span>{state.flickerAmount?.toFixed(2) || '0.50'}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={state.flickerAmount || 0.5} 
                onChange={e => sendCommand('glitch', parseFloat(e.target.value))} 
                className="w-full mt-2 accent-white" 
              />
            </div>
          </div>

          {/* Toggles Grid */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-neutral-800">
            <ToggleSwitch label="Glitch" checked={state.enableGlitch ?? true} onChange={v => sendCommand('enableGlitch', v)} />
            <ToggleSwitch label="VHS" checked={state.enableVHS ?? true} onChange={v => sendCommand('enableVHS', v)} />
            <ToggleSwitch label="Curve" checked={state.enableCurvature ?? true} onChange={v => sendCommand('enableCurvature', v)} />
            <ToggleSwitch label="Noise" checked={state.enableNoise ?? true} onChange={v => sendCommand('enableNoise', v)} />
            <ToggleSwitch label="Flicker" checked={state.enableFlicker ?? true} onChange={v => sendCommand('enableFlicker', v)} />
            <ToggleSwitch label="RGB" checked={state.enableRGBSplit ?? true} onChange={v => sendCommand('enableRGBSplit', v)} />
            <ToggleSwitch label="White Transp." checked={state.enableWhiteTransparency ?? false} onChange={v => sendCommand('enableWhiteTransparency', v)} />
            <ToggleSwitch label="Drift Offset" checked={state.enableDriftOffset ?? false} onChange={v => sendCommand('enableDriftOffset', v)} />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800">
            <button 
              onClick={() => sendCommand('shuffle')} 
              className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
            >
              <Zap size={20} />
              <span className="text-[10px] uppercase tracking-wider font-bold">Shuffle</span>
            </button>
            <button 
              onClick={() => sendCommand('randomize')} 
              className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
            >
              <Dices size={20} />
              <span className="text-[10px] uppercase tracking-wider font-bold">Random FX</span>
            </button>
          </div>

          {/* Upload */}
          <div className="pt-4 border-t border-neutral-800">
            <label className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${uploading ? 'border-emerald-500 text-emerald-500' : 'border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white'}`}>
              <Upload size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {uploading ? 'Sending...' : 'Send Images to TV'}
              </span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-8 border-t border-neutral-800/50 pt-8 text-center space-y-6">
          <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <button onClick={() => setShowFaqModal(true)} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => setShowAboutModal(true)} className="hover:text-white transition-colors">About</button>
            <button onClick={() => setShowContactModal(true)} className="hover:text-white transition-colors">Contact</button>
            <button onClick={() => setShowImpressumModal(true)} className="hover:text-white transition-colors">Impressum</button>
          </div>
          <div className="text-[10px] text-neutral-600 font-mono tracking-wider flex flex-col items-center gap-2">
            <span>VIZR © 2026 // Web-Based Visualization System</span>
            <span>vibecoded by kvssi</span>
          </div>
        </footer>

        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowContactModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Contact</h2>
                <button onClick={() => setShowContactModal(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
                <p>For technical support, feature requests, or general inquiries, please reach out to our team.</p>
                <div className="bg-black/50 p-4 rounded-lg border border-neutral-800">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-emerald-500 font-mono">hello@vizr.app</p>
                </div>
                <div className="bg-black/50 p-4 rounded-lg border border-neutral-800">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Social</p>
                  <p className="text-emerald-500 font-mono">@vizr_official</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showImpressumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowImpressumModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-2xl w-full space-y-6 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-900 z-10">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Legal & Privacy</h2>
                <button onClick={() => setShowImpressumModal(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-8 text-sm text-neutral-300">
                <section className="space-y-3">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Impressum (Legal Notice)
                  </h3>
                  <div className="bg-black/50 p-4 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-400 leading-relaxed">
                    <p>Information according to § 5 TMG:</p>
                    <br/>
                    <p>VIZR Systems GmbH</p>
                    <p>Creative Boulevard 42</p>
                    <p>10115 Berlin</p>
                    <p>Germany</p>
                    <br/>
                    <p>Email: legal@vizr.app</p>
                    <p>Phone: +49 (0) 30 12345678</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Privacy Policy
                  </h3>
                  <div className="space-y-4 text-neutral-400">
                    <p><strong className="text-neutral-200">1. Local Processing Architecture:</strong> VIZR is engineered with a strict privacy-first approach. All audio analysis, screen capture, and image processing operations are executed locally within your browser's sandbox. No media data (audio, video, or images) is ever uploaded, stored, or transmitted to external servers.</p>
                    <p><strong className="text-neutral-200">2. Remote Control Protocol:</strong> When utilizing the "VIZR Remote" feature, a lightweight WebSocket connection is established solely to synchronize control signals (e.g., slider values, toggle states) between your devices. This telemetry data is ephemeral and contains no media payloads.</p>
                    <p><strong className="text-neutral-200">3. Device Permissions:</strong> The application requests access to your microphone or screen capture APIs exclusively for generating audio-reactive visualizations. These permissions are managed entirely by your browser and can be revoked at any time.</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowAboutModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">About VIZR</h2>
                <button onClick={() => setShowAboutModal(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
                <p><strong>VIZR</strong> is a professional-grade, web-based visualization system engineered for live performances, streaming environments, and ambient installations.</p>
                <p>Built entirely on modern web standards, it operates natively within your browser. By leveraging the Web Audio API and hardware-accelerated HTML5 Canvas, VIZR generates real-time, zero-latency graphics that react dynamically to your audio source.</p>
                <p>No installation required. Zero data exfiltration. Maximum performance and privacy.</p>
                <div className="pt-4 mt-4 border-t border-neutral-800">
                  <p className="text-emerald-500 font-mono text-xs">vibecoded by kvssi</p>
                  <p className="text-neutral-600 font-mono text-[10px] mt-1">Version 2.0.4 // Build 2026</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFaqModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowFaqModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-2xl w-full space-y-6 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-900 z-10">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Frequently Asked Questions</h2>
                <button onClick={() => setShowFaqModal(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-6 text-sm text-neutral-300">
                <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-neutral-800/50">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">How do I configure the audio source?</h3>
                  <p className="text-neutral-400">Select your preferred audio input (Microphone, System Audio/Screen, or a local Audio File) from the main setup screen before initializing. Ensure you grant the necessary browser permissions when prompted.</p>
                </div>
                <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-neutral-800/50">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Why is screen audio not being captured?</h3>
                  <p className="text-neutral-400">When sharing your screen or a specific tab, you must explicitly enable the "Share tab audio" or "Share system audio" toggle in your browser's native screen share dialog. Without this, only the video feed is captured.</p>
                </div>
                <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-neutral-800/50">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">How does the Remote Control feature work?</h3>
                  <p className="text-neutral-400">Click the "VIZR REMOTE" button on the host device to display a QR code. Scan this code with your smartphone to instantly pair the devices. You can then control effects, speed, and intensity in real-time from your phone.</p>
                </div>
                <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-neutral-800/50">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Are my media files uploaded to a server?</h3>
                  <p className="text-neutral-400">Absolutely not. VIZR processes all audio and images locally on your machine. The remote control feature utilizes a lightweight WebSocket connection strictly to synchronize control signals (like slider adjustments). Your media never leaves your device.</p>
                </div>
                <div className="space-y-2 bg-black/30 p-4 rounded-xl border border-neutral-800/50">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">How can I optimize performance?</h3>
                  <p className="text-neutral-400">VIZR is heavily hardware-accelerated. For optimal frame rates, ensure hardware acceleration is enabled in your browser settings. If you experience lag on older devices, try reducing the "Event Density" or disabling complex effects like "Curvature" and "Noise".</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
