import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, MicOff, Play, Pause, Square, Maximize, Image as ImageIcon, X, MonitorUp, FileAudio, Smartphone, Dices, Zap, RefreshCw, Info, Wifi } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { RemoteControl } from './RemoteControl';

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <label 
    className="flex items-center justify-between gap-3 cursor-pointer py-2 px-3 bg-neutral-900/80 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-colors w-full"
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
      <div className="w-9 h-5 bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
    </div>
  </label>
);

const APP_VERSION = "1.5";

const AudioLevelMeter = ({ mode, deviceId, file, onError }: { mode: 'mic' | 'ambient' | 'screen' | 'file', deviceId?: string, file?: File, onError?: (err: string | null) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const reqRef = useRef<number>(0);

  useEffect(() => {
    if (mode === 'ambient') {
      if (onError) onError(null);
      return;
    }

    let isMounted = true;

    const startAudio = async () => {
      try {
        if (onError) onError(null);
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
          await audioEl.play();
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
          const stream = await navigator.mediaDevices.getDisplayMedia({
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
          if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            onError("Permission denied by user. Please allow access to use this feature.");
          } else if (err.message?.includes('No audio track found')) {
            onError(err.message);
          } else if (mode === 'screen') {
            onError("Screen capture is blocked in this preview. Please open the app in a new tab (top right icon) to use this feature.");
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

  if (mode === 'ambient') return null;

  return (
    <div className="mt-3 bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Signal Level</span>
        <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold animate-pulse">Active</span>
      </div>
      <canvas ref={canvasRef} width={300} height={12} className="w-full h-3 rounded-full overflow-hidden bg-neutral-950" />
    </div>
  );
};

export type AssetRole = 'bg' | 'mid' | 'fg' | 'logo' | 'poster' | 'overlay' | 'flash';
export type AssetBehavior = 'rare' | 'frequent' | 'peak' | 'normal';
export type AssetStyle = 'mono' | 'color' | 'accent' | 'dirty' | 'auto';

export interface ImageMetadata {
  role: AssetRole;
  behavior: AssetBehavior;
  style: AssetStyle;
}

export interface AssetItem {
  image: HTMLImageElement;
  metadata: ImageMetadata;
  file: File;
}

const parseMetadata = (file: File, img: HTMLImageElement): ImageMetadata => {
  const filename = file.name.toLowerCase();
  const parts = filename.split('.')[0].split('__');
  
  let role: AssetRole | undefined;
  let behavior: AssetBehavior | undefined;
  let style: AssetStyle | undefined;

  const roles = ['bg', 'mid', 'fg', 'logo', 'poster', 'overlay', 'flash'];
  const behaviors = ['rare', 'frequent', 'peak'];
  const styles = ['mono', 'color', 'accent', 'dirty'];

  parts.forEach(part => {
    if (roles.includes(part)) role = part as AssetRole;
    if (behaviors.includes(part)) behavior = part as AssetBehavior;
    if (styles.includes(part)) style = part as AssetStyle;
  });

  // Auto classification fallback
  if (!role) {
    const isPng = file.type === 'image/png';
    const ratio = img.width / img.height;
    
    if (isPng) {
      role = 'overlay';
    } else if (ratio > 1.2) {
      role = 'bg';
    } else if (ratio < 0.8) {
      role = 'poster';
    } else {
      role = 'mid';
    }
  }

  return {
    role: role || 'bg',
    behavior: behavior || 'frequent',
    style: style || 'auto'
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
        await this.audioElement.play();
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
      if (e.message && e.message.includes("No audio track found")) {
        throw e;
      }
      if (e.name === 'NotAllowedError' || e.message?.includes('Permission denied')) {
        throw new Error("Permission denied by user. Please allow access to use this feature.");
      }
      if (mode === 'screen') {
        throw new Error("Screen capture is blocked in this preview. Please open the app in a new tab (top right icon) to use this feature.");
      } else {
        throw new Error("Microphone access was denied. Please allow microphone access or try opening in a new tab.");
      }
    }
  }

  getAudioData(time: number) {
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

    // Smooth lerp
    this.smoothedVol += (targetVol - this.smoothedVol) * 0.15;
    this.smoothedLow += (targetLow - this.smoothedLow) * 0.15;
    this.smoothedMid += (targetMid - this.smoothedMid) * 0.15;
    this.smoothedHigh += (targetHigh - this.smoothedHigh) * 0.15;

    // Transient detection
    const lowTransient = targetLow - this.prevLow;
    const midTransient = targetMid - this.prevMid;
    const highTransient = targetHigh - this.prevHigh;

    // Kick detection (low frequency transient)
    if (lowTransient > 0.05 && targetLow > 0.4 && time - this.lastKickTime > 0.3) {
      this.beatCount = (this.beatCount + 1) % 4;
      
      // Groove-based variation
      if (this.beatCount === 0) {
        this.kickPulse = 1.0; // Beat 1: normal
      } else if (this.beatCount === 1) {
        this.kickPulse = 0.5; // Beat 2: reduced
      } else if (this.beatCount === 2) {
        this.kickPulse = 0.8; // Beat 3: normal-ish
      } else if (this.beatCount === 3) {
        this.kickPulse = 1.2; // Beat 4: stronger
      }
      
      this.lastKickTime = time;
    }

    // Clap detection (mid frequency transient)
    if (midTransient > 0.08 && targetMid > 0.3 && time - this.lastClapTime > 0.2) {
      this.clapPulse = 1.0;
      this.lastClapTime = time;
    }

    // Hat detection (high frequency transient)
    if (highTransient > 0.05 && targetHigh > 0.2 && time - this.lastHatTime > 0.1) {
      this.hatPulse = 1.0;
      this.lastHatTime = time;
    }

    // Decay envelopes
    this.kickPulse *= 0.85;
    this.clapPulse *= 0.8;
    this.hatPulse *= 0.7;

    // Bass groove (smoothed low energy)
    this.bassGroove = this.smoothedLow;

    this.prevLow = targetLow;
    this.prevMid = targetMid;
    this.prevHigh = targetHigh;

    return {
      vol: this.smoothedVol,
      low: this.smoothedLow,
      mid: this.smoothedMid,
      high: this.smoothedHigh,
      rawVol: targetVol,
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
        this.audioElement.play();
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
  globalEffects: number;
  flickerAmount: number;
  motionAmount: number;
  eventDensity: number;
  transitionSpeed: number;
}

class VisualEngine {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  assets: AssetItem[];
  audioMode: 'mic' | 'ambient' | 'screen' | 'file';
  deviceId?: string;
  audioFile?: File;
  colorMode: 'mostly-mono' | 'mono-accent' | 'mixed' | 'spectral-rgb';
  
  options: VisualOptions = {
    enableGlitch: true,
    enableVHS: true,
    enableCurvature: true,
    enableNoise: true,
    enableFlicker: true,
    enableRGBSplit: true,
    globalEffects: 0.8,
    flickerAmount: 0.5,
    motionAmount: 0.5,
    eventDensity: 0.5,
    transitionSpeed: 0.5
  };
  
  bgAssets: AssetItem[] = [];
  fgAssets: AssetItem[] = [];
  overlayAssets: AssetItem[] = [];
  
  bgIndex: number = 0;
  fgIndex: number = 0;
  overlayIndex: number = 0;
  
  bgTex: WebGLTexture;
  fgTex: WebGLTexture;
  overlayTex: WebGLTexture;

  time: number = 0;
  zoom: number = 0;
  audioAnalyzer: AudioAnalyzer | null = null;
  running: boolean = true;
  lastTime: number;
  program!: WebGLProgram;
  uniforms: any = {};
  onError?: (err: Error) => void;

  lastBgChange: number = 0;
  lastFgChange: number = 0;
  lastOverlayChange: number = 0;

  lastPeakTime: number = 0;
  nextRandomEventTime: number = 0;
  
  glitchType: number = 0;
  glitchTime: number = 0;
  glitchIntensity: number = 0;
  glitchDuration: number = 0;

  constructor(
    canvas: HTMLCanvasElement, 
    assets: AssetItem[], 
    audioMode: 'mic' | 'ambient' | 'screen' | 'file', 
    deviceId: string | undefined, 
    audioFile: File | undefined,
    colorMode: 'mostly-mono' | 'mono-accent' | 'mixed' | 'spectral-rgb',
    onError?: (err: Error) => void
  ) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl')!;
    this.assets = assets;
    this.audioMode = audioMode;
    this.deviceId = deviceId;
    this.audioFile = audioFile;
    this.colorMode = colorMode;
    this.onError = onError;
    
    this.bgAssets = assets.filter(a => ['bg'].includes(a.metadata.role));
    this.fgAssets = assets.filter(a => ['fg', 'mid', 'poster'].includes(a.metadata.role));
    this.overlayAssets = assets.filter(a => ['overlay', 'logo', 'flash'].includes(a.metadata.role));
    
    if (this.bgAssets.length === 0) this.bgAssets = assets;
    if (this.fgAssets.length === 0) this.fgAssets = assets;
    if (this.overlayAssets.length === 0) this.overlayAssets = assets;
    
    this.bgIndex = Math.floor(Math.random() * this.bgAssets.length);
    this.fgIndex = Math.floor(Math.random() * this.fgAssets.length);
    this.overlayIndex = Math.floor(Math.random() * this.overlayAssets.length);

    this.bgTex = this.gl.createTexture()!;
    this.fgTex = this.gl.createTexture()!;
    this.overlayTex = this.gl.createTexture()!;
    
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

  updateTextures() {
    const gl = this.gl;
    const bindImage = (tex: WebGLTexture, img: HTMLImageElement) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    bindImage(this.bgTex, this.bgAssets[this.bgIndex].image);
    bindImage(this.fgTex, this.fgAssets[this.fgIndex].image);
    bindImage(this.overlayTex, this.overlayAssets[this.overlayIndex].image);
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
      uniform sampler2D u_tex_fg;
      uniform sampler2D u_tex_overlay;
      
      uniform float u_time;
      uniform float u_global_effects;
      uniform float u_vol;
      uniform float u_high;
      uniform float u_low;
      uniform float u_zoom;
      
      uniform float u_kick;
      uniform float u_clap;
      uniform float u_hat;
      uniform float u_bass;
      
      uniform vec2 u_resolution;
      uniform vec2 u_res_bg;
      uniform vec2 u_res_fg;
      uniform vec2 u_res_overlay;
      
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
      uniform float u_flicker_amount;
      uniform float u_motion_amount;

      float rand(vec2 co){
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
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

      void main() {
        vec2 uv = vUv;

        // Exponential scaling for the "fireworks" magnitude of existing effects
        float effect_mult = u_global_effects + pow(u_global_effects, 4.0) * 2.0;

        // Zoom punch
        uv = (uv - 0.5) * (1.0 - u_zoom * 0.05 * effect_mult - u_kick * 0.03 * effect_mult) + 0.5;

        // CRT Curvature
        if (u_enable_curvature > 0.5) {
            vec2 crtUv = uv - 0.5;
            float rsq = crtUv.x * crtUv.x + crtUv.y * crtUv.y;
            crtUv += crtUv * (rsq * 0.1 * effect_mult);
            uv = crtUv + 0.5;
        }

        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        // Smooth Drift (Base state) - use u_bass for groove
        float driftX = sin(u_time * 0.2 + uv.y * 1.0) * 0.01 * effect_mult * u_motion_amount * (1.0 + u_bass);
        float driftY = cos(u_time * 0.15 + uv.x * 0.8) * 0.01 * effect_mult * u_motion_amount * (1.0 + u_bass);
        uv += vec2(driftX, driftY);

        // Glitch Events
        float tear = 0.0;
        float roll = 0.0;
        float noiseBurst = 0.0;
        float flickerBurst = 0.0;
        float rgbSplit = 0.0;

        if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
            float active_intensity = u_glitch_intensity * u_flicker_amount * 2.0;
            if (u_glitch_type == 1) {
                // Flicker Burst
                flickerBurst = step(0.5, fract(u_glitch_time * 15.0)) * active_intensity * 0.5;
            } else if (u_glitch_type == 2) {
                // Horizontal Tear
                float tearBand = step(0.98, sin(uv.y * 50.0 + u_glitch_time * 20.0));
                tear = (rand(vec2(uv.y * 20.0, u_time)) - 0.5) * 0.05 * active_intensity * tearBand;
                rgbSplit += 0.02 * active_intensity * tearBand;
            } else if (u_glitch_type == 3) {
                // Tracking Roll
                roll = fract(u_glitch_time * 2.0) * active_intensity * 0.05;
                uv.y = fract(uv.y + roll);
            } else if (u_glitch_type == 4) {
                // Noise Burst
                noiseBurst = active_intensity * 0.3;
            } else if (u_glitch_type == 5) {
                // Subtle Pixel Sort (simulated)
                float sortBand = step(0.95, sin(uv.y * 15.0 + u_time * 5.0));
                uv.x -= sortBand * (rand(vec2(uv.y, 0.0)) * 0.05 * active_intensity);
            }
        }
        
        // Clap adds quick horizontal crackle/tear
        if (u_enable_glitch > 0.5 && u_clap > 0.1) {
            float clapTearBand = step(0.95, sin(uv.y * 60.0 + u_time * 30.0));
            tear += (rand(vec2(uv.y * 10.0, u_time)) - 0.5) * 0.02 * u_clap * effect_mult * u_flicker_amount * clapTearBand;
            rgbSplit += 0.01 * u_clap * u_flicker_amount * clapTearBand;
        }

        // Hat adds tiny noise modulation
        if (u_enable_noise > 0.5 && u_hat > 0.1) {
            noiseBurst += u_hat * 0.05;
        }

        uv.x += tear;

        // RGB Shift (affected by vol/mid) - make it subtle in base state
        float shift = 0.0;
        if (u_enable_rgb_split > 0.5) {
            shift = 0.002 * effect_mult * (1.0 + u_vol);
            shift += rgbSplit;
        }
        
        // BG (Cover)
        vec2 uv_bg_r = getCoverUv(uv + vec2(shift, 0.0), u_resolution, u_res_bg);
        vec2 uv_bg_g = getCoverUv(uv, u_resolution, u_res_bg);
        vec2 uv_bg_b = getCoverUv(uv - vec2(shift, 0.0), u_resolution, u_res_bg);
        
        vec4 col_bg;
        col_bg.r = texture2D(u_tex_bg, uv_bg_r).r;
        col_bg.g = texture2D(u_tex_bg, uv_bg_g).g;
        col_bg.b = texture2D(u_tex_bg, uv_bg_b).b;
        col_bg.a = 1.0;

        // FG (Contain-Plus)
        // Darkened cover version to fill empty space, slightly offset for a "fake blur" feel
        vec2 uv_fg_cover = getCoverUv(uv, u_resolution, u_res_fg);
        vec4 col_fg_bg = texture2D(u_tex_fg, uv_fg_cover) * 0.15;
        col_fg_bg += texture2D(u_tex_fg, uv_fg_cover + vec2(0.01)) * 0.05;
        col_fg_bg += texture2D(u_tex_fg, uv_fg_cover - vec2(0.01)) * 0.05;

        vec2 fg_offset = vec2(sin(u_time * 0.1) * 0.01, cos(u_time * 0.08) * 0.01) * effect_mult * u_motion_amount * 2.0;
        vec2 uv_fg = getContainUv(uv + fg_offset, u_resolution, u_res_fg);
        // Scale down slightly to fit well
        uv_fg = (uv_fg - 0.5) * 1.02 + 0.5;
        
        vec4 col_fg = vec4(0.0);
        if (uv_fg.x >= 0.0 && uv_fg.x <= 1.0 && uv_fg.y >= 0.0 && uv_fg.y <= 1.0) {
            vec2 uv_fg_r = uv_fg + vec2(shift, 0.0);
            vec2 uv_fg_b = uv_fg - vec2(shift, 0.0);
            col_fg.r = texture2D(u_tex_fg, uv_fg_r).r;
            col_fg.g = texture2D(u_tex_fg, uv_fg).g;
            col_fg.b = texture2D(u_tex_fg, uv_fg_b).b;
            col_fg.a = texture2D(u_tex_fg, uv_fg).a;
        }

        // Overlay (Free floating, smaller scale)
        vec2 overlay_offset = vec2(cos(u_time * 0.2) * 0.02, sin(u_time * 0.15) * 0.02) * effect_mult * u_motion_amount * 2.0;
        vec2 uv_overlay = getContainUv(uv + overlay_offset, u_resolution, u_res_overlay);
        // Scale down more (logos should be tasteful)
        uv_overlay = (uv_overlay - 0.5) * 1.5 + 0.5;
        vec4 col_overlay = vec4(0.0);
        if (uv_overlay.x >= 0.0 && uv_overlay.x <= 1.0 && uv_overlay.y >= 0.0 && uv_overlay.y <= 1.0) {
            col_overlay = texture2D(u_tex_overlay, uv_overlay);
        }

        // Blend
        vec4 col = col_bg;
        // Add darkened FG cover to create a thematic backdrop
        col.rgb += col_fg_bg.rgb * 0.5; 
        // Alpha blend FG
        col.rgb = mix(col.rgb, col_fg.rgb, col_fg.a);
        // Screen blend Overlay
        col.rgb = 1.0 - (1.0 - col.rgb) * (1.0 - col_overlay.rgb * col_overlay.a * 0.8);

        // Color Mode
        float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        if (u_color_mode == 0) { // mostly-mono
            col.rgb = mix(vec3(gray), col.rgb, 0.05 + u_vol * 0.1);
        } else if (u_color_mode == 1) { // mono-accent
            float burst = step(0.85, u_vol) * step(0.8, rand(vec2(u_time, 2.0)));
            col.rgb = mix(vec3(gray), col.rgb, 0.1 + burst * 0.7);
        } else if (u_color_mode == 2) { // mixed
            col.rgb = mix(vec3(gray), col.rgb, 0.4 + u_vol * 0.3);
        } else if (u_color_mode == 3) { // spectral-rgb
            float burst = step(0.85, rand(floor(uv * 30.0) + u_time)) * u_vol;
            vec3 overblown = pow(col.rgb, vec3(0.6)) * 2.0;
            overblown.r *= 1.0 + u_kick * 1.5;
            overblown.g *= 1.0 + u_hat * 1.5;
            overblown.b *= 1.0 + u_bass * 1.5;
            col.rgb = mix(col.rgb, clamp(overblown, 0.0, 1.0), 0.2 + burst * 0.8);
        }

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

        // Flicker (affected by high/vol)
        if (u_enable_flicker > 0.5) {
            float baseFlicker = sin(u_time * 10.0) * 0.01 * effect_mult * u_flicker_amount;
            col.rgb += baseFlicker + flickerBurst * 0.2 + u_hat * 0.02 * effect_mult * u_flicker_amount;
        }

        // Kick adds slight contrast / brightness push
        col.rgb += u_kick * 0.1 * effect_mult;
        col.rgb = mix(col.rgb, smoothstep(0.0, 1.0, col.rgb), u_kick * 0.4 * effect_mult);

        // Clap adds short flash
        col.rgb += u_clap * 0.2 * effect_mult;

        // Vignette
        float dist = distance(vUv, vec2(0.5));
        col.rgb *= smoothstep(0.9, 0.3, dist);

        gl_FragColor = vec4(col.rgb, 1.0);
      }
    `);
    gl.compileShader(fs);

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
      u_tex_fg: gl.getUniformLocation(this.program, 'u_tex_fg'),
      u_tex_overlay: gl.getUniformLocation(this.program, 'u_tex_overlay'),
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_global_effects: gl.getUniformLocation(this.program, 'u_global_effects'),
      u_vol: gl.getUniformLocation(this.program, 'u_vol'),
      u_high: gl.getUniformLocation(this.program, 'u_high'),
      u_low: gl.getUniformLocation(this.program, 'u_low'),
      u_zoom: gl.getUniformLocation(this.program, 'u_zoom'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_res_bg: gl.getUniformLocation(this.program, 'u_res_bg'),
      u_res_fg: gl.getUniformLocation(this.program, 'u_res_fg'),
      u_res_overlay: gl.getUniformLocation(this.program, 'u_res_overlay'),
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
      u_flicker_amount: gl.getUniformLocation(this.program, 'u_flicker_amount'),
      u_motion_amount: gl.getUniformLocation(this.program, 'u_motion_amount'),
    };

    gl.uniform1i(this.uniforms.u_tex_bg, 0);
    gl.uniform1i(this.uniforms.u_tex_fg, 1);
    gl.uniform1i(this.uniforms.u_tex_overlay, 2);
  }

  setColorMode(mode: 'mostly-mono' | 'mono-accent' | 'mixed' | 'spectral-rgb') {
    this.colorMode = mode;
  }

  setOptions(opts: Partial<VisualOptions>) {
    this.options = { ...this.options, ...opts };
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

  render = () => {
    if (!this.running) return;
    requestAnimationFrame(this.render);

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.time += dt;

    let vol = 0, low = 0, mid = 0, high = 0, rawVol = 0;
    let kick = 0, clap = 0, hat = 0, bass = 0;
    if (this.audioAnalyzer) {
      const data = this.audioAnalyzer.getAudioData(this.time);
      vol = data.vol;
      low = data.low;
      mid = data.mid;
      high = data.high;
      rawVol = data.rawVol;
      kick = data.kickPulse;
      clap = data.clapPulse;
      hat = data.hatPulse;
      bass = data.bassGroove;
    } else {
      // simulate random peaks occasionally if no audio
      const simulatedPeak = Math.random() > 0.98 ? 0.9 : 0.0;
      vol = Math.sin(this.time * 0.5) * 0.3 + 0.3 + simulatedPeak;
      rawVol = vol;
      low = Math.sin(this.time * 0.2) * 0.5 + 0.5;
      high = Math.cos(this.time * 0.7) * 0.5 + 0.5;
      bass = low;
      if (simulatedPeak > 0) kick = 1.0;
      kick *= 0.85;
    }

    // Change assets based on volume and probability
    let changed = false;
    
    // Peak detection (use raw volume for sharper peaks)
    const isPeak = rawVol > 0.65 && (rawVol - vol) > 0.1;

    // Glitch Event Logic
    if (this.options.enableGlitch) {
        if (this.glitchIntensity > 0) {
            this.glitchTime += dt;
            if (this.glitchTime > this.glitchDuration) {
                this.glitchIntensity = 0; // End glitch
            }
        } else {
            // Trigger new glitch?
            let triggerGlitch = false;
            
            // 1. Audio Peak Trigger (controlled randomness)
            if (kick > 0.9 && this.time - this.lastPeakTime > 0.4) {
                if (Math.random() < (0.05 + this.options.eventDensity * 0.4)) { // 5% to 45% chance on strong kick
                    triggerGlitch = true;
                    this.lastPeakTime = this.time;
                }
            } else if (clap > 0.8 && this.time - this.lastPeakTime > 0.3) {
                if (Math.random() < (0.05 + this.options.eventDensity * 0.3)) { // 5% to 35% chance on strong clap
                    triggerGlitch = true;
                    this.lastPeakTime = this.time;
                }
            }
            
            // 2. Random Timing Trigger
            if (this.time > this.nextRandomEventTime) {
                triggerGlitch = true;
                const baseTime = 4.0 - this.options.eventDensity * 3.0; // 4s to 1s
                const varTime = 8.0 - this.options.eventDensity * 6.0; // 8s to 2s
                this.nextRandomEventTime = this.time + baseTime + Math.random() * varTime;
            }

            if (triggerGlitch) {
                this.glitchType = Math.floor(Math.random() * 5) + 1; // 1 to 5
                this.glitchTime = 0;
                this.glitchDuration = 0.05 + Math.random() * 0.2; // 0.05s to 0.25s (shorter)
                this.glitchIntensity = 0.3 + Math.random() * 0.4; // 0.3 to 0.7 (more subtle)
            }
        }
    } else {
        this.glitchIntensity = 0;
    }

    if (isPeak && Math.random() > (1.0 - this.options.eventDensity * 0.9)) {
      this.zoom = 1.0;
      
      const speedMult = Math.max(0.1, 2.0 - this.options.transitionSpeed * 1.9);
      
      // Backgrounds switch less aggressively, but more often on peaks
      if (Math.random() > (0.8 - this.options.eventDensity * 0.5) && this.time - this.lastBgChange > (2.0 - this.options.eventDensity * 1.5) * speedMult) {
        this.bgIndex = this.pickAsset(this.bgAssets, vol, this.bgIndex);
        this.lastBgChange = this.time;
        changed = true;
      }
      // Posters stay visible long enough
      if (Math.random() > (0.6 - this.options.eventDensity * 0.5) && this.time - this.lastFgChange > (1.5 - this.options.eventDensity * 1.0) * speedMult) {
        this.fgIndex = this.pickAsset(this.fgAssets, vol, this.fgIndex);
        this.lastFgChange = this.time;
        changed = true;
      }
      // Overlays/Flashes can be brief
      if (Math.random() > (0.4 - this.options.eventDensity * 0.4) && this.time - this.lastOverlayChange > (0.5 - this.options.eventDensity * 0.4) * speedMult) {
        this.overlayIndex = this.pickAsset(this.overlayAssets, vol, this.overlayIndex);
        this.lastOverlayChange = this.time;
        changed = true;
      }
    } else if (Math.random() > (0.999 - this.options.eventDensity * 0.008)) {
      const speedMult = Math.max(0.1, 2.0 - this.options.transitionSpeed * 1.9);
      
      // Occasional random change even without peak (ambient breathing)
      if (this.time - this.lastBgChange > (6.0 - this.options.eventDensity * 4.0) * speedMult) {
        this.bgIndex = this.pickAsset(this.bgAssets, vol, this.bgIndex);
        this.lastBgChange = this.time;
        changed = true;
      }
      if (this.time - this.lastFgChange > (4.0 - this.options.eventDensity * 2.0) * speedMult) {
        this.fgIndex = this.pickAsset(this.fgAssets, vol, this.fgIndex);
        this.lastFgChange = this.time;
        changed = true;
      }
      if (this.time - this.lastOverlayChange > (3.0 - this.options.eventDensity * 2.0) * speedMult) {
        this.overlayIndex = this.pickAsset(this.overlayAssets, vol, this.overlayIndex);
        this.lastOverlayChange = this.time;
        changed = true;
      }
    }

    if (changed) {
      this.updateTextures();
    }

    this.zoom += (0.0 - this.zoom) * 0.1;

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fgTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);

    gl.uniform1f(this.uniforms.u_time, this.time);
    gl.uniform1f(this.uniforms.u_global_effects, this.options.globalEffects);
    gl.uniform1f(this.uniforms.u_vol, vol);
    gl.uniform1f(this.uniforms.u_high, high);
    gl.uniform1f(this.uniforms.u_low, low);
    gl.uniform1f(this.uniforms.u_zoom, this.zoom);
    
    gl.uniform1i(this.uniforms.u_glitch_type, this.glitchType);
    gl.uniform1f(this.uniforms.u_glitch_time, this.glitchTime);
    gl.uniform1f(this.uniforms.u_glitch_intensity, this.glitchIntensity);

    gl.uniform1f(this.uniforms.u_kick, kick);
    gl.uniform1f(this.uniforms.u_clap, clap);
    gl.uniform1f(this.uniforms.u_hat, hat);
    gl.uniform1f(this.uniforms.u_bass, bass);

    let colorModeInt = 0;
    if (this.colorMode === 'mono-accent') colorModeInt = 1;
    else if (this.colorMode === 'mixed') colorModeInt = 2;
    else if (this.colorMode === 'spectral-rgb') colorModeInt = 3;
    gl.uniform1i(this.uniforms.u_color_mode, colorModeInt);

    gl.uniform1f(this.uniforms.u_enable_glitch, this.options.enableGlitch ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_vhs, this.options.enableVHS ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_curvature, this.options.enableCurvature ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_noise, this.options.enableNoise ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_flicker, this.options.enableFlicker ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_rgb_split, this.options.enableRGBSplit ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_flicker_amount, this.options.flickerAmount);
    gl.uniform1f(this.uniforms.u_motion_amount, this.options.motionAmount);

    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    
    const bgImg = this.bgAssets[this.bgIndex].image;
    gl.uniform2f(this.uniforms.u_res_bg, bgImg.width, bgImg.height);
    
    const fgImg = this.fgAssets[this.fgIndex].image;
    gl.uniform2f(this.uniforms.u_res_fg, fgImg.width, fgImg.height);
    
    const overlayImg = this.overlayAssets[this.overlayIndex].image;
    gl.uniform2f(this.uniforms.u_res_overlay, overlayImg.width, overlayImg.height);

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
      gl.deleteTexture(this.bgTex);
      gl.deleteTexture(this.fgTex);
      gl.deleteTexture(this.overlayTex);
      if (this.program) gl.deleteProgram(this.program);
    }
  }
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const remoteRoomId = urlParams.get('remote');

  if (remoteRoomId) {
    return <RemoteControl roomId={remoteRoomId} />;
  }

  const [roomId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [showAssetInfoModal, setShowAssetInfoModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [audioMode, setAudioMode] = useState<'mic' | 'ambient' | 'screen' | 'file'>('ambient');
  const [audioFile, setAudioFile] = useState<File | undefined>();
  const [deviceId, setDeviceId] = useState<string>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<'mostly-mono' | 'mono-accent' | 'mixed' | 'spectral-rgb'>('mostly-mono');
  
  const [enableGlitch, setEnableGlitch] = useState(true);
  const [enableVHS, setEnableVHS] = useState(true);
  const [enableCurvature, setEnableCurvature] = useState(true);
  const [enableNoise, setEnableNoise] = useState(true);
  const [enableFlicker, setEnableFlicker] = useState(true);
  const [enableRGBSplit, setEnableRGBSplit] = useState(true);
  
  const [globalEffects, setGlobalEffects] = useState(0.8);
  const [flickerAmount, setFlickerAmount] = useState(0.5);
  const [motionAmount, setMotionAmount] = useState(0.5);
  const [eventDensity, setEventDensity] = useState(0.5);
  const [transitionSpeed, setTransitionSpeed] = useState(0.5);

  const [isPlaying, setIsPlaying] = useState(false);
  const [filePlaying, setFilePlaying] = useState(true);
  const [fileVolume, setFileVolume] = useState(1.0);
  const [showUI, setShowUI] = useState(false);
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
          setAssets(loadedAssets);
        }
      };
      img.src = url;
    });
  };

  const handleShuffle = () => {
    setAssets(prev => [...prev].sort(() => Math.random() - 0.5));
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

  const handleStart = () => {
    if (assets.length === 0) return;
    setIsPlaying(true);
  };

  const stateRef = useRef({ 
    motionAmount, globalEffects, eventDensity, flickerAmount, transitionSpeed,
    enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit
  });

  useEffect(() => {
    stateRef.current = { 
      motionAmount, globalEffects, eventDensity, flickerAmount, transitionSpeed,
      enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit
    };
    if (socketRef.current) {
      socketRef.current.emit('sync-state', roomId, stateRef.current);
    }
  }, [motionAmount, globalEffects, eventDensity, flickerAmount, transitionSpeed, enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit, roomId]);

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

    socket.on('request-sync', () => {
      socket.emit('sync-state', roomId, stateRef.current);
    });

    socket.on('command', (cmd) => {
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
      if (cmd.action === 'shuffle') {
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
    if (isPlaying && canvasRef.current && !engineRef.current) {
      setAudioError(null);
      engineRef.current = new VisualEngine(
        canvasRef.current, 
        assets, 
        audioMode, 
        deviceId, 
        audioFile,
        colorMode,
        (err) => {
          setAudioError(err.message || "Audio access denied");
          handleStop();
        }
      );
    }
  }, [isPlaying, assets, audioMode, deviceId, audioFile]);

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
      engineRef.current.setOptions({
        enableGlitch,
        enableVHS,
        enableCurvature,
        enableNoise,
        enableFlicker,
        enableRGBSplit,
        globalEffects,
        flickerAmount,
        motionAmount,
        eventDensity,
        transitionSpeed
      });
    }
  }, [enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit, globalEffects, flickerAmount, motionAmount, eventDensity, transitionSpeed]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  if (isPlaying) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden" onClick={() => setShowUI(!showUI)}>
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Hint Text */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${showHint ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-black/50 backdrop-blur-sm text-white/50 px-4 py-2 rounded-full text-sm tracking-widest uppercase animate-pulse">
            Tap anywhere for controls
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
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Controls</span>
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

          {/* Sliders Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">Global</span>
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">Flicker</span>
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">Motion</span>
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">Density</span>
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest leading-none">Speed</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-800/50">
            <ToggleSwitch label="Glitch" checked={enableGlitch} onChange={setEnableGlitch} />
            <ToggleSwitch label="VHS" checked={enableVHS} onChange={setEnableVHS} />
            <ToggleSwitch label="Curve" checked={enableCurvature} onChange={setEnableCurvature} />
            <ToggleSwitch label="Noise" checked={enableNoise} onChange={setEnableNoise} />
            <ToggleSwitch label="Flicker" checked={enableFlicker} onChange={setEnableFlicker} />
            <ToggleSwitch label="RGB" checked={enableRGBSplit} onChange={setEnableRGBSplit} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-300 font-mono flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
      <div className="max-w-md w-full border border-neutral-800 p-8 space-y-8 bg-[#050505] shadow-2xl relative">
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tighter uppercase text-white">VIZR</h1>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-white text-black text-[10px] font-bold tracking-widest uppercase">v{APP_VERSION}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Web-Based Visualization System</p>
        </div>

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
                      <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded">{asset.metadata.role}</span>
                      <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded">{asset.metadata.behavior}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            
            {audioMode === 'file' && (
              <div className="mt-2">
                <label className="flex items-center justify-center w-full p-4 border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors text-neutral-400 hover:text-white">
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
                  {audioFile ? (
                    <span className="text-sm truncate max-w-[200px]">{audioFile.name}</span>
                  ) : (
                    <span className="text-sm flex items-center gap-2"><Upload size={16} /> Select Audio File</span>
                  )}
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
              <p className="text-red-500 text-xs mt-2">{audioError}</p>
            )}
            
            <AudioLevelMeter mode={audioMode} deviceId={deviceId} file={audioFile} onError={setAudioError} />
          </div>

          {/* Global Effect Sliders */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">3. Global Effect Sliders</label>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-400 uppercase">Global Effects</span>
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
                  <span className="text-xs text-neutral-400 uppercase">Flicker</span>
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
                  <span className="text-xs text-neutral-400 uppercase">Motion Amount</span>
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
                  <span className="text-xs text-neutral-400 uppercase">Event Density</span>
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
                  <span className="text-xs text-neutral-400 uppercase">Transition Speed</span>
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

          {/* Visual Toggles */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">4. Visual Toggles</label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <ToggleSwitch label="Glitch Effects" checked={enableGlitch} onChange={setEnableGlitch} />
              <ToggleSwitch label="VHS Overlay" checked={enableVHS} onChange={setEnableVHS} />
              <ToggleSwitch label="Screen Curvature" checked={enableCurvature} onChange={setEnableCurvature} />
              <ToggleSwitch label="Noise Layer" checked={enableNoise} onChange={setEnableNoise} />
              <ToggleSwitch label="Flicker" checked={enableFlicker} onChange={setEnableFlicker} />
              <ToggleSwitch label="RGB Split" checked={enableRGBSplit} onChange={setEnableRGBSplit} />
            </div>
          </div>

          {/* Color Mode */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">5. Color Mode</label>
            <select 
              value={colorMode} 
              onChange={e => setColorMode(e.target.value as any)}
              className="w-full p-3 bg-neutral-950 border border-neutral-800 text-sm uppercase tracking-wide text-neutral-300 outline-none focus:border-neutral-500"
            >
              <option value="mostly-mono">Mostly Mono</option>
              <option value="mono-accent">Mono + Accent</option>
              <option value="mixed">Mixed</option>
              <option value="spectral-rgb">Spectral RGB</option>
            </select>
          </div>
        </div>

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

      {/* Footer */}
      <footer className="max-w-md mx-auto mt-8 pb-8 text-center space-y-6">
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
                    <li><strong className="text-neutral-200">fg</strong> - Foreground (contained, posters)</li>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
