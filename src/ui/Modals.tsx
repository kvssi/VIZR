import React from 'react';
import { X, Activity } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const ContactModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-vizr-onyx border border-white/5 p-8 rounded-sm max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Contact & Support</h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={18} /></button>
      </div>
      <div className="space-y-4 text-xs font-mono text-neutral-400 leading-relaxed uppercase tracking-widest">
        <p>For technical support, feature requests, or general inquiries, please reach out to our team.</p>
        <div className="bg-vizr-surface/50 border border-white/5 p-6 space-y-2 flex flex-col items-center justify-center min-h-[100px]">
          <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.3em]">Direct Comm Link</p>
          <p className="text-vizr-signal font-black text-sm tracking-widest uppercase">hello@vizr.app</p>
        </div>
        <p className="text-[9px] text-neutral-600 mt-4 leading-relaxed">
          Business inquiries will be answered within 24-48 hours. Support requests from PRO license holders are prioritized in the queue.
        </p>
      </div>
    </div>
  </div>
);

export const ImpressumModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-vizr-onyx border border-white/5 p-8 rounded-sm max-w-xl w-full space-y-6 max-h-[80vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center border-b border-white/5 pb-4 sticky top-0 bg-vizr-onyx z-10 pt-2">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Impressum</h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={18} /></button>
      </div>
      <div className="space-y-8 text-xs font-mono text-neutral-400">
        <div className="space-y-2">
          <h3 className="text-vizr-signal font-black uppercase tracking-[0.2em] text-[10px]">Information according to § 5 TMG</h3>
          <p className="uppercase tracking-widest leading-relaxed">VIZR / Antigravity<br />Mustermannstraße 1<br />12345 Berlin<br />Germany</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-vizr-signal font-black uppercase tracking-[0.2em] text-[10px]">Contact</h3>
          <p className="uppercase tracking-widest font-black inline-block bg-vizr-surface/50 px-3 py-1 border border-white/5">legal@vizr.app</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-vizr-signal font-black uppercase tracking-[0.2em] text-[10px]">Liability for content</h3>
          <p className="uppercase tracking-widest leading-relaxed text-[10px] text-neutral-500">As a service provider, we are responsible for our own content on these pages in accordance with general laws under Section 7 (1) TMG. According to §§ 8 to 10 TMG, however, we as a service provider are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-vizr-signal font-black uppercase tracking-[0.2em] text-[10px]">Copyright</h3>
          <p className="uppercase tracking-widest leading-relaxed text-[10px] text-neutral-500">The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, or any form of commercialization of such material beyond the scope of the copyright law shall require the prior written consent of its respective author or creator.</p>
        </div>
      </div>
    </div>
  </div>
);

