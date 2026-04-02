import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, MicOff, Play, Pause, Square, Maximize, Image as ImageIcon, X, MonitorUp, FileAudio, Smartphone, Dices, Zap, RefreshCw, Info, Wifi, Activity, Trash2, Plus } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { RemoteControl } from './RemoteControl';
import { Conductor } from './conductor';
import { MusicalState, SignalFeatures, MusicalContext, ControlState, defaultControlState } from './types';

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <label 
    className="flex items-center justify-between gap-3 cursor-pointer py-2 px-3 bg-neutral-900/80 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-colors w-full"
    onClick={(e) => e.stopPropagation()}
  >
    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 truncate flex-1 text-left">{label}</span>
    <div className="relative inline-flex items-center shrink-0">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <div className="w-9 h-5 bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
    </div>
  </label>
);

const APP_VERSION = "2.0 beta";

const AudioLevelMeter = ({ mode, deviceId, file, onError, onClearFile }: { mode: 'mic' | 'ambient' | 'screen' | 'file', deviceId?: string, file?: File, onError?: (err: string | null) => void, onClearFile?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const reqRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (mode === 'ambient') {
      if (onError) onError(null);
      return;
    }

    let isMounted = true;

    const startAudio = async () => {
      try {
        if (onError) onError(null);
        
        if (!navigator.mediaDevices) {
          throw new Error("Media devices API is not available. This usually happens in insecure contexts or very old browsers.");
        }

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctxRef.current = ctx;
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 256;
        analyzerRef.current = analyzer;

        if (mode === 'file' && file) {
          const audioEl = new Audio(URL.createObjectURL(file));
          audioEl.loop = true;
          audioElRef.current = audioEl;
          const source = ctx.createMediaElementSource(audioEl);
          source.connect(analyzer);
          analyzer.connect(ctx.destination);
          setIsPlaying(false);
        } else if (mode === 'mic') {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true
          });
          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          if (stream.getAudioTracks().length === 0) {
            stream.getTracks().forEach(t => t.stop());
            throw new Error("No audio track found.");
          }
          streamRef.current = stream;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyzer);
        } else if (mode === 'screen') {
          // @ts-ignore
          const getDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices) || navigator.getDisplayMedia?.bind(navigator);
          
          if (!getDisplayMedia) {
            const isIframe = window.self !== window.top;
            if (isIframe) {
              throw new Error("Screen capture is restricted within the preview iframe. Please open the application in a new tab using the 'Open in New Tab' button below to use this feature.");
            } else {
              throw new Error("Screen capture is not supported in this browser. Please try using a modern desktop browser like Chrome, Edge, or Firefox.");
            }
          }

          const stream = await getDisplayMedia({
            audio: true,
            video: true
          });
          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          if (stream.getAudioTracks().length === 0) {
            stream.getTracks().forEach(t => t.stop());
            throw new Error("No audio track found. Please make sure to share audio.");
          }
          streamRef.current = stream;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyzer);
        }

        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const draw = () => {
          if (!isMounted) return;
          reqRef.current = requestAnimationFrame(draw);
          analyzer.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const vol = avg / 255; // 0 to 1

          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw background
          canvasCtx.fillStyle = '#1a1a1a';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw level
          const width = vol * canvas.width * 1.5; // boost visual a bit
          
          // Gradient
          const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
          gradient.addColorStop(0, '#4ade80'); // green
          gradient.addColorStop(0.6, '#eab308'); // yellow
          gradient.addColorStop(1, '#ef4444'); // red
          
          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(0, 0, Math.min(width, canvas.width), canvas.height);

          // Draw grid lines
          canvasCtx.fillStyle = '#000';
          for (let i = 1; i < 10; i++) {
            canvasCtx.fillRect((canvas.width / 10) * i, 0, 1, canvas.height);
          }
        };
        draw();
      } catch (err: any) {
        console.error("Preview audio error:", err);
        if (onError) {
          const isIframe = window.self !== window.top;
          if (mode === 'screen' && isIframe) {
            onError("Screen capture is restricted within the preview iframe. Please open the application in a new tab using the 'Open in New Tab' button below to use this feature.");
          } else if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            onError("Permission denied by user. Please allow access to use this feature.");
          } else if (err.message?.includes('No audio track found')) {
            onError(err.message);
          } else if (mode === 'screen') {
            onError("Screen capture failed. Please ensure you have granted permission and are sharing audio.");
          } else {
            onError("Microphone access was denied. Please allow microphone access or try opening in a new tab.");
          }
        }
      }
    };

    startAudio();

    return () => {
      isMounted = false;
      cancelAnimationFrame(reqRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.src = '';
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [mode, deviceId, file]);

  const togglePlay = () => {
    if (audioElRef.current) {
      if (isPlaying) {
        audioElRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Play error:", err);
        });
      }
    }
  };

  if (mode === 'ambient') return null;

  return (
    <div className="mt-3 bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex flex-col gap-3">
      {mode === 'file' && file ? (
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-800/50">
          <button 
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:bg-neutral-200 transition-colors shrink-0"
            title={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{file.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Audio Preview</div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${isPlaying ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 animate-pulse' : 'border-neutral-700 text-neutral-500 bg-neutral-800'}`}>
              {isPlaying ? 'Playing' : 'Ready'}
            </span>
            {onClearFile && (
              <button 
                onClick={onClearFile}
                className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                title="Remove File"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Signal Level</span>
          <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold animate-pulse">Active</span>
        </div>
      )}
      
      <div className="flex flex-col gap-1">
        {mode === 'file' && file && (
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] uppercase tracking-widest text-neutral-500">Level</span>
          </div>
        )}
        <canvas ref={canvasRef} width={300} height={12} className="w-full h-3 rounded-full overflow-hidden bg-neutral-950" />
      </div>
    </div>
  );
};

export type AssetType = 'bg' | 'poster' | 'overlay' | 'logo' | 'flash';
export type AssetAspect = 'landscape' | 'portrait' | 'square';
export type AssetColor = 'mono' | 'accent' | 'color';
export type AssetBehavior = 'frequent' | 'rare' | 'peak';

export interface ImageMetadata {
  type: AssetType;
  aspect: AssetAspect;
  color: AssetColor;
  behavior: AssetBehavior;
}

export interface AssetItem {
  image: HTMLImageElement;
  metadata: ImageMetadata;
  file: File;
}

const parseMetadata = (file: File, img: HTMLImageElement): ImageMetadata => {
  const filename = file.name.toLowerCase();
  const parts = filename.split('.')[0].split('__');
  
  let type: AssetType | undefined;
  let aspect: AssetAspect | undefined;
  let color: AssetColor | undefined;
  let behavior: AssetBehavior | undefined;

  const types = ['bg', 'poster', 'overlay', 'logo', 'flash'];
  const aspects = ['landscape', 'portrait', 'square'];
  const colors = ['mono', 'accent', 'color'];
  const behaviors = ['frequent', 'rare', 'peak'];

  parts.forEach(part => {
    if (types.includes(part)) type = part as AssetType;
    if (aspects.includes(part)) aspect = part as AssetAspect;
    if (colors.includes(part)) color = part as AssetColor;
    if (behaviors.includes(part)) behavior = part as AssetBehavior;
  });

  const ratio = img.width / img.height;
  const autoAspect = ratio > 1.1 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square';
  
  // Auto classification fallback
  if (!type) {
    if (file.type === 'image/png') {
      type = 'overlay';
    } else if (ratio > 1.2) {
      type = 'bg';
    } else {
      type = 'poster';
    }
  }

  return {
    type: type || 'bg',
    aspect: aspect || autoAspect,
    color: color || 'color',
    behavior: behavior || 'frequent'
  };
};

class AudioAnalyzer {
  ctx: AudioContext;
  analyzer: AnalyserNode;
  dataArray: Uint8Array;
  source: MediaStreamAudioSourceNode | null = null;
  stream: MediaStream | null = null;
  audioElement: HTMLAudioElement | null = null;
  elementSource: MediaElementAudioSourceNode | null = null;

  smoothedVol: number = 0;
  smoothedLow: number = 0;
  smoothedMid: number = 0;
  smoothedHigh: number = 0;

  kickPulse: number = 0;
  clapPulse: number = 0;
  hatPulse: number = 0;
  bassGroove: number = 0;

  prevLow: number = 0;
  prevMid: number = 0;
  prevHigh: number = 0;

  lastKickTime: number = 0;
  lastClapTime: number = 0;
  lastHatTime: number = 0;
  lastVol: number = 0;
  
  beatCount: number = 0;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 256;
    this.analyzer.smoothingTimeConstant = 0.8; // Built-in smoothing
    this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
  }

  async start(mode: 'mic' | 'ambient' | 'screen' | 'file', deviceId?: string, file?: File) {
    if (mode === 'ambient') return;
    
    try {
      if (mode === 'file' && file) {
        this.audioElement = new Audio(URL.createObjectURL(file));
        this.audioElement.loop = true;
        this.elementSource = this.ctx.createMediaElementSource(this.audioElement);
        this.elementSource.connect(this.analyzer);
        this.analyzer.connect(this.ctx.destination);
        try {
          await this.audioElement.play();
        } catch (e: any) {
          if (e.name !== 'AbortError') throw e;
        }
        return;
      }

      if (mode === 'mic') {
        const constraints: MediaStreamConstraints = {
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        };
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          throw new Error("Microphone access is not supported in this context. Try opening the app in a new tab.");
        }
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else if (mode === 'screen') {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
          throw new Error("Screen capture is not supported in this context. Try opening the app in a new tab.");
        }
        this.stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      }
      
      if (this.stream) {
        if (this.stream.getAudioTracks().length === 0) {
          this.stream.getTracks().forEach(t => t.stop());
          this.stream = null;
          throw new Error("No audio track found. Please make sure to share audio.");
        }
        this.source = this.ctx.createMediaStreamSource(this.stream);
        this.source.connect(this.analyzer);
      }
    } catch (e: any) {
      console.error("Audio access denied", e);
      const isIframe = window.self !== window.top;
      if (mode === 'screen' && isIframe) {
        throw new Error("Screen capture is restricted within the preview iframe. Please open the app in a new tab (top right icon) to use this feature.");
      }
      if (e.message && e.message.includes("No audio track found")) {
        throw e;
      }
      if (e.name === 'NotAllowedError' || e.message?.includes('Permission denied')) {
        throw new Error("Permission denied by user. Please allow access to use this feature.");
      }
      if (mode === 'screen') {
        throw new Error("Screen capture failed. Please ensure you have granted permission and are sharing audio.");
      } else {
        throw new Error("Microphone access was denied. Please allow microphone access or try opening in a new tab.");
      }
    }
  }

  getSignalFeatures(time: number): SignalFeatures {
    this.analyzer.getByteFrequencyData(this.dataArray);
    let low = 0, mid = 0, high = 0, vol = 0;
    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      vol += this.dataArray[i];
      if (i < len * 0.33) low += this.dataArray[i];
      else if (i < len * 0.66) mid += this.dataArray[i];
      else high += this.dataArray[i];
    }
    
    const targetVol = (vol / len) / 255;
    const targetLow = (low / (len * 0.33)) / 255;
    const targetMid = (mid / (len * 0.33)) / 255;
    const targetHigh = (high / (len * 0.33)) / 255;

    // Spectral Flux (Change in timbre)
    const flux = Math.max(0, targetVol - this.lastVol);
    this.lastVol = targetVol;

    // Onset Strength (Simplified)
    const onset = flux > 0.05 ? 1.0 : 0;

    return {
      vol: targetVol * 1.5, // Boost for visibility
      low: targetLow,
      mid: targetMid,
      high: targetHigh,
      rawVol: targetVol,
      flux,
      onset
    };
  }

  getAudioData(time: number) {
    const features = this.getSignalFeatures(time);
    
    // Maintain old transient logic for now to avoid breaking things immediately
    const lowTransient = features.low - this.prevLow;
    const midTransient = features.mid - this.prevMid;
    const highTransient = features.high - this.prevHigh;

    if (lowTransient > 0.05 && features.low > 0.4 && time - this.lastKickTime > 0.3) {
      this.beatCount = (this.beatCount + 1) % 4;
      this.kickPulse = this.beatCount === 0 ? 1.0 : (this.beatCount === 3 ? 1.2 : 0.8);
      this.lastKickTime = time;
    }

    if (midTransient > 0.08 && features.mid > 0.3 && time - this.lastClapTime > 0.2) {
      this.clapPulse = 1.0;
      this.lastClapTime = time;
    }

    if (highTransient > 0.05 && features.high > 0.2 && time - this.lastHatTime > 0.1) {
      this.hatPulse = 1.0;
      this.lastHatTime = time;
    }

    this.kickPulse *= 0.85;
    this.clapPulse *= 0.8;
    this.hatPulse *= 0.7;
    this.bassGroove = features.low;

    this.prevLow = features.low;
    this.prevMid = features.mid;
    this.prevHigh = features.high;

    return {
      vol: features.vol,
      low: features.low,
      mid: features.mid,
      high: features.high,
      rawVol: features.rawVol,
      kickPulse: this.kickPulse,
      clapPulse: this.clapPulse,
      hatPulse: this.hatPulse,
      bassGroove: this.bassGroove
    };
  }

  setVolume(vol: number) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, vol));
    }
  }

  togglePlayPause() {
    if (this.audioElement) {
      if (this.audioElement.paused) {
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Audio play error:", e);
            }
          });
        }
      } else {
        this.audioElement.pause();
      }
    }
  }

  isFilePlaying() {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.source) {
      this.source.disconnect();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.elementSource) {
      this.elementSource.disconnect();
    }
    if (this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}

export interface VisualOptions {
  enableGlitch: boolean;
  enableVHS: boolean;
  enableCurvature: boolean;
  enableNoise: boolean;
  enableFlicker: boolean;
  enableRGBSplit: boolean;
  enableDriftOffset: boolean;
  enableBlobDynamics: boolean;
  globalEffects: number;
  flickerAmount: number;
  motionAmount: number;
  eventDensity: number;
  transitionSpeed: number;
  overlayEnabled: boolean;
  overlayTransparencyMode: 'normal' | 'black' | 'white';
  overlayOpacity: number;
}

const transparentImg = new Image();
transparentImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const dummyAsset: AssetItem = {
  file: new File([], "dummy.png"),
  image: transparentImg,
  metadata: { type: 'overlay', aspect: 'square', color: 'color', behavior: 'rare' }
};

class VisualEngine {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  assets: AssetItem[];
  audioMode: 'mic' | 'ambient' | 'screen' | 'file';
  deviceId?: string;
  audioFile?: File;
  visualMode: 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope';
  colorMode: string;
  
  options: VisualOptions = {
    enableGlitch: true,
    enableVHS: true,
    enableCurvature: true,
    enableNoise: true,
    enableFlicker: true,
    enableRGBSplit: true,
    enableDriftOffset: false,
    enableBlobDynamics: true,
    globalEffects: 0.9,
    flickerAmount: 0.5,
    motionAmount: 0.6,
    eventDensity: 0.7,
    transitionSpeed: 0.5,
    overlayEnabled: true,
    overlayTransparencyMode: 'normal',
    overlayOpacity: 100
  };
  
  bgAssets: AssetItem[] = [];
  posterAssets: AssetItem[] = [];
  overlayAssets: AssetItem[] = [];
  logoAssets: AssetItem[] = [];
  flashAssets: AssetItem[] = [];
  
  bgIndex: number = 0;
  posterIndex: number = 0;
  overlayIndex: number = 0;
  logoIndex: number = 0;
  flashIndex: number = 0;

  time: number = 0;
  zoomState: 'HOLD' | 'DRIFT' | 'PULSE' = 'DRIFT';
  currentZoom: number = 0;
  targetZoom: number = 0;
  beatCount: number = 0;
  lastKick: number = 0;
  pulseTimer: number = 0;
  prevPosterIndex: number = -1;
  audioAnalyzer: AudioAnalyzer | null = null;
  conductor: Conductor = new Conductor();
  lastMusicalContext: MusicalContext | null = null;
  running: boolean = true;
  lastTime: number;
  program!: WebGLProgram;
  uniforms: any = {};
  onError?: (err: Error) => void;

  lastBgChange: number = 0;
  lastPosterChange: number = 0;
  lastOverlayChange: number = 0;

  lastPeakTime: number = 0;
  nextRandomEventTime: number = 0;
  
  glitchType: number = 0;
  glitchTime: number = 0;
  glitchIntensity: number = 0;
  glitchDuration: number = 0;
  signalGlitchBounce: number = 0;
  signalGlitchRecoil: number = 0;
  postDropEnergy: number = 0;
  
  isBuildup: boolean = false;
  buildupValue: number = 0;
  dropPulse: number = 0;
  layerVisibility: number[] = [1, 1, 1, 1];
  posterZoomLevel: number = 1.0;
  posterCrop: {x: number, y: number} = {x: 0, y: 0};

  // Macro States
  macroBuildUp: boolean = false;
  macroTension: boolean = false;
  macroDrop: boolean = false;
  macroExtraBounce: boolean = false;

  lavaState: number = 0;
  lavaNextState: number = 0;
  lavaMix: number = 0;
  lavaIntensity: number = 1.0;
  lavaReveal: number = 0.0;
  lavaTransformationAmount: number = 0.0;
  lavaTransformationTarget: number = 0.0;
  nextLavaStateTime: number = 0;
  nextLavaTransformationTime: number = 0;

  representPulse: number = 0;
  representWave: number = 0;
  representWaveColor: number = 0; // 0: blue, 1: red
  nextRepresentEventTime: number = 0;

  kaleidoscopeRotation: number = 0;
  kaleidoscopeDrift: {x: number, y: number} = {x: 0, y: 0};
  kaleidoscopeTunnelDepth: number = 0;
  kaleidoscopeCenterPulse: number = 0;
  kaleidoscopeShapeMorph: number = 0;
  kaleidoscopeShapeType: number = 0;
  kaleidoscopeTransitionFade: number = 1.0;
  
  contourStripOffset: number = 0;
  contourPlaneShift: number = 0;
  contourReassembly: number = 1.0;
  contourBounce: number = 0;
  contourShatter: number = 0;
  contourRasterDensity: number = 1.0;
  contourReliefDepth: number = 0.5;

  constructor(
    canvas: HTMLCanvasElement, 
    assets: AssetItem[], 
    audioMode: 'mic' | 'ambient' | 'screen' | 'file', 
    deviceId: string | undefined, 
    audioFile: File | undefined,
    visualMode: 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope',
    colorMode: string,
    onError?: (err: Error) => void
  ) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl')!;
    this.assets = assets;
    this.audioMode = audioMode;
    this.deviceId = deviceId;
    this.audioFile = audioFile;
    this.visualMode = visualMode;
    this.colorMode = colorMode;
    this.onError = onError;
    this.conductor = new Conductor();
    
    this.bgAssets = assets.filter(a => a.metadata.type === 'bg');
    this.posterAssets = assets.filter(a => a.metadata.type === 'poster');
    this.overlayAssets = assets.filter(a => a.metadata.type === 'overlay');
    this.logoAssets = assets.filter(a => a.metadata.type === 'logo');
    this.flashAssets = assets.filter(a => a.metadata.type === 'flash');
    
