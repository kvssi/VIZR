import { SignalFeatures } from '../types';

export class AudioAnalyzer {
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
  isStopped: boolean = false;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 256;
    this.analyzer.smoothingTimeConstant = 0.8; // Built-in smoothing
    this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
  }

  async start(mode: 'mic' | 'ambient' | 'screen' | 'file', deviceId?: string, file?: File) {
    this.isStopped = false;
    if (mode === 'ambient') return;
    
    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (mode === 'file' && file) {
        this.audioElement = new Audio(URL.createObjectURL(file));
        this.audioElement.loop = true;
        this.audioElement.crossOrigin = 'anonymous';
        this.elementSource = this.ctx.createMediaElementSource(this.audioElement);
        this.elementSource.connect(this.analyzer);
        this.analyzer.connect(this.ctx.destination);
        try {
          await this.audioElement.play();
        } catch (e: any) {
          if (e.name !== 'AbortError') throw e;
        }
        if (this.isStopped) {
          this.stop();
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
      
      if (this.isStopped && this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
        return;
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
      if (e.name === 'NotFoundError' || e.message?.includes('Requested device not found')) {
        throw new Error("The selected audio input is no longer available. Please reselect the device and try again.");
      }
      if (mode === 'screen') {
        throw new Error("Screen capture failed. Please ensure you have granted permission and are sharing audio.");
      } else {
        throw new Error("Microphone access was denied. Please allow microphone access or try opening in a new tab.");
      }
    }
  }

  getSignalFeatures(time: number): SignalFeatures {
    this.analyzer.getByteFrequencyData(this.dataArray as any);
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
    this.isStopped = true;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.elementSource) {
      this.elementSource.disconnect();
      this.elementSource = null;
    }
    if (this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
  }
}