export const AboutModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-vizr-onyx border border-white/5 p-8 sm:p-12 rounded-sm max-w-xl w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-[-0.05em] text-white">VIZR CORE</h2>
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-vizr-signal">Synchronized Engine v2.0</p>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-sm"><X size={16} /></button>
      </div>
      <div className="space-y-8 text-xs font-mono text-neutral-400">
        <div className="space-y-6 leading-relaxed uppercase tracking-widest">
          <p><strong className="text-white">VIZR</strong> is a professional-grade, web-based visualization system engineered for live performances, streaming environments, and ambient installations.</p>
          <p>Built entirely on modern web standards, it operates natively within your browser. By leveraging the Web Audio API and hardware-accelerated HTML5 Canvas, VIZR generates real-time, zero-latency graphics that react dynamically to your audio source.</p>
          
          <div className="bg-vizr-surface/30 p-6 border border-white/5 flex flex-col items-center justify-center space-y-2 text-center my-6">
            <span className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em]">Operational Status</span>
            <span className="text-white font-black uppercase tracking-[0.1em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-vizr-signal rounded-full animate-pulse"></div>
              No installation required. Zero data exfiltration.
            </span>
            <span className="text-vizr-signal font-black text-[10px] uppercase tracking-widest mt-2">Maximum Performance /// Maximum Privacy</span>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col items-center text-center gap-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-bold">Concept & Engineering</p>
            <p className="text-white font-black uppercase tracking-widest">vibecoded by kvssi</p>
            <p className="text-[8px] text-neutral-700 mt-2">Build 2026.04</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const FaqModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-vizr-onyx border border-white/5 p-8 rounded-sm max-w-2xl w-full space-y-6 max-h-[80vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center border-b border-white/5 pb-4 sticky top-0 bg-vizr-onyx z-10 pt-2">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">System FAQ & Documentation</h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={18} /></button>
      </div>
      <div className="space-y-4 text-xs font-mono text-neutral-400">
        
        <div className="space-y-2 bg-vizr-surface/40 p-5 rounded-sm border border-white/5">
          <h3 className="text-vizr-signal font-black uppercase tracking-widest text-[10px]">How do I configure the audio source?</h3>
          <p className="leading-relaxed uppercase tracking-widest text-[10px]">Select your preferred audio input (Microphone, System Audio/Screen, or a local Audio File) from the main setup screen before initializing. Ensure you grant the necessary browser permissions when prompted.</p>
        </div>

        <div className="space-y-2 bg-vizr-surface/40 p-5 rounded-sm border border-white/5">
          <h3 className="text-vizr-signal font-black uppercase tracking-widest text-[10px]">Why is screen audio not being captured?</h3>
          <p className="leading-relaxed uppercase tracking-widest text-[10px]">When sharing your screen or a specific tab, you must explicitly enable the <strong>"Share tab audio"</strong> or <strong>"Share system audio"</strong> toggle in your browser's native screen share dialog. Without this, only the video feed is captured.</p>
        </div>

        <div className="space-y-2 bg-vizr-surface/40 p-5 rounded-sm border border-white/5">
          <h3 className="text-vizr-signal font-black uppercase tracking-widest text-[10px]">How does the Remote Control feature work?</h3>
          <p className="leading-relaxed uppercase tracking-widest text-[10px]">Click the "VIZR Remote Linked" button on the host device to display a QR code. Scan this code with your smartphone to instantly pair the devices over WebSockets. You can then control effects, speed, and intensity in real-time from your phone.</p>
        </div>

        <div className="space-y-2 bg-vizr-surface/40 p-5 rounded-sm border border-white/5">
          <h3 className="text-vizr-signal font-black uppercase tracking-widest text-[10px]">Are my media files uploaded to a server?</h3>
          <p className="leading-relaxed uppercase tracking-widest text-[10px]">Absolutely not. VIZR processes all audio and images locally on your machine. The remote control feature utilizes a lightweight WebSocket connection strictly to synchronize control signals (like slider adjustments). Your media never leaves your device.</p>
        </div>
        
        <div className="space-y-2 bg-vizr-surface/40 p-5 rounded-sm border border-white/5">
          <h3 className="text-vizr-signal font-black uppercase tracking-widest text-[10px]">How can I optimize performance?</h3>
          <p className="leading-relaxed uppercase tracking-widest text-[10px]">VIZR is heavily hardware-accelerated. For optimal frame rates, ensure hardware acceleration is enabled in your browser settings. If you experience lag on older devices, try reducing the <strong>"Event Density"</strong> or disabling complex effects like <strong>"Curvature"</strong> and <strong>"Noise"</strong>.</p>
        </div>
      </div>
    </div>
  </div>
);