    if (this.bgAssets.length === 0) this.bgAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.posterAssets.length === 0) this.posterAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.overlayAssets.length === 0) this.overlayAssets = [dummyAsset];
    if (this.logoAssets.length === 0) this.logoAssets = [dummyAsset];
    if (this.flashAssets.length === 0) this.flashAssets = [dummyAsset];
    
    this.bgIndex = Math.floor(Math.random() * this.bgAssets.length);
    this.posterIndex = Math.floor(Math.random() * this.posterAssets.length);
    this.overlayIndex = Math.floor(Math.random() * this.overlayAssets.length);
    this.logoIndex = Math.floor(Math.random() * this.logoAssets.length);
    this.flashIndex = Math.floor(Math.random() * this.flashAssets.length);
    
    if (audioMode !== 'ambient') {
      this.audioAnalyzer = new AudioAnalyzer();
      this.audioAnalyzer.start(audioMode, deviceId, audioFile).catch(err => {
        console.error("Failed to start audio analyzer", err);
        if (this.onError) this.onError(err);
      });
    }

    this.initGL();
    this.updateTextures();
    this.resize();
    window.addEventListener('resize', this.resize);
    
    this.lastTime = performance.now();
    this.render();
  }

  textureCache: Map<HTMLImageElement, WebGLTexture> = new Map();

  getTexture(img: HTMLImageElement): WebGLTexture {
    const gl = this.gl;
    if (this.textureCache.has(img)) {
      return this.textureCache.get(img)!;
    }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    this.textureCache.set(img, tex);
    return tex;
  }

  updateTextures(type?: 'bg' | 'poster' | 'overlay' | 'logo' | 'flash') {
    // No-op: Textures are now fetched dynamically in render() via getTexture()
  }

  resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  initGL() {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D u_tex_bg;
      uniform sampler2D u_tex_poster;
      uniform sampler2D u_tex_overlay;
      uniform sampler2D u_tex_logo;
      uniform sampler2D u_tex_flash;
      
      uniform float u_time;
      uniform float u_global_effects;
      uniform float u_vol;
      uniform float u_mid;
      uniform float u_high;
      uniform float u_low;
      uniform float u_zoom;
      
      uniform float u_kick;
      uniform float u_clap;
      uniform float u_hat;
      uniform float u_bass;
      
      uniform vec2 u_resolution;
      uniform vec2 u_res_bg;
      uniform vec2 u_res_poster;
      uniform vec2 u_res_overlay;
      uniform vec2 u_res_logo;
      uniform vec2 u_res_flash;
      
      uniform int u_visual_mode;
      uniform int u_color_mode;

      uniform int u_glitch_type;
      uniform float u_glitch_time;
      uniform float u_glitch_intensity;
      
      uniform float u_enable_glitch;
      uniform float u_enable_vhs;
      uniform float u_enable_curvature;
      uniform float u_enable_noise;
      uniform float u_enable_flicker;
      uniform float u_enable_rgb_split;
      uniform float u_enable_drift_offset;
      uniform float u_enable_blob_dynamics;
      
      uniform float u_overlay_enabled;
      uniform float u_overlay_trans_mode;
      uniform float u_overlay_opacity;
      
      uniform float u_flicker_amount;
      uniform float u_motion_amount;
      uniform vec4 u_layer_visibility;

      uniform float u_poster_softness;
      uniform float u_overlay_softness;
      uniform float u_poster_white_transparency;
      uniform float u_overlay_white_transparency;

      uniform float u_poster_zoom_weight;
      uniform float u_poster_zoom_level;
      uniform vec2 u_poster_crop;
      uniform float u_overlay_zoom_weight;
      
      uniform float u_last_bg_change;
      uniform float u_last_poster_change;
      uniform float u_last_overlay_change;
      
      uniform float u_buildup;
      uniform float u_drop_pulse;

      uniform float u_lava_state;
      uniform float u_lava_next_state;
      uniform float u_lava_mix;
      uniform float u_lava_intensity;
      uniform float u_lava_reveal;
      uniform float u_lava_transformation;
      uniform float u_lava_is_logo;

      uniform float u_represent_pulse;
      uniform float u_represent_wave;
      uniform float u_represent_wave_color;

      uniform float u_beat_phase;
      uniform float u_bar_phase;
      uniform float u_energy_trend;

      float rand(vec2 co){
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      float vnoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float n = i.x + i.y * 57.0 + 113.0 * i.z;

          return mix(mix(mix(rand(vec2(n + 0.0, 0.0)), rand(vec2(n + 1.0, 0.0)), f.x),
                         mix(rand(vec2(n + 57.0, 0.0)), rand(vec2(n + 58.0, 0.0)), f.x), f.y),
                     mix(mix(rand(vec2(n + 113.0, 0.0)), rand(vec2(n + 114.0, 0.0)), f.x),
                         mix(rand(vec2(n + 170.0, 0.0)), rand(vec2(n + 171.0, 0.0)), f.x), f.y), f.z);
      }

      // Lava Space Helpers
      float getLavaFieldBase(vec2 p, float t, float state, float bass, float kick, float clap, float vol) {
          float f = 0.0;
          float lowFreq = (bass + kick) * 0.5;
          float midFreq = (clap + vol) * 0.5;
          
          // Coordinate warping for more organic, asymmetrical "lava tongues"
          vec2 p_warped = p + vec2(sin(p.y * 1.5 + t * 0.5), cos(p.x * 1.2 - t * 0.4)) * 0.3;
          
          // 0: BUBBLE (Classic lava lamp - refined)
          if (state < 0.5) {
              float scale = 2.2;
              f += sin(p_warped.x * scale + t * 0.3) * cos(p_warped.y * scale * 0.7 - t * 0.2);
              // Elongated droplets
              f += sin(p.x * 5.0 + t * 2.0) * sin(p.y * 2.0 - t * 1.5) * 0.3 * (1.0 + midFreq);
              f += cos(p.x * 3.0 - t) * sin(p.y * 4.0 + t * 0.8) * 0.2;
          }
          // 1: WAVE (Flowing horizontal streams - refined)
          else if (state < 1.5) {
              float scale = 1.2;
              f += sin(p_warped.x * scale + t * 0.4 + p_warped.y * 0.6) * 0.7;
              f += sin(p.x * 2.5 - t * (0.8 + midFreq)) * cos(p.y * 0.5 + t * 0.2) * 0.4;
              f += sin(p.y * 3.0 + t * 0.5) * 0.25;
          }
          // 2: SPREAD (Expanding circular ripples - refined)
          else if (state < 2.5) {
              vec2 center = vec2(1.0 + sin(t * 0.3) * 0.5, 1.0 + cos(t * 0.2) * 0.5);
              float dist = length(p_warped - center); 
              f += sin(dist * 3.5 - t * (1.5 + lowFreq * 2.5)) * 0.7;
              f += sin(p.x * 3.0 + t) * cos(p.y * 5.0 - t) * 0.25;
          }
          // 3: DISSOLVE (Scattered particles/noise - refined)
          else if (state < 3.5) {
              float scale = 3.5;
              f += sin(p_warped.x * scale + t) * cos(p_warped.y * scale - t) * 0.4;
              f += rand(p + t) * 0.15 * midFreq;
              f *= smoothstep(1.8, 0.2, length(p - 1.0) + sin(t * 0.4) * 0.6);
          }
          // 4: PULSE (Rhythmic breathing - refined)
          else if (state < 4.5) {
              float pulse = sin(t * (2.0 + lowFreq * 4.0)) * 0.4 + 0.6;
              f += sin(p_warped.x * 1.2) * cos(p_warped.y * 1.2) * pulse;
              f += sin(p.x * 4.0 + t) * cos(p.y * 2.0 - t * 0.5) * 0.2;
          }
          // 5: REVEAL (Minimal fluid, mostly image - refined)
          else if (state < 5.5) {
              f += sin(p_warped.x * 1.2 + t * 0.08) * cos(p_warped.y * 1.2 - t * 0.08) * 0.08;
              f += sin(p.x * 8.0 + t) * 0.015 * midFreq;
          }
          // 6: COLOR BLOOM (Intense color fields - refined)
          else {
              f += sin(p_warped.x * 1.8 + t) * cos(p_warped.y * 1.8 - t) * 0.7;
              f += sin(p.x * 3.5 - t * 1.2) * 0.35 * midFreq;
              f += cos(p.y * 6.0 + t) * 0.15;
          }
          
          return f;
      }

      float getLavaField(vec2 p, float t, float blobDynamics, float bass, float kick, float clap, float vol) {
          float f1 = getLavaFieldBase(p, t, u_lava_state, bass, kick, clap, vol);
          float f2 = getLavaFieldBase(p, t, u_lava_next_state, bass, kick, clap, vol);
          float f = mix(f1, f2, u_lava_mix);
          
          // Apply overall intensity
          f *= u_lava_intensity;
          
          // Sculpted look: non-linear shaping for more defined "masses"
          if (blobDynamics > 0.5) {
              float sign_f = sign(f);
              f = abs(f);
              f = smoothstep(0.0, 1.0, f);
              f = pow(f, 0.75); // Sharpen edges slightly
              f *= sign_f;
          }
          
          // Layered depth: add a secondary, slower moving background field
          float bgField = sin(p.x * 0.5 + t * 0.1) * cos(p.y * 0.4 - t * 0.08) * 0.3;
          f = mix(bgField, f, 0.8);
          
          // Add micro-ripples based on high frequencies
          f += sin(p.x * 25.0 + p.y * 25.0 + t * 8.0) * 0.008 * (0.1 + vol);
          
          return f;
      }

      vec3 getLavaNormal(vec2 p, float t, float blobDynamics, float bass, float kick, float clap, float vol) {
          float eps = 0.02;
          float f = getLavaField(p, t, blobDynamics, bass, kick, clap, vol);
          float fx = getLavaField(p + vec2(eps, 0.0), t, blobDynamics, bass, kick, clap, vol);
          float fy = getLavaField(p + vec2(0.0, eps), t, blobDynamics, bass, kick, clap, vol);
          return normalize(vec3(f - fx, f - fy, eps * 2.0));
      }

      vec2 getCoverUv(vec2 uv, vec2 screenRes, vec2 texRes) {
          float screenAspect = screenRes.x / screenRes.y;
          float texAspect = texRes.x / texRes.y;
          vec2 scale = vec2(1.0, 1.0);
          if (screenAspect > texAspect) {
              scale.y = texAspect / screenAspect;
          } else {
              scale.x = screenAspect / texAspect;
          }
          return (uv - 0.5) * scale + 0.5;
      }

      vec2 getContainUv(vec2 uv, vec2 screenRes, vec2 texRes) {
          float screenAspect = screenRes.x / screenRes.y;
          float texAspect = texRes.x / texRes.y;
          vec2 scale = vec2(1.0, 1.0);
          if (screenAspect > texAspect) {
              scale.x = screenAspect / texAspect;
          } else {
              scale.y = texAspect / screenAspect;
          }
          return (uv - 0.5) * scale + 0.5;
      }

      float getSoftEdge(vec2 uv, vec2 res, float softness) {
          if (softness <= 0.001) return 1.0;
          float aspect = res.x / res.y;
          vec2 dist = min(uv, 1.0 - uv);
          if (aspect > 1.0) {
              dist.x *= aspect;
          } else {
              dist.y /= aspect;
          }
          return smoothstep(0.0, softness, dist.x) * smoothstep(0.0, softness, dist.y);
      }

      vec4 applyOverlayTransparency(vec4 overlay_color, float trans_mode, float opacity) {
          float lum = dot(overlay_color.rgb, vec3(0.299, 0.587, 0.114));
          float alpha_mod = 1.0;
          if (trans_mode == 1.0) {
              // Black Transparent: suppress dark tones
              alpha_mod = smoothstep(0.02, 0.3, lum);
          } else if (trans_mode == 2.0) {
              // White Transparent: suppress bright tones
              alpha_mod = 1.0 - smoothstep(0.7, 0.98, lum);
          }
          overlay_color.a *= alpha_mod * opacity;
          return overlay_color;
      }

      void main() {
        vec2 uv = vUv;
        vec2 originalUv = uv;
        
        // Glitch Events (Global)
        float tear = 0.0;
        float roll = 0.0;
        float noiseBurst = 0.0;
        float flickerBurst = 0.0;
        float rgbSplit = 0.0;

        // Exponential scaling for the "fireworks" magnitude of existing effects
        float effect_mult = u_global_effects + pow(u_global_effects, 4.0) * 2.0;

        // Lava Space Fluid Distortion
        if (u_visual_mode == 1) {
            float t = u_time * 0.2;
            float blobDynamics = u_enable_blob_dynamics;
            
            // Generate fluid field
            float field = getLavaField(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
            
            // Asset Type Detection (Heuristic via Logo Alpha)
            vec2 uv_logo_test = getContainUv(uv, u_resolution, u_res_logo);
            float logoMask = 0.0;
            if (uv_logo_test.x >= 0.0 && uv_logo_test.x <= 1.0 && uv_logo_test.y >= 0.0 && uv_logo_test.y <= 1.0) {
                logoMask = texture2D(u_tex_logo, uv_logo_test).a * u_layer_visibility.w;
            }
            
            // Transformation strength differs: Logos are more controlled
            float transStrength = mix(u_lava_transformation, u_lava_transformation * 0.6, logoMask);
            
            // Contour following: use image luminance to warp the field
            // When transformation is high, the image structure drives the fluid shapes more
            float imgLum = dot(texture2D(u_tex_poster, uv).rgb, vec3(0.299, 0.587, 0.114));
            
            // Logos follow silhouette more strictly, photos follow contrast zones
            float contourWeight = mix(0.6, 1.2, logoMask);
            field += (imgLum - 0.5) * contourWeight * transStrength; 
            
            // Fluid Distortion
            if (u_enable_glitch > 0.5) {
                vec3 normal = getLavaNormal(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
                
                // Distortion intensity scales with transformation and energy
                // Logos have less total deformation
                float fluidIntensity = (0.05 + u_bass * 0.25) * effect_mult * transStrength;
                
                // Use normal for more "physical" distortion
                uv += normal.xy * fluidIntensity;
                
                // Add stronger "spatial" depth displacement
                float depthDisplace = field * 0.15 * effect_mult * transStrength;
                uv += normal.xy * depthDisplace;
                
                // Subtle rotational drift
                float angle = u_time * 0.05 + field * 0.2 * transStrength;
                mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                uv = (uv - 0.5) * rot + 0.5;
            }
            
            // Stronger breathing zoom moving in on bass
            float spaceZoom = 0.92 - (u_bass * 0.3 * effect_mult * (u_motion_amount + 0.5) * u_lava_intensity);
            // Temporary expansion on peaks
            spaceZoom -= u_drop_pulse * 0.1 * u_lava_intensity;
            spaceZoom = max(0.1, spaceZoom); // Prevent collapse to black
            
            uv = (uv - 0.5) * spaceZoom + 0.5;
        }

        // CONTOUR Mode: Structural Graphic System (Strips, Planes, Panels, Blocks)
        if (u_visual_mode == 3) {
            float stripCount = u_lava_state;
            float reassembly = u_lava_next_state;
            float stripOffsetAmount = u_lava_mix;
            float reliefDepth = u_lava_intensity;
            float shatter = u_lava_reveal;
            float energy = u_lava_transformation;
            float bounce = u_represent_pulse;
            float rasterDensity = u_represent_wave;
            float planeShift = u_represent_wave_color;

            // 0. Lifecycle & Visibility Cycle (Choreographed)
            float cycleTime = u_time * 0.2;
            float visibilityCycle = 0.5 + 0.5 * sin(cycleTime); // 0.0 to 1.0
            // Phases: 0.0-0.3 (Clear), 0.3-0.7 (Partial), 0.7-1.0 (Strong)
            float strongPhase = smoothstep(0.6, 0.9, visibilityCycle);
            float partialPhase = smoothstep(0.2, 0.6, visibilityCycle) * (1.0 - strongPhase);
            float clearPhase = 1.0 - partialPhase - strongPhase;
            
            // Global reassembly override based on cycle
            float cycleReassembly = mix(reassembly, 1.0, clearPhase * 0.8);
            
            // 1. Structural Bounce (Kick driven)
            vec2 centerDir = originalUv - 0.5;
            uv = originalUv + centerDir * bounce * 0.1 * reliefDepth * (1.0 - clearPhase);

            // 2. Image-Derived Segmentation (Shape Families)
            // Use low-res luminance to drive structure
            vec2 lowResUv = floor(originalUv * 8.0) / 8.0;
            float imgLum = dot(texture2D(u_tex_poster, lowResUv).rgb, vec3(0.299, 0.587, 0.114));
            
            // Determine Shape Family based on time and image content
            float familySelector = fract(cycleTime * 0.5 + imgLum * 0.2);
            
            if (strongPhase > 0.1 || partialPhase > 0.1) {
                float structuralWeight = mix(partialPhase * 0.5, 1.0, strongPhase);
                
                if (familySelector < 0.25) {
                    // STRIPS: Wide horizontal architectural slicing
                    float stripId = floor(uv.y * (stripCount * 0.5 + 2.0));
                    float slide = (fract(stripId * 0.5) > 0.5 ? 1.0 : -1.0) * stripOffsetAmount * energy * 0.3;
                    uv.x += slide * structuralWeight;
                } else if (familySelector < 0.5) {
                    // PANELS: Broad vertical structural bands
                    float panelId = floor(uv.x * 2.0);
                    float shift = (fract(panelId * 0.5) > 0.5 ? 1.0 : -1.0) * planeShift * energy * 0.2;
                    uv.y += shift * structuralWeight;
                } else if (familySelector < 0.75) {
                    // SLABS: Large rectangular image-derived blocks
                    vec2 slabGrid = vec2(3.0, 5.0);
                    vec2 slabId = floor(uv * slabGrid);
                    float slabRand = rand(slabId);
                    vec2 slabShift = (vec2(slabRand, rand(slabId + 1.0)) - 0.5) * shatter * 0.2;
                    uv += slabShift * structuralWeight;
                } else {
                    // RELIEF: Stepped image-derived planes
                    float steppedLum = floor(imgLum * 5.0) / 5.0;
                    float reliefWarp = steppedLum * 0.1 * reliefDepth;
                    uv += vec2(reliefWarp, -reliefWarp) * structuralWeight;
                }
            }

            // 3. Pseudo-3D Relief (Derived from Image)
            vec4 posterSample = texture2D(u_tex_poster, uv);
            float lum = dot(posterSample.rgb, vec3(0.299, 0.587, 0.114));
            vec2 tilt = vec2(lum - 0.5) * planeShift * 0.1 * reliefDepth * (1.0 - clearPhase);
            uv += tilt;

            // 4. Rhythmic Reassembly
            uv = mix(uv, originalUv, cycleReassembly);

            // 5. Integrated Raster (Detail)
            if (u_enable_vhs > 0.5) {
                float lineFreq = 30.0 + rasterDensity * 150.0;
                float lines = sin(uv.y * lineFreq + u_time * 2.0) * 0.5 + 0.5;
                float edge = abs(lum - dot(texture2D(u_tex_poster, uv + 0.002).rgb, vec3(0.299, 0.587, 0.114)));
                float rasterEffect = smoothstep(0.4, 0.6, lines) * (0.1 + edge * 2.0) * reliefDepth * strongPhase;
                uv += vec2(rasterEffect * 0.005);
            }
            
            if (u_enable_rgb_split > 0.5) {
                rgbSplit += (0.002 + shatter * 0.01) * energy * (1.0 - clearPhase);
            }
        }

        // Curvature / Lens
        if (u_enable_curvature > 0.5) {
            vec2 centerUv = uv - 0.5;
            float rsq = centerUv.x * centerUv.x + centerUv.y * centerUv.y;
            if (u_visual_mode == 0) {
                // CRT Curvature
                centerUv += centerUv * (rsq * 0.1 * effect_mult);
            } else if (u_visual_mode == 1) {
                // Liquid Lens
                float bulge = sin(rsq * 8.0 - u_time * 1.5) * 0.03 * effect_mult * (1.0 + u_bass * 2.0);
                centerUv += centerUv * bulge;
            } else if (u_visual_mode == 2) {
                // Represent Perspective / Subtle Bend
                float bend = rsq * 0.05 * (1.0 + u_bass * 0.5);
                centerUv += centerUv * bend;
                
                // Subtle perspective tilt
                centerUv.x *= 1.0 + centerUv.y * 0.05 * sin(u_time * 0.2);
            } else if (u_visual_mode == 3) {
                // Relief Bend: Subtle cylindrical warp
                float bend = centerUv.x * centerUv.x * 0.1 * effect_mult;
                centerUv.y += bend * (1.0 + u_bass);
            }
            uv = centerUv + 0.5;
        }

        // Smooth Drift (Base state) - use u_bass for groove
        // Background -> almost static
        float driftX = sin(u_time * 0.1 + uv.y * 0.5) * 0.003 * effect_mult * u_motion_amount * (1.0 + u_bass) * (1.0 - u_buildup * 0.5);
        float driftY = cos(u_time * 0.08 + uv.x * 0.4) * 0.003 * effect_mult * u_motion_amount * (1.0 + u_bass) * (1.0 - u_buildup * 0.5);
        
        // Add Drift Offset (Interval-based, subtle)
        if (u_enable_drift_offset > 0.5) {
            float cycle = mod(u_time, 8.0); // 8 second cycle
            // Smoothly fade in over 1s, hold for 1s, fade out over 1s
            float trigger = smoothstep(0.0, 1.0, cycle) * smoothstep(3.0, 2.0, cycle);
            
            float cycleId = floor(u_time / 8.0);
            float randX = (rand(vec2(cycleId, 1.0)) - 0.5) * 2.0;
            float randY = (rand(vec2(1.0, cycleId)) - 0.5) * 2.0;
            
            // Base drift is small, scales with bass. If bass is 0, drift is minimal.
            float driftIntensity = 0.01 + (u_bass * 0.03); 
            
            driftX += randX * driftIntensity * trigger;
            driftY += randY * driftIntensity * trigger;
        }

        uv += vec2(driftX, driftY);
        
        // Micro jitter during buildup
        uv += vec2(rand(uv + u_time), rand(uv - u_time)) * 0.003 * u_buildup;

        if (u_visual_mode == 0) {
            if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
                float active_intensity = u_glitch_intensity * u_flicker_amount * 2.0;
                if (u_glitch_type == 1) {
                    // Dark Flicker Burst (compression feel)
                    flickerBurst = -step(0.5, fract(u_glitch_time * 15.0)) * active_intensity * 0.5;
                } else if (u_glitch_type == 2) {
                    // Horizontal Tear
                    float tearBand = step(0.95, sin(uv.y * 50.0 + u_glitch_time * 20.0));
                    tear = (rand(vec2(uv.y * 20.0, u_time)) - 0.5) * 0.1 * active_intensity * tearBand;
                    rgbSplit += 0.05 * active_intensity * tearBand;
                } else if (u_glitch_type == 3) {
                    // Tracking Roll
                    roll = fract(u_glitch_time * 3.0) * active_intensity * 0.1;
                    uv.y = fract(uv.y + roll);
                } else if (u_glitch_type == 4) {
                    // Noise Burst
                    noiseBurst = active_intensity * 0.5;
                } else if (u_glitch_type == 5) {
                    // Subtle Pixel Sort (simulated)
                    float sortBand = step(0.9, sin(uv.y * 15.0 + u_time * 5.0));
                    uv.x -= sortBand * (rand(vec2(uv.y, 0.0)) * 0.1 * active_intensity);
                } else if (u_glitch_type == 6) {
                    // RGB Separation Burst
                    rgbSplit += 0.1 * active_intensity;
                    uv.x += (rand(vec2(u_time, uv.y)) - 0.5) * 0.02 * active_intensity;
                } else if (u_glitch_type == 7) {
                    // Distortion Wave
                    float wave = sin(uv.y * 10.0 + u_glitch_time * 10.0) * 0.05 * active_intensity;
                    uv.x += wave;
                    rgbSplit += abs(wave) * 0.5;
                } else if (u_glitch_type == 8) {
                    // Stutter / Jitter
                    uv.x += (step(0.5, rand(vec2(u_time, 1.0))) - 0.5) * 0.05 * active_intensity;
                    uv.y += (step(0.5, rand(vec2(1.0, u_time))) - 0.5) * 0.05 * active_intensity;
                }
            }
            
            // Clap adds quick horizontal crackle/tear (Accent)
            if (u_enable_glitch > 0.5 && u_clap > 0.1) {
                float clapTearBand = step(0.95, sin(uv.y * 60.0 + u_time * 30.0));
                tear += (rand(vec2(uv.y * 10.0, u_time)) - 0.5) * 0.02 * u_clap * effect_mult * u_flicker_amount * clapTearBand;
                rgbSplit += 0.01 * u_clap * u_flicker_amount * clapTearBand;
            }
        }

        // Hat adds tiny noise modulation (Subtle high frequency)
        if (u_enable_noise > 0.5 && u_hat > 0.1) {
            noiseBurst += u_hat * 0.05;
        }

        uv.x += tear;

        // RGB Shift (tied to kick for impact/pressure)
        float shift = 0.0;
        if (u_enable_rgb_split > 0.5) {
            shift = 0.001 * effect_mult * (1.0 + u_bass);
            shift += rgbSplit;
            shift += u_kick * 0.005 * effect_mult; // Pressure distortion on kick
            
            if (u_visual_mode == 0) {
                shift += u_represent_wave * 0.015; // Add recoil to RGB split
            }
        }
        
        // Internal surface RGB shift (micro shift on high frequencies)
        shift += u_hat * 0.0015;
        
        // BG (Cover)
        float bg_age = u_time - u_last_bg_change;
        float bg_fade = smoothstep(0.0, 0.5, bg_age);
        
        vec2 bg_offset = vec2(0.0);
        if (u_visual_mode == 0) {
            bg_offset.y += u_represent_pulse * 0.02; // Subtle background bounce
            bg_offset.x -= u_represent_wave * 0.01;
        }
        
        vec2 uv_bg_r = getCoverUv(uv + vec2(shift, 0.0) + bg_offset, u_resolution, u_res_bg);
        vec2 uv_bg_g = getCoverUv(uv + bg_offset, u_resolution, u_res_bg);
        vec2 uv_bg_b = getCoverUv(uv - vec2(shift, 0.0) + bg_offset, u_resolution, u_res_bg);
        
        vec4 col_bg;
        col_bg.r = texture2D(u_tex_bg, uv_bg_r).r;
        col_bg.g = texture2D(u_tex_bg, uv_bg_g).g;
        col_bg.b = texture2D(u_tex_bg, uv_bg_b).b;
        col_bg.a = u_layer_visibility.x * bg_fade;

        if (u_visual_mode == 2) {
            // REPRESENT MODE: Premium Dark Background with loaded asset
            vec3 darkBase = vec3(0.05, 0.05, 0.08);
            
            // Subtle Grid
            vec2 gridUv = uv * 20.0;
            vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
            float gridLine = 1.0 - smoothstep(0.0, 0.05, min(grid.x, grid.y));
            
            darkBase += gridLine * 0.02 * (0.5 + 0.5 * sin(u_time * 0.5));
            
            // Atmospheric Waves
            float wavePos = fract(uv.y * 0.5 - u_time * 0.1 + u_represent_wave);
            float wave = smoothstep(0.1, 0.0, abs(wavePos - 0.5));
            
            vec3 waveColor = u_represent_wave_color > 0.5 ? vec3(0.8, 0.1, 0.1) : vec3(0.1, 0.3, 0.8);
            darkBase += waveColor * wave * u_represent_wave * 0.3;
            
            // Atmospheric Glow
            float glow = u_represent_pulse * 0.15;
            darkBase += vec3(0.1, 0.15, 0.2) * glow;
            
            // Mix loaded background asset (darkened/tinted for premium look)
            float lum = dot(col_bg.rgb, vec3(0.299, 0.587, 0.114));
            vec3 tintedBg = col_bg.rgb * 0.4 + vec3(0.05, 0.05, 0.1) * lum; // Darken and cool tint
            
            // Add subtle glitter/sparkle based on luminance and time
            float sparkle = pow(fract(sin(dot(uv + u_time * 0.1, vec2(12.9898, 78.233))) * 43758.5453), 20.0) * lum;
            tintedBg += vec3(sparkle) * 0.5;

            col_bg.rgb = darkBase + (tintedBg * col_bg.a);
            col_bg.a = 1.0; // Background is always opaque at the base
        } else {
            col_bg.rgb *= col_bg.a;
        }

        // FG (Contain-Plus) - Poster -> Main Movement
        // Enhanced Background Fill (Blurred & Darkened) derived from the poster itself
        // This fills gaps during rotation, zoom, or when the poster is contained
        // Use originalUv for stable background fill to prevent black gaps during transforms
        vec2 uv_poster_fill = getCoverUv(originalUv, u_resolution, u_res_poster);
        // Scale it up (zoom out) to ensure it covers even during transforms
        uv_poster_fill = (uv_poster_fill - 0.5) * 0.5 + 0.5; 
        
        float poster_age = u_time - u_last_poster_change;
        float poster_fade = smoothstep(0.0, 0.3, poster_age);
        
        // 9-tap blur for the background fill
        vec4 col_poster_bg = vec4(0.0);
        float bSize = 0.04; // Increased blur size for better integration
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill) * 0.2;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill + vec2(bSize, 0.0)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill - vec2(bSize, 0.0)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill + vec2(0.0, bSize)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill - vec2(0.0, bSize)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill + vec2(bSize, bSize)) * 0.1;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill - vec2(bSize, bSize)) * 0.1;
        
        // Darken significantly for atmospheric feel
        col_poster_bg.rgb *= 0.2 * poster_fade;
        
        // Add a soft vignette to the fill layer to blend into black
        vec2 fillVignetteUv = uv * (1.0 - uv.yx);
        float fillVignette = fillVignetteUv.x * fillVignetteUv.y * 15.0;
        fillVignette = pow(fillVignette, 0.4);
        col_poster_bg.rgb *= fillVignette;

        // Add glitch transition effect when poster is new
        float transition_glitch = (1.0 - smoothstep(0.0, 0.4, poster_age)) * u_motion_amount;
        vec2 poster_offset = vec2(sin(u_time * 0.1) * 0.01, cos(u_time * 0.08) * 0.01) * effect_mult * u_motion_amount * 2.0;
        poster_offset += vec2(rand(vec2(u_time, uv.y)) - 0.5, rand(vec2(uv.x, u_time)) - 0.5) * 0.1 * transition_glitch;
        
        float current_zoom = u_zoom;
        if (u_visual_mode == 0) {
            // Signal Glitch: Add post-drop bounce and recoil
            current_zoom += u_represent_pulse * 0.25; // Strong forward bounce
            current_zoom -= u_represent_wave * 0.15;  // Elastic recoil
            
            // Add physical push to offset
            poster_offset.y += u_represent_pulse * 0.08;
            poster_offset.x += (rand(vec2(u_time, 1.0)) - 0.5) * u_represent_wave * 0.05;
        }
        
        vec2 uv_poster = getContainUv(uv + poster_offset + u_poster_crop, u_resolution, u_res_poster);
        // Scale down slightly to fit well, apply beat zoom, and apply poster zoom level
        uv_poster = (uv_poster - 0.5) * ((1.02 - current_zoom * u_poster_zoom_weight) / u_poster_zoom_level) + 0.5;
        
        vec4 col_poster = vec4(0.0);
        if (uv_poster.x >= 0.0 && uv_poster.x <= 1.0 && uv_poster.y >= 0.0 && uv_poster.y <= 1.0) {
            vec2 uv_poster_r = uv_poster + vec2(shift + transition_glitch * 0.05, 0.0);
            vec2 uv_poster_b = uv_poster - vec2(shift + transition_glitch * 0.05, 0.0);
            
            // Add RGB split recoil for Signal Glitch
            if (u_visual_mode == 0 && u_enable_rgb_split > 0.5) {
                uv_poster_r.x += u_represent_wave * 0.02;
                uv_poster_b.x -= u_represent_wave * 0.02;
            }
            
            col_poster.r = texture2D(u_tex_poster, uv_poster_r).r;
            col_poster.g = texture2D(u_tex_poster, uv_poster).g;
            col_poster.b = texture2D(u_tex_poster, uv_poster_b).b;
            col_poster.a = texture2D(u_tex_poster, uv_poster).a;
            col_poster.a *= getSoftEdge(uv_poster, u_res_poster, u_poster_softness);
            
            // Fade in
            col_poster.a *= poster_fade;
            
            // Slightly reduce poster visibility during buildup
            col_poster.a *= (1.0 - u_buildup * 0.15);
            col_poster.a *= u_layer_visibility.y;
        }

        // Overlay (Accents, subtle texture changes)
        // Movement is minimal, tied to groove, with occasional jumps
        float overlay_age = u_time - u_last_overlay_change;
        vec2 overlay_jump = vec2(0.0);
        if (u_motion_amount > 0.5 && step(0.95, rand(vec2(floor(u_time * 2.0), 1.0))) > 0.5) {
            overlay_jump = vec2(rand(vec2(u_time, 1.0)) - 0.5, rand(vec2(1.0, u_time)) - 0.5) * 0.5;
        }
        
        vec2 overlay_offset = vec2(cos(u_time * 0.1) * 0.005, sin(u_time * 0.08) * 0.005) * effect_mult * u_motion_amount;
        
        float overlay_zoom = current_zoom;
        if (u_visual_mode == 0) {
            // Overlay reacts differently to bounce (more snappy, less heavy)
            overlay_offset.y -= u_represent_pulse * 0.04;
            overlay_zoom += u_represent_wave * 0.2; // Recoil expands overlay
        }
        
        vec2 uv_overlay = getContainUv(uv + overlay_offset + overlay_jump, u_resolution, u_res_overlay);
        // Scale down more (logos should be tasteful), and apply minimal beat zoom
        uv_overlay = (uv_overlay - 0.5) * (1.5 - overlay_zoom * u_overlay_zoom_weight) + 0.5;
        
        // Glitch distortion on overlay
        if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
            uv_overlay.x += (rand(vec2(uv_overlay.y * 10.0, u_time)) - 0.5) * 0.05 * u_glitch_intensity;
        }
        
        vec4 col_overlay = vec4(0.0);
        if (u_layer_visibility.z > 0.5 && u_overlay_enabled > 0.5) {
            if (uv_overlay.x >= 0.0 && uv_overlay.x <= 1.0 && uv_overlay.y >= 0.0 && uv_overlay.y <= 1.0) {
                col_overlay = texture2D(u_tex_overlay, uv_overlay);
                col_overlay.a *= getSoftEdge(uv_overlay, u_res_overlay, u_overlay_softness);
                
                col_overlay = applyOverlayTransparency(col_overlay, u_overlay_trans_mode, u_overlay_opacity);
                
                // Occasional overlay accent based on groove/randomness
                float slow_pulse = sin(u_time * 0.2) * sin(u_time * 0.33);
                float overlay_accent = smoothstep(0.6, 1.0, sin(u_time * 0.5 + u_bass * 2.0) * slow_pulse);
                col_overlay.a *= 0.3 + 0.7 * overlay_accent; // Base 30%, spikes to 100% occasionally
                
                // Slightly reduce overlay intensity during buildup
                col_overlay.a *= (1.0 - u_buildup * 0.2);
            }
        }

        // Logo Layer
        vec2 logo_jump = vec2(0.0);
        if (u_motion_amount > 0.5 && step(0.98, rand(vec2(floor(u_time * 4.0), 2.0))) > 0.5) {
            logo_jump = vec2(rand(vec2(u_time, 2.0)) - 0.5, rand(vec2(2.0, u_time)) - 0.5) * 0.8;
        }
        
        if (u_visual_mode == 0) {
            // Logo bounce (very snappy, sharp)
            logo_jump.y -= u_represent_pulse * 0.06;
            logo_jump.x += u_represent_wave * 0.03;
        }
        
        vec2 uv_logo = getContainUv(uv + logo_jump, u_resolution, u_res_logo);
        
        // Glitch distortion on logo
        if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
            uv_logo.x += (rand(vec2(uv_logo.y * 20.0, u_time)) - 0.5) * 0.1 * u_glitch_intensity;
        }
        
        float logo_age = u_time - u_last_overlay_change;
        float logo_fade = smoothstep(0.0, 0.5, logo_age);
        
        vec4 col_logo = vec4(0.0);
        if (uv_logo.x >= 0.0 && uv_logo.x <= 1.0 && uv_logo.y >= 0.0 && uv_logo.y <= 1.0) {
            col_logo = texture2D(u_tex_logo, uv_logo);
            
            if (u_visual_mode == 0) {
                // Signal Glitch: Sharp scale bounce
                float logoPulse = 1.0 + u_represent_pulse * 0.1 - u_represent_wave * 0.05;
                vec2 pulsedUv = (uv_logo - 0.5) / logoPulse + 0.5;
                if (pulsedUv.x >= 0.0 && pulsedUv.x <= 1.0 && pulsedUv.y >= 0.0 && pulsedUv.y <= 1.0) {
                    col_logo = texture2D(u_tex_logo, pulsedUv);
                }
            } else if (u_visual_mode == 2) {
                // REPRESENT MODE: Enhanced Logo
                // Subtle scaling pulse
                float logoPulse = 1.0 + u_bass * 0.05 * u_represent_pulse;
                vec2 pulsedUv = (uv_logo - 0.5) / logoPulse + 0.5;
                if (pulsedUv.x >= 0.0 && pulsedUv.x <= 1.0 && pulsedUv.y >= 0.0 && pulsedUv.y <= 1.0) {
                    col_logo = texture2D(u_tex_logo, pulsedUv);
                }
                
                // Logo Glow
                float logoGlow = u_represent_pulse * 0.5 + u_bass * 0.5;
                col_logo.rgb += col_logo.rgb * logoGlow * 0.5;
                
                // Light pass sweep
                float sweepPos = fract(u_time * 0.3);
                float sweep = smoothstep(0.1, 0.0, abs(uv_logo.x - sweepPos));
                col_logo.rgb += vec3(1.0) * sweep * 0.3;
            }
            
            col_logo.a *= u_layer_visibility.w;
            col_logo.a *= logo_fade; // Smooth transition
        }

        // Flash Layer
        vec2 uv_flash = getContainUv(uv, u_resolution, u_res_flash);
        vec4 col_flash = vec4(0.0);
        if (uv_flash.x >= 0.0 && uv_flash.x <= 1.0 && uv_flash.y >= 0.0 && uv_flash.y <= 1.0) {
            col_flash = texture2D(u_tex_flash, uv_flash);
            col_flash.a *= u_drop_pulse; // Only visible during peaks/drops
        }

        // Blend
        vec4 col = col_bg;
        
        if (u_visual_mode == 4) {
            // KALEIDOSCOPE MODE (4) - Repaired & Rebalanced
            float sides = u_lava_state;
            float shape_type = u_lava_next_state;
            float shape_morph = u_lava_mix;
            float mirror_depth = u_lava_intensity;
            float tunnel_depth = u_lava_reveal;
            float rotation_angle = u_lava_transformation; // Integrated angle from JS
            float center_lock = u_lava_is_logo;
            float center_pulse = u_represent_pulse;
            float shimmer = u_represent_wave;
            
            // 0. Rotation: Subtle & Slow
            // We use the integrated angle but add a tiny time-based drift for life
            float slow_rotation = rotation_angle + u_time * 0.005;
            
            vec2 k_uv = uv - 0.5;
            float r = length(k_uv);
            
            // A. RIPPLE (Radial wave movement)
            // Pattern breathing from center outward, driven by shimmer/highs
            float ripple_freq = 10.0 + u_high * 10.0;
            float ripple_speed = 1.0;
            float ripple_amp = 0.012 * (0.3 + shimmer * 0.7);
            float ripple = sin(r * ripple_freq - u_time * ripple_speed) * ripple_amp;
            r += ripple;
            
            float a = atan(k_uv.y, k_uv.x) + slow_rotation;
            
            // 1. Radial Symmetry & Mirroring
            float tau = 6.283185;
            float sides_safe = max(3.0, sides);
            
            // B. REASSEMBLY (Internal pieces reorganize)
            // Modulate slice angle with mids for structural shifting
            float reassembly = sin(u_time * 0.08) * 0.015 + u_mid * 0.04;
            float slice = (tau / sides_safe) * (1.0 + reassembly);
            
            // Center Lock: Reduces reassembly and rotation if active
            if (center_lock > 0.5) {
                slice = tau / sides_safe;
            }
            
            float angle_in_slice = mod(a, slice);
            float mirror_a = abs(angle_in_slice - slice * 0.5);
            
            // D. INTERLOCKING (Shapes slide into each other)
            // Subtle angular offset based on radius and mids
            mirror_a += sin(r * 4.0 - u_time * 0.25) * 0.025 * u_mid;
            
            // C. BOUNCE (Elastic pulse with groove)
            // Internal forms pulse and rebound with kick
            float bounce = 1.0 + sin(u_time * 0.35) * 0.01 + u_kick * 0.08;
            
            // 2. Spatial Tunnel & Breathing
            float tunnel_zoom = 1.0 + fract(tunnel_depth * 0.1) * 1.5;
            float radial_zoom = (0.8 + center_pulse * 0.3) * tunnel_zoom * bounce;
            radial_zoom = max(0.05, radial_zoom);
            
            // E. PATTERN DRIFT (Internal migration)
            // Slow internal migration of image-derived shapes
            vec2 internal_drift = vec2(
                sin(u_time * 0.03 + u_bass * 0.15),
                cos(u_time * 0.05 + u_bass * 0.1)
            ) * 0.07;
            
            // Parallax offset based on radius
            vec2 drift_parallax = u_poster_crop * (1.0 + r * 0.3);
            
            // 4. Coordinate Transformation
            vec2 polar_uv = vec2(cos(mirror_a), sin(mirror_a)) * r;
            polar_uv /= radial_zoom;
            polar_uv += drift_parallax + internal_drift;
            
            // 5. Shape Family Evolution (Dancing internal pieces)
            float shape_field = 0.0;
            vec2 shape_uv = (polar_uv - 0.5) * 2.0;
            
            if (u_enable_noise > 0.5) {
                // SHAPE MORPH enabled
                float morph_speed = u_time * 0.4;
                if (shape_type < 0.5) {
                    // OVALS
                    shape_field = length(shape_uv * vec2(1.0, 0.5 + shape_morph));
                } else if (shape_type < 1.5) {
                    // BLOBS
                    shape_field = length(shape_uv) + sin(atan(shape_uv.y, shape_uv.x) * 5.0 + morph_speed) * 0.2 * shape_morph;
                } else if (shape_type < 2.5) {
                    // RECTS
                    vec2 q = abs(shape_uv) - vec2(0.5 + shape_morph * 0.5);
                    shape_field = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
                } else {
                    // STRIPES
                    shape_field = abs(shape_uv.x) + sin(shape_uv.y * 10.0 + morph_speed) * 0.1 * shape_morph;
                }
                polar_uv += shape_uv * (1.0 - smoothstep(0.0, 0.1, abs(shape_field - 0.5))) * 0.03;
            }
            
            // 6. Layered Compositing
            vec4 k_poster = texture2D(u_tex_poster, polar_uv + 0.5);
            
            // Add shimmer detail
            float detail_noise = vnoise(vec3(polar_uv * 15.0, u_time * 0.5)) * shimmer;
            k_poster.rgb += detail_noise * 0.15;
            
            // Center-out expansion mask
            float center_mask = smoothstep(0.0, 0.7, r * (1.0 + center_pulse * 0.5));
            
            // Multi-layer depth (VHS toggle as "Multi-Layer")
            if (u_enable_vhs > 0.5) {
                // Secondary layer with different interlocking drift
                float r2 = r * 1.25;
                float mirror_a2 = mirror_a + sin(u_time * 0.15) * 0.12;
                vec2 polar_uv2 = vec2(cos(mirror_a2), sin(mirror_a2)) * r2;
                polar_uv2 /= radial_zoom * 1.15;
                polar_uv2 += drift_parallax * 0.7 + internal_drift * -0.6;
                
                vec4 layer2 = texture2D(u_tex_poster, polar_uv2 + 0.5);
                k_poster = mix(k_poster, layer2, 0.45 * (1.0 - center_mask));
            }
            
            // Merge Overlay into the pattern
            if (u_layer_visibility.z > 0.5 && u_overlay_enabled > 0.5) {
                if (u_enable_rgb_split > 0.5) {
                    // OVERLAY MERGE
                    vec2 overlay_k_uv = getContainUv(polar_uv + 0.5, u_resolution, u_res_overlay);
                    vec4 mirrored_overlay = texture2D(u_tex_overlay, overlay_k_uv);
                    mirrored_overlay = applyOverlayTransparency(mirrored_overlay, u_overlay_trans_mode, u_overlay_opacity);
                    k_poster = mix(k_poster, mirrored_overlay, mirrored_overlay.a * 0.5);
                } else {
                    col = mix(col, col_overlay, col_overlay.a);
                }
            }
            
            // Final Kaleidoscope Color
            float mirror_mix = max(0.15, mirror_depth);
            col = mix(col, k_poster, mirror_mix);

            // Depth Logo (Logo appears in front of the tunnel)
            if (col_logo.a > 0.01) {
                if (u_enable_flicker > 0.5) {
                    // DEPTH LOGO
                    vec2 logo_parallax = u_poster_crop * 0.15 + vec2(sin(u_time * 0.2), cos(u_time * 0.25)) * 0.02;
                    vec2 uv_logo_spatial = getContainUv(uv + logo_parallax, u_resolution, u_res_logo);
                    vec4 spatial_logo = texture2D(u_tex_logo, uv_logo_spatial);
                    
                    // Logo pulse and glow
                    float logo_glow = center_pulse * 0.4;
                    spatial_logo.rgb += spatial_logo.rgb * logo_glow;
                    
                    col.rgb = mix(col.rgb, spatial_logo.rgb, spatial_logo.a * u_layer_visibility.w);
                } else {
                    col.rgb = mix(col.rgb, col_logo.rgb, col_logo.a);
                }
            }
        }
        
        if (u_visual_mode != 2 && u_visual_mode != 4) {
            // Add darkened Poster cover to create a thematic backdrop
            col.rgb += col_poster_bg.rgb * 0.5; 
            // Alpha blend Poster
            col.rgb = mix(col.rgb, col_poster.rgb, col_poster.a);
            // Screen blend Overlay
            col.rgb = 1.0 - (1.0 - col.rgb) * (1.0 - col_overlay.rgb * col_overlay.a * 0.8);
        }
        
        // Flash Blend
        float isDark = step(0.2, rand(vec2(floor(u_time * 4.0), 1.0)));
        if (isDark > 0.5) {
            // Multiply blend for dark flash
            col.rgb = mix(col.rgb, col.rgb * (1.0 - col_flash.rgb), col_flash.a);
        } else {
            // Screen blend for bright flash
            col.rgb = 1.0 - (1.0 - col.rgb) * (1.0 - col_flash.rgb * col_flash.a);
        }

        // Color Mode
        float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        
        if (u_visual_mode == 0) {
            // Signal Glitch Colors
            if (u_color_mode == 0) { // mostly-mono
                col.rgb = mix(vec3(gray), col.rgb, 0.05 + u_vol * 0.1);
            } else if (u_color_mode == 1) { // mono-accent
                float burst = step(0.85, u_vol) * step(0.8, rand(vec2(u_time, 2.0)));
                col.rgb = mix(vec3(gray), col.rgb, 0.1 + burst * 0.7);
            } else if (u_color_mode == 2) { // mixed
                col.rgb = mix(vec3(gray), col.rgb, 0.4 + u_vol * 0.3);
            } else if (u_color_mode == 3) { // spectral-rgb
                float burst = step(0.85, rand(floor(uv * 30.0) + u_time)) * u_vol;
                vec3 saturated = col.rgb * col.rgb * 2.0;
                saturated.r *= 1.0 + u_kick * 0.5;
                saturated.g *= 1.0 + u_hat * 0.5;
                saturated.b *= 1.0 + u_bass * 0.5;
                col.rgb = mix(col.rgb, clamp(saturated, 0.0, 1.0), 0.2 + burst * 0.5);
            }
        } else if (u_visual_mode == 3) {
            // CONTOUR Mode: Structural, Graphic, Spatial
            float reassembly = u_lava_next_state;
            float stripCount = u_lava_state;
            float globalEnergy = u_lava_transformation;
            float bounce = u_represent_pulse;
            float planeShift = u_represent_wave_color;
            float reliefDepth = u_lava_intensity;
            
            // 0. Lifecycle & Visibility Cycle
            float cycleTime = u_time * 0.2;
            float visibilityCycle = 0.5 + 0.5 * sin(cycleTime);
            float strongPhase = smoothstep(0.6, 0.9, visibilityCycle);
            float partialPhase = smoothstep(0.2, 0.6, visibilityCycle) * (1.0 - strongPhase);
            float clearPhase = 1.0 - partialPhase - strongPhase;
            
            // 1. Structural Sampling
            vec2 structuralUv = uv;
            
            // Sample image with structural UVs
            vec2 uv_poster_struct = getContainUv(structuralUv + u_poster_crop, u_resolution, u_res_poster);
            uv_poster_struct = (uv_poster_struct - 0.5) * (1.0 / u_poster_zoom_level) + 0.5;
            
            if (uv_poster_struct.x >= 0.0 && uv_poster_struct.x <= 1.0 && uv_poster_struct.y >= 0.0 && uv_poster_struct.y <= 1.0) {
                col = texture2D(u_tex_poster, uv_poster_struct);
                col.a *= getSoftEdge(uv_poster_struct, u_res_poster, u_poster_softness);
            } else {
                col = col_poster_bg;
            }
            
            float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
            
            // 2. Structural Patterns (Image-Derived)
            // Contour Lines (Depth Relief)
            float contourScale = 8.0 + u_bass * 12.0 * globalEnergy;
            float contourLines = abs(fract(lum * contourScale + u_time * 0.05) - 0.5) * 2.0;
            contourLines = smoothstep(0.35, 0.45, contourLines);
            
            // Structural Hatch (Replacing Dot Raster)
            float hatchScale = 40.0 + u_represent_wave * 60.0;
            float hatchLines = sin(structuralUv.y * hatchScale + structuralUv.x * hatchScale * 0.5);
            float hatchThreshold = mix(0.9, 0.1, lum);
            float structuralHatch = smoothstep(hatchThreshold - 0.1, hatchThreshold + 0.1, hatchLines);
            
            // 3. Color Modes (Integrated with Visibility Cycle)
            vec3 finalCol = col.rgb;
            
            if (u_color_mode == 0) { // print-black
                float graphic = mix(structuralHatch, contourLines, 0.4);
                vec3 bw = vec3(smoothstep(0.3, 0.7, lum));
                finalCol = mix(bw, vec3(graphic), strongPhase * 0.85);
            } else if (u_color_mode == 1) { // topo-relief
                vec3 base = vec3(0.04, 0.06, 0.08);
                vec3 accent = vec3(0.95, 0.85, 0.65);
                vec3 topo = mix(base, accent * (0.5 + lum * 0.5), contourLines);
                finalCol = mix(col.rgb, topo, partialPhase * 0.4 + strongPhase);
            } else { // spectral-contour
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.0, 0.33, 0.67);
                vec3 pal = a + b * cos(6.28318 * (c * lum + d + u_time * 0.04));
                vec3 spectral = mix(pal * 0.2, pal, contourLines);
                finalCol = mix(col.rgb, spectral, partialPhase * 0.3 + strongPhase * 0.95);
            }
            
            col.rgb = mix(col.rgb, finalCol, 1.0 - clearPhase * 0.6);
            
            // 4. Structural Shards (Replacing Random Dots)
            if (u_lava_reveal > 0.05) {
                vec2 shardId = floor(uv * 4.0);
                float shard = step(0.97 - u_lava_reveal * 0.03, rand(shardId + floor(u_time * 4.0)));
                col.rgb = mix(col.rgb, vec3(1.0), shard * strongPhase * 0.7);
            }
            
            col.a *= u_layer_visibility.y;
        } else if (u_visual_mode == 1) {
            // Lava Space Colors & Material Behavior
            float t = u_time * 0.2;
            float blobDynamics = u_enable_blob_dynamics;
            float field = getLavaField(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
            vec3 normal = getLavaNormal(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
            
            // Asset Type Distinction via Logo Alpha
            float isLogo = col_logo.a;
            float transStrength = mix(u_lava_transformation, u_lava_transformation * 0.6, isLogo);
            
            // Image Abstraction vs Logo Stylization
            if (isLogo > 0.1) {
                // LOGOS: Molten stylization, glowing plastic / liquid acrylic feel
                // Preserve silhouette and key contours
                vec3 moltenCol = col.rgb * (1.2 + u_vol * 0.3);
                col.rgb = mix(col.rgb, moltenCol, transStrength * 0.4);
            } else {
                // PHOTOS: Fluid abstraction, soft posterized masses
                vec3 posterizedCol = floor(col.rgb * 4.0) / 4.0;
                col.rgb = mix(col.rgb, posterizedCol, transStrength * 0.7);
            }
            
            // 3D Shading - Refined for glossy liquid look
            vec3 lightDir = normalize(vec3(1.0, 1.5, 2.5));
            vec3 viewDir = vec3(0.0, 0.0, 1.0);
            float diff = max(dot(normal, lightDir), 0.0);
            
            // Sharper, more glossy specular
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(reflectDir, viewDir), 0.0), 64.0);
            
            // Fresnel effect for edge highlights
            float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
            
            // Inner shading / Ambient Occlusion simulation
            float ao = smoothstep(0.0, 0.8, abs(field));
            
            // Surface Detail (Ripples & Flow)
            // Logos get more refined edge shimmer
            float detailScale = mix(15.0, 30.0, isLogo);
            float surfaceDetail = sin(field * detailScale + u_time * 1.5) * 0.03 * (1.0 + u_high);
            field += surfaceDetail;

            // Retro-futuristic 70s space-age energy: Add a subtle "glow" based on field
            // Logos get stronger bloom/glow
            float glowBase = mix(0.4, 0.8, isLogo);
            float glow = smoothstep(0.2, 0.9, abs(field)) * glowBase * (1.0 + u_vol);
            
            // Add halation (warm glow around bright edges)
            float halation = smoothstep(0.6, 1.0, abs(field)) * 0.3 * (1.0 + u_vol);
            vec3 halationColor = vec3(1.0, 0.45, 0.15) * halation;

            if (u_color_mode == 0) { // cosmic-flow
                vec3 color1 = vec3(0.01, 0.03, 0.15); // Deep space blue
                vec3 color2 = vec3(0.05, 0.5, 0.7); // Cyan
                vec3 color3 = vec3(0.35, 0.05, 0.6); // Violet
                
                // Smooth organic blending
                float blend1 = smoothstep(-0.6, 0.4, field + gray * 0.15);
                float blend2 = smoothstep(-0.1, 0.9, field - gray * 0.15);
                
                vec3 mappedColor = mix(color1, color2, blend1);
                mappedColor = mix(mappedColor, color3, blend2);
                
                // Material shading
                mappedColor *= (0.4 + diff * 0.6) * ao;
                mappedColor += vec3(0.8, 0.9, 1.0) * spec * 0.7 * (1.0 + u_high);
                mappedColor += vec3(0.4, 0.6, 1.0) * fresnel * 0.5;
                
                // Subtle glow
                mappedColor += color2 * glow;
                mappedColor += halationColor;
                
                // Final mix with original image to preserve recognizability
                // The mix amount is driven by the transformation cycle
                // Logos preserve recognizability more strongly
                float mixAmount = smoothstep(0.0, 0.7, abs(field)) * transStrength;
                mixAmount *= mix(1.0, 0.7, isLogo);
                
                col.rgb = mix(col.rgb, mappedColor, mixAmount);
            } else if (u_color_mode == 1) { // dual-lava
                vec3 color1 = vec3(0.7, 0.1, 0.0); // Deep Red
                vec3 color2 = vec3(1.0, 0.55, 0.0); // Amber
                
                float midFreq = (u_clap + u_vol) * 0.5;
                
                // Smooth organic blending
                float blend = smoothstep(-0.7, 0.7, field + sin(u_time * 0.4) * 0.15);
                
                vec3 mappedColor = mix(color1, color2, blend);
                
                // Material shading
                mappedColor *= (0.4 + diff * 0.6) * ao;
                mappedColor += vec3(1.0, 0.95, 0.8) * spec * 0.8 * (1.0 + midFreq);
                mappedColor += vec3(1.0, 0.6, 0.2) * fresnel * 0.4;
                
                // Core glow
                mappedColor += color2 * glow * 1.2;
                mappedColor += halationColor * 1.5;
                
                // Final mix with original image
                float mixAmount = smoothstep(0.0, 0.7, abs(field)) * transStrength;
                mixAmount *= mix(1.0, 0.7, isLogo);
                
                col.rgb = mix(col.rgb, mappedColor, mixAmount);
            } else if (u_color_mode == 2) { // spectral-flow
                float highFreq = (u_hat + u_high) * 0.5;
                
                // Cosine palette - more cinematic
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(0.8, 0.8, 0.8);
                vec3 d = vec3(0.0, 0.33, 0.67);
                
                vec3 mappedColor = a + b * cos(6.28318 * (c * (field * 0.4 + gray * 0.4) + d + u_time * 0.08));
                
                // Material shading
                mappedColor *= (0.5 + diff * 0.5) * ao;
                mappedColor += vec3(1.0) * spec * 0.6 * (1.0 + highFreq);
                mappedColor += mappedColor * fresnel * 0.4;
                
                // Add spectral glow
                mappedColor += mappedColor * glow;
                mappedColor += halationColor;
                
                // Final mix with original image
                float mixAmount = smoothstep(0.0, 0.7, abs(field)) * transStrength;
                mixAmount *= mix(1.0, 0.7, isLogo);
                
                col.rgb = mix(col.rgb, mappedColor, mixAmount);
            }
        }

        // --- Internal Subtle Surface Effects System ---
        // Driven by high frequencies to make the image surface feel alive
        float surfaceActivity = u_high * 0.5 + u_hat * 0.5 + u_buildup * 0.4;
        
        float randVar = rand(uv + fract(u_time * 0.5)); // Small random variation
        
        // 1. Fine Grain
        float fineGrain = (randVar - 0.5) * 0.03 * (0.2 + surfaceActivity);
        col.rgb += fineGrain;
        
        // 2. Micro Flicker
        float microFlicker = (rand(vec2(u_time * 20.0, randVar)) - 0.5) * 0.02 * surfaceActivity;
        col.rgb += microFlicker;
        
        // 3. Thin Horizontal Lines (Micro-VHS)
        float microLines = (sin(uv.y * 1200.0 - u_time * 15.0) * 0.5 + 0.5) * 0.015 * surfaceActivity;
        col.rgb -= microLines;
        
        // 4. Slight Contrast Variation
        col.rgb = mix(vec3(0.5), col.rgb, 1.0 + (surfaceActivity * 0.05));

        // Scanlines
        if (u_enable_vhs > 0.5) {
            float scanline = sin(uv.y * 800.0 + u_time * 5.0) * 0.015 * effect_mult;
            scanline += (rand(uv + u_time) - 0.5) * 0.02 * u_hat * effect_mult;
            col.rgb -= scanline;
        }

        // Noise (affected by high)
        if (u_enable_noise > 0.5) {
            float baseNoise = (rand(uv + u_time) - 0.5) * 0.03 * effect_mult * (1.0 + u_high);
            float extraNoise = (rand(uv + u_time * 2.0) - 0.5) * 0.2 * noiseBurst;
            col.rgb += baseNoise + extraNoise;
        }

        // Flicker (Darker, subtractive)
        if (u_enable_flicker > 0.5) {
            float baseFlicker = sin(u_time * 10.0) * 0.01 * effect_mult * u_flicker_amount;
            col.rgb -= (baseFlicker + abs(flickerBurst) * 0.2 + u_hat * 0.02 * effect_mult * u_flicker_amount);
        }

        // Dark Impact System: Kick adds pressure/compression (darkening and contrast)
        // Remove bright flashes
        float impact = u_kick + u_drop_pulse * 1.5; // Drop pulse hits harder
        col.rgb -= impact * 0.08 * effect_mult; // Slight darkening on kick/drop
        col.rgb = max(vec3(0.0), col.rgb); // Prevent negative colors before contrast
        col.rgb = mix(col.rgb, smoothstep(0.1, 0.9, col.rgb), impact * 0.3 * effect_mult); // Contrast push
        
        // Buildup contrast
        col.rgb = mix(col.rgb, smoothstep(0.05, 0.95, col.rgb), u_buildup * 0.15);

        // Final Logo Blend (Ensure visibility across all modes)
        if (u_visual_mode == 4) {
            col.rgb = mix(col.rgb, col_logo.rgb, col_logo.a * 0.5);
        } else {
            col.rgb = mix(col.rgb, col_logo.rgb, col_logo.a);
        }

        // Vignette
        float dist = distance(vUv, vec2(0.5));
        col.rgb *= smoothstep(0.9, 0.3, dist);

        // Final Safety Fallback: Never allow pure black if assets exist
        if (length(col.rgb) < 0.01 && (u_layer_visibility.x > 0.1 || u_layer_visibility.y > 0.1)) {
            // Fallback to a dimmed version of the poster if everything else failed
            vec2 fallbackUv = getContainUv(originalUv, u_resolution, u_res_poster);
            vec4 fallbackSample = texture2D(u_tex_poster, fallbackUv);
            col.rgb = mix(col.rgb, fallbackSample.rgb * 0.5, fallbackSample.a * u_layer_visibility.y);
        }

        gl_FragColor = vec4(col.rgb, 1.0);
      }
    `);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      u_tex_bg: gl.getUniformLocation(this.program, 'u_tex_bg'),
      u_tex_poster: gl.getUniformLocation(this.program, 'u_tex_poster'),
      u_tex_overlay: gl.getUniformLocation(this.program, 'u_tex_overlay'),
      u_tex_logo: gl.getUniformLocation(this.program, 'u_tex_logo'),
      u_tex_flash: gl.getUniformLocation(this.program, 'u_tex_flash'),
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_global_effects: gl.getUniformLocation(this.program, 'u_global_effects'),
      u_vol: gl.getUniformLocation(this.program, 'u_vol'),
      u_mid: gl.getUniformLocation(this.program, 'u_mid'),
      u_high: gl.getUniformLocation(this.program, 'u_high'),
      u_low: gl.getUniformLocation(this.program, 'u_low'),
      u_zoom: gl.getUniformLocation(this.program, 'u_zoom'),
      u_last_bg_change: gl.getUniformLocation(this.program, 'u_last_bg_change'),
      u_last_poster_change: gl.getUniformLocation(this.program, 'u_last_poster_change'),
      u_last_overlay_change: gl.getUniformLocation(this.program, 'u_last_overlay_change'),
      u_buildup: gl.getUniformLocation(this.program, 'u_buildup'),
      u_drop_pulse: gl.getUniformLocation(this.program, 'u_drop_pulse'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_res_bg: gl.getUniformLocation(this.program, 'u_res_bg'),
      u_res_poster: gl.getUniformLocation(this.program, 'u_res_poster'),
      u_res_overlay: gl.getUniformLocation(this.program, 'u_res_overlay'),
      u_res_logo: gl.getUniformLocation(this.program, 'u_res_logo'),
      u_res_flash: gl.getUniformLocation(this.program, 'u_res_flash'),
      u_visual_mode: gl.getUniformLocation(this.program, 'u_visual_mode'),
      u_color_mode: gl.getUniformLocation(this.program, 'u_color_mode'),
      u_glitch_type: gl.getUniformLocation(this.program, 'u_glitch_type'),
      u_glitch_time: gl.getUniformLocation(this.program, 'u_glitch_time'),
      u_glitch_intensity: gl.getUniformLocation(this.program, 'u_glitch_intensity'),
      u_kick: gl.getUniformLocation(this.program, 'u_kick'),
      u_clap: gl.getUniformLocation(this.program, 'u_clap'),
      u_hat: gl.getUniformLocation(this.program, 'u_hat'),
      u_bass: gl.getUniformLocation(this.program, 'u_bass'),
      u_enable_glitch: gl.getUniformLocation(this.program, 'u_enable_glitch'),
      u_enable_vhs: gl.getUniformLocation(this.program, 'u_enable_vhs'),
      u_enable_curvature: gl.getUniformLocation(this.program, 'u_enable_curvature'),
      u_enable_noise: gl.getUniformLocation(this.program, 'u_enable_noise'),
      u_enable_flicker: gl.getUniformLocation(this.program, 'u_enable_flicker'),
      u_enable_rgb_split: gl.getUniformLocation(this.program, 'u_enable_rgb_split'),
      u_enable_drift_offset: gl.getUniformLocation(this.program, 'u_enable_drift_offset'),
      u_enable_blob_dynamics: gl.getUniformLocation(this.program, 'u_enable_blob_dynamics'),
      u_overlay_enabled: gl.getUniformLocation(this.program, 'u_overlay_enabled'),
      u_overlay_trans_mode: gl.getUniformLocation(this.program, 'u_overlay_trans_mode'),
      u_overlay_opacity: gl.getUniformLocation(this.program, 'u_overlay_opacity'),
      u_flicker_amount: gl.getUniformLocation(this.program, 'u_flicker_amount'),
      u_motion_amount: gl.getUniformLocation(this.program, 'u_motion_amount'),
      u_layer_visibility: gl.getUniformLocation(this.program, 'u_layer_visibility'),
      u_poster_softness: gl.getUniformLocation(this.program, 'u_poster_softness'),
      u_overlay_softness: gl.getUniformLocation(this.program, 'u_overlay_softness'),
      u_poster_white_transparency: gl.getUniformLocation(this.program, 'u_poster_white_transparency'),
      u_overlay_white_transparency: gl.getUniformLocation(this.program, 'u_overlay_white_transparency'),
      u_poster_zoom_weight: gl.getUniformLocation(this.program, 'u_poster_zoom_weight'),
      u_poster_zoom_level: gl.getUniformLocation(this.program, 'u_poster_zoom_level'),
      u_poster_crop: gl.getUniformLocation(this.program, 'u_poster_crop'),
      u_overlay_zoom_weight: gl.getUniformLocation(this.program, 'u_overlay_zoom_weight'),
      u_lava_state: gl.getUniformLocation(this.program, 'u_lava_state'),
      u_lava_next_state: gl.getUniformLocation(this.program, 'u_lava_next_state'),
      u_lava_mix: gl.getUniformLocation(this.program, 'u_lava_mix'),
      u_lava_intensity: gl.getUniformLocation(this.program, 'u_lava_intensity'),
      u_lava_reveal: gl.getUniformLocation(this.program, 'u_lava_reveal'),
      u_lava_transformation: gl.getUniformLocation(this.program, 'u_lava_transformation'),
      u_lava_is_logo: gl.getUniformLocation(this.program, 'u_lava_is_logo'),
      u_represent_pulse: gl.getUniformLocation(this.program, 'u_represent_pulse'),
      u_represent_wave: gl.getUniformLocation(this.program, 'u_represent_wave'),
      u_represent_wave_color: gl.getUniformLocation(this.program, 'u_represent_wave_color'),
      u_beat_phase: gl.getUniformLocation(this.program, 'u_beat_phase'),
      u_bar_phase: gl.getUniformLocation(this.program, 'u_bar_phase'),
      u_energy_trend: gl.getUniformLocation(this.program, 'u_energy_trend'),
    };

    gl.uniform1i(this.uniforms.u_tex_bg, 0);
    gl.uniform1i(this.uniforms.u_tex_poster, 1);
    gl.uniform1i(this.uniforms.u_tex_overlay, 2);
    gl.uniform1i(this.uniforms.u_tex_logo, 3);
    gl.uniform1i(this.uniforms.u_tex_flash, 4);
  }

  setVisualMode(mode: 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope') {
    this.visualMode = mode;
  }

  setColorMode(mode: string) {
    this.colorMode = mode;
  }

  setOptions(opts: Partial<VisualOptions>) {
    this.options = { ...this.options, ...opts };
  }

  updateAssets(assets: AssetItem[]) {
    this.assets = assets;
    this.bgAssets = assets.filter(a => a.metadata.type === 'bg');
    this.posterAssets = assets.filter(a => a.metadata.type === 'poster');
    this.overlayAssets = assets.filter(a => a.metadata.type === 'overlay');
    this.logoAssets = assets.filter(a => a.metadata.type === 'logo');
    this.flashAssets = assets.filter(a => a.metadata.type === 'flash');
    
    if (this.bgAssets.length === 0) this.bgAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.posterAssets.length === 0) this.posterAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.overlayAssets.length === 0) this.overlayAssets = [dummyAsset];
    if (this.logoAssets.length === 0) this.logoAssets = [dummyAsset];
    if (this.flashAssets.length === 0) this.flashAssets = [dummyAsset];

    // Force a re-pick of assets
    this.bgIndex = Math.floor(Math.random() * this.bgAssets.length);
    this.posterIndex = Math.floor(Math.random() * this.posterAssets.length);
    this.overlayIndex = Math.floor(Math.random() * this.overlayAssets.length);
    this.logoIndex = Math.floor(Math.random() * this.logoAssets.length);
    this.flashIndex = Math.floor(Math.random() * this.flashAssets.length);

    // Clean up unused textures
    const currentImages = new Set(assets.map(a => a.image));
    currentImages.add(dummyAsset.image);
    
    for (const [img, tex] of this.textureCache.entries()) {
      if (!currentImages.has(img)) {
        this.gl?.deleteTexture(tex);
        this.textureCache.delete(img);
      }
    }
  }

  setMacro(macro: 'buildUp' | 'tension' | 'drop' | 'extraBounce', active: boolean) {
    if (macro === 'buildUp') this.macroBuildUp = active;
    if (macro === 'tension') this.macroTension = active;
    if (macro === 'extraBounce') this.macroExtraBounce = active;
    if (macro === 'drop') {
      this.macroDrop = active;
      if (active) {
        // Trigger one-shot drop effects
        this.postDropEnergy = 1.0;
        this.dropPulse = 1.0;
        this.signalGlitchBounce += 1.5;
        this.signalGlitchRecoil += 0.5;
        this.lavaState = (this.lavaState + 1) % 3;
      }
    }
  }

  pickAsset(assets: AssetItem[], vol: number, currentIndex: number): number {
    if (!assets || assets.length === 0) return 0;
    if (assets.length === 1) return 0;
    
    let validAssets = assets.filter((a, i) => {
      if (i === currentIndex) return false; // Don't pick the same one
      if (a.metadata.behavior === 'peak') return vol > 0.8;
      return true;
    });
    if (validAssets.length === 0) validAssets = assets.filter((a, i) => i !== currentIndex);
    if (validAssets.length === 0) return 0; // Fallback if only 1 asset exists

    let totalWeight = 0;
    const weights = validAssets.map(a => {
      let w = 1;
      if (a.metadata.behavior === 'rare') w = 0.1;
      if (a.metadata.behavior === 'frequent') w = 3.0;
      totalWeight += w;
      return w;
    });

    let r = Math.random() * totalWeight;
    for (let i = 0; i < validAssets.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        return assets.indexOf(validAssets[i]);
      }
    }
    return 0;
  }

  private updateLavaSpace(context: MusicalContext) {
    if (!context) return;
    const { events, state, energyTrend, time } = context;
    if (time > this.nextLavaStateTime) {
      this.lavaState = this.lavaNextState;
      this.lavaNextState = Math.floor(Math.random() * 7);
      this.lavaMix = 0;
      this.nextLavaStateTime = time + 6.0 + Math.random() * 8.0; // Slower transitions
    }
    this.lavaMix = Math.min(1.0, this.lavaMix + 0.008);
    
    // Transformation amount driven by state and energy
    let targetTransformation = 0;
    if (state === MusicalState.BUILDING) {
      targetTransformation = 0.4 + energyTrend * 0.4;
    } else if (state === MusicalState.PRE_DROP_TENSION) {
      targetTransformation = 0.8 + Math.sin(time * 10.0) * 0.1;
    } else if (state === MusicalState.DROP_RELEASE) {
      targetTransformation = 1.0;
    } else if (state === MusicalState.GROOVE_LOCKED) {
      targetTransformation = 0.1 + events.rawKick * 0.3;
    }
    
    this.lavaTransformationAmount += (targetTransformation - this.lavaTransformationAmount) * 0.1;

    // Lava intensity reacts to kicks for "impact"
    const targetIntensity = 0.3 + events.rawKick * 0.8 + events.intensity * 0.3;
    this.lavaIntensity += (targetIntensity - this.lavaIntensity) * 0.2;

    // Reveal amount: more abstract during breakdown, more structured during groove
    const targetReveal = state === MusicalState.BREAKDOWN ? 0.3 : 0.85;
    this.lavaReveal += (targetReveal - this.lavaReveal) * 0.05;

    const gl = this.gl;
    if (gl) {
      gl.uniform1f(this.uniforms.u_lava_state, this.lavaState);
      gl.uniform1f(this.uniforms.u_lava_next_state, this.lavaNextState);
      gl.uniform1f(this.uniforms.u_lava_mix, this.lavaMix);
      gl.uniform1f(this.uniforms.u_lava_transformation, this.lavaTransformationAmount);
      gl.uniform1f(this.uniforms.u_lava_intensity, this.lavaIntensity);
      gl.uniform1f(this.uniforms.u_lava_reveal, this.lavaReveal);
      
      // Determine if we are primarily showing a logo in Lava Space
      let lavaIsLogo = 0.0;
      if (this.layerVisibility[3] > 0.5 && this.layerVisibility[1] < 0.2) {
          lavaIsLogo = 1.0;
      }
      gl.uniform1f(this.uniforms.u_lava_is_logo, lavaIsLogo);
    }
  }

  private updateContour(context: MusicalContext) {
    if (!context) return;
    const { events, features, state, time } = context;
    
    // 1. Structural Energy (Global)
    const structuralEnergy = (this.options.globalEffects * 0.5 + events.smoothedBass * 0.5) * this.options.eventDensity;
    
    // 2. Strip Offset (Bass driven)
    const targetStripOffset = events.rawBass * 0.25 * this.options.motionAmount;
    this.contourStripOffset += (targetStripOffset - this.contourStripOffset) * 0.1;
    
    // 3. Plane Shift (Mids driven)
    const targetPlaneShift = this.options.enableCurvature ? (events.rawSnare * 0.4 * this.options.motionAmount) : 0;
    this.contourPlaneShift += (targetPlaneShift - this.contourPlaneShift) * 0.15;
    
    // 4. Reassembly Logic (Phrase boundaries & Energy)
    // Reassemble during breakdown or at phrase boundaries
    let targetReassembly = 1.0;
    if (state === MusicalState.BUILDING || state === MusicalState.DROP_RELEASE) {
      targetReassembly = 0.2 + (1.0 - events.smoothedBass) * 0.5;
    }
    if (events.isPhraseBoundary) {
      targetReassembly = 1.0; // Force reassemble at boundary
    }
    this.contourReassembly += (targetReassembly - this.contourReassembly) * 0.05;
    
    // 5. Bounce & Push (Kick driven)
    const kickBounce = this.options.enableFlicker ? (events.rawKick * 0.5 * this.options.globalEffects) : 0;
    this.contourBounce = Math.max(this.contourBounce * 0.85, kickBounce);
    
    // 6. Shatter (Drop/Peak driven)
    const isDrop = state === MusicalState.DROP_RELEASE;
    const targetShatter = this.options.enableGlitch ? (isDrop ? 1.0 : events.rawSnare * 0.6) : 0;
    this.contourShatter = Math.max(this.contourShatter * 0.9, targetShatter * this.options.globalEffects);
    
    // 7. Raster Density (Highs driven)
    const targetDensity = this.options.enableVHS ? (0.2 + features.high * 1.5 * this.options.eventDensity) : 0;
    this.contourRasterDensity += (targetDensity - this.contourRasterDensity) * 0.1;

    const gl = this.gl;
    if (gl) {
      // u_lava_state -> STRIP COUNT (4 to 24)
      // u_lava_next_state -> REASSEMBLY (0-1)
      // u_lava_mix -> STRIP OFFSET
      // u_lava_intensity -> RELIEF DEPTH
      // u_lava_reveal -> SHATTER
      // u_lava_transformation -> GLOBAL ENERGY
      // u_represent_pulse -> BOUNCE
      // u_represent_wave -> RASTER DENSITY
      // u_represent_wave_color -> PLANE SHIFT
      
      const stripCount = 4.0 + Math.floor(this.options.eventDensity * 20.0);
      
      gl.uniform1f(this.uniforms.u_lava_state, stripCount);
      gl.uniform1f(this.uniforms.u_lava_next_state, this.contourReassembly);
      gl.uniform1f(this.uniforms.u_lava_mix, this.contourStripOffset);
      gl.uniform1f(this.uniforms.u_lava_intensity, this.options.globalEffects);
      gl.uniform1f(this.uniforms.u_lava_reveal, this.contourShatter);
      gl.uniform1f(this.uniforms.u_lava_transformation, structuralEnergy);
      
      gl.uniform1f(this.uniforms.u_represent_pulse, this.contourBounce);
      gl.uniform1f(this.uniforms.u_represent_wave, this.contourRasterDensity);
      gl.uniform1f(this.uniforms.u_represent_wave_color, this.contourPlaneShift);
    }
  }

  private updateRepresent(context: MusicalContext) {
    if (!context) return;
    const { events, state, time, energyTrend } = context;
    
    // Complex pulse: Multi-layered oscillation
    const basePulse = Math.sin(time * 0.5) * 0.2 + Math.sin(time * 1.2) * 0.1;
    const kickPulse = events.rawKick * 0.9;
    
    this.representPulse = Math.max(this.representPulse, kickPulse);
    this.representPulse *= 0.88; // Slightly slower decay
    
    const finalPulse = basePulse + this.representPulse + (state === MusicalState.BUILDING ? energyTrend * 0.3 : 0);
    
    if (time > this.nextRepresentEventTime) {
      this.representWave = 1.0;
      this.representWaveColor = Math.random() > 0.5 ? 1 : 0;
      this.nextRepresentEventTime = time + 5.0 + Math.random() * 5.0;
    }
    this.representWave *= 0.94;

    const gl = this.gl;
    if (gl) {
      gl.uniform1f(this.uniforms.u_represent_pulse, finalPulse);
      gl.uniform1f(this.uniforms.u_represent_wave, this.representWave);
      gl.uniform1f(this.uniforms.u_represent_wave_color, this.representWaveColor);
    }
  }

  private updateSignalGlitch(context: MusicalContext) {
    if (!context) return;
    const { events, state, energyTrend, time } = context;
    
    // Post-drop energy window
    if ((state === MusicalState.DROP_RELEASE && context.confidence.drop > 0.8 && this.conductor.shouldTrigger('post_drop_spike', 1.0, 4.0, 2.0)) || this.macroDrop) {
        this.postDropEnergy = 1.0;
    }
    this.postDropEnergy *= 0.98; // Slow decay for a short window
    
    // Post-drop bounce and recoil logic
    const isDrop = state === MusicalState.DROP_RELEASE || this.macroDrop;
    const dropMultiplier = isDrop ? 2.0 : 1.0 + this.postDropEnergy * 1.5;
    
    // Add kick impact to bounce (overshoot and settle)
    if ((events.rawKick > 0.4 && this.conductor.shouldTrigger('signal_bounce', 1.0, 0.05, 0.05)) || this.macroExtraBounce) {
        this.signalGlitchBounce += (events.rawKick || 0.8) * 0.9 * dropMultiplier;
    }
    
    // Add snare/clap impact to recoil
    if ((events.rawSnare > 0.3 && this.conductor.shouldTrigger('signal_recoil', 1.0, 0.05, 0.05)) || this.macroExtraBounce) {
        this.signalGlitchRecoil += (events.rawSnare || 0.8) * 1.1 * dropMultiplier;
    }
    
    // Elastic settling (spring-like decay)
    this.signalGlitchBounce += (0 - this.signalGlitchBounce) * 0.2;
    this.signalGlitchRecoil += (0 - this.signalGlitchRecoil) * 0.25;
    
    this.signalGlitchBounce *= 0.82;
    this.signalGlitchRecoil *= 0.78;

    // State-aware glitching
    let triggerChance = 0.95 + this.postDropEnergy * 0.1; // Increased base chance
    if (state === MusicalState.BUILDING) triggerChance = 0.8;
    if (state === MusicalState.PRE_DROP_TENSION) triggerChance = 0.6;
    
    let triggerThreshold = 0.6 - this.postDropEnergy * 0.3; // Lowered threshold for more action
    if (events.beatAccent === 3) triggerThreshold = 0.2; // 16th beat accent
    else if (events.beatAccent === 2) triggerThreshold = 0.3; // 8th beat accent
    else if (events.beatAccent === 1) triggerThreshold = 0.4; // 4th beat accent

    const densityMult = Math.max(0.05, 1.0 - this.options.eventDensity); // More aggressive density
    if (events.rawKick > triggerThreshold && this.conductor.shouldTrigger('glitch', triggerChance, 0.4 * densityMult, 0.3 * densityMult)) {
      this.glitchIntensity = 1.0 + Math.random() * 0.8 + this.postDropEnergy * 0.5; // Increased intensity
      if (events.beatAccent >= 2) this.glitchIntensity += 0.5;
      this.glitchType = Math.floor(Math.random() * 9); // Use all 9 glitch types
      if (state === MusicalState.PRE_DROP_TENSION) this.glitchType = 7; // More aggressive glitch
      if (events.beatAccent === 3) this.glitchType = 6; // Special glitch on 16th
      this.glitchDuration = 0.15 + Math.random() * 0.3;
      this.glitchTime = time;
    }
    
    this.glitchIntensity *= 0.85; // Slightly slower decay for more presence

    const gl = this.gl;
    if (gl) {
      gl.uniform1f(this.uniforms.u_glitch_intensity, this.glitchIntensity);
      gl.uniform1i(this.uniforms.u_glitch_type, this.glitchType);
      
      // Pass bounce and recoil to shader using existing uniforms
      gl.uniform1f(this.uniforms.u_represent_pulse, this.signalGlitchBounce);
      gl.uniform1f(this.uniforms.u_represent_wave, this.signalGlitchRecoil);
    }
  }

  private updateKaleidoscope(context: MusicalContext) {
    if (!context) return;
    const { events, features, time } = context;

    // 1. Rotation: Repaired curve - much slower, power-based scaling
    // 0.5 is neutral, extremes are faster but still elegant
    const motion = this.options.motionAmount;
    const curve = Math.pow(Math.abs(motion - 0.5) * 2.0, 3.0) * Math.sign(motion - 0.5);
    const baseRotationSpeed = curve * 0.015; // Max ~0.9 rad/s at extremes
    const organicRotation = Math.sin(time * 0.1) * 0.005;
    const bassRotation = events.rawBass * 0.01 * motion;
    this.kaleidoscopeRotation += (baseRotationSpeed + organicRotation + bassRotation);

    // 2. Pattern Drift: Slow offset movement (parallax feel)
    const driftSpeed = this.options.transitionSpeed * 0.02;
    this.kaleidoscopeDrift.x += Math.sin(time * 0.15) * driftSpeed;
    this.kaleidoscopeDrift.y += Math.cos(time * 0.12) * driftSpeed;

    // 3. Center Pulse & Tunnel Depth
    // Kick drives the "expansion" from center
    const kickPulse = events.rawKick * 0.4 * this.options.globalEffects;
    this.kaleidoscopeCenterPulse = Math.max(this.kaleidoscopeCenterPulse * 0.9, kickPulse);
    
    // Tunnel depth: continuous movement + bass pressure
    const tunnelSpeed = (this.options.transitionSpeed - 0.5) * 0.05;
    this.kaleidoscopeTunnelDepth += tunnelSpeed + events.rawBass * 0.03;

    // 4. Shape Morphing (Mids + Shimmer)
    // Shapes morph from oval to angular based on mids and flicker (shimmer)
    const targetMorph = (features.mid * 0.5 + features.high * 0.5 * this.options.flickerAmount) * this.options.eventDensity;
    this.kaleidoscopeShapeMorph = this.kaleidoscopeShapeMorph * 0.95 + targetMorph * 0.05;

    // 5. Shape Type Evolution
    // Change shape family occasionally or based on phrase boundaries
    if (events.isPhraseBoundary || (Math.random() < 0.002 * this.options.eventDensity)) {
      this.kaleidoscopeShapeType = (this.kaleidoscopeShapeType + 1) % 4;
    }

    const gl = this.gl;
    if (gl) {
      // Reusing lava uniforms for kaleidoscope
      // u_lava_state -> SIDES (4 to 16)
      // u_lava_next_state -> SHAPE TYPE (0-3)
      // u_lava_mix -> SHAPE MORPH (0-1)
      // u_lava_intensity -> MIRROR DEPTH / SYMMETRY
      // u_lava_reveal -> TUNNEL DEPTH (continuous)
      // u_lava_transformation -> ROTATION (continuous)
      // u_lava_is_logo -> CENTER LOCK (0 or 1)
      
      const sides = 4.0 + Math.floor(this.options.eventDensity * 12.0);
      const shimmer = features.high * this.options.flickerAmount;
      
      gl.uniform1f(this.uniforms.u_lava_state, sides);
      gl.uniform1f(this.uniforms.u_lava_next_state, this.kaleidoscopeShapeType);
      gl.uniform1f(this.uniforms.u_lava_mix, this.kaleidoscopeShapeMorph);
      gl.uniform1f(this.uniforms.u_lava_intensity, this.options.globalEffects);
      gl.uniform1f(this.uniforms.u_lava_reveal, this.kaleidoscopeTunnelDepth);
      gl.uniform1f(this.uniforms.u_lava_transformation, this.kaleidoscopeRotation);
      gl.uniform1f(this.uniforms.u_lava_is_logo, this.options.enableCurvature ? 1.0 : 0.0);
      
      // Use represent uniforms for additional params
      gl.uniform1f(this.uniforms.u_represent_pulse, this.kaleidoscopeCenterPulse);
      gl.uniform1f(this.uniforms.u_represent_wave, shimmer);
      
      // We can use u_poster_crop for drift
      gl.uniform2f(this.uniforms.u_poster_crop, this.kaleidoscopeDrift.x, this.kaleidoscopeDrift.y);
    }
  }

  render = () => {
    if (!this.running) return;
    requestAnimationFrame(this.render);

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.time += dt;

    let context: MusicalContext | null = null;
    if (this.audioAnalyzer) {
      const features = this.audioAnalyzer.getSignalFeatures(this.time);
      context = this.conductor.update(features, this.time);
      this.lastMusicalContext = context;
    }

    const vol = context?.features.vol || 0;
    const low = context?.features.low || 0;
    const mid = context?.features.mid || 0;
    const high = context?.features.high || 0;
    const kick = context?.events.rawKick || 0;
    const bass = context?.events.smoothedBass || 0;
    const snare = context?.events.rawSnare || 0;
    const hat = context?.events.rawHat || 0;
    let buildup = context?.confidence.build || 0;
    let drop = context?.confidence.drop || 0;
    
    // Apply macros
    if (this.macroBuildUp) buildup = Math.max(buildup, 0.8);
    if (this.macroTension) {
      this.glitchIntensity = Math.max(this.glitchIntensity, 0.6);
      this.glitchType = 1; // Horizontal tearing
    }
    
    // Decay drop pulse if triggered manually
    if (this.dropPulse > 0) {
      drop = Math.max(drop, this.dropPulse);
      this.dropPulse *= 0.9;
      if (this.dropPulse < 0.01) this.dropPulse = 0;
    }

    const beatPhase = context?.beatPhase || 0;
    const barPhase = context?.barPhase || 0;
    const energyTrend = context?.energyTrend || 0;

    // Update uniforms
    const gl = this.gl;
    if (!gl) return;

    // Temporary Debug Logging
    if (Math.floor(this.time * 2) % 20 === 0 && Math.random() < 0.05) { // Log occasionally
      console.log('VIZR Render State:', {
        mode: this.visualMode,
        assets: {
          bg: this.bgAssets.length,
          poster: this.posterAssets.length,
          overlay: this.overlayAssets.length,
          logo: this.logoAssets.length
        },
        visibility: this.layerVisibility,
        glitch: this.glitchIntensity > 0 ? this.glitchType : 'none'
      });
    }

    gl.uniform1f(this.uniforms.u_vol, vol);
    gl.uniform1f(this.uniforms.u_low, low);
    gl.uniform1f(this.uniforms.u_mid, mid);
    gl.uniform1f(this.uniforms.u_high, high);
    gl.uniform1f(this.uniforms.u_kick, kick);
    gl.uniform1f(this.uniforms.u_clap, snare);
    gl.uniform1f(this.uniforms.u_bass, bass);
    gl.uniform1f(this.uniforms.u_hat, hat);
    gl.uniform1f(this.uniforms.u_buildup, buildup);
    gl.uniform1f(this.uniforms.u_drop_pulse, drop);
    gl.uniform1f(this.uniforms.u_beat_phase, beatPhase);
    gl.uniform1f(this.uniforms.u_bar_phase, barPhase);
    gl.uniform1f(this.uniforms.u_energy_trend, energyTrend);

    // Mode-Specific Logic
    if (this.visualMode === 'lava-space') {
      this.updateLavaSpace(context!);
    } else if (this.visualMode === 'contour') {
      this.updateContour(context!);
    } else if (this.visualMode === 'represent') {
      this.updateRepresent(context!);
    } else if (this.visualMode === 'signal-glitch') {
      this.updateSignalGlitch(context!);
    } else if (this.visualMode === 'kaleidoscope') {
      this.updateKaleidoscope(context!);
    }
    // --- Asset Switching & Glitch Logic ---
    if (context) {
      const { events, features, state } = context;
      
      const densityMult = Math.max(0.1, 1.5 - this.options.eventDensity);
      // Phrase Boundary or High Intensity Kick triggers asset switch
      if (events.isPhraseBoundary || (events.rawKick > 0.85 && this.conductor.shouldTrigger('asset_switch', 0.8, 0.5 * densityMult, 0.5 * densityMult))) {
        const speedMult = Math.max(0.1, 2.0 - this.options.transitionSpeed * 1.9);
        
        if (Math.random() > 0.4 && this.time - this.lastBgChange > 2.0 * speedMult) {
          this.bgIndex = this.pickAsset(this.bgAssets, features.vol, this.bgIndex);
          this.lastBgChange = this.time;
          this.updateTextures('bg');
        }
        
        if (Math.random() > 0.5 && this.time - this.lastPosterChange > 1.5 * speedMult) {
          this.posterIndex = this.pickAsset(this.posterAssets, features.vol, this.posterIndex);
          this.lastPosterChange = this.time;
          
          // Randomize poster zoom and crop for variety
          if (Math.random() > 0.5) {
            this.posterZoomLevel = 1.0 + Math.random() * 2.0;
            this.posterCrop = { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 };
          } else {
            this.posterZoomLevel = 1.0;
            this.posterCrop = { x: 0, y: 0 };
          }
          this.updateTextures('poster');
        }

        if (Math.random() > 0.3 && this.time - this.lastOverlayChange > 0.5 * speedMult) {
          this.overlayIndex = this.pickAsset(this.overlayAssets, features.vol, this.overlayIndex);
          this.logoIndex = this.pickAsset(this.logoAssets, features.vol, this.logoIndex);
          this.flashIndex = this.pickAsset(this.flashAssets, features.vol, this.flashIndex);
          this.lastOverlayChange = this.time;
          this.updateTextures('overlay');
          this.updateTextures('logo');
          this.updateTextures('flash');
        }
      }

      // Glitch Logic (Mode-aware)
      if (this.options.enableGlitch) {
        if (state === MusicalState.BUILDING || state === MusicalState.PRE_DROP_TENSION) {
          // Increase glitch probability during building/tension
          if (this.conductor.shouldTrigger('glitch_tension', 0.4, 0.4 * densityMult, 0.2 * densityMult)) {
            this.glitchIntensity = 0.5 + Math.random() * 0.5;
            this.glitchType = Math.floor(Math.random() * 8) + 1;
            this.glitchDuration = 0.1;
            this.glitchTime = this.time;
          }
        }
      }
    }

    // Start State Check
    if (this.prevPosterIndex !== this.posterIndex) {
        this.prevPosterIndex = this.posterIndex;
        if (Math.random() > 0.4) {
            this.currentZoom = 0.15 + Math.random() * 0.1;
            this.targetZoom = 0;
            this.zoomState = 'DRIFT';
        }
    }

    // Musical Zoom Logic
    if (kick > 0.6 && this.time - this.lastKick > 0.3) {
        this.lastKick = this.time;
        this.beatCount++;
        
        const beat = this.beatCount % 4;
        let pulse = 0;
        
        if (beat === 1) {
            pulse = 0.02 + Math.random() * 0.02;
        } else if (beat === 0) {
            pulse = 0.05 + Math.random() * 0.04;
        }
        
        const densityMult = Math.max(0.1, 1.5 - this.options.eventDensity);
        if (pulse > 0 && this.conductor.shouldTrigger('zoom_pulse', 0.6, 0.5 * densityMult, 0.2 * densityMult)) {
            this.targetZoom += pulse;
            this.zoomState = 'PULSE';
            this.pulseTimer = 0.1;
        }
    }
    
    this.pulseTimer -= dt;
    if (this.pulseTimer <= 0 && this.zoomState === 'PULSE') {
        this.zoomState = 'DRIFT';
    }

    // Cap target zoom to avoid extreme zoom-ins
    this.targetZoom = Math.min(this.targetZoom, 0.2);
    
    if (this.zoomState === 'DRIFT') {
        this.targetZoom = Math.max(0, this.targetZoom - 0.03 * dt); // Very slow zoom out
    }
    
    // Smooth interpolation
    this.currentZoom += (this.targetZoom - this.currentZoom) * 6.0 * dt;

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.bgAssets[this.bgIndex].image));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.posterAssets[this.posterIndex].image));
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.overlayAssets[this.overlayIndex].image));
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.logoAssets[this.logoIndex].image));
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.flashAssets[this.flashIndex].image));

    gl.uniform1f(this.uniforms.u_time, this.time);
    gl.uniform1f(this.uniforms.u_global_effects, this.options.globalEffects);
    gl.uniform1f(this.uniforms.u_last_bg_change, this.lastBgChange);
    gl.uniform1f(this.uniforms.u_last_poster_change, this.lastPosterChange);
    gl.uniform1f(this.uniforms.u_last_overlay_change, this.lastOverlayChange);
    gl.uniform1f(this.uniforms.u_zoom, this.currentZoom + buildup * 0.05);
    
    let visualModeInt = 0;
    if (this.visualMode === 'lava-space') visualModeInt = 1;
    else if (this.visualMode === 'represent') visualModeInt = 2;
    else if (this.visualMode === 'contour') visualModeInt = 3;
    else if (this.visualMode === 'kaleidoscope') visualModeInt = 4;
    gl.uniform1i(this.uniforms.u_visual_mode, visualModeInt);

    let colorModeInt = 0;
    if (this.visualMode === 'signal-glitch') {
      if (this.colorMode === 'mono-accent') colorModeInt = 1;
      else if (this.colorMode === 'mixed') colorModeInt = 2;
      else if (this.colorMode === 'spectral-rgb') colorModeInt = 3;
    } else if (this.visualMode === 'lava-space') {
      if (this.colorMode === 'dual-lava') colorModeInt = 1;
      else if (this.colorMode === 'spectral-flow') colorModeInt = 2;
    }
    gl.uniform1i(this.uniforms.u_color_mode, colorModeInt);

    gl.uniform1f(this.uniforms.u_enable_glitch, this.options.enableGlitch ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_vhs, this.options.enableVHS ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_curvature, this.options.enableCurvature ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_noise, this.options.enableNoise ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_flicker, this.options.enableFlicker ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_rgb_split, this.options.enableRGBSplit ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_drift_offset, this.options.enableDriftOffset ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_blob_dynamics, this.options.enableBlobDynamics ? 1.0 : 0.0);
    
    gl.uniform1f(this.uniforms.u_overlay_enabled, this.options.overlayEnabled ? 1.0 : 0.0);
    let transMode = 0.0;
    if (this.options.overlayTransparencyMode === 'black') transMode = 1.0;
    else if (this.options.overlayTransparencyMode === 'white') transMode = 2.0;
    gl.uniform1f(this.uniforms.u_overlay_trans_mode, transMode);
    gl.uniform1f(this.uniforms.u_overlay_opacity, this.options.overlayOpacity / 100.0);
    
    gl.uniform1f(this.uniforms.u_flicker_amount, this.options.flickerAmount);
    gl.uniform1f(this.uniforms.u_motion_amount, this.options.motionAmount);
    gl.uniform4f(this.uniforms.u_layer_visibility, this.layerVisibility[0], this.layerVisibility[1], this.layerVisibility[2], this.layerVisibility[3]);

    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    
    const bgImg = this.bgAssets[this.bgIndex].image;
    gl.uniform2f(this.uniforms.u_res_bg, bgImg.width, bgImg.height);
    
    const posterAsset = this.posterAssets[this.posterIndex];
    gl.uniform2f(this.uniforms.u_res_poster, posterAsset.image.width, posterAsset.image.height);
    let posterSoftness = 0.0;
    let posterWhiteTransp = 0.0;
    let posterZoomWeight = 0.0;
    if (posterAsset.metadata.type === 'poster') {
      posterSoftness = posterAsset.metadata.aspect === 'portrait' ? 0.2 : 0.1;
      posterWhiteTransp = posterAsset.metadata.color === 'mono' ? 0.5 : 0.2;
      posterZoomWeight = posterAsset.metadata.behavior === 'peak' ? 1.5 : 1.0;
    }
    gl.uniform1f(this.uniforms.u_poster_softness, posterSoftness);
    gl.uniform1f(this.uniforms.u_poster_white_transparency, posterWhiteTransp);
    gl.uniform1f(this.uniforms.u_poster_zoom_weight, posterZoomWeight);
    gl.uniform1f(this.uniforms.u_poster_zoom_level, this.posterZoomLevel);
    gl.uniform2f(this.uniforms.u_poster_crop, this.posterCrop.x, this.posterCrop.y);
    
    const overlayAsset = this.overlayAssets[this.overlayIndex];
    gl.uniform2f(this.uniforms.u_res_overlay, overlayAsset.image.width, overlayAsset.image.height);
    let overlaySoftness = 0.0;
    let overlayWhiteTransp = 0.0;
    let overlayZoomWeight = 0.0;
    if (overlayAsset.metadata.type === 'overlay') {
      overlaySoftness = overlayAsset.metadata.aspect === 'square' ? 0.4 : 0.2;
      overlayWhiteTransp = overlayAsset.metadata.color === 'accent' ? 0.9 : 0.7;
      overlayZoomWeight = overlayAsset.metadata.behavior === 'rare' ? 0.2 : 0.5;
    }
    gl.uniform1f(this.uniforms.u_overlay_softness, overlaySoftness);
    gl.uniform1f(this.uniforms.u_overlay_white_transparency, overlayWhiteTransp);
    gl.uniform1f(this.uniforms.u_overlay_zoom_weight, overlayZoomWeight);

    const logoAsset = this.logoAssets[this.logoIndex];
    gl.uniform2f(this.uniforms.u_res_logo, logoAsset.image.width, logoAsset.image.height);

    const flashAsset = this.flashAssets[this.flashIndex];
    gl.uniform2f(this.uniforms.u_res_flash, flashAsset.image.width, flashAsset.image.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this.resize);
    if (this.audioAnalyzer) {
      this.audioAnalyzer.stop();
    }
    const gl = this.gl;
    if (gl) {
      this.textureCache.forEach(tex => gl.deleteTexture(tex));
      this.textureCache.clear();
      if (this.program) gl.deleteProgram(this.program);
    }
  }
}

const AssetEditor = ({ assets, onAssetsChange, onAddMore, onClose }: { 
  assets: AssetItem[], 
  onAssetsChange: (assets: AssetItem[]) => void,
  onAddMore: () => void,
  onClose: () => void 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(assets.length > 0 ? 0 : null);
  const selectedAsset = selectedIndex !== null ? assets[selectedIndex] : null;

  const updateMetadata = (updates: Partial<ImageMetadata>) => {
    if (selectedIndex === null) return;
    const newAssets = [...assets];
    newAssets[selectedIndex] = {
      ...newAssets[selectedIndex],
      metadata: { ...newAssets[selectedIndex].metadata, ...updates }
    };
    onAssetsChange(newAssets);
  };

  const getGeneratedFilename = (asset: AssetItem) => {
    const { type, aspect, color, behavior } = asset.metadata;
    const ext = asset.file.name.split('.').pop();
    return `${type}__${aspect}__${color}__${behavior}.${ext}`;
  };

  const removeAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    onAssetsChange(newAssets);
    if (selectedIndex === index) {
      setSelectedIndex(newAssets.length > 0 ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-neutral-300 font-mono flex flex-col z-50">
      {/* Header */}
      <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Asset Editor</h2>
          <span className="text-[10px] text-neutral-600 uppercase tracking-widest leading-none border border-neutral-800 px-2 py-1">Smart Naming</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-900 rounded-lg transition-colors text-neutral-500 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Image List */}
        <div className="w-64 border-r border-neutral-800 flex flex-col bg-neutral-950/50">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Assets ({assets.length})</span>
            <button 
              onClick={onAddMore}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-indigo-400 hover:text-indigo-300"
              title="Add more assets"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {assets.map((asset, i) => (
              <div key={i} className="group relative">
                <button
                  onClick={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left ${
                    selectedIndex === i ? 'bg-white text-black' : 'hover:bg-neutral-900'
                  }`}
                >
                  <div className="w-10 h-10 rounded bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700/50">
                    <img src={asset.image.src} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-bold truncate uppercase tracking-tight ${selectedIndex === i ? 'text-black' : 'text-neutral-300'}`}>
                      {asset.file.name}
                    </div>
                    <div className={`text-[8px] uppercase tracking-widest mt-0.5 ${selectedIndex === i ? 'text-black/60' : 'text-neutral-600'}`}>
                      {asset.metadata.type} • {asset.metadata.aspect}
                    </div>
                  </div>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAsset(i);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                    selectedIndex === i ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-neutral-600 hover:text-red-400 hover:bg-red-400/10'
                  }`}
                  title="Remove asset"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 p-4 text-center">
                <ImageIcon size={24} className="mb-2 opacity-20" />
                <span className="text-[10px] uppercase tracking-widest">No assets loaded</span>
                <button 
                  onClick={onAddMore}
                  className="mt-4 px-3 py-2 border border-neutral-800 hover:border-neutral-600 text-[10px] uppercase tracking-widest transition-colors"
                >
                  Add Assets
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Large Preview */}
        <div className="flex-1 bg-neutral-900/30 flex items-center justify-center p-12 relative overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          {selectedAsset ? (
            <div className="relative group max-w-full max-h-full flex items-center justify-center">
              <img 
                src={selectedAsset.image.src} 
                alt="" 
                className="max-w-full max-h-full object-contain shadow-2xl border border-neutral-800 bg-black"
              />
              <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                <span className="text-[10px] text-neutral-600 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">
                  {selectedAsset.image.width} × {selectedAsset.image.height} px
                </span>
              </div>
            </div>
          ) : (
            <div className="text-neutral-700 uppercase tracking-[0.2em] text-xs">Select an asset to preview</div>
          )}
        </div>

        {/* RIGHT: Info & Controls */}
        <div className="w-80 border-l border-neutral-800 flex flex-col bg-neutral-950">
          {selectedAsset ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* File Info */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Original File</label>
                <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                  <div className="text-xs text-white break-all font-bold">{selectedAsset.file.name}</div>
                  <div className="text-[9px] text-neutral-600 mt-1 uppercase tracking-widest">
                    {(selectedAsset.file.size / 1024).toFixed(1)} KB • {selectedAsset.file.type}
                  </div>
                </div>
              </div>

              {/* Smart Tagging */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Type (Required)</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['bg', 'poster', 'overlay', 'logo', 'flash'].map(t => (
                      <button
                        key={t}
                        onClick={() => updateMetadata({ type: t as AssetType })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all rounded ${
                          selectedAsset.metadata.type === t 
                            ? 'bg-white text-black border-white font-bold' 
                            : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['landscape', 'portrait', 'square'].map(a => (
                      <button
                        key={a}
                        onClick={() => updateMetadata({ aspect: a as AssetAspect })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all rounded ${
                          selectedAsset.metadata.aspect === a 
                            ? 'bg-white text-black border-white font-bold' 
                            : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Color Profile</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['mono', 'accent', 'color'].map(c => (
                      <button
                        key={c}
                        onClick={() => updateMetadata({ color: c as AssetColor })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all rounded ${
                          selectedAsset.metadata.color === c 
                            ? 'bg-white text-black border-white font-bold' 
                            : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Behavior</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['frequent', 'rare', 'peak'].map(b => (
                      <button
                        key={b}
                        onClick={() => updateMetadata({ behavior: b as AssetBehavior })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all rounded ${
                          selectedAsset.metadata.behavior === b 
                            ? 'bg-white text-black border-white font-bold' 
                            : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generated Name */}
              <div className="space-y-3 pt-4 border-t border-neutral-800">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Generated Filename</label>
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg group relative flex items-center justify-between">
                  <div className="text-xs text-indigo-300 font-mono break-all">{getGeneratedFilename(selectedAsset)}</div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(getGeneratedFilename(selectedAsset))}
                    className="p-2 text-indigo-500 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-colors"
                    title="Copy Name"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 space-y-2">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Zap size={16} fill="currentColor" />
                  Use in Visualizer
                </button>
                <button 
                  onClick={() => {
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", selectedAsset.image.src);
                    downloadAnchorNode.setAttribute("download", getGeneratedFilename(selectedAsset));
                    document.body.appendChild(downloadAnchorNode); // required for firefox
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                  }}
                  className="w-full py-3 border border-neutral-800 text-neutral-500 text-[10px] uppercase tracking-widest hover:text-white hover:border-neutral-600 transition-all"
                >
                  Download Renamed File
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-700 p-12 text-center">
              <div className="space-y-4">
                <Activity size={32} className="mx-auto opacity-10" />
                <p className="text-[10px] uppercase tracking-[0.2em] leading-relaxed">Select an asset from the list to begin analysis and role assignment</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const remoteRoomId = urlParams.get('remote');

  if (remoteRoomId) {
    return <RemoteControl roomId={remoteRoomId} />;
  }

  const [roomId] = useState(() => {
    const saved = localStorage.getItem('vizr_room_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('vizr_room_id', newId);
    return newId;
  });
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [showAssetInfoModal, setShowAssetInfoModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);
  const [view, setView] = useState<'visualizer' | 'editor'>('visualizer');
  const socketRef = useRef<Socket | null>(null);

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [audioMode, setAudioMode] = useState<'mic' | 'ambient' | 'screen' | 'file'>('ambient');
  const [audioFile, setAudioFile] = useState<File | undefined>();
  const [deviceId, setDeviceId] = useState<string>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const [controlState, setControlState] = useState<ControlState>(defaultControlState);

  const { visualMode, colorMode } = controlState;

  const {
    enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit, enableDriftOffset, enableBlobDynamics
  } = controlState.toggles;
  
  const {
    globalEffects, flickerAmount, motionAmount, eventDensity, transitionSpeed
  } = controlState.sliders;
  
  const overlaySettings = controlState.overlaySettings;

  const setVisualMode = (mode: ControlState['visualMode']) => {
    setControlState(prev => ({ ...prev, visualMode: mode }));
  };

  const setColorMode = (mode: string) => {
    setControlState(prev => ({ ...prev, colorMode: mode }));
  };

  const updateToggle = (key: keyof ControlState['toggles']) => (val: any) => {
    setControlState(prev => ({
      ...prev,
      toggles: { ...prev.toggles, [key]: typeof val === 'function' ? val(prev.toggles[key]) : val }
    }));
  };

  const updateSlider = (key: keyof ControlState['sliders']) => (val: any) => {
    setControlState(prev => ({
      ...prev,
      sliders: { ...prev.sliders, [key]: typeof val === 'function' ? val(prev.sliders[key]) : val }
    }));
  };

  const setEnableGlitch = updateToggle('enableGlitch');
  const setEnableVHS = updateToggle('enableVHS');
  const setEnableCurvature = updateToggle('enableCurvature');
  const setEnableNoise = updateToggle('enableNoise');
  const setEnableFlicker = updateToggle('enableFlicker');
  const setEnableRGBSplit = updateToggle('enableRGBSplit');
  const setEnableDriftOffset = updateToggle('enableDriftOffset');
  const setEnableBlobDynamics = updateToggle('enableBlobDynamics');

  const setGlobalEffects = updateSlider('globalEffects');
  const setFlickerAmount = updateSlider('flickerAmount');
  const setMotionAmount = updateSlider('motionAmount');
  const setEventDensity = updateSlider('eventDensity');
  const setTransitionSpeed = updateSlider('transitionSpeed');

  const setOverlaySettings = (val: any) => {
    setControlState(prev => ({
      ...prev,
      overlaySettings: typeof val === 'function' ? val(prev.overlaySettings) : val
    }));
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [remoteState, setRemoteState] = useState<'OFFLINE' | 'WAITING' | 'CONNECTED'>('OFFLINE');
  const [filePlaying, setFilePlaying] = useState(true);
  const [fileVolume, setFileVolume] = useState(1.0);
  const [showUI, setShowUI] = useState(false);
  const [livePage, setLivePage] = useState<'settings' | 'performance'>('settings');
  const [showHint, setShowHint] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      console.warn("enumerateDevices is not supported in this context.");
      return;
    }
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !deviceId) {
        setDeviceId(audioInputs[0].deviceId);
      }
    }).catch(err => {
      console.error("Error enumerating devices", err);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/'));
    const loadedAssets: AssetItem[] = [];
    let loadedCount = 0;

    files.forEach((file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const metadata = parseMetadata(file, img);
        loadedAssets.push({ image: img, metadata, file });
        loadedCount++;
        if (loadedCount === files.length) {
          setAssets(prev => [...prev, ...loadedAssets]);
        }
      };
      img.src = url;
    });
  };

  const handleShuffle = () => {
    console.log("[VIZR] Shuffle triggered. Regenerating scene...");
    setAssets(prev => {
      if (prev.length === 0) return prev;
      return [...prev].sort(() => Math.random() - 0.5);
    });
  };

  const handleRandomize = () => {
    setMotionAmount(Math.random());
    setGlobalEffects(Math.random());
    setEventDensity(Math.random());
    setFlickerAmount(Math.random());
    setTransitionSpeed(Math.random());
    setEnableGlitch(Math.random() > 0.3);
    setEnableVHS(Math.random() > 0.3);
    setEnableRGBSplit(Math.random() > 0.3);
  };

  const handleReset = () => {
    setControlState({
      ...defaultControlState,
      visualMode: controlState.visualMode, // Preserve current mode
      colorMode: controlState.colorMode
    });
  };

  const handleStart = () => {
    if (assets.length === 0) return;
    setIsPlaying(true);
  };

  const stateRef = useRef(controlState);

  useEffect(() => {
    stateRef.current = controlState;
    if (socketRef.current) {
      socketRef.current.emit('FULL_CONTROL_STATE', roomId, controlState);
    }
  }, [controlState, roomId]);

  useEffect(() => {
    if (isPlaying && !showUI) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [isPlaying, showUI]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    socket.emit('join-room', roomId, 'host');
    setRemoteState('WAITING');

    socket.on('remote-connected', () => {
      setRemoteState('CONNECTED');
      if (!isPlaying) {
        setIsPlaying(true);
      }
    });

    socket.on('remote-disconnected', () => {
      setRemoteState('WAITING');
    });

    socket.on('REQUEST_CONTROL_STATE', () => {
      setRemoteState('CONNECTED');
      if (!isPlaying) {
        setIsPlaying(true);
      }
      socket.emit('FULL_CONTROL_STATE', roomId, stateRef.current);
    });

    socket.on('command', (cmd) => {
      if (cmd.action === 'visualMode') setVisualMode(cmd.value);
      if (cmd.action === 'colorMode') setColorMode(cmd.value);
      if (cmd.action === 'speed') setMotionAmount(cmd.value);
      if (cmd.action === 'intensity') setGlobalEffects(cmd.value);
      if (cmd.action === 'complexity') setEventDensity(cmd.value);
      if (cmd.action === 'glitch') setFlickerAmount(cmd.value);
      if (cmd.action === 'transitionSpeed') setTransitionSpeed(cmd.value);
      if (cmd.action === 'enableGlitch') setEnableGlitch(cmd.value);
      if (cmd.action === 'enableVHS') setEnableVHS(cmd.value);
      if (cmd.action === 'enableCurvature') setEnableCurvature(cmd.value);
      if (cmd.action === 'enableNoise') setEnableNoise(cmd.value);
      if (cmd.action === 'enableFlicker') setEnableFlicker(cmd.value);
      if (cmd.action === 'enableRGBSplit') setEnableRGBSplit(cmd.value);
      if (cmd.action === 'enableDriftOffset') setEnableDriftOffset(cmd.value);
      if (cmd.action === 'enableBlobDynamics') setEnableBlobDynamics(cmd.value);
      if (cmd.action === 'overlaySettings') setOverlaySettings(cmd.value);
      if (cmd.action === 'reset') handleReset();
      if (cmd.action === 'macro') {
        if (engineRef.current) {
          engineRef.current.setMacro(cmd.value.name, cmd.value.active);
        }
      }
      if (cmd.action === 'shuffle') {
        console.log("[VIZR] Remote shuffle received by host.");
        handleShuffle();
      }
      if (cmd.action === 'randomize') {
        handleRandomize();
      }
    });

    socket.on('new-image', async (payload) => {
      try {
        const res = await fetch(payload.data);
        const blob = await res.blob();
        const file = new File([blob], payload.name, { type: payload.type });
        
        const img = new Image();
        img.onload = () => {
          const metadata = parseMetadata(file, img);
          setAssets(prev => [...prev, { image: img, metadata, file }]);
        };
        img.src = URL.createObjectURL(file);
      } catch (err) {
        console.error("Failed to process remote image", err);
      }
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  useEffect(() => {
    if (isPlaying) {
      // Trigger fade-in when playing starts
      const timer = setTimeout(() => setFadeOpacity(1), 50);
      return () => clearTimeout(timer);
    } else {
      setFadeOpacity(0);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && canvasRef.current && !engineRef.current) {
      setAudioError(null);
      engineRef.current = new VisualEngine(
        canvasRef.current, 
        assets, 
        audioMode, 
        deviceId, 
        audioFile,
        visualMode,
        colorMode,
        (err) => {
          setAudioError(err.message || "Audio access denied");
          handleStop();
        }
      );
    }
  }, [isPlaying, audioMode, deviceId, audioFile, visualMode]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateAssets(assets);
    }
  }, [assets]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVisualMode(visualMode);
    }
  }, [visualMode]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setColorMode(colorMode);
    }
  }, [colorMode]);

  const handleStop = () => {
    setIsPlaying(false);
    setShowUI(false);
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    const elem = document as any;
    if (document.fullscreenElement || elem.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (elem.webkitExitFullscreen) {
        elem.webkitExitFullscreen();
      }
    }
  };

  const toggleFullscreen = () => {
    const elem = document.documentElement as any;
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err: any) => console.error(err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err: any) => console.error(err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    if (engineRef.current) {
      const currentOverlaySettings = overlaySettings[visualMode] || { enabled: true, mode: 'normal', opacity: 100 };
      engineRef.current.setOptions({
        enableGlitch,
        enableVHS,
        enableCurvature,
        enableNoise,
        enableFlicker,
        enableRGBSplit,
        enableDriftOffset,
        enableBlobDynamics,
        overlayEnabled: currentOverlaySettings.enabled,
        overlayTransparencyMode: currentOverlaySettings.mode,
        overlayOpacity: currentOverlaySettings.opacity,
        globalEffects,
        flickerAmount,
        motionAmount,
        eventDensity,
        transitionSpeed
      });
    }
  }, [enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit, enableDriftOffset, enableBlobDynamics, overlaySettings, visualMode, globalEffects, flickerAmount, motionAmount, eventDensity, transitionSpeed]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  if (view === 'editor') {
    return (
      <AssetEditor 
        assets={assets} 
        onAssetsChange={setAssets} 
        onAddMore={() => fileInputRef.current?.click()}
        onClose={() => setView('visualizer')} 
      />
    );
  }

  if (isPlaying) {
    return (
      <div 
        className="fixed inset-0 bg-black overflow-hidden transition-opacity duration-700 ease-in-out" 
        style={{ opacity: fadeOpacity }}
        onClick={() => setShowUI(!showUI)}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Hint Text */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${showHint ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-black/50 backdrop-blur-sm text-white/50 px-4 py-2 rounded-full text-sm tracking-widest uppercase animate-pulse">
            Tap anywhere for controls
          </div>
        </div>

        {/* Remote Connection Indicator */}
        <div className={`absolute top-6 left-6 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${remoteState === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>
            <Activity size={14} className={remoteState === 'CONNECTED' ? 'animate-pulse' : ''} />
            {remoteState === 'CONNECTED' ? 'Remote Connected' : 'Remote Offline'}
          </div>
        </div>

        {/* Top Right Close Button (X) */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleStop(); }}
          className={`absolute top-6 right-6 p-3 bg-black/80 border border-neutral-800 text-white hover:bg-neutral-900 transition-opacity duration-300 ${showUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          title="Close"
        >
          <X size={24} />
        </button>

        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 sm:bottom-6 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-auto max-w-[95vw] flex flex-col gap-4 bg-black/80 backdrop-blur-xl sm:border border-t border-neutral-800 p-4 sm:rounded-2xl transition-all duration-500 ease-out ${showUI ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}`}
        >
          {/* Top Row: Actions */}
          <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleStop}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Stop Visualization"
              >
                <Square size={18} fill="currentColor" />
              </button>
              <div className="w-px h-4 bg-neutral-800" />
              
              {/* PAGE SWITCHER */}
              <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                <button
                  onClick={() => setLivePage('settings')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                    livePage === 'settings' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setLivePage('performance')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                    livePage === 'performance' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Performance
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {audioMode === 'file' && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (engineRef.current && engineRef.current.audioAnalyzer) {
                        engineRef.current.audioAnalyzer.togglePlayPause();
                        setFilePlaying(engineRef.current.audioAnalyzer.isFilePlaying());
                      }
                    }}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    title={filePlaying ? "Pause Audio" : "Play Audio"}
                  >
                    {filePlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] text-neutral-500 uppercase">Vol</span>
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
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 accent-white h-1 bg-neutral-800 appearance-none outline-none rounded-full"
                    />
                  </div>
                  <div className="w-px h-4 bg-neutral-800 mx-1" />
                </>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleShuffle(); }}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Shuffle Order"
              >
                <Zap size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleRandomize(); }}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Randomize All"
              >
                <Dices size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>

          {livePage === 'settings' ? (
            <>
              {/* Sliders Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                      {visualMode === 'kaleidoscope' ? 'Mirror Depth' : 'Global'}
                    </span>
                    <span className="text-[10px] text-neutral-600">{(globalEffects * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={globalEffects}
                    onChange={(e) => setGlobalEffects(parseFloat(e.target.value))}
                    className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                      {visualMode === 'kaleidoscope' ? 'Shimmer' : 'Flicker'}
                    </span>
                    <span className="text-[10px] text-neutral-600">{(flickerAmount * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={flickerAmount}
                    onChange={(e) => setFlickerAmount(parseFloat(e.target.value))}
                    className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                      {visualMode === 'kaleidoscope' ? 'Rotation' : 'Motion'}
                    </span>
                    <span className="text-[10px] text-neutral-600">{(motionAmount * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={motionAmount}
                    onChange={(e) => setMotionAmount(parseFloat(e.target.value))}
                    className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                      {visualMode === 'kaleidoscope' ? 'Sides' : 'Density'}
                    </span>
                    <span className="text-[10px] text-neutral-600">{(eventDensity * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={eventDensity}
                    onChange={(e) => setEventDensity(parseFloat(e.target.value))}
                    className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                      {visualMode === 'kaleidoscope' ? 'Pattern Drift' : 'Speed'}
                    </span>
                    <span className="text-[10px] text-neutral-600">{(transitionSpeed * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={transitionSpeed}
                    onChange={(e) => setTransitionSpeed(parseFloat(e.target.value))}
                    className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/50">
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "Glitch" : (visualMode === 'kaleidoscope' ? "Symmetry Break" : "Fluid")} checked={enableGlitch} onChange={setEnableGlitch} />
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "VHS" : (visualMode === 'kaleidoscope' ? "Multi Layer" : "Dust")} checked={enableVHS} onChange={setEnableVHS} />
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "Curve" : (visualMode === 'kaleidoscope' ? "Center Lock" : "Lens")} checked={enableCurvature} onChange={setEnableCurvature} />
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "Noise" : (visualMode === 'kaleidoscope' ? "Radial Zoom" : "Grain")} checked={enableNoise} onChange={setEnableNoise} />
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "Flicker" : (visualMode === 'kaleidoscope' ? "Pulse" : "Pulse")} checked={enableFlicker} onChange={setEnableFlicker} />
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "RGB" : (visualMode === 'kaleidoscope' ? "Prism" : "Aura")} checked={enableRGBSplit} onChange={setEnableRGBSplit} />
                <ToggleSwitch label={visualMode === 'signal-glitch' ? "Drift Offset" : "Cosmic Drift"} checked={enableDriftOffset} onChange={setEnableDriftOffset} />
                {visualMode === 'lava-space' && (
                  <ToggleSwitch label="Blob Dynamics" checked={enableBlobDynamics} onChange={setEnableBlobDynamics} />
                )}
              </div>

              {/* Overlay Settings */}
              {visualMode !== 'represent' && (
                <div className="pt-4 border-t border-neutral-800/50 space-y-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Overlay Settings</label>
                  <div className="space-y-3">
                    <ToggleSwitch 
                      label="Enable Overlay" 
                      checked={overlaySettings[visualMode]?.enabled ?? true} 
                      onChange={(val) => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], enabled: val } }))} 
                    />
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-400 uppercase">Opacity</span>
                        <span className="text-xs text-neutral-500">{overlaySettings[visualMode]?.opacity ?? 100}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" step="1"
                        value={overlaySettings[visualMode]?.opacity ?? 100}
                        onChange={(e) => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], opacity: parseInt(e.target.value) } }))}
                        className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                      />
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-neutral-800">
                      <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                        <button
                          onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: 'black' } }))}
                          className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${
                            (overlaySettings[visualMode]?.mode ?? 'normal') === 'black' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Black
                        </button>
                        <button
                          onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: 'white' } }))}
                          className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${
                            (overlaySettings[visualMode]?.mode ?? 'normal') === 'white' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          White
                        </button>
                        <button
                          onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: 'normal' } }))}
                          className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${
                            (overlaySettings[visualMode]?.mode ?? 'normal') === 'normal' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Normal
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-6 pt-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest leading-none">Intensity</span>
                    <span className="text-xs text-neutral-600">{(globalEffects * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={globalEffects}
                    onChange={(e) => setGlobalEffects(parseFloat(e.target.value))}
                    className="w-full h-3 accent-white bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest leading-none">Motion</span>
                    <span className="text-xs text-neutral-600">{(motionAmount * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01"
                    value={motionAmount}
                    onChange={(e) => setMotionAmount(parseFloat(e.target.value))}
                    className="w-full h-3 accent-white bg-neutral-800 appearance-none outline-none rounded-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onPointerDown={() => engineRef.current?.setMacro('buildUp', true)}
                  onPointerUp={() => engineRef.current?.setMacro('buildUp', false)}
                  onPointerLeave={() => engineRef.current?.setMacro('buildUp', false)}
                  className="h-16 bg-neutral-900 hover:bg-neutral-800 active:bg-white active:text-black border border-neutral-800 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-150 select-none"
                >
                  Build Up
                </button>
                <button
                  onPointerDown={() => engineRef.current?.setMacro('tension', true)}
                  onPointerUp={() => engineRef.current?.setMacro('tension', false)}
                  onPointerLeave={() => engineRef.current?.setMacro('tension', false)}
                  className="h-16 bg-neutral-900 hover:bg-neutral-800 active:bg-white active:text-black border border-neutral-800 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-150 select-none"
                >
                  Tension
                </button>
                <button
                  onPointerDown={() => engineRef.current?.setMacro('drop', true)}
                  onPointerUp={() => engineRef.current?.setMacro('drop', false)}
                  onPointerLeave={() => engineRef.current?.setMacro('drop', false)}
                  className="h-16 bg-neutral-900 hover:bg-neutral-800 active:bg-white active:text-black border border-neutral-800 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-150 select-none"
                >
                  Drop
                </button>
                <button
                  onPointerDown={() => engineRef.current?.setMacro('extraBounce', true)}
                  onPointerUp={() => engineRef.current?.setMacro('extraBounce', false)}
                  onPointerLeave={() => engineRef.current?.setMacro('extraBounce', false)}
                  className="h-16 bg-neutral-900 hover:bg-neutral-800 active:bg-white active:text-black border border-neutral-800 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-150 select-none"
                >
                  Extra Bounce
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-300 font-mono flex flex-col p-4 sm:p-6 lg:p-8 selection:bg-white selection:text-black">
      <div className="w-full flex-1 border border-neutral-800 p-6 sm:p-8 bg-[#050505] shadow-2xl relative flex flex-col">
        
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tighter uppercase text-white">VIZR</h1>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-white text-black text-[10px] font-bold tracking-widest uppercase">v{APP_VERSION}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Web-Based Visualization System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Column 1 */}
          <div className="space-y-8">
            {/* File Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">1. Source Material</label>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 p-8 border border-dashed border-neutral-700 hover:border-white hover:text-white transition-colors bg-neutral-950"
            >
              <Upload size={24} />
              <span className="text-sm uppercase tracking-wide">
                {assets.length > 0 ? `${assets.length} Images Loaded` : 'Select Image Folder'}
              </span>
            </button>
            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mt-2">
              <span>{assets.length > 0 ? `${assets.length} assets loaded` : 'No assets loaded'}</span>
              <button 
                onClick={() => setShowAssetInfoModal(true)}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
              >
                <Info size={12} />
                Smart Asset Naming
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
              <div className="mt-4 max-h-32 overflow-y-auto border border-neutral-800 bg-neutral-900 p-2 space-y-2">
                {assets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate w-1/2 text-neutral-400">{asset.file.name}</span>
                    <div className="flex gap-2">
                      <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded">{asset.metadata.type}</span>
                      <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded">{asset.metadata.behavior}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asset Editor Button */}
          <button 
            onClick={() => setView('editor')}
            className="w-full flex items-center justify-center gap-2 p-3 border border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300 bg-transparent text-sm uppercase tracking-wide transition-colors"
          >
            <ImageIcon size={16} />
            Open Asset Editor
          </button>

          {/* Audio Mode */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">2. Audio Input</label>
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => setAudioMode('ambient')}
                className={`flex items-center justify-center gap-2 p-3 border text-sm uppercase tracking-wide transition-colors ${
                  audioMode === 'ambient' 
                    ? 'border-white text-white bg-white/5' 
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                <MicOff size={16} /> Ambient
              </button>
              <button 
                onClick={() => setAudioMode('mic')}
                className={`flex items-center justify-center gap-2 p-3 border text-sm uppercase tracking-wide transition-colors ${
                  audioMode === 'mic' 
                    ? 'border-white text-white bg-white/5' 
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                <Mic size={16} /> Mic
              </button>
              <button 
                onClick={() => setAudioMode('screen')}
                className={`flex items-center justify-center gap-2 p-3 border text-sm uppercase tracking-wide transition-colors ${
                  audioMode === 'screen' 
                    ? 'border-white text-white bg-white/5' 
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                <MonitorUp size={16} /> Screen
              </button>
              <button 
                onClick={() => setAudioMode('file')}
                className={`flex items-center justify-center gap-2 p-3 border text-sm uppercase tracking-wide transition-colors ${
                  audioMode === 'file' 
                    ? 'border-white text-white bg-white/5' 
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                <FileAudio size={16} /> File
              </button>
            </div>
            
            {audioMode === 'file' && !audioFile && (
              <div className="mt-2">
                <label className="flex items-center justify-center w-full p-4 border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors text-neutral-400 hover:text-white rounded-lg">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAudioFile(e.target.files[0]);
                      }
                    }}
                  />
                  <span className="text-sm flex items-center gap-2"><Upload size={16} /> Select Audio File</span>
                </label>
              </div>
            )}

            {audioMode === 'mic' && devices.length > 0 && (
              <select 
                value={deviceId} 
                onChange={e => setDeviceId(e.target.value)}
                className="w-full p-2 bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none focus:border-neutral-500"
              >
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            )}
            {audioError && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Activity size={12} /> Audio Input Error
                </p>
                <p className="text-neutral-400 text-[10px] leading-relaxed">
                  {audioError}
                </p>
                {audioMode === 'screen' && (
                  <button 
                    onClick={() => {
                      const url = process.env.APP_URL || window.location.href;
                      window.open(url, '_blank');
                    }}
                    className="mt-2 w-full py-1.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    <Maximize size={12} /> Open in New Tab
                  </button>
                )}
              </div>
            )}
            
            {((audioMode === 'file' && audioFile) || audioMode !== 'file') && (
              <AudioLevelMeter 
                mode={audioMode} 
                deviceId={deviceId} 
                file={audioFile} 
                onError={setAudioError} 
                onClearFile={() => setAudioFile(undefined)}
              />
            )}
          </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-8">
            {/* Visual Mode */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">3. Visual Mode</label>
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
                className="w-full p-3 bg-neutral-950 border border-neutral-800 text-sm uppercase tracking-wide text-neutral-300 outline-none focus:border-neutral-500"
              >
                <option value="signal-glitch">SIGNAL GLITCH</option>
                <option value="lava-space">LAVA SPACE</option>
                <option value="represent">REPRESENT MODE</option>
                <option value="contour">CONTOUR</option>
                <option value="kaleidoscope">KALEIDOSCOPE</option>
              </select>
            </div>

            {/* Color Mode */}
            <div className="space-y-3 pt-2 lg:pt-0">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">4. Color Palette</label>
              <select 
                value={colorMode} 
                onChange={e => setColorMode(e.target.value)}
                className="w-full p-3 bg-neutral-950 border border-neutral-800 text-sm uppercase tracking-wide text-neutral-300 outline-none focus:border-neutral-500"
              >
                {visualMode === 'represent' ? (
                  <>
                    <option value="atmospheric">Atmospheric</option>
                  </>
                ) : visualMode === 'signal-glitch' ? (
                  <>
                    <option value="mostly-mono">Mostly Mono</option>
                    <option value="mono-accent">Mono + Accent</option>
                    <option value="mixed">Mixed</option>
                    <option value="spectral-rgb">Spectral RGB</option>
                  </>
                ) : visualMode === 'contour' ? (
                  <>
                    <option value="print-black">PRINT BLACK</option>
                    <option value="topo-relief">TOPO RELIEF</option>
                    <option value="spectral-contour">SPECTRAL CONTOUR</option>
                  </>
                ) : visualMode === 'kaleidoscope' ? (
                  <>
                    <option value="prism">PRISM</option>
                    <option value="tube-light">TUBE LIGHT</option>
                    <option value="glass-bloom">GLASS BLOOM</option>
                    <option value="chroma-wheel">CHROMA WHEEL</option>
                  </>
                ) : (
                  <>
                    <option value="cosmic-flow">COSMIC FLOW</option>
                    <option value="dual-lava">DUAL LAVA</option>
                    <option value="spectral-flow">SPECTRAL FLOW</option>
                  </>
                )}
              </select>
            </div>

            {/* FX Settings */}
            <div className="space-y-4 pt-2 lg:pt-0">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">5. FX Settings</label>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400 uppercase">{visualMode === 'kaleidoscope' ? 'Mirror Depth' : (visualMode === 'contour' ? 'Structure' : 'Global')}</span>
                  <span className="text-xs text-neutral-500">{(globalEffects * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={globalEffects}
                  onChange={(e) => setGlobalEffects(parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400 uppercase">Smooth</span>
                  <span className="text-xs text-neutral-400 uppercase">{visualMode === 'signal-glitch' ? 'Flicker' : (visualMode === 'kaleidoscope' ? 'Shimmer' : (visualMode === 'contour' ? 'Raster Density' : 'Fluid Amount'))}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={flickerAmount}
                  onChange={(e) => setFlickerAmount(parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400 uppercase">{visualMode === 'kaleidoscope' ? 'Rotation' : (visualMode === 'contour' ? 'Structural Motion' : 'Motion Amount')}</span>
                  <span className="text-xs text-neutral-500">{(motionAmount * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={motionAmount}
                  onChange={(e) => setMotionAmount(parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400 uppercase">{visualMode === 'signal-glitch' ? 'Event Density' : (visualMode === 'kaleidoscope' ? 'Sides' : (visualMode === 'contour' ? 'Strip Count' : 'Wave Density'))}</span>
                  <span className="text-xs text-neutral-500">{(eventDensity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={eventDensity}
                  onChange={(e) => setEventDensity(parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400 uppercase">{visualMode === 'kaleidoscope' ? 'Pattern Drift' : (visualMode === 'contour' ? 'Reassembly' : 'Transition Speed')}</span>
                  <span className="text-xs text-neutral-500">{(transitionSpeed * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={transitionSpeed}
                  onChange={(e) => setTransitionSpeed(parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                />
              </div>
            </div>
          </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-8 flex flex-col h-full">
            {/* Visual Toggles */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">6. Visual Toggles</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "Glitch Effects" : visualMode === 'lava-space' ? "Fluid Distortion" : visualMode === 'contour' ? "Shatter" : visualMode === 'kaleidoscope' ? "Symmetry Break" : "Logo Reactivity"} checked={enableGlitch} onChange={setEnableGlitch} />
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "VHS Overlay" : visualMode === 'lava-space' ? "Space Dust" : visualMode === 'contour' ? "Raster Layer" : visualMode === 'kaleidoscope' ? "Multi Layer" : "Atmospheric Grain"} checked={enableVHS} onChange={setEnableVHS} />
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "Screen Curvature" : visualMode === 'lava-space' ? "Liquid Lens" : visualMode === 'contour' ? "Plane Shift" : visualMode === 'kaleidoscope' ? "Center Lock" : "Spatial Bend"} checked={enableCurvature} onChange={setEnableCurvature} />
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "Noise Layer" : visualMode === 'lava-space' ? "Star Grain" : visualMode === 'contour' ? "Depth Noise" : visualMode === 'kaleidoscope' ? "Radial Zoom" : "Energy Noise"} checked={enableNoise} onChange={setEnableNoise} />
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "Flicker" : visualMode === 'lava-space' ? "Glow Pulse" : visualMode === 'contour' ? "Bounce" : visualMode === 'kaleidoscope' ? "Depth Logo" : "Glow Pulse"} checked={enableFlicker} onChange={setEnableFlicker} />
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "RGB Split" : visualMode === 'lava-space' ? "Aura Shift" : visualMode === 'contour' ? "Structural Shift" : visualMode === 'kaleidoscope' ? "Overlay Merge" : "Color Shift"} checked={enableRGBSplit} onChange={setEnableRGBSplit} />
              <ToggleSwitch label={visualMode === 'signal-glitch' ? "Drift Offset" : visualMode === 'lava-space' ? "Cosmic Drift" : visualMode === 'contour' ? "Structural Drift" : "Subtle Drift"} checked={enableDriftOffset} onChange={setEnableDriftOffset} />
              {visualMode === 'lava-space' && (
                <ToggleSwitch label="Blob Dynamics" checked={enableBlobDynamics} onChange={setEnableBlobDynamics} />
              )}
            </div>
          </div>

            {/* Overlay Settings */}
            {visualMode !== 'represent' && (
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">7. Overlay Settings</label>
                <div className="space-y-3">
                  <ToggleSwitch 
                    label="Enable Overlay" 
                    checked={overlaySettings[visualMode]?.enabled ?? true} 
                    onChange={(val) => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], enabled: val } }))} 
                  />
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-400 uppercase">Opacity</span>
                      <span className="text-xs text-neutral-500">{overlaySettings[visualMode]?.opacity ?? 100}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" step="1"
                      value={overlaySettings[visualMode]?.opacity ?? 100}
                      onChange={(e) => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], opacity: parseInt(e.target.value) } }))}
                      className="w-full accent-white h-1 bg-neutral-800 appearance-none outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                      <button
                        onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: 'black' } }))}
                        className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${
                          (overlaySettings[visualMode]?.mode ?? 'normal') === 'black' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        Black
                      </button>
                      <button
                        onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: 'white' } }))}
                        className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${
                          (overlaySettings[visualMode]?.mode ?? 'normal') === 'white' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        White
                      </button>
                      <button
                        onClick={() => setOverlaySettings(prev => ({ ...prev, [visualMode]: { ...prev[visualMode], mode: 'normal' } }))}
                        className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${
                          (overlaySettings[visualMode]?.mode ?? 'normal') === 'normal' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        Normal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto space-y-4 pt-8 lg:pt-0">
              {/* Start Button */}
              <button 
                onClick={handleStart}
                disabled={assets.length === 0}
                className="w-full flex flex-col items-center justify-center gap-2 p-6 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold uppercase tracking-widest hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
              >
                <Play size={24} fill="currentColor" /> 
                <span className="text-sm">INITIALIZE</span>
              </button>

              {/* Remote Button */}
              <button 
                onClick={() => setShowRemoteModal(true)}
                className="w-full flex flex-col items-center justify-center gap-2 p-6 bg-blue-500/20 text-blue-500 border border-blue-500/30 font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-colors rounded-xl"
              >
                <Wifi size={24} />
                <span className="text-sm">VIZR REMOTE</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full mx-auto mt-12 pb-8 border-t border-neutral-800/50 pt-8 text-center space-y-6">
        <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <button onClick={() => setShowFaqModal(true)} className="hover:text-white transition-colors">FAQ</button>
          <button onClick={() => setShowAboutModal(true)} className="hover:text-white transition-colors">About</button>
          <button onClick={() => setShowContactModal(true)} className="hover:text-white transition-colors">Contact</button>
          <button onClick={() => setShowImpressumModal(true)} className="hover:text-white transition-colors">Impressum</button>
        </div>
        <div className="text-[10px] text-neutral-600 font-mono tracking-wider flex flex-col items-center gap-2">
          <span>VIZR v2.0 beta © 2026 // Web-Based Visualization System</span>
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
                <p className="text-neutral-600 font-mono text-[10px] mt-1">Version 2.0 beta // Build 2026</p>
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

      {showRemoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowRemoteModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full space-y-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-widest text-white">Remote Control</h2>
              <p className="text-xs text-neutral-400">Scan this QR code with your phone to control the visualizer remotely.</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={`${window.location.origin}?remote=${roomId}`} size={200} />
            </div>

            <div className="text-center space-y-1 w-full">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Or share this link:</p>
              <div className="flex items-center gap-2 bg-black p-2 rounded border border-neutral-800">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}?remote=${roomId}`} 
                  className="bg-transparent text-xs text-neutral-300 w-full outline-none"
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}?remote=${roomId}`)}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-[10px] uppercase font-bold rounded text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <button 
              onClick={() => setShowRemoteModal(false)}
              className="w-full p-3 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-widest rounded-lg text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showAssetInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowAssetInfoModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-2xl w-full space-y-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-bold uppercase tracking-widest text-white">Smart Asset Naming</h2>
              <button onClick={() => setShowAssetInfoModal(false)} className="text-neutral-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6 text-sm text-neutral-300">
              <p>
                You can optimize how the visualizer uses your images by naming your files using a specific format. The engine reads these tags to make smart decisions about when and how to display them.
              </p>
              
              <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-indigo-300 border border-neutral-800 text-center">
                [type]__[aspect]__[color]__[behavior].ext
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-wider text-xs border-b border-neutral-800 pb-1">1. Type (Required)</h3>
                  <ul className="space-y-2 text-neutral-400 mt-2">
                    <li><strong className="text-neutral-200">bg</strong> - Backgrounds (covers screen)</li>
                    <li><strong className="text-neutral-200">poster</strong> - Large visual elements (foreground visuals)</li>
                    <li><strong className="text-neutral-200">overlay</strong> - Floating logos/graphics</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-wider text-xs border-b border-neutral-800 pb-1">2. Aspect Ratio</h3>
                  <ul className="space-y-2 text-neutral-400 mt-2">
                    <li><strong className="text-neutral-200">landscape</strong> - Wide images</li>
                    <li><strong className="text-neutral-200">portrait</strong> - Tall images</li>
                    <li><strong className="text-neutral-200">square</strong> - 1:1 images</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-wider text-xs border-b border-neutral-800 pb-1">3. Color Profile</h3>
                  <ul className="space-y-2 text-neutral-400 mt-2">
                    <li><strong className="text-neutral-200">mono</strong> - Black & white / grayscale</li>
                    <li><strong className="text-neutral-200">accent</strong> - Mostly mono with one color</li>
                    <li><strong className="text-neutral-200">color</strong> - Full color images</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-wider text-xs border-b border-neutral-800 pb-1">4. Behavior</h3>
                  <ul className="space-y-2 text-neutral-400 mt-2">
                    <li><strong className="text-neutral-200">frequent</strong> - Shows up often</li>
                    <li><strong className="text-neutral-200">rare</strong> - Shows up rarely</li>
                    <li><strong className="text-neutral-200">peak</strong> - Only flashes on heavy bass/kicks</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800">
                <h3 className="text-white font-bold mb-3 uppercase tracking-wider text-xs">Examples</h3>
                <ul className="space-y-3 font-mono text-xs text-neutral-400 bg-black/30 p-4 rounded-lg border border-neutral-800/50">
                  <li className="flex flex-col gap-1">
                    <span className="text-white">bg__landscape__mono__01.jpg</span>
                    <span className="text-neutral-500 font-sans text-[10px]">A black and white landscape background.</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-white">logo__square__accent__rare.png</span>
                    <span className="text-neutral-500 font-sans text-[10px]">A square logo with an accent color that rarely appears.</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-white">poster__portrait__color__peak.jpg</span>
                    <span className="text-neutral-500 font-sans text-[10px]">A colorful portrait poster that only flashes on heavy beats.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-800 space-y-4">
                <h3 className="text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  Visual Modes & Dynamics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-neutral-800/50 space-y-2">
                    <h4 className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">Signal Glitch</h4>
                    <p className="text-neutral-400 text-xs leading-relaxed">High-energy, chaotic visual system. Uses rhythmic repetition and controlled randomness. Best for fast-paced, intense audio.</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-neutral-800/50 space-y-2">
                    <h4 className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">Lava Space</h4>
                    <p className="text-neutral-400 text-xs leading-relaxed">Fluid, organic matter in motion. Features 3D depth, bubbling blobs, and smooth material blending. Reactive to all frequency bands.</p>
                  </div>
                </div>
                <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                  <p className="text-indigo-300 text-xs leading-relaxed">
                    <strong className="text-white">Blob Dynamics:</strong> Specifically for Lava Space. When enabled, it enhances the fluid's bubbling, droplet behavior, and dimensional morphing for a more intense liquid experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
