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
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.emit('join-room', roomId, 'remote');

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
          <p className="text-[10px] text-emerald-500 tracking-widest uppercase flex items-center justify-center gap-2">
            <Activity size={12} className="animate-pulse" /> Connected to: {roomId}
          </p>
        </div>

        <div className="space-y-6 bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
          
          {/* Sliders */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex justify-between">
                <span>Global Effects</span>
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
        <footer className="mt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <button onClick={() => setShowFaqModal(true)} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => setShowAboutModal(true)} className="hover:text-white transition-colors">About</button>
            <button onClick={() => setShowContactModal(true)} className="hover:text-white transition-colors">Contact</button>
            <button onClick={() => setShowImpressumModal(true)} className="hover:text-white transition-colors">Impressum</button>
          </div>
          <div className="text-[10px] text-neutral-600 font-mono tracking-wider">
            VIZR (c)26 // Web-Based Visualization System // vibecoded by kvssi // simply keeping the good vibes
          </div>
        </footer>

        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowContactModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Contact</h2>
                <button onClick={() => setShowContactModal(false)} className="text-neutral-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
                <p>For inquiries, feedback, or support, please reach out:</p>
                <p className="text-emerald-500 font-mono">hello@example.com</p>
                <p>Follow the development and share your vibes:</p>
                <p className="text-emerald-500 font-mono">@vizr_app</p>
                <p className="text-xs text-neutral-500 pt-4">* Please replace these placeholders with your actual contact information before deploying.</p>
              </div>
            </div>
          </div>
        )}

        {showImpressumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowImpressumModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-2xl w-full space-y-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-900">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Impressum & Privacy</h2>
                <button onClick={() => setShowImpressumModal(false)} className="text-neutral-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-6 text-sm text-neutral-300">
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Impressum (Legal Notice)</h3>
                  <p className="text-neutral-400">Information according to § 5 TMG:</p>
                  <p className="text-neutral-400 font-mono text-xs">
                    [Your Name/Company]<br/>
                    [Street Address]<br/>
                    [ZIP and City]<br/>
                    [Country]
                  </p>
                  <p className="text-neutral-400 font-mono text-xs mt-2">
                    Email: [Your Email]<br/>
                    Phone: [Your Phone Number]
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Privacy Policy (Datenschutz)</h3>
                  <p className="text-neutral-400"><strong>1. Local Processing:</strong> VIZR is designed with privacy in mind. All audio analysis, screen capture, and image processing happen <strong>strictly locally</strong> within your browser. No media data (audio, video, or images) is ever uploaded, stored, or transmitted to any external servers.</p>
                  <p className="text-neutral-400"><strong>2. Remote Control (WebSockets):</strong> If you use the "VIZR Remote" feature, a temporary WebSocket connection is established to synchronize control signals (like slider values and button presses) between your devices. This connection does not transmit any media data.</p>
                  <p className="text-neutral-400"><strong>3. Browser Permissions:</strong> The app requests access to your microphone or screen only to generate the audio-reactive visuals. You have full control over these permissions via your browser settings.</p>
                </div>
                <p className="text-xs text-emerald-500 pt-4">* Please update the placeholder information with your actual details.</p>
              </div>
            </div>
          </div>
        )}

        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowAboutModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">About VIZR</h2>
                <button onClick={() => setShowAboutModal(false)} className="text-neutral-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
                <p><strong>VIZR</strong> is a web-based, audio-reactive visualization system designed for live performances, streaming, and ambient displays.</p>
                <p>Built entirely with modern web technologies, it runs directly in your browser. It leverages the Web Audio API and HTML5 Canvas to generate real-time, hardware-accelerated graphics that react dynamically to your music.</p>
                <p>No installation required. No data leaves your device. Everything is processed locally for maximum privacy and performance.</p>
                <p className="text-emerald-500 font-mono text-xs pt-4">vibecoded by kvssi // simply keeping the good vibes</p>
              </div>
            </div>
          </div>
        )}

        {showFaqModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowFaqModal(false)}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-2xl w-full space-y-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-900">
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Frequently Asked Questions</h2>
                <button onClick={() => setShowFaqModal(false)} className="text-neutral-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-6 text-sm text-neutral-300">
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">How do I get the audio to react?</h3>
                  <p className="text-neutral-400">Select your audio source (Microphone, System Audio/Screen, or a local File) before clicking Initialize. Make sure to grant the necessary browser permissions when prompted.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Why isn't screen audio working?</h3>
                  <p className="text-neutral-400">When sharing your screen or tab, you must explicitly check the "Share tab audio" or "Share system audio" checkbox in the browser's screen share dialog. Otherwise, only video is captured.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Can I control VIZR from my phone?</h3>
                  <p className="text-neutral-400">Yes! Click the "VIZR REMOTE" button on the setup screen to reveal a QR code. Scan it with your smartphone to control effects, speed, and intensity in real-time.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Are my images or audio uploaded anywhere?</h3>
                  <p className="text-neutral-400">No. VIZR processes all audio and images locally in your browser. The remote control feature uses a lightweight WebSocket connection only to sync control signals (like slider values), but your media never leaves your device.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-wider text-xs">Why is the visualizer lagging?</h3>
                  <p className="text-neutral-400">VIZR is hardware-accelerated. For the best performance, ensure hardware acceleration is enabled in your browser settings and try reducing the "Complexity" or "Event Density" sliders if you are on an older device.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