export const RemoteModal = ({ roomId, onClose }: { roomId: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-vizr-onyx border border-white/5 p-8 sm:p-10 rounded-sm max-w-sm w-full space-y-8 flex flex-col items-center shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="text-center space-y-2 w-full border-b border-white/5 pb-6">
        <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">
          <Activity size={18} className="text-vizr-signal animate-pulse" /> Remote Link
        </h2>
        <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-500">Scan code to acquire control</p>
      </div>
      
      <div className="bg-white p-6 rounded-sm shadow-xl">
        <QRCodeSVG value={`${window.location.origin}?remote=${roomId}`} size={220} bgColor="#ffffff" fgColor="#15131a" />
      </div>

      <div className="text-center space-y-3 w-full pt-4">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">Manual Direct Link</p>
        <div className="flex items-center gap-2 bg-vizr-surface p-1 rounded-sm border border-white/5">
          <input 
            type="text" 
            readOnly 
            value={`${window.location.origin}?remote=${roomId}`} 
            className="bg-transparent text-[10px] font-mono text-neutral-400 w-full outline-none px-2 uppercase tracking-wide"
          />
          <button 
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}?remote=${roomId}`)}
            className="px-4 py-2 bg-white/5 hover:bg-vizr-signal hover:text-white text-[10px] uppercase font-black tracking-widest text-neutral-300 transition-all border border-white/5"
          >
            Copy
          </button>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="w-full p-4 bg-vizr-surface hover:bg-white/5 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-all border border-white/5 mt-4 group"
      >
        <span className="group-hover:text-vizr-signal mr-2">/</span> Terminate Dialog
      </button>
    </div>
  </div>
);

export const AssetInfoModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-vizr-onyx border border-white/5 p-8 rounded-sm max-w-2xl w-full space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-mono" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center border-b border-white/5 pb-4 sticky top-0 bg-vizr-onyx z-10 pt-2">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Smart Asset Naming Protocol</h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      
      <div className="space-y-8 text-xs text-neutral-400">
        <p className="uppercase tracking-widest leading-relaxed text-[10px]">
          Optimize visualizer asset utilization by employing the following naming convention. The engine parses these tags to execute structural rendering decisions.
        </p>
        
        <div className="bg-vizr-signal text-white p-4 font-black text-sm tracking-[0.2em] text-center border-y border-white/10 shadow-lg glow">
          [TYPE]__[ASPECT]__[COLOR]__[BEHAVIOR].EXT
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="space-y-3 border-l-2 border-vizr-surface pl-4">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">1. Identifier (Required)</h3>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest">
              <li><strong className="text-vizr-signal">bg</strong> - Background context layer</li>
              <li><strong className="text-vizr-signal">poster</strong> - Primary foreground structure</li>
              <li><strong className="text-vizr-signal">overlay</strong> - Floating / absolute positioned data</li>
            </ul>
          </div>
          
          <div className="space-y-3 border-l-2 border-vizr-surface pl-4">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">2. Aspect Ratio</h3>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest">
              <li><strong className="text-vizr-signal">landscape</strong> - Horizontal dominance</li>
              <li><strong className="text-vizr-signal">portrait</strong> - Vertical dominance</li>
              <li><strong className="text-vizr-signal">square</strong> - 1:1 isometric constraint</li>
            </ul>
          </div>
          
          <div className="space-y-3 border-l-2 border-vizr-surface pl-4">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">3. Chromatic Profile</h3>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest">
              <li><strong className="text-vizr-signal">mono</strong> - Black & white / grayscale matrix</li>
              <li><strong className="text-vizr-signal">accent</strong> - Monochromatic block + signal hue</li>
              <li><strong className="text-vizr-signal">color</strong> - Full spectrum representation</li>
            </ul>
          </div>
          
          <div className="space-y-3 border-l-2 border-vizr-surface pl-4">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">4. Temporal Behavior</h3>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest">
              <li><strong className="text-vizr-signal">frequent</strong> - High occurrence rate</li>
              <li><strong className="text-vizr-signal">rare</strong> - Low occurrence rate</li>
              <li><strong className="text-vizr-signal">peak</strong> - Transients / kick drum strict</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5">
          <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-4">Syntax Examples</h3>
          <ul className="space-y-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 bg-vizr-surface/40 p-6 border border-white/5">
            <li className="flex flex-col gap-2 border-b border-white/5 pb-4">
              <span className="text-white font-bold tracking-[0.1em] bg-black/50 px-2 py-1 inline-block w-fit border border-white/5">bg__landscape__mono__01.jpg</span>
              <span className="text-neutral-400">A black and white landscape background.</span>
            </li>
            <li className="flex flex-col gap-2 border-b border-white/5 pb-4">
              <span className="text-white font-bold tracking-[0.1em] bg-black/50 px-2 py-1 inline-block w-fit border border-white/5">logo__square__accent__rare.png</span>
              <span className="text-neutral-400">A square logo with an accent color that rarely appears.</span>
            </li>
            <li className="flex flex-col gap-2">
              <span className="text-white font-bold tracking-[0.1em] bg-black/50 px-2 py-1 inline-block w-fit border border-white/5">poster__portrait__color__peak.jpg</span>
              <span className="text-neutral-400">A colorful portrait poster that flushes on heavy beats.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

